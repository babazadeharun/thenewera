import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  duplicateOf,
  importId,
  mappedRow,
  parseSalesFile,
  SalesImportError,
} from "@/lib/sales/import";
export const runtime = "nodejs";
export const maxDuration = 60;
const json = (data: unknown, status = 200) =>
  NextResponse.json(data, { status, headers: { "Cache-Control": "no-store" } });
async function bounded(r: Request, max: number) {
  if (Number(r.headers.get("content-length") || 0) > max)
    throw new SalesImportError("Sorğu həddindən böyükdür.");
  const reader = r.body?.getReader();
  if (!reader) throw new SalesImportError("Fayl və ya məlumat göndərin.");
  const parts: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > max) {
        await reader.cancel();
        throw new SalesImportError("Sorğu həddindən böyükdür.");
      }
      parts.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  return Buffer.concat(parts);
}
export async function POST(r: Request) {
  const user = await getCurrentUser();
  if (!user || !["SUPER_ADMIN", "ADMIN"].includes(user.role))
    return json(
      { error: "Bu əməliyyat üçün admin icazəsi tələb olunur." },
      403,
    );
  if (r.headers.get("origin") !== new URL(r.url).origin)
    return json({ error: "Sorğunun mənbəyi təsdiqlənmədi." }, 403);
  try {
    if (r.headers.get("content-type")?.startsWith("multipart/form-data")) {
      const bytes = await bounded(r, 2 * 1024 * 1024 + 65536);
      const form = await new Request(r.url, {
        method: "POST",
        headers: { "content-type": r.headers.get("content-type")! },
        body: bytes,
      }).formData();
      const file = form.get("file");
      if (!file || typeof file === "string")
        throw new SalesImportError("Fayl seçin.");
      return json(
        await parseSalesFile(Buffer.from(await file.arrayBuffer()), file.name),
      );
    }
    let body: any;
    try {
      body = JSON.parse(
        (await bounded(r, 2 * 1024 * 1024 + 65536)).toString("utf8"),
      );
    } catch (e) {
      if (e instanceof SalesImportError) throw e;
      throw new SalesImportError("JSON məlumatı düzgün deyil.");
    }
    if (
      !body ||
      !["preview", "commit"].includes(body.action) ||
      !Array.isArray(body.rows) ||
      body.rows.length < 1 ||
      body.rows.length > 25
    )
      throw new SalesImportError("Bir paketdə 1–25 sətir göndərin.");
    if (body.action === "commit" && body.confirm !== true)
      throw new SalesImportError("İdxalı təsdiqləyin.");
    const results = [];
    // Preview never writes. Every commit revalidates raw input and checks duplicates
    // under a PostgreSQL transaction lock, including concurrent imports by admins.
    const previewExisting =
      body.action === "preview"
        ? await prisma.salesDeal.findMany({
            select: {
              id: true,
              title: true,
              contactName: true,
              email: true,
              phone: true,
            },
          })
        : [];
    for (let i = 0; i < body.rows.length; i++) {
      try {
        const row = mappedRow(body.rows[i], body.mapping);
        if (body.action === "preview") {
          const old = duplicateOf(row, previewExisting);
          results.push({
            index: i,
            status: old ? "duplicate" : "ready",
            data: row,
            duplicate: old?.title,
          });
          if (!old) previewExisting.push({ id: importId(row), ...row });
        } else {
          const result = await prisma.$transaction(
            async (db) => {
              await db.$executeRaw`SELECT pg_advisory_xact_lock(73294621)`;
              const existing = await db.salesDeal.findMany({
                select: {
                  id: true,
                  title: true,
                  contactName: true,
                  email: true,
                  phone: true,
                },
              });
              const old = duplicateOf(row, existing);
              if (old)
                return { index: i, status: "duplicate", duplicate: old.title };
              const deal = await db.salesDeal.create({
                data: {
                  ...row,
                  id: importId(row),
                  assignedUserId: user.id,
                  proposalStatus: "TODO",
                  activities: {
                    create: {
                      type: "NOTE",
                      text: "Fayldan idxal edildi. Təklif göndərilməlidir. Məktub göndərilməyib.",
                      createdByUserId: user.id,
                    },
                  },
                },
              });
              return { index: i, status: "created", id: deal.id };
            },
            { timeout: 10000 },
          );
          results.push(result);
        }
      } catch (e) {
        results.push({
          index: i,
          status: "error",
          error:
            e instanceof SalesImportError
              ? e.message
              : "Sətir yadda saxlanmadı. Yenidən cəhd edə bilərsiniz.",
        });
      }
    }
    return json({ results });
  } catch (e) {
    if (e instanceof SalesImportError) return json({ error: e.message }, 400);
    console.error(
      "sales import failed",
      e instanceof Error ? e.name : "unknown",
    );
    return r.headers.get("content-type")?.startsWith("multipart/form-data")
      ? json(
          {
            error:
              "Faylı oxumaq mümkün olmadı. Faylın düzgün XLSX, DOCX və ya UTF-8 CSV olduğuna əmin olun.",
          },
          400,
        )
      : json(
          {
            error:
              "Satış məlumatlarını yoxlamaq mümkün olmadı. Bir qədər sonra yenidən cəhd edin.",
          },
          503,
        );
  }
}

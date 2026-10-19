import ExcelJS from "exceljs";
import { createHash } from "node:crypto";
import { tx, context, permit, write, hash, type Actor } from "./db";
import { fail, required, str } from "./policy";
import { save } from "./records";
export function csv(text: string) {
  const rows: string[][] = [];
  const separator = delimiter(text);
  let row: string[] = [],
    cell = "",
    quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"') {
      if (quoted && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (!cell || quoted) quoted = !quoted;
      else fail("CSV dırnaq formatı düzgün deyil.");
    } else if (
      !quoted &&
      (ch === "," || ch === ";" || ch === "\n" || ch === "\r")
    ) {
      if ((ch === "," || ch === ";") && ch !== separator) {
        cell += ch;
        continue;
      }
      row.push(cell);
      cell = "";
      if (ch === "\n" || ch === "\r") {
        if (ch === "\r" && text[i + 1] === "\n") i++;
        if (row.some((x) => x.trim())) rows.push(row);
        row = [];
      }
    } else cell += ch;
    if (rows.length > 1000 || row.length > 100 || cell.length > 20000)
      fail("Maksimum 1000 sətir, 100 sütun, sahə başına 20000 simvol.");
  }
  if (quoted) fail("CSV dırnağı bağlanmayıb.");
  row.push(cell);
  if (row.some((x) => x.trim())) rows.push(row);
  return rows;
}
function delimiter(text: string) {
  const first = text.split(/\r?\n/, 1)[0];
  return first.split(";").length > first.split(",").length ? ";" : ",";
}
function safeXlsx(bytes: Buffer) {
  let at = -1;
  for (let p = bytes.length - 22; p >= Math.max(0, bytes.length - 65557); p--)
    if (bytes.readUInt32LE(p) === 0x06054b50) {
      at = p;
      break;
    }
  if (at < 0) fail("XLSX arxivi düzgün deyil.");
  const entries = bytes.readUInt16LE(at + 10),
    offset = bytes.readUInt32LE(at + 16);
  if (entries > 2000 || offset >= bytes.length)
    fail("Excel arxivi çox böyükdür.");
  let p = offset,
    total = 0;
  for (let n = 0; n < entries; n++) {
    if (p + 46 > bytes.length || bytes.readUInt32LE(p) !== 0x02014b50)
      fail("XLSX arxivi düzgün deyil.");
    const size = bytes.readUInt32LE(p + 24),
      name = bytes.readUInt16LE(p + 28),
      extra = bytes.readUInt16LE(p + 30),
      comment = bytes.readUInt16LE(p + 32);
    total += size;
    if (size === 0xffffffff || total > 20 * 1024 * 1024)
      fail("Excel açıldıqda 20 MB limitini keçir.");
    p += 46 + name + extra + comment;
  }
}
export async function parseFile(bytes: Buffer, name: string) {
  if (bytes.length > 2 * 1024 * 1024)
    fail("İmport faylı maksimum 2 MB olmalıdır.");
  let rows: string[][] = [];
  if (name.toLowerCase().endsWith(".xlsx")) {
    safeXlsx(bytes);
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(bytes as never);
    const sheet = wb.worksheets[0];
    if (!sheet) fail("Excel vərəqi yoxdur.");
    if (sheet.rowCount > 1001 || sheet.columnCount > 100)
      fail("Maksimum 1000 məlumat sətri və 100 sütun.");
    sheet.eachRow((row) => {
      const values: string[] = [];
      for (let n = 1; n <= sheet.columnCount; n++) {
        const cell = row.getCell(n);
        if (cell.type === ExcelJS.ValueType.Formula)
          fail("Formulaları əvvəlcə sadə dəyərlərə çevirin.");
        values.push(cell.text.slice(0, 20000));
      }
      rows.push(values);
    });
  } else if (name.toLowerCase().endsWith(".csv"))
    rows = csv(bytes.toString("utf8").replace(/^\uFEFF/, ""));
  else fail("CSV və ya XLSX faylı seçin.");
  if (rows.length < 2) fail("Başlıq və ən azı bir məlumat sətri olmalıdır.");
  const headers = rows
    .shift()!
    .map((x, i) => str(x, 100) || "Sütun " + (i + 1));
  return {
    headers,
    rows: rows.slice(0, 1000),
    fingerprint: createHash("sha256").update(bytes).digest("hex"),
  };
}
export async function importRows(
  u: Actor,
  id: string,
  support: string | null,
  b: Record<string, unknown>,
) {
  const kind = required(b.kind);
  if (!["customers", "sales", "tasks"].includes(kind))
    fail("İmport bölməsi uyğun deyil.");
  if (!Array.isArray(b.rows) || b.rows.length > 25 || !b.rows.length)
    fail("Bir paketdə 1–25 sətir.");
  const batch = required(b.batchId, 100),
    mapping = b.mapping as Record<string, unknown>;
  if (!mapping || typeof mapping !== "object") fail("Sütun uyğunluğunu seçin.");
  await tx(async (db) => {
    const c = await context(db, u, id, support);
    permit(c, kind, "create");
    write(c, kind);
  });
  const start = Math.max(0, Math.floor(Number(b.start) || 0)),
    results = [];
  for (let index = 0; index < b.rows.length; index++) {
    const raw = b.rows[index];
    try {
      const item = await tx(async (db) => {
        const c = await context(db, u, id, support);
        permit(c, kind, "create");
        write(c, kind);
        const key =
            "import:" + u.id + ":" + hash(batch) + ":" + (start + index),
          old = await db.crmEvent.findUnique({
            where: { companyId_key: { companyId: id, key } },
          });
        if (old) return { id: old.entryId, reused: true };
        if (!Array.isArray(raw) || raw.length > 100)
          fail("Sətir düzgün deyil.");
        const value: Record<string, unknown> = {
          status: "OPEN",
          data: {},
          custom: {},
        };
        for (const [field, col] of Object.entries(mapping)) {
          const n = Number(col);
          if (col === "" || !Number.isInteger(n) || n < 0 || n >= raw.length)
            continue;
          const content = String(raw[n] ?? "").trim();
          if (
            [
              "title",
              "email",
              "phone",
              "amount",
              "currency",
              "dueAt",
              "stage",
              "pipelineId",
            ].includes(field)
          )
            value[field] = content;
          if (field.startsWith("custom."))
            (value.custom as Record<string, unknown>)[field.slice(7)] = content;
          if (
            [
              "source",
              "person",
              "company",
              "tags",
              "notes",
              "nextStep",
            ].includes(field)
          )
            (value.data as Record<string, unknown>)[field] = content;
        }
        if (kind === "sales") value.stage = value.stage || c.company.stages[0];
        const created = await save(db, c, kind, value);
        await db.crmEvent.create({
          data: {
            companyId: id,
            type: "IMPORT",
            key,
            actorId: u.id,
            actorType: support ? "PLATFORM" : "MEMBER",
            entryId: created.id,
            data: { batch: hash(batch), row: start + index },
          },
        });
        return { id: created.id };
      });
      results.push({ row: start + index + 1, ok: true, ...item });
    } catch (e) {
      results.push({
        row: start + index + 1,
        ok: false,
        error:
          e instanceof Error && e.name !== "PrismaClientKnownRequestError"
            ? e.message
            : "Sətir yadda saxlanmadı.",
      });
    }
  }
  return { results };
}

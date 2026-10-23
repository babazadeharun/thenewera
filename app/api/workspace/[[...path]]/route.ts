import { intakeKey } from "@/lib/crm/intake";
import { socialList, socialPending, startSocial, finishEmbedded, activateSocial, disconnectSocial, verifySocial, cancelSocial } from '@/lib/crm/social';
import { mailHealth } from "@/lib/crm/mail";
import { assistant } from "@/lib/crm/assistant";
import { queueStatus } from "@/lib/crm/queue";
import { connections, syncNow } from "@/lib/crm/connections";
import { configure, approvals } from "@/lib/crm/preferences";
import {
  timeline,
  dashboard,
  savedViews,
  trash,
  mergeCustomer,
} from "@/lib/crm/insights";
import { threads, conversation, act as inboxAction } from "@/lib/crm/inbox";
import { schedules } from "@/lib/crm/booking";
import { portalInvite, deliverPortal } from "@/lib/crm/portal";
import { parseFile, importRows } from "@/lib/crm/imports";
import { prisma } from "@/lib/prisma";
import {
  where,
  actor,
  tx,
  context,
  permit,
  write,
  entry,
  seat,
  log,
  publicInvite,
} from "@/lib/crm/db";
import {
  home,
  create,
  accept,
  invite,
  deliver,
  team,
  changeMember,
  transfer,
  meta,
} from "@/lib/crm/workspaces";
import { list, save, reports, kinds } from "@/lib/crm/records";
import { origin, bytes, body, handled, json } from "@/lib/crm/http";
import { fail, required, str } from "@/lib/crm/policy";
import { upload, attachment, pdf } from "@/lib/crm/files";
import { providerStatus, send, suggest } from "@/lib/crm/providers";
import { hash } from "@/lib/crm/db";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;
type P = { params: Promise<{ path?: string[] }> };
export async function GET(r: Request, p: P) {
  return handled(async () => {
    const { path = [] } = await p.params,
      q = new URL(r.url).searchParams;
    if (path[0] === "invite") {
      const i =
        (await prisma.crmInvitation.findUnique({
          where: { hash: hash(required(q.get("token"), 100)) },
          select: {
            role: true,
            expiresAt: true,
            acceptedAt: true,
            revokedAt: true,
            company: { select: { name: true } },
          },
        })) || fail("Dəvət tapılmadı.", 404);
      return json({
        ...i,
        state: i.acceptedAt
          ? "ACCEPTED"
          : i.revokedAt
            ? "REVOKED"
            : i.expiresAt < new Date()
              ? "EXPIRED"
              : "PENDING",
      });
    }
    const u = await actor();
    if (!path.length) return json(await home(u));
    const [id, op, itemId] = path;
    if (op === "mail-health") {
      await tx(async (db) => {
        const c = await context(db, u, id, q.get("support"));
        permit(c, "team", "create");
      });
      return json(await mailHealth());
    }
    if (op === 'social-connections') return json(await socialList(u,id));
    if (op === 'social-auth') return json(await socialPending(u,id,required(q.get('authId'))));
    if (op === "connections") return json(await connections(u, id));
    const result = await tx(async (db) => {
      const c = await context(db, u, id, q.get("support"));
      if (op === "queue") return { data: await queueStatus(db, c) };
      if (op === "timeline")
        return { data: await timeline(db, c, required(itemId)) };
      if (op === "dashboard") return { data: await dashboard(db, c, q) };
      if (op === "threads") return { data: await threads(db, c, q) };
      if (op === "conversation")
        return { data: await conversation(db, c, required(itemId)) };
      if (op === "approvals") return { data: await approvals(db, c) };
      if (op === "views") return { data: await savedViews(db, c) };
      if (op === "trash") return { data: await trash(db, c) };
      if (op === "schedules") return { data: await schedules(db, c) };
      if (op === "portal-access") {
        permit(c, "customers", "update");
        await entry(db, c, required(q.get("customerId")), "update");
        return {
          data: await db.crmPortalAccess.findMany({
            where: { companyId: id, customerId: q.get("customerId")! },
            select: {
              id: true,
              email: true,
              acceptedAt: true,
              revokedAt: true,
              expiresAt: true,
            },
          }),
        };
      }
      if (op === "portal-requests") {
        permit(c, "customers", "read");
        const customerIds = (
          await db.crmEntry.findMany({
            where: await where(db, c, "customers"),
            select: { id: true },
          })
        ).map((e) => e.id);
        return {
          data: await db.crmEvent.findMany({
            where: {
              companyId: id,
              type: "PORTAL_REQUEST",
              entryId: { in: customerIds },
            },
            orderBy: { createdAt: "desc" },
            take: 100,
          }),
        };
      }
      if (op === "meta") return { data: await meta(db, c) };
      if (op === "team") return { data: await team(db, c) };
      if (op === "reports") return { data: await reports(db, c, q) };
      if (kinds.includes(op))
        return {
          data: itemId ? await entry(db, c, itemId) : await list(db, c, op, q),
        };
      if (op === "history") {
        const target = q.get("id");
        if (target) await entry(db, c, target);
        else permit(c, "settings", "read");
        return {
          data: await db.crmEvent.findMany({
            where: {
              companyId: id,
              type: "AUDIT",
              ...(target ? { entryId: target } : {}),
            },
            orderBy: { createdAt: "desc" },
            take: 100,
          }),
        };
      }
      if (op === "files") {
        if (itemId) return { file: await attachment(db, c, itemId) };
        const entryId = required(q.get("id"));
        await entry(db, c, entryId);
        return {
          data: await db.crmAttachment.findMany({
            where: { companyId: id, entryId },
            select: { id: true, name: true, size: true, portalVisible: true },
          }),
        };
      }
      if (op === "pdf") {
        const item = await entry(db, c, required(itemId), "export");
        if (item.kind !== "quotes") fail("Təklif tapılmadı.", 404);
        await log(db, id, u, "PDF_EXPORTED", {}, item.id, Boolean(c.support));
        const logo = await db.crmAttachment.findFirst({
          where: { companyId: id, entryId: null },
          orderBy: { createdAt: "desc" },
          select: { bytes: true, mime: true },
        });
        return {
          pdf: item,
          name: c.company.name,
          brand: {
            ...(c.company.preferences as any)?.brand,
            ...(logo
              ? { logo: new Uint8Array(logo.bytes), logoMime: logo.mime }
              : {}),
          },
        };
      }
      if (op === "export") {
        const out = await list(db, c, required(itemId), q, "export");
        const fields = [
          "id",
          "title",
          "email",
          "phone",
          "status",
          "stage",
          "amount",
          "currency",
          "assigneeId",
          "customerId",
          "saleId",
          "dueAt",
          "pipelineId",
          "custom",
          "data",
        ] as const;
        const cell = (v: unknown) => {
          let s = typeof v === "object" ? JSON.stringify(v) : String(v ?? "");
          if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
          return '"' + s.replace(/"/g, '""') + '"';
        };
        await log(
          db,
          id,
          u,
          "EXPORTED",
          { kind: itemId, count: out.total },
          undefined,
          Boolean(c.support),
        );
        return {
          csv:
            "\ufeff" +
            [
              fields.join(","),
              ...out.items.map((x) => fields.map((k) => cell(x[k])).join(",")),
            ].join("\r\n"),
        };
      }
      if (op === "rules") {
        permit(c, "automation", "read");
        return {
          data: {
            rules: await db.crmAutomation.findMany({
              where: { companyId: id },
            }),
            runs: await db.crmEvent.findMany({
              where: { companyId: id, type: "RUN" },
              orderBy: { createdAt: "desc" },
              take: 100,
            }),
          },
        };
      }
      if (op === "providers") {
        permit(c, "messages", "read");
        return { data: await providerStatus(db, id) };
      }
      if (op === "billing") {
        permit(c, "billing", "read");
        return {
          data: {
            company: { ...c.company, state: c.state },
            plans: await db.crmPlan.findMany({
              where: { archived: false, trialDefault: false },
            }),
            events: await db.crmEvent.findMany({
              where: {
                companyId: id,
                type: { in: ["SUPPORT", "SUBSCRIPTION", "RECEIPT"] },
              },
              orderBy: { createdAt: "desc" },
              take: 50,
            }),
            usage: {
              seats: await db.crmSeat.count({
                where: { companyId: id, active: true },
              }),
              records: await db.crmEntry.count({
                where: { companyId: id, deletedAt: null },
              }),
              bytes:
                (
                  await db.crmAttachment.aggregate({
                    where: { companyId: id },
                    _sum: { size: true },
                  })
                )._sum.size || 0,
            },
          },
        };
      }
      fail("Bölmə tapılmadı.", 404);
    });
    if (result.file)
      return new Response(new Uint8Array(result.file.bytes), {
        headers: {
          "Content-Type": result.file.mime,
          "Content-Disposition": `${result.file.entryId ? "attachment" : "inline"}; filename*=UTF-8''${encodeURIComponent(result.file.name)}`,
          "Cache-Control": "private, no-store",
          "Content-Security-Policy": "default-src 'none'; sandbox",
          "X-Content-Type-Options": "nosniff",
        },
      });
    if (result.pdf)
      return new Response(
        await pdf(
          result.name!,
          result.pdf,
          "brand" in result ? result.brand : undefined,
        ),
        {
          headers: {
            "Content-Type": "application/pdf",
            "Content-Disposition": 'attachment; filename="proposal.pdf"',
            "Cache-Control": "private, no-store",
          },
        },
      );
    if (result.csv)
      return new Response(result.csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": 'attachment; filename="workspace.csv"',
          "Cache-Control": "private, no-store",
        },
      });
    return json(result.data);
  });
}
export async function POST(r: Request, p: P) {
  return handled(async () => {
    const { path = [] } = await p.params,
      q = new URL(r.url).searchParams,
      u = await actor();
    if (!path.length) {
      const b = await body(r);

      return json(
        b.action === "accept" ? await accept(u, b) : await create(u, b),
        201,
      );
    }
    const [id, op, itemId] = path;
    if (op === "upload") {
      origin(r);
      const data = await bytes(r, 10485760);
      return json(
        await tx(async (db) =>
          upload(
            db,
            await context(db, u, id, q.get("support")),
            data,
            decodeURIComponent(r.headers.get("x-filename") || "file"),
            r.headers.get("content-type") || "",
            q.get("id"),
          ),
        ),
      );
    }
    if (op === "import-preview") {
      origin(r);
      await tx(async (db) => {
        const c = await context(db, u, id, q.get("support"));
        const kind = q.get("kind") || "customers";
        if (!["customers", "sales", "tasks"].includes(kind))
          fail("İmport bölməsi uyğun deyil.");
        permit(c, kind, "create");
        write(c, kind);
      });
      return json(
        await parseFile(
          await bytes(r, 2097152),
          decodeURIComponent(r.headers.get("x-filename") || "file.csv"),
        ),
      );
    }
    const b = await body(r);
    if(op === 'social-start')return json(await startSocial(u,id,b));
    if(op === 'social-finish')return json(await finishEmbedded(u,id,b));
    if(op === 'social-activate')return json(await activateSocial(u,id,b));
    if(op === 'social-disconnect')return json(await disconnectSocial(u,id,required(b.id)));
    if(op === 'social-check')return json(await verifySocial(u,id,required(b.id)));
    if(op === 'social-cancel')return json(await cancelSocial(u,id,required(b.authId)));
    if (op === "sync-connection")
      return json(await syncNow(u, id, required(b.id)));
    if (op === "mail-test") {
      await tx(async (db) => {
        const c = await context(db, u, id, q.get("support"));
        permit(c, "team", "create");
        write(c);
      });
      return json(await mailHealth(true));
    }
    if (op === "connection") return json(await connections(u, id, b));
    if (op === "assistant")
      return json(await assistant(u, id, q.get("support"), b));
    if (op === "import")
      return json(await importRows(u, id, q.get("support"), b));
    if (op === "send")
      return json(
        await send(u, id, q.get("support"), required(b.id), b.confirm === true),
      );
    if (op === "ai")
      return json(
        await suggest(
          u,
          id,
          q.get("support"),
          required(b.customerId),
          b.confirm === true,
        ),
      );
    const result = await tx(async (db) => {
      const c = await context(db, u, id, q.get("support"));
      if (op === "merge-customer") return mergeCustomer(db, c, b);
      if (op === "retry-job") return queueStatus(db, c, b);
      if (op === "preferences") return configure(db, c, b);
      if (op === "approval") return approvals(db, c, b);
      if (op === "view") return savedViews(db, c, b);
      if (op === "restore") return trash(db, c, b);
      if (op === "inbox") return inboxAction(db, c, b);
      if (op === "schedule") return schedules(db, c, b);
      if (op === "portal-invite")
        return { portalDelivery: await portalInvite(db, c, b) };
      if (kinds.includes(op)) return save(db, c, op, b, itemId);
      if (op === "invite") return { delivery: await invite(db, c, b) };
      if (op === "revoke") {
        permit(c, "team", "update");
        write(c);
        await db.crmInvitation.updateMany({
          where: { id: required(b.id), companyId: id, acceptedAt: null },
          data: { revokedAt: new Date() },
        });
        await log(
          db,
          id,
          u,
          "INVITE_REVOKED",
          { id: String(b.id) },
          undefined,
          Boolean(c.support),
        );
        return { ok: true };
      }
      if (op === "member") return changeMember(db, c, b);
      if (op === "transfer") return transfer(db, c, b);
      if (op === "welcome" || op === "dismiss") {
        if (!c.member || c.support) fail("Üzvlük tələb olunur.", 403);
        await db.crmSeat.update({
          where: { id: c.member.id },
          data:
            op === "welcome"
              ? { welcomedAt: new Date() }
              : { dismissedAt: new Date() },
        });
        return { ok: true };
      }
      if (op === "notification") {
        const e = await db.crmEvent.findFirst({
          where: {
            id: required(b.id),
            companyId: id,
            type: "NOTICE",
            userId: u.id,
          },
        });
        if (e)
          await db.crmEvent.update({
            where: { id: e.id },
            data: { data: { ...(e.data as object), read: true } },
          });
        return { ok: true };
      }
      if (op === "request") {
        if (c.member?.role !== "OWNER") fail("Yalnız Owner üçün.", 403);
        if (
          await db.crmEvent.count({
            where: {
              companyId: id,
              type: "SUPPORT",
              actorId: u.id,
              createdAt: { gt: new Date(Date.now() - 60000) },
            },
          })
        )
          fail("Bir dəqiqə gözləyin.", 429);
        return db.crmEvent.create({
          data: {
            companyId: id,
            type: "SUPPORT",
            actorId: u.id,
            data: {
              message: required(b.message, 4000),
              type: b.type === "ACTIVATION" ? "ACTIVATION" : "SUPPORT",
              status: "OPEN",
            },
          },
        });
      }
      if (op === "delete") {
        write(c);
        const e = await entry(db, c, required(b.id), "delete");
        if (
          e.kind === "calendar" &&
          (await db.crmBooking.count({
            where: {
              companyId: id,
              calendarEntryId: e.id,
              status: "CONFIRMED",
            },
          }))
        )
          fail("Aktiv rezervasiyanı əvvəlcə təqvimdə ləğv edin.", 409);
        if (e.version !== Number(b.version)) fail("Qeyd dəyişib.", 409);
        if (
          await db.crmEntry.count({
            where: {
              companyId: id,
              deletedAt: null,
              OR: [{ customerId: e.id }, { saleId: e.id }],
            },
          })
        )
          fail("Əlaqəli qeydləri əvvəlcə yeniləyin.");
        await db.crmEntry.update({
          where: { id: e.id },
          data: { deletedAt: new Date(), version: { increment: 1 } },
        });
        await log(
          db,
          id,
          u,
          "ENTRY_DELETED",
          { kind: e.kind },
          e.id,
          Boolean(c.support),
        );
        return { ok: true };
      }
      if (op === "portal-request") {
        write(c);
        const e =
          (await db.crmEvent.findFirst({
            where: {
              id: required(b.id),
              companyId: id,
              type: "PORTAL_REQUEST",
            },
          })) || fail("Müraciət tapılmadı.", 404);
        await entry(db, c, required(e.entryId), "update");
        await db.crmEvent.update({
          where: { id: e.id },
          data: {
            data: {
              ...(e.data as object),
              reply: required(b.reply, 4000),
              status: "ANSWERED",
            },
          },
        });
        await log(
          db,
          id,
          u,
          "PORTAL_REQUEST_ANSWERED",
          {},
          e.entryId || undefined,
          Boolean(c.support),
        );
        return { ok: true };
      }
      if (op === "file-sharing") {
        write(c);
        const f = await attachment(db, c, required(b.id));
        if (!f.entryId) fail("Loqo paylaşımı bu əməliyyatla dəyişmir.");
        await entry(db, c, f.entryId, "update");
        await db.crmAttachment.update({
          where: { id: f.id },
          data: { portalVisible: b.visible === true },
        });
        await log(
          db,
          id,
          u,
          "FILE_SHARING_CHANGED",
          { fileId: f.id, visible: b.visible === true },
          f.entryId,
          Boolean(c.support),
        );
        return { ok: true };
      }
      if (op === "delete-file") {
        write(c);
        const f = await attachment(db, c, required(b.id));
        if (f.entryId) await entry(db, c, f.entryId, "update");
        else permit(c, "settings", "update");
        await db.crmAttachment.delete({ where: { id: f.id } });
        await log(
          db,
          id,
          u,
          "FILE_DELETED",
          { id: f.id },
          f.entryId || undefined,
          Boolean(c.support),
        );
        return { ok: true };
      }
      if (op === "intake-key") return intakeKey(db, c, b);
      if (op === "settings") {
        permit(c, "settings", "update");
        write(c);
        const stages = Array.isArray(b.stages)
          ? Array.from(new Set(b.stages.map((s) => required(s, 80))))
          : c.company.stages;
        if (!stages.length || stages.length > 20)
          fail("1–20 mərhələ olmalıdır.");
        const used = await db.crmEntry.findMany({
          where: {
            companyId: id,
            kind: "sales",
            status: "OPEN",
            deletedAt: null,
          },
          select: { stage: true },
        });
        if (used.some((x) => x.stage && !stages.includes(x.stage)))
          fail("Aktiv satışın mərhələsi silinə bilməz.");
        await db.crmCompany.update({
          where: { id },
          data: {
            name: required(b.name),
            industry: required(b.industry),
            email: required(b.email),
            phone: required(b.phone, 40),
            taxId: str(b.taxId, 30) || null,
            stages,
          },
        });
        await log(
          db,
          id,
          u,
          "SETTINGS_CHANGED",
          {},
          undefined,
          Boolean(c.support),
        );
        return { ok: true };
      }
      if (op === "rule") {
        permit(c, "automation", "create");
        write(c, "automation");
        if (c.member?.role !== "OWNER" && !c.support)
          fail("Yalnız Owner qayda yarada bilər.", 403);
        if (b.id) {
          await db.crmAutomation.updateMany({
            where: { id: required(b.id), companyId: id },
            data: { active: b.active === true },
          });
        } else {
          const trigger = required(b.trigger),
            action = required(b.action);
          if (
            !["CREATED", "STAGE_CHANGED", "OVERDUE"].includes(trigger) ||
            !["ASSIGN", "TASK", "NOTIFY"].includes(action) ||
            (action === "ASSIGN" && trigger !== "CREATED")
          )
            fail("Qayda uyğun deyil.");
          const s = await seat(db, required(b.assigneeId), id),
            stage = str(b.stage, 80) || null;
          if (
            trigger === "STAGE_CHANGED" &&
            (!stage || !c.company.stages.includes(stage))
          )
            fail("Mərhələ seçin.");
          await db.crmAutomation.create({
            data: {
              companyId: id,
              title: required(b.title),
              trigger,
              action,
              assigneeId: s.id,
              stage,
              authorId: u.id,
            },
          });
        }
        await log(db, id, u, "RULE_CHANGED", {}, undefined, Boolean(c.support));
        return { ok: true };
      }
      fail("Əməliyyat tapılmadı.", 404);
    });
    if (result && typeof result === "object" && "portalDelivery" in result) {
      const d = result.portalDelivery;
      if (d && typeof d === "object" && "delivery" in d && d.delivery)
        return json(await deliverPortal(d.delivery));
      return json(d);
    }
    if (
      result &&
      typeof result === "object" &&
      "delivery" in result &&
      result.delivery
    )
      return json(await deliver(result.delivery));
    return json(result);
  });
}

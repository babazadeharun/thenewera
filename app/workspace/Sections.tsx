"use client";
import { useEffect, useState } from "react";
import { api, Form, Modal, Table, dt, roleNames, type R } from "./shared";
export default function Sections({
  section,
  data,
  meta,
  url,
  action,
  writable,
  refresh,
  error,
}: {
  section: string;
  data: R;
  meta: R;
  url: (s: string) => string;
  action: (op: string, b: R) => Promise<any>;
  writable: boolean;
  refresh: () => Promise<any>;
  error: (s: string) => void;
}) {
  const [editing, setEditing] = useState<R | null>(null),
    [custom, setCustom] = useState(false),
    [grants, setGrants] = useState<R>({}),
    [providers, setProviders] = useState<R>({}),
    [draft, setDraft] = useState(""),
    [lookup, setLookup] = useState(""),
    [customers, setCustomers] = useState<R[]>([]),
    [mail, setMail] = useState<R | null>(null);
  useEffect(() => {
    if (section === "team" && meta.permissions.team?.create !== "NONE")
      api(url("mail-health"))
        .then(setMail)
        .catch(() => {});
  }, [section]);
  const can = (s: string, op = "read") => meta.permissions[s]?.[op] !== "NONE";
  const opts = (a: string[]) =>
    a.map((x) => ({ value: x, label: roleNames[x] || x }));
  useEffect(() => {
    if (section !== "messages") return;
    api(url("providers"))
      .then(setProviders)
      .catch((e) => error(e.message));
  }, [section]);
  useEffect(() => {
    if (section === "messages" && can("customers")) {
      const t = setTimeout(
        () =>
          api(url("customers?q=" + encodeURIComponent(lookup)))
            .then((d) => setCustomers(d.items))
            .catch(() => {}),
        200,
      );
      return () => clearTimeout(t);
    }
  }, [section, lookup]);
  if (section === "team")
    return (
      <>
        {mail && (
          <section className="crmPanel">
            <h2>Dəvət poçtunun vəziyyəti</h2>
            <p>Göndərən: {mail.sender}</p>
            <p>
              Link ayarı: {mail.url === "OK" ? "Hazırdır" : mail.url} · SMTP:{" "}
              {mail.smtpConfigured ? "Qurulub" : "Qurulmayıb"}
            </p>
            {mail.message && (
              <p className={mail.verified ? "crmBanner" : "crmError"}>
                {mail.message}
              </p>
            )}
            {writable && (
              <button
                onClick={async () => {
                  try {
                    setMail(await api(url("mail-test"), {}));
                  } catch (e) {
                    error((e as Error).message);
                  }
                }}
              >
                Poçt bağlantısını yoxla
              </button>
            )}
          </section>
        )}
        <section className="crmPanel">
          <h2>Komanda</h2>
          <p>Limit: {meta.company.seats} istifadəçi (rəhbər daxil).</p>
          {(data.members || []).map((m: R) => (
            <div className="crmRow" key={m.id}>
              <div>
                <b>{m.user.email}</b>
                <p>
                  {roleNames[m.role]} · {m.team || "Şöbə yoxdur"} ·{" "}
                  {m.active ? "Aktiv" : "Deaktiv"}
                </p>
              </div>
              {writable && can("team", "update") && m.role !== "OWNER" && (
                <button
                  onClick={() => {
                    setEditing(m);
                    setGrants(m.grants || {});
                    setCustom(Boolean(m.grants));
                  }}
                >
                  İdarə et
                </button>
              )}
            </div>
          ))}
        </section>
        {writable && can("team", "create") && (
          <section className="crmPanel">
            <h2>Əməkdaş dəvət et</h2>
            <Form
              fields={[
                {
                  key: "email",
                  label: "E-poçt",
                  type: "email",
                  required: true,
                },
                {
                  key: "role",
                  label: "Rol",
                  options: opts([
                    "SALES",
                    "ADMIN",
                    "MANAGER",
                    "ACCOUNTANT",
                    "VIEWER",
                  ]),
                },
                { key: "team", label: "Şöbə (istəyə bağlı)" },
              ]}
              label="Dəvət göndər"
              submit={(b) => action("invite", b)}
            />
          </section>
        )}
        <section className="crmPanel">
          <h2>Dəvətlər</h2>
          {(data.invites || []).map((i: R) => {
            const status = i.acceptedAt
              ? "Qəbul edilib"
              : i.revokedAt
                ? "Ləğv edilib"
                : new Date(i.expiresAt) < new Date()
                  ? "Vaxtı bitib"
                  : "Gözləyir";
            return (
              <div className="crmRow" key={i.id}>
                <div>
                  <b>{i.email}</b>
                  <p>
                    {roleNames[i.role]} · {status} · {dt(i.expiresAt)}
                  </p>
                  {i.error && <p className="crmError">{i.error}</p>}
                </div>
                {writable && can("team", "update") && !i.acceptedAt && (
                  <div className="crmActions">
                    <button
                      onClick={() =>
                        action("invite", {
                          email: i.email,
                          role: i.role,
                          team: i.team,
                        }).catch((e) => error(e.message))
                      }
                    >
                      Yenidən göndər
                    </button>
                    {!i.revokedAt && (
                      <button
                        onClick={() =>
                          action("revoke", { id: i.id }).catch((e) =>
                            error(e.message),
                          )
                        }
                      >
                        Ləğv et
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </section>
        {meta.member?.role === "OWNER" && writable && (
          <section className="crmPanel">
            <h2>Sahibliyi ötür</h2>
            <p>
              Şirkətin adını yazmaqla bu əməliyyatı ayrıca təsdiqləyin. Əvvəlki
              Owner Admin olacaq.
            </p>
            <Form
              fields={[
                {
                  key: "id",
                  label: "Yeni Owner",
                  required: true,
                  options: (data.members || [])
                    .filter((m: R) => m.active && m.id !== meta.member.id)
                    .map((m: R) => ({ value: m.id, label: m.user.email })),
                },
                {
                  key: "confirm",
                  label: "Təsdiq üçün şirkətin adı",
                  required: true,
                },
              ]}
              label="Sahibliyi ötür"
              submit={(b) => action("transfer", b)}
            />
          </section>
        )}
        {editing && (
          <Modal title="Əməkdaşı idarə et" close={() => setEditing(null)}>
            <Form
              fields={[
                {
                  key: "role",
                  label: "Rol",
                  options: opts([
                    "ADMIN",
                    "MANAGER",
                    "SALES",
                    "ACCOUNTANT",
                    "VIEWER",
                  ]),
                },
                { key: "team", label: "Şöbə" },
                {
                  key: "active",
                  label: "Giriş",
                  options: [
                    { value: "true", label: "Aktiv" },
                    { value: "false", label: "Deaktiv" },
                  ],
                },
                {
                  key: "reassignId",
                  label: "Qeydləri başqa əməkdaşa ötür",
                  options: [
                    { value: "", label: "Ötürmə" },
                    ...(data.members || [])
                      .filter((m: R) => m.active && m.id !== editing.id)
                      .map((m: R) => ({ value: m.id, label: m.user.email })),
                  ],
                },
              ]}
              values={{ ...editing, active: String(editing.active) }}
              submit={async (b) => {
                await action("member", {
                  ...b,
                  id: editing.id,
                  active: b.active === "true",
                  grants: custom ? grants : null,
                });
                setEditing(null);
              }}
            >
              <label>
                <input
                  type="checkbox"
                  checked={custom}
                  onChange={(e) => setCustom(e.target.checked)}
                />
                Fərdi icazələr (seçilməyibsə rola uyğun ilkin icazələr)
              </label>
              {custom && (
                <div className="crmTableWrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Bölmə</th>
                        {["read", "create", "update", "delete", "export"].map(
                          (o) => (
                            <th key={o}>
                              {
                                (
                                  {
                                    read: "Baxış",
                                    create: "Yarat",
                                    update: "Dəyiş",
                                    delete: "Sil",
                                    export: "İxrac",
                                  } as R
                                )[o]
                              }
                            </th>
                          ),
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {Object.keys(meta.permissions).map((resource) => (
                        <tr key={resource}>
                          <td>{resource}</td>
                          {["read", "create", "update", "delete", "export"].map(
                            (op) => (
                              <td key={op}>
                                <select
                                  aria-label={resource + " " + op}
                                  value={grants[resource]?.[op] || "NONE"}
                                  onChange={(e) =>
                                    setGrants((g) => ({
                                      ...g,
                                      [resource]: {
                                        ...g[resource],
                                        [op]: e.target.value,
                                      },
                                    }))
                                  }
                                >
                                  {["NONE", "OWN", "TEAM", "ALL"].map((s) => (
                                    <option key={s} value={s}>
                                      {
                                        (
                                          {
                                            NONE: "Yoxdur",
                                            OWN: "Öz qeydləri",
                                            TEAM: "Komanda",
                                            ALL: "Bütün şirkət",
                                          } as R
                                        )[s]
                                      }
                                    </option>
                                  ))}
                                </select>
                              </td>
                            ),
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Form>
          </Modal>
        )}
      </>
    );
  if (section === "settings")
    return (
      <>
        <section className="crmPanel">
          <h2>Şirkət ayarları</h2>
          <Form
            disabled={!writable || !can("settings", "update")}
            fields={[
              { key: "name", label: "Şirkət adı", required: true },
              { key: "industry", label: "Fəaliyyət sahəsi", required: true },
              { key: "email", label: "E-poçt", type: "email", required: true },
              { key: "phone", label: "Telefon", required: true },
              { key: "taxId", label: "VÖEN" },
              {
                key: "stages",
                label: "Satış mərhələləri (hər sətirdə bir mərhələ)",
                type: "textarea",
                required: true,
              },
            ]}
            values={{ ...meta.company, stages: meta.company.stages.join("\n") }}
            submit={(b) =>
              action("settings", {
                ...b,
                stages: b.stages.split("\n").filter(Boolean),
              })
            }
          />
          {writable && can("settings", "update") && (
            <label>
              Loqo (PNG / JPEG / WebP)
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  try {
                    const r = await fetch(url("upload"), {
                      method: "POST",
                      headers: {
                        "Content-Type": f.type,
                        "x-filename": encodeURIComponent(f.name),
                      },
                      body: f,
                    });
                    const d = await r.json();
                    if (!r.ok) throw Error(d.error);
                    await refresh();
                  } catch (e) {
                    error((e as Error).message);
                  }
                }}
              />
            </label>
          )}
        </section>
        <section className="crmPanel">
          <h2>Fəaliyyət jurnalı</h2>
          <Table
            rows={
              Array.isArray(data)
                ? data.map((e: R) => ({
                    Tarix: dt(e.createdAt),
                    Əməliyyat: e.data.action,
                    Müəllif: e.actorId,
                    Rejim: e.actorType,
                  }))
                : []
            }
          />
        </section>
      </>
    );
  if (section === "billing")
    return (
      <>
        <section className="crmPanel">
          <h2>Plan və abunəlik</h2>
          <p>
            Vəziyyət: <b>{meta.company.state}</b>
          </p>
          <p>
            Pulsuz istifadə: {dt(meta.company.trialStart)} —{" "}
            {dt(meta.company.trialEnd)}
          </p>
          <p>Aktiv abunəlik: {dt(meta.company.paidUntil) || "Aktiv deyil"}</p>
          <p>Ödəniş kartı tələb olunmur. Avtomatik ödəniş tutulmayacaq.</p>
          <Table
            rows={[
              {
                Limit: "İstifadəçilər",
                İstifadə: data.usage?.seats || 0,
                Maksimum: meta.company.seats,
              },
              {
                Limit: "Qeydlər",
                İstifadə: data.usage?.records || 0,
                Maksimum: meta.company.records,
              },
              {
                Limit: "Yaddaş (MB)",
                İstifadə: ((data.usage?.bytes || 0) / 1048576).toFixed(2),
                Maksimum: (meta.company.bytes / 1048576).toFixed(0),
              },
            ]}
          />
          <p>Açıq imkanlar: {meta.company.features.join(", ")}</p>
        </section>
        <section className="crmPanel">
          <h2>Planlar</h2>
          {(data.plans || []).map((p: R) => (
            <article className="crmCard" key={p.id}>
              <h3>{p.name}</h3>
              <p>
                {p.price} {p.currency} · {p.seats} istifadəçi ·{" "}
                {(p.bytes / 1048576).toFixed(0)} MB
              </p>
              <p>{p.features.join(", ")}</p>
              <button
                onClick={() =>
                  action("request", {
                    type: "ACTIVATION",
                    message: "Aktivləşdirmə sorğusu: " + p.name,
                  })
                    .then(() => alert("Sorğu göndərildi."))
                    .catch((e) => error(e.message))
                }
              >
                Aktivləşdirmə sorğusu göndər
              </button>
            </article>
          ))}
          {!data.plans?.length && (
            <p>
              Tariflər Super Admin tərəfindən hazırlanır. Aktivləşdirmə sorğusu
              göndərə bilərsiniz.
            </p>
          )}
        </section>
        <section className="crmPanel">
          <h2>Dəstək / aktivləşdirmə sorğusu</h2>
          <Form
            fields={[
              {
                key: "type",
                label: "Sorğu növü",
                options: [
                  { value: "ACTIVATION", label: "Abunəliyi aktivləşdir" },
                  { value: "SUPPORT", label: "Dəstək" },
                ],
              },
              {
                key: "message",
                label: "Mesaj",
                type: "textarea",
                required: true,
              },
            ]}
            label="Sorğu göndər"
            submit={(b) => action("request", b)}
          />
          <h3>Abunəlik tarixçəsi</h3>
          <Table
            rows={(data.events || []).map((e: R) => ({
              Tarix: dt(e.createdAt),
              Növ: e.type,
              Məlumat:
                e.data.message ||
                e.data.reason ||
                e.data.action ||
                (e.data.amount !== undefined
                  ? e.data.amount + " " + e.data.currency
                  : e.data.status) ||
                "—",
            }))}
          />
        </section>
      </>
    );
  if (section === "automation")
    return (
      <>
        <section className="crmPanel">
          <h2>Avtomatlaşdırma qaydaları</h2>
          {(data.rules || []).map((r: R) => (
            <div className="crmRow" key={r.id}>
              <span>
                {r.title} · {r.trigger} → {r.action} ·{" "}
                {r.active ? "Aktiv" : "Bağlı"}
              </span>
              {writable && can("automation", "create") && (
                <button
                  onClick={() =>
                    action("rule", { id: r.id, active: !r.active }).catch((e) =>
                      error(e.message),
                    )
                  }
                >
                  {r.active ? "Dayandır" : "Aktivləşdir"}
                </button>
              )}
            </div>
          ))}
          {writable && can("automation", "create") && (
            <Form
              fields={[
                {
                  key: "title",
                  label: "Qayda adı / yaranacaq tapşırıq",
                  required: true,
                },
                {
                  key: "trigger",
                  label: "Hadisə",
                  options: opts(["CREATED", "STAGE_CHANGED", "OVERDUE"]),
                },
                {
                  key: "action",
                  label: "Əməliyyat",
                  options: opts(["TASK", "ASSIGN", "NOTIFY"]),
                },
                {
                  key: "stage",
                  label: "Mərhələ (dəyişmə qaydası üçün)",
                  options: meta.company.stages.map((s: string) => ({
                    value: s,
                    label: s,
                  })),
                },
                {
                  key: "assigneeId",
                  label: "Məsul əməkdaş",
                  required: true,
                  options: meta.members.map((m: R) => ({
                    value: m.id,
                    label: m.user.email,
                  })),
                },
              ]}
              label="Qayda yarat"
              submit={(b) => action("rule", b)}
            />
          )}
          <p>
            Qaydalar serverdə işləyir. Sınaq/abunəlik bitdikdə dəyişiklik edən
            icralar dayanır.
          </p>
        </section>
        <section className="crmPanel">
          <h2>İcra və xəta tarixçəsi</h2>
          <Table
            rows={(data.runs || []).map((r: R) => ({
              Tarix: dt(r.createdAt),
              Status: r.data.status,
              Xəta: r.data.error || "—",
            }))}
          />
        </section>
      </>
    );
  if (section === "messages")
    return (
      <>
        <section className="crmPanel">
          <h2>İnteqrasiyalar</h2>
          {["email", "whatsapp", "instagram", "ai"].map((k) => (
            <p key={k}>
              <b>{k.toUpperCase()}</b>:{" "}
              {providers[k] === "CONFIGURED"
                ? "Konfiqurasiya edilib — nəticə göndəriş jurnalında görünür"
                : "Qoşulmayıb"}
            </p>
          ))}
          <p>
            Gələn e-poçt:{" "}
            {providers.emailInbox === "CONFIGURED"
              ? "hesab bağlanıb; sinxronizasiya fon işləri ilə aparılır"
              : "qoşulmayıb — Ayarlardan şirkətin poçtunu bağlayın"}
            . Mövcud admin poçtu avtomatik paylaşılmır. WhatsApp sərbəst mətn
            yalnız 24 saatlıq cavab pəncərəsində işləyir; şablon göndərişi
            qoşulmayıb.
          </p>
          <Table
            rows={(providers.logs || []).map((e: R) => ({
              Tarix: dt(e.createdAt),
              Kanal: e.data.channel,
              Vəziyyət: e.data.state,
              Xəta: e.data.message || "—",
            }))}
          />
        </section>
        {providers.ai === "CONFIGURED" && (
          <section className="crmPanel">
            <h2>AI yazışma köməkçisi</h2>
            <label>
              Müştəri axtar
              <input
                value={lookup}
                onChange={(e) => setLookup(e.target.value)}
              />
            </label>
            <Form
              fields={[
                {
                  key: "customerId",
                  label: "Müştəri",
                  required: true,
                  options: customers.map((c) => ({
                    value: c.id,
                    label: c.title,
                  })),
                },
              ]}
              label="Xülasə və cavab layihəsi hazırla"
              submit={async (b) => {
                if (
                  !confirm(
                    "İcazəniz daxilində görünən yazışmalar AI provayderinə göndəriləcək. Davam edirsiniz?",
                  )
                )
                  return;
                const r = await action("ai", { ...b, confirm: true });
                setDraft(r.draft);
              }}
            />
            <pre className="crmDraft">{draft}</pre>
            <p>
              AI yalnız layihə verir. Mesajın göndərilməsi ayrıca təsdiq tələb
              edir.
            </p>
          </section>
        )}
      </>
    );
  return null;
}

"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { api, Form, Table, dt, type R } from "./shared";
type Props = {
  section: string;
  meta: R;
  url: (s: string) => string;
  action: (s: string, b: R) => Promise<any>;
  writable: boolean;
  error: (s: string) => void;
};
export default function Advanced(p: Props) {
  if (p.section === "settings") return <Configuration {...p} />;
  if (p.section === "inbox") return <Inbox {...p} />;
  if (p.section === "imports") return <Importer {...p} />;
  if (p.section === "approvals") return <Approvals {...p} />;
  if (p.section === "booking") return <BookingSettings {...p} />;
  if (p.section === "portal") return <PortalRequests {...p} />;
  if (p.section === "trash") return <Trash {...p} />;
  if (p.section === "overview")
    return (
      <>
        <Overview {...p} />
        <AssistantPanel {...p} />
      </>
    );
  return null;
}
function Overview({ meta, url }: Props) {
  const [data, setData] = useState<R>({}),
    [error, setError] = useState("");
  useEffect(() => {
    if (meta.permissions.reports?.read !== "NONE")
      api(url("dashboard"))
        .then(setData)
        .catch((e) => setError(e.message));
  }, [meta.company.id]);
  const attention = data.attention || {};
  return (
    <>
      {error && <p className="crmError">{error}</p>}
      <section className="crmPanel">
        <h2>İstifadəyə başlamaq</h2>
        <p>
          Komandanızı dəvət edin, ilk müştərini əlavə edin və ya Excel-dən
          köçürün, sonra ilk satışınızı yaradın.
        </p>
        <div className="crmActions">
          <a href={"/workspace/" + meta.company.id + "?section=team"}>
            Komanda
          </a>
          <a href={"/workspace/" + meta.company.id + "?section=customers"}>
            Müştərilər
          </a>
          <a href={"/workspace/" + meta.company.id + "?section=imports"}>
            Excel / CSV importu
          </a>
          <Link href="/workspace/account">Giriş təhlükəsizliyi</Link>
        </div>
      </section>
      {data.attention && (
        <>
          <section className="crmPanel">
            <h2>Bu gün diqqət tələb edir</h2>
            <div className="crmCards">
              {[
                ["Cavab gözləyən", attention.counts?.unanswered],
                ["Gecikmiş tapşırıqlar", attention.counts?.overdue],
                ["7 gündür hərəkətsiz satışlar", attention.counts?.stalled],
              ].map(([label, value]) => (
                <div className="crmCard" key={String(label)}>
                  <small>{label}</small>
                  <strong>{value || 0}</strong>
                </div>
              ))}
            </div>
            <Table
              rows={(attention.stalled || []).slice(0, 10).map((e: R) => ({
                Satış: e.title,
                Mərhələ: e.stage,
                Son_hərəkət: dt(e.stageAt),
              }))}
            />
          </section>
          <section className="crmPanel">
            <h2>Mənbələr üzrə faktiki daxilolmalar</h2>
            <Table
              rows={(data.sources || []).map((r: R) => ({
                Mənbə: r.source,
                Valyuta: r.currency,
                Daxilolma: r.received,
                Ödəniş_sayı: r.payments,
              }))}
            />
          </section>
          <section className="crmPanel">
            <h2>Açıq satış potensialı</h2>
            <p>{data.forecast?.notice}</p>
            <Table
              rows={Object.entries(data.forecast?.amounts || {}).map(
                ([currency, value]) => ({ Valyuta: currency, Məbləğ: value }),
              )}
            />
          </section>
        </>
      )}
    </>
  );
}
function Configuration({ meta, url, action, writable }: Props) {
  const initial = meta.company.preferences || {},
    [config, setConfig] = useState<R>(initial),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const allowed = writable && meta.permissions.settings.update !== "NONE";
  async function save(value: R) {
    setError("");
    try {
      await action("preferences", value);
      setNotice("Ayarlar saxlanıldı.");
    } catch (e) {
      setError((e as Error).message);
    }
  }
  return (
    <>
      {error && <p className="crmError">{error}</p>}
      {notice && <p className="crmBanner">{notice}</p>}
      <ConnectionPanel
        meta={meta}
        url={url}
        action={action}
        writable={writable}
        section="settings"
        error={setError}
      />
      <section className="crmPanel">
        <h2>Fərdi məlumat sahələri</h2>
        <p>Sahələr seçilmiş bölmənin qeyd formasında görünür.</p>
        <Table
          rows={(config.fields || []).map((f: R) => ({
            Ad: f.label,
            Açar: f.key,
            Bölmə: f.kind,
            Tip: f.type,
            Tələb: f.required ? "Bəli" : "Xeyr",
            Əməliyyat: allowed ? (
              <button
                onClick={() => {
                  const fields = config.fields.filter(
                    (x: R) => x.key !== f.key,
                  );
                  save({ fields }).then(() =>
                    setConfig((c) => ({ ...c, fields })),
                  );
                }}
              >
                Sil
              </button>
            ) : (
              "—"
            ),
          }))}
        />
        {allowed && (
          <Form
            fields={[
              { key: "label", label: "Sahənin adı", required: true },
              {
                key: "key",
                label: "Unikal açar (məsələn service_interest)",
                required: true,
              },
              {
                key: "kind",
                label: "Bölmə",
                options: [
                  "customers",
                  "sales",
                  "tasks",
                  "calendar",
                  "quotes",
                ].map((x) => ({
                  value: x,
                  label: (
                    {
                      customers: "Müştərilər",
                      sales: "Satışlar",
                      tasks: "Tapşırıqlar",
                      calendar: "Təqvim",
                      quotes: "Təkliflər",
                    } as R
                  )[x],
                })),
              },
              {
                key: "type",
                label: "Tip",
                options: ["text", "number", "date", "select", "checkbox"].map(
                  (x) => ({ value: x, label: x }),
                ),
              },
              {
                key: "options",
                label: "Seçimlər (hər sətirdə bir seçim)",
                type: "textarea",
              },
              {
                key: "required",
                label: "Tələb olunsun?",
                options: [
                  { value: "false", label: "Xeyr" },
                  { value: "true", label: "Bəli" },
                ],
              },
            ]}
            label="Sahə əlavə et"
            submit={async (b) => {
              const fields = [
                ...(config.fields || []),
                {
                  ...b,
                  required: b.required === "true",
                  options: b.options.split("\n").filter(Boolean),
                },
              ];
              await action("preferences", { fields });
              setConfig((c) => ({ ...c, fields }));
            }}
          />
        )}
      </section>
      <section className="crmPanel">
        <h2>Satış prosesləri</h2>
        {(config.pipelines || []).map((x: R) => (
          <p key={x.id}>
            {x.name}: {x.stages.join(" → ")}{" "}
            {allowed && (
              <button
                onClick={() => {
                  const pipelines = config.pipelines.filter(
                    (v: R) => v.id !== x.id,
                  );
                  save({ pipelines }).then(() =>
                    setConfig((c) => ({ ...c, pipelines })),
                  );
                }}
              >
                Sil
              </button>
            )}
          </p>
        ))}
        {allowed && (
          <Form
            fields={[
              {
                key: "id",
                label: "Proses açarı (məsələn corporate)",
                required: true,
              },
              { key: "name", label: "Proses adı", required: true },
              {
                key: "stages",
                label: "Mərhələlər (hər sətirdə biri)",
                type: "textarea",
                required: true,
              },
            ]}
            label="Proses əlavə et"
            submit={async (b) => {
              const pipelines = [
                ...(config.pipelines || []),
                {
                  id: b.id,
                  name: b.name,
                  stages: b.stages.split("\n").filter(Boolean),
                },
              ];
              await action("preferences", { pipelines });
              setConfig((c) => ({ ...c, pipelines }));
            }}
          />
        )}
      </section>
      <section className="crmPanel">
        <h2>Mərhələyə keçid şərtləri</h2>
        {(config.gates || []).map((g: R, i: number) => (
          <p key={i}>
            {g.pipelineId} / {g.stage}: {g.fields.join(", ")}{" "}
            {allowed && (
              <button
                onClick={() => {
                  const gates = config.gates.filter(
                    (_: R, n: number) => n !== i,
                  );
                  save({ gates }).then(() =>
                    setConfig((c) => ({ ...c, gates })),
                  );
                }}
              >
                Sil
              </button>
            )}
          </p>
        ))}
        {allowed && (
          <Form
            fields={[
              {
                key: "pipelineId",
                label: "Satış prosesi",
                options: [
                  { value: "main", label: "Əsas satış" },
                  ...(config.pipelines || []).map((x: R) => ({
                    value: x.id,
                    label: x.name,
                  })),
                ],
              },
              { key: "stage", label: "Mərhələnin dəqiq adı", required: true },
              {
                key: "fields",
                label:
                  "Tələb olunan sahə açarları (vergüllə: customerId,nextStep,dueAt və ya fərdi sahə)",
                required: true,
              },
            ]}
            submit={async (b) => {
              const gates = [
                ...(config.gates || []),
                {
                  pipelineId: b.pipelineId,
                  stage: b.stage,
                  fields: b.fields
                    .split(",")
                    .map((x: string) => x.trim())
                    .filter(Boolean),
                },
              ];
              await action("preferences", { gates });
              setConfig((c) => ({ ...c, gates }));
            }}
          />
        )}
      </section>
      <section className="crmPanel">
        <h2>Təsdiq, sənəd və cavab ayarları</h2>
        <Form
          disabled={!allowed}
          fields={[
            {
              key: "approvalAbove",
              label:
                "Bu məbləğdən böyük təklif rəhbər təsdiqi tələb etsin (boş: bağlı)",
              type: "number",
            },
            {
              key: "approvalDiscount",
              label:
                "Bu məbləğdən böyük endirim təsdiq tələb etsin (boş: bağlı)",
              type: "number",
            },
            {
              key: "slaMinutes",
              label: "Cavab müddəti, dəqiqə",
              type: "number",
            },
            { key: "brandTitle", label: "PDF sənəd başlığı" },
            {
              key: "brandFooter",
              label: "PDF sənədin son qeydi",
              type: "textarea",
            },
          ]}
          values={{
            ...initial,
            slaMinutes: initial.slaMinutes || 30,
            brandTitle: initial.brand?.title,
            brandFooter: initial.brand?.footer,
          }}
          submit={(b) =>
            save({
              ...b,
              brand: { title: b.brandTitle, footer: b.brandFooter },
            })
          }
        />
        <h3>Hazır cavablar</h3>
        {(config.quickReplies || []).map((r: R, i: number) => (
          <p key={i}>
            {r.title}{" "}
            {allowed && (
              <button
                onClick={() => {
                  const quickReplies = config.quickReplies.filter(
                    (_: R, n: number) => n !== i,
                  );
                  save({ quickReplies }).then(() =>
                    setConfig((c) => ({ ...c, quickReplies })),
                  );
                }}
              >
                Sil
              </button>
            )}
          </p>
        ))}
        {allowed && (
          <Form
            fields={[
              { key: "title", label: "Cavab adı", required: true },
              {
                key: "body",
                label: "Cavab mətni",
                type: "textarea",
                required: true,
              },
            ]}
            label="Hazır cavab əlavə et"
            submit={async (b) => {
              const quickReplies = [...(config.quickReplies || []), b];
              await action("preferences", { quickReplies });
              setConfig((c) => ({ ...c, quickReplies }));
            }}
          />
        )}
      </section>
      <section className="crmPanel">
        <h2>Sahə üzrə başlanğıc</h2>
        <p>İş prosesinizə uyğun başlanğıc seçimi və faydalı sahə əlavə edin.</p>
        <Form
          disabled={!allowed}
          fields={[
            {
              key: "industryTemplate",
              label: "Fəaliyyət",
              options: [
                { value: "general", label: "Ümumi biznes" },
                { value: "clinic", label: "Klinika və həkim" },
                { value: "agency", label: "Agentlik" },
                { value: "services", label: "Xidmət biznesi" },
              ],
            },
          ]}
          values={initial}
          submit={async (b) => {
            const labels: R = {
              clinic: "Maraqlandığı xidmət",
              agency: "Layihə növü",
              services: "Xidmət istiqaməti",
              general: "Müştəri seqmenti",
            };
            const key = "service_interest";
            const fields = (config.fields || []).some((f: R) => f.key === key)
              ? config.fields
              : [
                  ...(config.fields || []),
                  {
                    key,
                    label: labels[b.industryTemplate],
                    kind: "customers",
                    type: "text",
                    required: false,
                    options: [],
                  },
                ];
            await action("preferences", {
              industryTemplate: b.industryTemplate,
              fields,
            });
            setConfig((c) => ({ ...c, fields }));
          }}
        />
      </section>
    </>
  );
}
function Importer({ url, writable, meta }: Props) {
  const [preview, setPreview] = useState<R | null>(null),
    [kind, setKind] = useState("customers"),
    [mapping, setMapping] = useState<R>({}),
    [results, setResults] = useState<R[]>([]),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [batch, setBatch] = useState("");
  async function commit() {
    if (!preview) return;
    setBusy(true);
    setError("");
    const collected = [];
    try {
      for (let i = 0; i < preview.rows.length; i += 25) {
        const out = await api(url("import"), {
          kind,
          mapping,
          rows: preview.rows.slice(i, i + 25),
          start: i,
          batchId: batch,
        });
        collected.push(...out.results);
        setResults([...collected]);
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="crmPanel">
      <h2>Excel / CSV-dən məlumat köçür</h2>
      <p>
        İlk sətir sütun başlıqları olmalıdır. Maksimum 2 MB / 1000 sətir.
        Uyğunluğu seçib önbaxışdan sonra təsdiqləyin. Eyni importu yenidən
        təsdiqləmək əvvəl uğurlu sətrləri təkrarlamır.
      </p>
      {error && <p className="crmError">{error}</p>}
      <label>
        Bölmə
        <select
          value={kind}
          onChange={(e) => {
            setKind(e.target.value);
            setPreview(null);
            setResults([]);
          }}
        >
          {["customers", "sales", "tasks"]
            .filter((k) => meta.permissions[k]?.create !== "NONE")
            .map((k) => (
              <option key={k} value={k}>
                {
                  (
                    {
                      customers: "Müştərilər",
                      sales: "Satışlar",
                      tasks: "Tapşırıqlar",
                    } as R
                  )[k]
                }
              </option>
            ))}
        </select>
      </label>
      <label>
        Fayl
        <input
          type="file"
          accept=".csv,.xlsx"
          disabled={!writable || busy}
          onChange={async (e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            setError("");
            setBusy(true);
            try {
              const r = await fetch(url("import-preview?kind=" + kind), {
                method: "POST",
                headers: { "x-filename": encodeURIComponent(f.name) },
                body: f,
              });
              const d = await r.json();
              if (!r.ok) throw Error(d.error);
              setPreview(d);
              setBatch(crypto.randomUUID());
              setResults([]);
              setMapping({ title: 0 });
            } catch (e) {
              setError((e as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        />
      </label>
      {preview && (
        <>
          <div className="crmFields">
            {[
              "title",
              ...(kind === "customers"
                ? ["email", "phone", "company", "person", "source", "tags"]
                : kind === "sales"
                  ? ["amount", "currency", "stage", "nextStep", "dueAt"]
                  : ["dueAt"]),
              "notes",
            ]
              .concat(
                (meta.company.preferences?.fields || [])
                  .filter((f: R) => f.kind === kind)
                  .map((f: R) => "custom." + f.key),
              )
              .map((field) => (
                <label key={field}>
                  {(
                    {
                      title: "Ad (tələb olunur)",
                      email: "E-poçt",
                      phone: "Telefon",
                      company: "Şirkət",
                      person: "Əlaqəli şəxs",
                      source: "Mənbə",
                      tags: "Etiketlər",
                      amount: "Məbləğ",
                      currency: "Valyuta",
                      stage: "Mərhələ",
                      nextStep: "Növbəti addım",
                      dueAt: "Son tarix",
                      notes: "Qeyd",
                    } as R
                  )[field] ||
                    (meta.company.preferences?.fields || []).find(
                      (f: R) => "custom." + f.key === field,
                    )?.label ||
                    field}
                  <select
                    value={mapping[field] ?? ""}
                    onChange={(e) =>
                      setMapping((m) => ({ ...m, [field]: e.target.value }))
                    }
                  >
                    <option value="">Köçürmə</option>
                    {preview.headers.map((h: string, i: number) => (
                      <option key={i} value={i}>
                        {h}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
          </div>
          <h3>İlk 10 sətir — cəmi {preview.rows.length}</h3>
          <Table
            rows={preview.rows
              .slice(0, 10)
              .map((row: string[]) =>
                Object.fromEntries(
                  preview.headers.map((h: string, i: number) => [
                    h + " (" + (i + 1) + ")",
                    row[i] || "",
                  ]),
                ),
              )}
          />
          <button
            className="crmPrimary"
            disabled={
              busy ||
              !writable ||
              mapping.title === undefined ||
              mapping.title === ""
            }
            onClick={() => {
              if (confirm("Seçilmiş məlumatları şirkətə əlavə edirsiniz?"))
                commit();
            }}
          >
            {busy ? "Köçürülür…" : "İmportu təsdiqlə"}
          </button>
        </>
      )}
      {results.length > 0 && (
        <>
          <p>
            Uğurlu: {results.filter((r) => r.ok).length} · Xəta:{" "}
            {results.filter((r) => !r.ok).length}
          </p>
          <Table
            rows={results.map((r) => ({
              Sətir: r.row,
              Nəticə: r.ok
                ? r.reused
                  ? "Əvvəl köçürülüb"
                  : "Əlavə edildi"
                : r.error,
            }))}
          />
        </>
      )}
    </section>
  );
}
function Trash({ url, action, writable }: Props) {
  const [rows, setRows] = useState<R[]>([]),
    [error, setError] = useState("");
  const load = () =>
    api(url("trash"))
      .then(setRows)
      .catch((e) => setError(e.message));
  useEffect(() => {
    load();
  }, []);
  return (
    <section className="crmPanel">
      <h2>Silinmiş qeydləri bərpa et</h2>
      {error && <p className="crmError">{error}</p>}
      <Table
        rows={rows.map((r) => ({
          Ad: r.title,
          Bölmə: r.kind,
          Silinib: dt(r.deletedAt),
          Əməliyyat: writable ? (
            <button
              onClick={async () => {
                try {
                  await action("restore", { id: r.id });
                  load();
                } catch (e) {
                  setError((e as Error).message);
                }
              }}
            >
              Bərpa et
            </button>
          ) : (
            "Yalnız baxış"
          ),
        }))}
      />
    </section>
  );
}
function Approvals({ url, action, writable, meta }: Props) {
  const [rows, setRows] = useState<R[]>([]),
    [quotes, setQuotes] = useState<R[]>([]),
    [error, setError] = useState("");
  const load = () =>
    Promise.all([
      api(url("approvals")).then(setRows),
      api(url("quotes")).then((d) => setQuotes(d.items)),
    ]).catch((e) => setError(e.message));
  useEffect(() => {
    load();
  }, []);
  return (
    <section className="crmPanel">
      <h2>Təklif təsdiqləri</h2>
      {error && <p className="crmError">{error}</p>}
      {writable && (
        <Form
          fields={[
            {
              key: "entryId",
              label: "Təklif",
              options: quotes.map((q) => ({
                value: q.id,
                label: q.title + " · " + q.amount + " " + q.currency,
              })),
              required: true,
            },
          ]}
          label="Təsdiq sorğusu göndər"
          submit={async (b) => {
            await action("approval", { ...b, action: "request" });
            await load();
          }}
        />
      )}
      <Table
        rows={rows.map((r) => ({
          Təklif: quotes.find((q) => q.id === r.entryId)?.title || r.entryId,
          Vəziyyət: r.status,
          Səbəb: r.reason || "—",
          Qərar:
            writable &&
            meta.permissions.settings.update !== "NONE" &&
            r.status === "PENDING" ? (
              <div className="crmActions">
                {["APPROVED", "REJECTED"].map((status) => (
                  <button
                    key={status}
                    onClick={async () => {
                      const reason = prompt("Qərarın səbəbini yazın");
                      if (!reason) return;
                      try {
                        await action("approval", {
                          action: "decide",
                          entryId: r.entryId,
                          status,
                          reason,
                        });
                        load();
                      } catch (e) {
                        setError((e as Error).message);
                      }
                    }}
                  >
                    {status === "APPROVED" ? "Təsdiqlə" : "Rədd et"}
                  </button>
                ))}
              </div>
            ) : (
              "—"
            ),
        }))}
      />
    </section>
  );
}
function BookingSettings({ url, action, meta, writable }: Props) {
  const [rows, setRows] = useState<R[]>([]),
    [error, setError] = useState(""),
    [days, setDays] = useState(["Mon", "Tue", "Wed", "Thu", "Fri"]);
  const load = () =>
    api(url("schedules"))
      .then(setRows)
      .catch((e) => setError(e.message));
  useEffect(() => {
    load();
  }, []);
  return (
    <section className="crmPanel">
      <h2>Rezervasiya səhifələri</h2>
      {error && <p className="crmError">{error}</p>}
      {rows.map((s) => (
        <article className="crmCard" key={s.id}>
          <h3>{s.title}</h3>
          <p>
            {s.duration} dəqiqə · {s.timezone} · {s.active ? "Aktiv" : "Bağlı"}
          </p>
          <a
            href={"/workspace/book/" + s.slug}
            target="_blank"
            rel="noreferrer"
          >
            Rezervasiya səhifəsini aç
          </a>
          {writable && meta.permissions.settings.update !== "NONE" && (
            <button
              onClick={async () => {
                await action("schedule", { ...s, active: !s.active });
                load();
              }}
            >
              {s.active ? "Dayandır" : "Aktivləşdir"}
            </button>
          )}
        </article>
      ))}
      {writable && meta.permissions.settings.update !== "NONE" && (
        <Form
          fields={[
            { key: "title", label: "Görüş / xidmət adı", required: true },
            {
              key: "assigneeId",
              label: "Məsul əməkdaş",
              options: meta.members.map((m: R) => ({
                value: m.id,
                label: m.user.email,
              })),
            },
            { key: "timezone", label: "Saat qurşağı", required: true },
            {
              key: "duration",
              label: "Müddət (dəqiqə)",
              type: "number",
              required: true,
            },
            { key: "buffer", label: "Görüşlər arası fasilə", type: "number" },
            {
              key: "leadHours",
              label: "Ən az neçə saat əvvəl?",
              type: "number",
            },
            { key: "horizonDays", label: "Neçə gün qabağa?", type: "number" },
            {
              key: "start",
              label: "İşin başlanması",
              type: "time",
              required: true,
            },
            { key: "end", label: "İşin bitməsi", type: "time", required: true },
          ]}
          values={{
            timezone: "Asia/Baku",
            duration: 30,
            buffer: 10,
            leadHours: 2,
            horizonDays: 30,
            start: "09:00",
            end: "18:00",
          }}
          label="Rezervasiya səhifəsi yarat"
          submit={async (b) => {
            await action("schedule", {
              ...b,
              availability: days.map((day) => ({
                day,
                start: b.start,
                end: b.end,
              })),
            });
            await load();
          }}
        >
          <fieldset>
            <legend>İş günləri</legend>
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d, i) => (
              <label key={d}>
                <input
                  type="checkbox"
                  checked={days.includes(d)}
                  onChange={(e) =>
                    setDays((ds) =>
                      e.target.checked ? [...ds, d] : ds.filter((x) => x !== d),
                    )
                  }
                />
                {["B.e.", "Ç.a.", "Ç.", "C.a.", "C.", "Ş.", "B."][i]}
              </label>
            ))}
          </fieldset>
        </Form>
      )}
    </section>
  );
}
function Inbox({ url, action, meta, writable }: Props) {
  const [threads, setThreads] = useState<R[]>([]),
    [selected, setSelected] = useState<R | null>(null),
    [conversation, setConversation] = useState<R | null>(null),
    [replies, setReplies] = useState<R[]>([]),
    [text, setText] = useState(""),
    [note, setNote] = useState(""),
    [lookup, setLookup] = useState(""),
    [customerOptions, setCustomerOptions] = useState<R[]>([]),
    [error, setError] = useState("");
  useEffect(() => {
    if (meta.permissions.customers?.read === "NONE") return;
    const timer = setTimeout(
      () =>
        api(url("customers?q=" + encodeURIComponent(lookup)))
          .then((d) => setCustomerOptions(d.items))
          .catch(() => {}),
      200,
    );
    return () => clearTimeout(timer);
  }, [lookup]);
  const load = () =>
    api(url("threads"))
      .then((d) => {
        setThreads(d.items);
        setReplies(d.quickReplies);
      })
      .catch((e) => setError(e.message));
  async function open(t: R) {
    setSelected(t);
    try {
      setConversation(await api(url("conversation/" + t.messageId)));
    } catch (e) {
      setError((e as Error).message);
    }
  }
  useEffect(() => {
    load();
    const timer = setInterval(load, 30000);
    return () => clearInterval(timer);
  }, []);
  async function act(b: R) {
    if (!selected) return;
    try {
      await action("inbox", { ...b, messageId: selected.messageId });
      await open(selected);
      await load();
    } catch (e) {
      setError((e as Error).message);
    }
  }
  return (
    <section className="crmPanel">
      <h2>Komanda yazışma mərkəzi</h2>
      {error && <p className="crmError">{error}</p>}
      <div className="crmInbox">
        <div className="crmThreadList">
          {threads.map((t) => (
            <button
              className={selected?.id === t.id ? "active" : ""}
              key={t.id}
              onClick={() => open(t)}
            >
              <b>{t.title}</b>
              <small>
                {t.channel} · {t.contact}
              </small>
              <span>{t.lastMessage}</span>
              {t.overdue && <strong>Cavab müddəti keçib</strong>}
            </button>
          ))}
          {!threads.length && (
            <p>
              Hələ yazışma yoxdur. Qoşulmuş kanallardan daxil olan mesajlar
              burada görünür.
            </p>
          )}
        </div>
        {conversation && selected && (
          <div>
            <div className="crmRow">
              <h3>{selected.contact}</h3>
              <span>{conversation.thread.status}</span>
            </div>
            {conversation.claimActive && (
              <p className="crmBanner">
                {meta.members.find(
                  (m: R) => m.id === conversation.thread.claimedBy,
                )?.user.email || "Əməkdaş"}{" "}
                cavab hazırlayır.
              </p>
            )}
            <div className="crmMessages">
              {conversation.messages.map((m: R) => (
                <article
                  className={
                    "crmBubble " + (m.status === "RECEIVED" ? "incoming" : "")
                  }
                  key={m.id}
                >
                  <small>
                    {m.status} · {new Date(m.createdAt).toLocaleString("az-AZ")}
                  </small>
                  <p>{m.data.body}</p>
                </article>
              ))}
            </div>
            {writable && meta.permissions.messages.update !== "NONE" && (
              <>
                <div className="crmActions">
                  <button onClick={() => act({ action: "claim" })}>
                    Cavab üçün götür (2 dəq.)
                  </button>
                  <button onClick={() => act({ action: "release" })}>
                    Burax
                  </button>
                  <select
                    aria-label="Yazışma vəziyyəti"
                    value={conversation.thread.status}
                    onChange={(e) =>
                      act({ action: "status", status: e.target.value })
                    }
                  >
                    {["OPEN", "WAITING", "CLOSED"].map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                  <select
                    aria-label="Yazışmanı təyin et"
                    value={conversation.thread.assigneeId || ""}
                    onChange={(e) =>
                      act({ action: "assign", assigneeId: e.target.value })
                    }
                  >
                    <option value="">Məsul əməkdaş</option>
                    {meta.members.map((m: R) => (
                      <option key={m.id} value={m.id}>
                        {m.user.email}
                      </option>
                    ))}
                  </select>
                </div>
                {!conversation.thread.customerId && (
                  <section>
                    <h4>Yazışmanı müştəri kartına bağlayın</h4>
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
                          options: customerOptions.map((c) => ({
                            value: c.id,
                            label: c.title,
                          })),
                        },
                      ]}
                      label="Müştəriyə bağla"
                      submit={(b) => act({ ...b, action: "link" })}
                    />
                  </section>
                )}
                <label>
                  Hazır cavab
                  <select
                    onChange={(e) =>
                      setText(replies[Number(e.target.value)]?.body || "")
                    }
                    defaultValue=""
                  >
                    <option value="">Seçin</option>
                    {replies.map((r, i) => (
                      <option key={i} value={i}>
                        {r.title}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Cavab
                  <textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                  />
                </label>
                <button
                  className="crmPrimary"
                  disabled={!text.trim() || !conversation.thread.customerId}
                  onClick={async () => {
                    if (
                      !confirm(
                        "Bu cavabı müştəriyə göndərməyi təsdiqləyirsiniz?",
                      )
                    )
                      return;
                    try {
                      const draft = await api(url("messages"), {
                        title: "Re: " + selected.title,
                        status: "DRAFT",
                        customerId: conversation.thread.customerId,
                        data: {
                          channel: selected.channel,
                          to: selected.contact,
                          body: text,
                        },
                      });
                      await action("send", { id: draft.id, confirm: true });
                      setText("");
                      await open(selected);
                      load();
                    } catch (e) {
                      setError((e as Error).message);
                    }
                  }}
                >
                  Cavabı təsdiqlə və göndər
                </button>
                <label>
                  Komanda üçün daxili qeyd
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                  />
                </label>
                <button
                  disabled={!note.trim()}
                  onClick={async () => {
                    await act({ action: "note", text: note });
                    setNote("");
                  }}
                >
                  Daxili qeyd əlavə et
                </button>
              </>
            )}
            <h4>Daxili qeydlər</h4>
            {conversation.notes.map((n: R) => (
              <p key={n.id}>{n.data.text}</p>
            ))}
          </div>
        )}
        {!conversation && (
          <p className="crmEmpty">
            Yazışmanı seçin: mesajlar, məsul əməkdaş və daxili qeydlər burada
            görünəcək.
          </p>
        )}
      </div>
    </section>
  );
}

function ConnectionPanel({ url, action, writable }: Props) {
  const [data, setData] = useState<R>({}),
    [jobs, setJobs] = useState<R[]>([]),
    [error, setError] = useState("");
  const load = () =>
    Promise.all([
      api(url("connections")).then(setData),
      api(url("queue")).then(setJobs),
    ]).catch((e) => setError(e.message));
  useEffect(() => {
    load();
  }, []);
  return (
    <section className="crmPanel">
      <h2>Poçt və təqvim hesabları</h2>
      <p>
        Yalnız bu şirkətə aid hesabı bağlayın. Poçt üçün Gmail/Outlook inbox və
        göndərmə, təqvim üçün rezervasiyaların paylaşılması və vaxt
        dəyişikliklərinin alınması nəzərdə tutulur.
      </p>
      {error && <p className="crmError">{error}</p>}
      {(data.items || []).map((c: R) => (
        <div className="crmRow" key={c.id}>
          <span>
            {c.provider} · {c.channel} · {c.email} ·{" "}
            {c.active ? "Qoşulub" : "Ayrılıb"}
          </span>
          {writable && c.active && (
            <>
              <button
                onClick={async () => {
                  try {
                    await action("sync-connection", { id: c.id });
                    load();
                  } catch (e) {
                    setError((e as Error).message);
                  }
                }}
              >
                İndi sinxronizasiya et
              </button>
              <button
                onClick={async () => {
                  if (!confirm("Bu bağlantını ayırırsınız?")) return;
                  try {
                    await action("connection", {
                      action: "disconnect",
                      id: c.id,
                    });
                    load();
                  } catch (e) {
                    setError((e as Error).message);
                  }
                }}
              >
                Ayır
              </button>
            </>
          )}
        </div>
      ))}
      {writable && (
        <div className="crmActions">
          {["google", "microsoft"].map((provider) => (
            <div key={provider}>
              <b>{provider === "google" ? "Google" : "Microsoft"}</b>
              {data.configured?.[provider] ? (
                ["MAIL", "CALENDAR"].map((channel) => (
                  <button
                    key={channel}
                    onClick={async () => {
                      try {
                        const r = await action("connection", {
                          provider,
                          channel,
                        });
                        location.href = r.url;
                      } catch (e) {
                        setError((e as Error).message);
                      }
                    }}
                  >
                    {channel === "MAIL" ? "Poçtu bağla" : "Təqvimi bağla"}
                  </button>
                ))
              ) : (
                <p>Provayder tətbiqi qurulmayıb.</p>
              )}
            </div>
          ))}
        </div>
      )}
      <h3>Fon işlərinin vəziyyəti</h3>
      <Table
        rows={jobs.map((j) => ({
          İş: j.kind,
          Vəziyyət: j.state,
          Vaxt: dt(j.runAt),
          Xəta: j.error || "—",
          Əməliyyat:
            writable && ["ERROR", "UNCERTAIN", "PAUSED"].includes(j.state) ? (
              <button
                onClick={async () => {
                  if (
                    !confirm(
                      "Xarici provayderdə nəticəni yoxladınız? Təkrar icra dublikat məktub yarada bilər.",
                    )
                  )
                    return;
                  try {
                    await action("retry-job", { id: j.id, confirm: true });
                    load();
                  } catch (e) {
                    setError((e as Error).message);
                  }
                }}
              >
                Yoxladım, yenidən icra et
              </button>
            ) : (
              "—"
            ),
        }))}
      />
    </section>
  );
}
function AssistantPanel({ meta, url, action, writable }: Props) {
  const [result, setResult] = useState<R | null>(null),
    [error, setError] = useState(""),
    [provider, setProvider] = useState("CHECKING");
  useEffect(() => {
    if (meta.permissions.messages?.read === "NONE") return;
    api(url("providers"))
      .then((p) => setProvider(p.ai))
      .catch(() => setProvider("NOT_CONNECTED"));
  }, [meta.company.id]);
  if (
    meta.permissions.reports?.read === "NONE" ||
    meta.permissions.messages?.read === "NONE"
  )
    return null;
  if (provider !== "CONFIGURED")
    return (
      <section className="crmPanel">
        <h2>İş köməkçisi</h2>
        <p>
          {provider === "CHECKING"
            ? "AI bağlantısı yoxlanılır…"
            : "AI provayderi qoşulmayıb. Serverdə şirkətə aid açar və model qurulduqdan sonra aktivləşir."}
        </p>
      </section>
    );
  return (
    <section className="crmPanel">
      <h2>İş köməkçisi</h2>
      <p>
        Görünən CRM məlumatlarından xülasə və növbəti addımlar. Məsələn: “Bu gün
        hansı müştərilərlə əlaqə saxlamalıyam?”
      </p>
      {error && <p className="crmError">{error}</p>}
      <Form
        disabled={!writable}
        fields={[
          {
            key: "question",
            label: "Sualınız",
            type: "textarea",
            required: true,
          },
        ]}
        label="AI köməkçisindən soruş"
        submit={async (b) => {
          if (
            !confirm(
              "İcazəniz daxilindəki qeydlərin məhdud nümunəsi AI provayderinə göndərilsin?",
            )
          )
            return;
          try {
            setResult(await action("assistant", { ...b, confirm: true }));
          } catch (e) {
            setError((e as Error).message);
          }
        }}
      />
      {result && (
        <>
          <pre>{result.text}</pre>
          <p>{result.notice}</p>
          <details>
            <summary>İstifadə olunan mənbələr</summary>
            {result.sources.map((s: R) => (
              <p key={s.id}>
                {s.kind} · {s.title} · {s.id}
              </p>
            ))}
          </details>
        </>
      )}
    </section>
  );
}

function PortalRequests({ url, action, writable, meta }: Props) {
  const [rows, setRows] = useState<R[]>([]),
    [error, setError] = useState("");
  const load = () =>
    api(url("portal-requests"))
      .then(setRows)
      .catch((e) => setError(e.message));
  useEffect(() => {
    load();
  }, []);
  return (
    <section className="crmPanel">
      <h2>Müştəri kabinetindən müraciətlər</h2>
      {error && <p className="crmError">{error}</p>}
      {rows.map((r) => (
        <article className="crmCard" key={r.id}>
          <p>
            {dt(r.createdAt)} · {r.data.status}
          </p>
          <h3>{r.data.message}</h3>
          {r.data.reply && <p>Cavabınız: {r.data.reply}</p>}
          {writable && meta.permissions.customers.update !== "NONE" && (
            <Form
              fields={[
                {
                  key: "reply",
                  label: "Müştərinin kabinetində görünəcək cavab",
                  type: "textarea",
                  required: true,
                },
              ]}
              label="Cavabı saxla"
              submit={async (b) => {
                await action("portal-request", { ...b, id: r.id });
                await load();
              }}
            />
          )}
        </article>
      ))}
      {!rows.length && <p>Yeni müraciət yoxdur.</p>}
    </section>
  );
}

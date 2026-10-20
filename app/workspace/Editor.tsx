"use client";
import { useEffect, useState } from "react";
import CustomerHistory from "./CustomerHistory";
import { api, Form, Modal, dt, type R, type Field } from "./shared";
const states: Record<string, string[]> = {
  customers: ["OPEN", "ACTIVE", "ARCHIVED"],
  sales: ["OPEN", "WON", "LOST"],
  tasks: ["OPEN", "IN_PROGRESS", "DONE"],
  calendar: ["OPEN", "DONE", "CANCELLED"],
  quotes: ["DRAFT", "SENT", "ACCEPTED", "REJECTED"],
  payments: ["RECORDED", "VOID"],
  messages: ["DRAFT", "SENT", "RECEIVED"],
};
export default function Editor({
  kind,
  item,
  meta,
  url,
  writable,
  close,
  saved,
}: {
  kind: string;
  item: R | null;
  meta: R;
  url: (s: string) => string;
  writable: boolean;
  close: () => void;
  saved: () => void;
}) {
  const [customers, setCustomers] = useState<R[]>([]),
    [sales, setSales] = useState<R[]>([]),
    [q, setQ] = useState(""),
    [error, setError] = useState(""),
    [files, setFiles] = useState<R[]>([]),
    [history, setHistory] = useState<R[]>([]),
    [pipelineId, setPipelineId] = useState(item?.pipelineId || "main"),
    [lines, setLines] = useState<R[]>(
      item?.data.lines || [{ name: "", quantity: 1, price: 0 }],
    );
  useEffect(() => {
    const t = setTimeout(() => {
      for (const [k, set] of [
        ["customers", setCustomers],
        ["sales", setSales],
      ] as const)
        if (meta.permissions[k]?.read !== "NONE")
          api(url(k + "?q=" + encodeURIComponent(q)))
            .then((d) => set(d.items))
            .catch(() => {});
    }, 200);
    return () => clearTimeout(t);
  }, [q]);
  async function refresh() {
    if (!item) return;
    setFiles(await api(url("files?id=" + item.id)));
    setHistory(await api(url("history?id=" + item.id)));
  }
  useEffect(() => {
    refresh().catch((e) => setError(e.message));
  }, []);
  const options = (a: string[]) => a.map((x) => ({ value: x, label: x })),
    members = meta.members.map((m: R) => ({
      value: m.id,
      label: m.user.email,
    }));
  const fields: Field[] = [
    { key: "title", label: "Ad / başlıq", required: true },
    { key: "status", label: "Status", options: options(states[kind]) },
    {
      key: "assigneeId",
      label: "Məsul əməkdaş",
      options: [{ value: "", label: "Seçilməyib" }, ...members],
    },
  ];
  if (kind === "customers")
    fields.push(
      { key: "email", label: "E-poçt", type: "email" },
      { key: "phone", label: "Telefon" },
      ...[
        "company|Şirkət",
        "person|Əlaqəli şəxs",
        "source|Mənbə",
        "tags|Etiketlər",
        "instagramId|Instagram alıcı ID-si (rəsmi API)",
      ].map((x) => ({
        key: "data." + x.split("|")[0],
        label: x.split("|")[1],
      })),
    );
  if (kind !== "customers")
    fields.push({
      key: "customerId",
      label: "Müştəri",
      options: [
        { value: "", label: "Seçilməyib" },
        ...(item?.customerId && !customers.some((x) => x.id === item.customerId)
          ? [{ value: item.customerId, label: "Seçilmiş müştəri" }]
          : []),
        ...customers.map((x) => ({ value: x.id, label: x.title })),
      ],
    });
  if (["tasks", "calendar", "quotes", "payments", "messages"].includes(kind))
    fields.push({
      key: "saleId",
      label: "Əlaqəli satış",
      required: kind === "payments",
      options: [
        { value: "", label: "Seçilməyib" },
        ...(item?.saleId && !sales.some((x) => x.id === item.saleId)
          ? [{ value: item.saleId, label: "Seçilmiş satış" }]
          : []),
        ...sales.map((x) => ({
          value: x.id,
          label: x.title + " · " + x.currency,
        })),
      ],
    });
  if (["sales", "quotes", "payments"].includes(kind)) {
    fields.push({
      key: "currency",
      label: "Valyuta",
      options: options(["AZN", "USD", "EUR", "TRY", "GBP"]),
    });
    if (kind !== "quotes")
      fields.push({
        key: "amount",
        label:
          kind === "payments" ? "Faktiki ödəniş" : "Razılaşdırılmış məbləğ",
        type: "number",
        required: true,
      });
  }
  if (["sales", "tasks", "calendar", "quotes", "payments"].includes(kind))
    fields.push({
      key: "dueAt",
      label:
        kind === "sales" ? "Gözlənilən bağlanma" : "Son tarix / görüş vaxtı",
      type: "datetime-local",
    });
  if (kind === "sales")
    fields.push(
      {
        key: "stage",
        label: "Mərhələ",
        options: options(
          pipelineId === "main"
            ? meta.company.stages
            : (meta.company.preferences?.pipelines || []).find(
                (p: R) => p.id === pipelineId,
              )?.stages || [],
        ),
      },
      { key: "data.nextStep", label: "Növbəti addım" },
      { key: "data.lossReason", label: "İtirilmə səbəbi" },
    );
  if (["tasks", "calendar"].includes(kind))
    fields.push(
      {
        key: "data.priority",
        label: "Prioritet",
        options: options(["NORMAL", "LOW", "HIGH", "URGENT"]),
      },
      { key: "data.reminderAt", label: "Xatırlatma", type: "datetime-local" },
    );
  if (kind === "payments")
    fields.push(
      { key: "data.reference", label: "Ödəniş istinadı", required: true },
      {
        key: "data.paidAt",
        label: "Faktiki ödəniş tarixi",
        type: "datetime-local",
      },
    );
  if (kind === "messages")
    fields.push(
      {
        key: "data.channel",
        label: "Kanal",
        options: options(["EMAIL", "WHATSAPP", "INSTAGRAM", "MESSENGER"]),
      },
      {
        key: "data.to",
        label: "Müştərinin e-poçtu / telefonu",
        required: true,
      },
      { key: "data.body", label: "Mesaj", type: "textarea", required: true },
    );
  if (kind === "calendar")
    fields.push({
      key: "data.durationMinutes",
      label: "Görüş müddəti (dəqiqə)",
      type: "number",
    });
  for (const f of (meta.company.preferences?.fields || []).filter(
    (f: R) => f.kind === kind,
  ))
    fields.push({
      key: "custom." + f.key,
      label: f.label,
      required: f.required,
      type:
        f.type === "select"
          ? undefined
          : f.type === "checkbox"
            ? undefined
            : f.type,
      options:
        f.type === "select"
          ? f.options.map((v: string) => ({ value: v, label: v }))
          : f.type === "checkbox"
            ? [
                { value: "false", label: "Xeyr" },
                { value: "true", label: "Bəli" },
              ]
            : undefined,
    });
  if (kind === "quotes")
    fields.push({
      key: "data.discount",
      label: "Endirim məbləği",
      type: "number",
    });
  fields.push({ key: "data.notes", label: "Qeydlər", type: "textarea" });
  const values: R = {
    ...item,
    status:
      item?.status ||
      (kind === "quotes" || kind === "messages"
        ? "DRAFT"
        : kind === "payments"
          ? "RECORDED"
          : "OPEN"),
    assigneeId: item?.assigneeId || meta.member?.id || "",
    currency: item?.currency || "AZN",
    stage: item?.stage || meta.company.stages[0],
  };
  for (const [k, v] of Object.entries(item?.data || {}))
    values["data." + k] = v;
  for (const [k, v] of Object.entries(item?.custom || {}))
    values["custom." + k] = v;
  for (const f of fields)
    if (f.type === "datetime-local" && values[f.key]) {
      const d = new Date(values[f.key]);
      values[f.key] = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16);
    }
  const editable =
    writable &&
    (!item || meta.permissions[kind]?.update !== "NONE") &&
    !item?.data.delivery;
  return (
    <Modal title={item ? "Qeyd detalları" : "Yeni qeyd"} close={close}>
      {error && <p className="crmError">{error}</p>}
      {kind !== "customers" && (
        <label>
          Əlaqəli müştəri / satış axtar
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Adla axtar…"
          />
        </label>
      )}
      <Form
        fields={fields}
        values={values}
        disabled={!editable}
        submit={async (b) => {
          const data: R = {},
            custom: R = {};
          for (const k of Object.keys(b))
            if (k.startsWith("custom.")) custom[k.slice(7)] = b[k];
          for (const k of Object.keys(b))
            if (k.startsWith("data.")) data[k.slice(5)] = b[k];
          if (kind === "quotes") data.lines = lines;
          data.portalVisible = b.portalVisible === "true";
          await api(url(kind + (item ? "/" + item.id : "")), {
            ...b,
            pipelineId,
            custom,
            version: item?.version,
            data,
            participants: (b.participants || "").split(",").filter(Boolean),
          });
          saved();
          close();
        }}
      >
        {kind === "sales" && (
          <label>
            Satış prosesi
            <select
              disabled={!editable}
              value={pipelineId}
              onChange={(e) => setPipelineId(e.target.value)}
            >
              <option value="main">Əsas satış</option>
              {(meta.company.preferences?.pipelines || []).map((p: R) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
        )}
        {["sales", "quotes", "payments", "tasks", "calendar"].includes(
          kind,
        ) && (
          <label>
            Müştərinin şəxsi kabinetində paylaş
            <select
              disabled={!editable}
              name="portalVisible"
              defaultValue={String(item?.data.portalVisible === true)}
            >
              <option value="false">Paylaşma</option>
              <option value="true">Paylaş</option>
            </select>
          </label>
        )}
        <label>
          Əlavə iştirakçılar (Ctrl ilə çox seçim)
          <select
            multiple
            disabled={!editable}
            defaultValue={item?.participants || []}
            onChange={(e) => {
              const form = e.currentTarget.form;
              const hidden = form?.elements.namedItem(
                "participants",
              ) as HTMLInputElement;
              if (hidden)
                hidden.value = Array.from(e.currentTarget.selectedOptions)
                  .map((o) => o.value)
                  .join(",");
            }}
          >
            {members.map((m: R) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
          <input
            type="hidden"
            name="participants"
            defaultValue={(item?.participants || []).join(",")}
          />
        </label>
        {kind === "quotes" && (
          <section>
            <h3>Məhsul / xidmətlər</h3>
            {lines.map((l, i) => (
              <div className="crmLine" key={i}>
                {["name", "quantity", "price"].map((k, j) => (
                  <label key={k}>
                    {["Ad", "Say", "Vahid qiymət"][j]}
                    <input
                      required
                      type={k === "name" ? "text" : "number"}
                      min="0"
                      step="0.01"
                      disabled={!editable}
                      value={l[k]}
                      onChange={(e) =>
                        setLines((a) =>
                          a.map((x, n) =>
                            n === i
                              ? {
                                  ...x,
                                  [k]:
                                    k === "name"
                                      ? e.target.value
                                      : Number(e.target.value),
                                }
                              : x,
                          ),
                        )
                      }
                    />
                  </label>
                ))}
                {editable && (
                  <button
                    type="button"
                    disabled={lines.length === 1}
                    onClick={() => setLines((a) => a.filter((_, n) => n !== i))}
                  >
                    Sil
                  </button>
                )}
              </div>
            ))}
            {editable && (
              <button
                type="button"
                onClick={() =>
                  setLines((a) => [...a, { name: "", quantity: 1, price: 0 }])
                }
              >
                Sətir əlavə et
              </button>
            )}
            <p>
              Endirimdən əvvəl:{" "}
              {lines.reduce((s, l) => s + l.quantity * l.price, 0).toFixed(2)}
            </p>
          </section>
        )}
      </Form>
      {item && (
        <section>
          <h3>Fayllar</h3>
          <p>
            Fayl kabinetdə yalnız ayrıca paylaşım açıldıqda və əlaqəli qeyd də
            paylaşıldıqda görünür.
          </p>
          {files.map((f) => (
            <div className="crmRow" key={f.id}>
              <a href={url("files/" + f.id)}>
                {f.name} · {Math.ceil(f.size / 1024)} KB
              </a>
              {editable && (
                <button
                  onClick={async () => {
                    try {
                      await api(url("file-sharing"), {
                        id: f.id,
                        visible: !f.portalVisible,
                      });
                      await refresh();
                    } catch (e) {
                      setError((e as Error).message);
                    }
                  }}
                >
                  {f.portalVisible
                    ? "Kabinetdə paylaşımı bağla"
                    : "Kabinetdə paylaş"}
                </button>
              )}
              {editable && (
                <button
                  onClick={async () => {
                    try {
                      await api(url("delete-file"), { id: f.id });
                      await refresh();
                    } catch (e) {
                      setError((e as Error).message);
                    }
                  }}
                >
                  Sil
                </button>
              )}
            </div>
          ))}
          {editable && (
            <label>
              Fayl yüklə (maksimum 10 MB)
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp,application/pdf,text/plain"
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  try {
                    const r = await fetch(url("upload?id=" + item.id), {
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
                    setError((e as Error).message);
                  }
                }}
              />
            </label>
          )}
          <h3>Fəaliyyət tarixçəsi</h3>
          {history.map((h) => (
            <p key={h.id}>
              {dt(h.createdAt)} · {h.data.action} · {h.actorType}
            </p>
          ))}
        </section>
      )}
      {item && kind === "customers" && (
        <CustomerHistory
          id={item.id}
          url={url}
          writable={editable}
          canMerge={meta.member?.role === "OWNER" || meta.support === "WRITE"}
          onMerged={() => {
            saved();
            close();
          }}
        />
      )}
    </Modal>
  );
}

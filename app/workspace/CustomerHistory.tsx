"use client";
import { useEffect, useState } from "react";
import { api, Form, Table, dt, type R } from "./shared";
export default function CustomerHistory({
  id,
  url,
  writable,
  canMerge,
  onMerged,
}: {
  id: string;
  url: (s: string) => string;
  writable: boolean;
  canMerge: boolean;
  onMerged: () => void;
}) {
  const [data, setData] = useState<R>({}),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [q, setQ] = useState(""),
    [targets, setTargets] = useState<R[]>([]);
  useEffect(() => {
    if (!canMerge) return;
    const timer = setTimeout(
      () =>
        api(url("customers?q=" + encodeURIComponent(q)))
          .then((d) => setTargets(d.items.filter((e: R) => e.id !== id)))
          .catch(() => {}),
      200,
    );
    return () => clearTimeout(timer);
  }, [q]);
  useEffect(() => {
    api(url("timeline/" + id))
      .then(setData)
      .catch((e) => setError(e.message));
  }, [id]);
  return (
    <section>
      <h3>Müştərinin bütün tarixçəsi</h3>
      {error && <p className="crmError">{error}</p>}
      <Table
        rows={(data.records || [])
          .filter((r: R) => r.id !== id)
          .map((r: R) => ({
            Bölmə: r.kind,
            Ad: r.title,
            Vəziyyət: r.status,
            Son_yenilənmə: dt(r.updatedAt),
          }))}
      />
      {(data.records || [])
        .filter((r: R) => r.id !== id)
        .map((r: R) => (
          <details key={r.id}>
            <summary>
              {r.kind} · {r.title} · {r.status}
            </summary>
            {r.kind === "messages" && (
              <p style={{ whiteSpace: "pre-wrap" }}>{r.data.body}</p>
            )}
            {["sales", "quotes", "payments"].includes(r.kind) && (
              <p>
                {r.amount} {r.currency}
              </p>
            )}
            {r.data.notes && (
              <p style={{ whiteSpace: "pre-wrap" }}>{r.data.notes}</p>
            )}
          </details>
        ))}
      <h3>Əlaqəli fəaliyyətlər</h3>
      {(data.events || []).map((e: R) => (
        <p key={e.id}>
          {dt(e.createdAt)} · {e.data.action || e.data.text} · {e.actorType}
        </p>
      ))}
      {writable && (
        <>
          <h3>Müştərinin şəxsi kabineti</h3>
          <p>
            Müştəri mövcud hesabı ilə daxil olur. Yalnız ayrıca paylaşdığınız
            qeydlər görünür.
          </p>
          <div className="crmActions">
            <button
              onClick={async () => {
                try {
                  const r = await api(url("portal-invite"), { customerId: id });
                  setNotice(r.notice || "Dəvət hazırlandı.");
                } catch (e) {
                  setError((e as Error).message);
                }
              }}
            >
              Kabinet dəvəti göndər
            </button>
            <button
              onClick={async () => {
                if (!confirm("Bu müştərinin kabinet girişini dayandırırsınız?"))
                  return;
                try {
                  await api(url("portal-invite"), {
                    customerId: id,
                    revoke: true,
                  });
                  setNotice("Kabinet girişi dayandırıldı.");
                } catch (e) {
                  setError((e as Error).message);
                }
              }}
            >
              Kabinet girişini dayandır
            </button>
          </div>
          {notice && <p className="crmBanner">{notice}</p>}
          {canMerge && (
            <section>
              <h3>Dublikat müştəriləri birləşdir</h3>
              <p>
                Bu kartın əlaqəli qeydləri seçəcəyiniz müştəriyə ötürülür. Bu
                kart tarixçə ilə saxlanılaraq silinmiş vəziyyətə keçir; onun
                kabinet girişi dayandırılır.
              </p>
              <label>
                Saxlanılacaq müştərini axtar
                <input value={q} onChange={(e) => setQ(e.target.value)} />
              </label>
              <Form
                fields={[
                  {
                    key: "targetId",
                    label: "Saxlanılacaq müştəri",
                    required: true,
                    options: targets.map((t) => ({
                      value: t.id,
                      label: t.title,
                    })),
                  },
                  {
                    key: "confirm",
                    label: "Saxlanılacaq müştərinin adını yazın",
                    required: true,
                  },
                ]}
                label="Birləşdirməni təsdiqlə"
                submit={async (b) => {
                  await api(url("merge-customer"), { ...b, sourceId: id });
                  onMerged();
                }}
              />
            </section>
          )}
        </>
      )}
    </section>
  );
}

"use client";
import { useEffect, useState, use } from "react";
import Link from "next/link";
import { api, Form, type R } from "../../shared";
export default function Book({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params),
    [day, setDay] = useState(new Date().toISOString().slice(0, 10)),
    [data, setData] = useState<R | null>(null),
    [mine, setMine] = useState<R[]>([]),
    [selected, setSelected] = useState(""),
    [moving, setMoving] = useState(""),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [key, setKey] = useState("");
  const base = "/api/workspace-booking/" + encodeURIComponent(slug);
  async function load() {
    try {
      setData(await api(base + "?day=" + day));
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
    api(base + "?mine=1")
      .then(setMine)
      .catch(() => {});
  }
  useEffect(() => {
    load();
    setKey(crypto.randomUUID());
  }, [day]);
  const format = (v: string) =>
    new Date(v).toLocaleString("az-AZ", { timeZone: data?.schedule.timezone });
  return (
    <main className="crmScope crmHome">
      <Link href="/">NEW ERA</Link>
      <header>
        <small>REZERVASİYA</small>
        <h1>{data?.schedule.title || "Görüş vaxtı seçin."}</h1>
        <p>
          {data?.schedule.company} · {data?.schedule.duration} dəqiqə · Saat
          qurşağı: {data?.schedule.timezone}
        </p>
      </header>
      {error && <p className="crmError">{error}</p>}
      {notice && <p className="crmBanner">{notice}</p>}
      <section className="crmPanel">
        <p>
          Rezervasiyanı təsdiqləmək üçün e-poçtu təsdiqlənmiş mövcud
          hesabınızdan istifadə edin.
        </p>
        <div className="crmActions">
          <Link
            href={
              "/login?next=" + encodeURIComponent("/workspace/book/" + slug)
            }
          >
            Daxil ol
          </Link>
          <Link
            href={
              "/register?next=" + encodeURIComponent("/workspace/book/" + slug)
            }
          >
            Hesab yarat
          </Link>
        </div>
        <label>
          Tarix
          <input
            type="date"
            value={day}
            onChange={(e) => {
              setDay(e.target.value);
              setSelected("");
            }}
          />
        </label>
        <div className="crmSlots">
          {data?.slots.map((s: string) => (
            <button
              className={selected === s ? "crmPrimary" : ""}
              key={s}
              onClick={() => setSelected(s)}
            >
              {new Date(s).toLocaleTimeString("az-AZ", {
                timeZone: data.schedule.timezone,
                hour: "2-digit",
                minute: "2-digit",
              })}
            </button>
          ))}
        </div>
        {data && !data.slots.length && <p>Bu tarixdə uyğun vaxt yoxdur.</p>}
        {selected && (
          <Form
            fields={[{ key: "name", label: "Ad və soyad", required: true }]}
            label={
              moving ? "Vaxt dəyişikliyini təsdiqlə" : "Rezervasiyanı təsdiqlə"
            }
            submit={async (b) => {
              await api(base, {
                ...b,
                startsAt: selected,
                requestKey: key,
                bookingId: moving || undefined,
              });
              setNotice("Rezervasiya təsdiqləndi: " + format(selected));
              setSelected("");
              setMoving("");
              setKey(crypto.randomUUID());
              await load();
            }}
          />
        )}
      </section>
      {mine.length > 0 && (
        <section className="crmPanel">
          <h2>Rezervasiyalarım</h2>
          {mine.map((b) => (
            <article className="crmCard" key={b.id}>
              <h3>{b.title}</h3>
              <p>
                {format(b.startsAt)} · {b.status}
              </p>
              {b.status === "CONFIRMED" && (
                <div className="crmActions">
                  <button
                    onClick={() => {
                      setMoving(b.id);
                      setNotice("Yeni tarix və vaxt seçin.");
                      setKey(crypto.randomUUID());
                    }}
                  >
                    Vaxtı dəyiş
                  </button>
                  <button
                    onClick={async () => {
                      if (!confirm("Rezervasiyanı ləğv edirsiniz?")) return;
                      try {
                        await api(base, {
                          action: "cancel",
                          bookingId: b.id,
                          requestKey: crypto.randomUUID(),
                        });
                        await load();
                      } catch (e) {
                        setError((e as Error).message);
                      }
                    }}
                  >
                    Ləğv et
                  </button>
                </div>
              )}
            </article>
          ))}
        </section>
      )}
    </main>
  );
}

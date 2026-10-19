"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { api, Form, Table, dt, type R } from "../shared";
export default function Portal() {
  const [list, setList] = useState<R[]>([]),
    [selected, setSelected] = useState(""),
    [data, setData] = useState<R | null>(null),
    [token, setToken] = useState(""),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const load = () =>
    api("/api/workspace-portal")
      .then(setList)
      .catch((e) => setError(e.message));
  useEffect(() => {
    setToken(new URLSearchParams(location.search).get("token") || "");
    load();
  }, []);
  async function open(id: string) {
    setSelected(id);
    try {
      setData(
        await api("/api/workspace-portal?accessId=" + encodeURIComponent(id)),
      );
    } catch (e) {
      setError((e as Error).message);
    }
  }
  async function action(b: R) {
    const r = await api("/api/workspace-portal", { ...b, accessId: selected });
    await open(selected);
    return r;
  }
  return (
    <main className="crmScope crmHome">
      <Link href="/">NEW ERA</Link>
      <header>
        <small>MÜŞTƏRİ KABİNETİ</small>
        <h1>İşləriniz bir yerdə.</h1>
        <p>
          Şirkətin sizinlə paylaşdığı təklifləri, işləri və ödənişləri izləyin.
        </p>
      </header>
      {error && <p className="crmError">{error}</p>}
      {notice && <p className="crmBanner">{notice}</p>}
      <div className="crmActions">
        <Link
          href={
            "/login?next=" +
            encodeURIComponent(
              "/workspace/portal" + (token ? "?token=" + token : ""),
            )
          }
        >
          Hesaba daxil ol
        </Link>
        <Link
          href={
            "/register?next=" +
            encodeURIComponent(
              "/workspace/portal" + (token ? "?token=" + token : ""),
            )
          }
        >
          Hesab yarat
        </Link>
      </div>
      {token && (
        <section className="crmPanel">
          <h2>Kabinet dəvətini qəbul et</h2>
          <p>
            Dəvətin göndərildiyi e-poçtla təsdiqlənmiş hesabınıza daxil olun.
          </p>
          <button
            className="crmPrimary"
            onClick={async () => {
              try {
                await api("/api/workspace-portal", { action: "accept", token });
                setToken("");
                history.replaceState(null, "", "/workspace/portal");
                await load();
                setNotice("Dəvət qəbul edildi.");
              } catch (e) {
                setError((e as Error).message);
              }
            }}
          >
            Dəvəti qəbul edirəm
          </button>
        </section>
      )}
      <div className="crmCards">
        {list.map((a) => (
          <button className="crmCard" key={a.id} onClick={() => open(a.id)}>
            <h2>{a.company.name}</h2>
            <span>Kabinetə daxil ol</span>
          </button>
        ))}
      </div>
      {data && (
        <>
          <section className="crmPanel">
            <h2>
              {data.company.name} · {data.customer.title}
            </h2>
            <Table
              rows={data.records.map((r: R) => ({
                Bölmə: r.kind,
                Ad: r.title,
                Vəziyyət: r.status,
                Məbləğ: ["quotes", "payments", "sales"].includes(r.kind)
                  ? r.amount + " " + r.currency
                  : "—",
                Tarix: dt(r.dueAt),
                Sənəd:
                  r.kind === "quotes" ? (
                    <a
                      href={
                        "/api/workspace-portal?accessId=" +
                        selected +
                        "&pdfId=" +
                        r.id
                      }
                    >
                      PDF
                    </a>
                  ) : (
                    "—"
                  ),
                Əməliyyat:
                  r.kind === "quotes" && r.status === "SENT" ? (
                    <div className="crmActions">
                      {["ACCEPTED", "REJECTED"].map((status) => (
                        <button
                          key={status}
                          onClick={async () => {
                            if (
                              !confirm(
                                status === "ACCEPTED"
                                  ? "Təklifi qəbul edirsiniz?"
                                  : "Təklifi rədd edirsiniz?",
                              )
                            )
                              return;
                            try {
                              await action({
                                action: "quote",
                                entryId: r.id,
                                version: r.version,
                                status,
                                confirm: true,
                              });
                              setNotice("Qərarınız saxlanıldı.");
                            } catch (e) {
                              setError((e as Error).message);
                            }
                          }}
                        >
                          {status === "ACCEPTED" ? "Qəbul et" : "Rədd et"}
                        </button>
                      ))}
                    </div>
                  ) : (
                    "—"
                  ),
              }))}
            />
          </section>
          <section className="crmPanel">
            <h2>Sənədlər və fayllar</h2>
            {(data.files || []).map((f: R) => (
              <p key={f.id}>
                <a
                  href={
                    "/api/workspace-portal?accessId=" +
                    selected +
                    "&fileId=" +
                    f.id
                  }
                >
                  {f.name}
                </a>
              </p>
            ))}
            <Form
              fields={[
                {
                  key: "entryId",
                  label: "Əlaqəli iş / təklif",
                  required: true,
                  options: data.records.map((r: R) => ({
                    value: r.id,
                    label: r.title,
                  })),
                },
              ]}
              label="Faylı yüklə"
              submit={async (b) => {
                const input = document.getElementById(
                  "portal-upload",
                ) as HTMLInputElement;
                const f = input.files?.[0];
                if (!f) throw Error("Fayl seçin.");
                const r = await fetch(
                  "/api/workspace-portal?upload=1&accessId=" +
                    selected +
                    "&entryId=" +
                    encodeURIComponent(b.entryId),
                  {
                    method: "POST",
                    headers: {
                      "Content-Type": f.type,
                      "x-filename": encodeURIComponent(f.name),
                    },
                    body: f,
                  },
                );
                const d = await r.json();
                if (!r.ok) throw Error(d.error);
                await open(selected);
                setNotice("Fayl yükləndi.");
              }}
            >
              <label>
                Fayl (maksimum 10 MB)
                <input
                  id="portal-upload"
                  type="file"
                  accept="image/png,image/jpeg,image/webp,application/pdf,text/plain"
                  required
                />
              </label>
            </Form>
          </section>
          <section className="crmPanel">
            <h2>Dəstək müraciəti</h2>
            <Form
              fields={[
                {
                  key: "message",
                  label: "Mesajınız",
                  type: "textarea",
                  required: true,
                },
              ]}
              label="Müraciət göndər"
              submit={async (b) => {
                await action({ ...b, action: "support" });
                setNotice("Müraciətiniz göndərildi.");
              }}
            />
            {data.requests.map((r: R) => (
              <p key={r.id}>
                {r.data.message} · {r.data.status}
                {r.data.reply && <span> · Cavab: {r.data.reply}</span>}
              </p>
            ))}
          </section>
        </>
      )}
    </main>
  );
}

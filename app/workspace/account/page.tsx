"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { api, Form, dt, type R } from "../shared";
import { safeNext } from "@/lib/crm/policy";
export default function Account() {
  const [data, setData] = useState<R | null>(null),
    [setup, setSetup] = useState<R | null>(null),
    [codes, setCodes] = useState<string[]>([]),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const load = () =>
    api("/api/workspace-account")
      .then(setData)
      .catch((e) => setError(e.message));
  useEffect(() => {
    load();
  }, []);
  async function action(b: R) {
    const r = await api("/api/workspace-account", b);
    await load();
    return r;
  }
  return (
    <main className="crmScope crmHome">
      <Link href="/workspace">← Workspace</Link>
      <header>
        <small>NEW ERA WORKSPACE</small>
        <h1>Giriş təhlükəsizliyi.</h1>
        <p>
          İki mərhələli təsdiq Workspace və CRM-ə girişi qoruyur. Mövcud sayt
          hesabınız istifadə olunur.
        </p>
      </header>
      {error && <p className="crmError">{error}</p>}
      {notice && <p className="crmBanner">{notice}</p>}
      {data && (
        <>
          <section className="crmPanel">
            <h2>Authenticator ilə təsdiq</h2>
            <p>Vəziyyət: {data.enabled ? "Aktiv" : "Aktiv deyil"}</p>
            {!data.configured && (
              <p>
                Serverdə şifrələmə açarı qurulmalıdır. Hazırda aktivləşdirmə
                bağlıdır.
              </p>
            )}
            {data.enabled && !data.verified && (
              <Form
                fields={[
                  {
                    key: "code",
                    label: "Authenticator kodu və ya bərpa kodu",
                    required: true,
                  },
                ]}
                label="Təsdiqlə"
                submit={async (b) => {
                  await action({ ...b, action: "challenge" });
                  const next = safeNext(
                    new URLSearchParams(location.search).get("next"),
                  );
                  location.href = next || "/workspace";
                }}
              />
            )}
            {data.configured && !data.enabled && !setup && (
              <Form
                fields={[
                  {
                    key: "password",
                    label: "Cari şifrəniz",
                    type: "password",
                    required: true,
                  },
                ]}
                label="İki mərhələli təsdiqi qur"
                submit={async (b) => {
                  setSetup(await action({ ...b, action: "setup" }));
                }}
              />
            )}
            {setup && (
              <>
                <p>
                  Authenticator tətbiqində yeni hesabı bu açarla əlavə edin.
                  Açarı başqaları ilə paylaşmayın.
                </p>
                <code className="crmSecret">{setup.secret}</code>
                <Form
                  fields={[
                    {
                      key: "code",
                      label: "Tətbiqdə görünən 6 rəqəmli kod",
                      required: true,
                    },
                  ]}
                  label="Aktivləşdir"
                  submit={async (b) => {
                    const r = await action({ ...b, action: "enable" });
                    setCodes(r.recoveryCodes || []);
                    setSetup(null);
                  }}
                />
              </>
            )}
            {codes.length > 0 && (
              <div className="crmBanner">
                <p>
                  Bərpa kodlarını təhlükəsiz yerdə saxlayın. Hər biri yalnız bir
                  dəfə istifadə edilir.
                </p>
                <pre>{codes.join("\n")}</pre>
                <button onClick={() => setCodes([])}>Saxladım</button>
              </div>
            )}
            {data.enabled && data.verified && (
              <Form
                fields={[
                  {
                    key: "password",
                    label: "Cari şifrəniz",
                    type: "password",
                    required: true,
                  },
                ]}
                label="İki mərhələli təsdiqi dayandır"
                submit={async (b) => {
                  if (
                    confirm(
                      "Workspace üçün əlavə giriş qorumasını dayandırırsınız?",
                    )
                  )
                    await action({ ...b, action: "disable" });
                }}
              />
            )}
          </section>
          <section className="crmPanel">
            <h2>Aktiv giriş sessiyaları</h2>
            <p>Bu sessiyalar eyni sayt hesabınıza aiddir.</p>
            {data.sessions.map((s: R) => (
              <div className="crmRow" key={s.id}>
                <span>
                  {s.current ? "Bu sessiya" : "Digər sessiya"} ·{" "}
                  {dt(s.createdAt)} · Bitir: {dt(s.expiresAt)}
                </span>
                {!s.current && (
                  <Form
                    fields={[
                      {
                        key: "password",
                        label: "Şifrə",
                        type: "password",
                        required: true,
                      },
                    ]}
                    label="Sessiyanı bağla"
                    submit={async (b) => {
                      await action({ ...b, action: "revoke", sessionId: s.id });
                      setNotice("Sessiya bağlandı.");
                    }}
                  />
                )}
              </div>
            ))}
          </section>
        </>
      )}
    </main>
  );
}

"use client";
import { useEffect, useState } from "react";
import { Instagram, ArrowLeft } from "lucide-react";
import { instagramRequest, instagramState } from "../SalesInstagram";
export default function InstagramSettings() {
  const [data, setData] = useState<any>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [checked, setChecked] = useState(false),
    [notice, setNotice] = useState("");
  async function load() {
    const q = new URLSearchParams(window.location.search),
      attempt = q.get("attempt");
    if (q.get("error"))
      setError(
        "Instagram qoşulması tamamlanmadı. Aktiv Super Admin sessiyası ilə yenidən başladın.",
      );
    const d = await instagramRequest(
      undefined,
      attempt ? "?attempt=" + encodeURIComponent(attempt) : "",
    );
    setData(d);
  }
  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, []);
  async function action(kind: string) {
    setBusy(true);
    setError("");
    try {
      if (
        kind === "disconnect" &&
        !window.confirm(
          "Platformanın Instagram bağlantısını kəsmək istəyirsiniz?",
        )
      )
        return;
      const d = await instagramRequest({
        action: kind,
        attempt: data?.pending?.id,
        confirm: true,
      });
      if (d.url) {
        window.location.assign(d.url);
        return;
      }
      window.history.replaceState(null, "", "/admin/sales-instagram");
      await load();
      setNotice(
        kind === "disconnect"
          ? "Bağlantı kəsildi."
          : "Instagram hesabı qoşuldu. Yazışmalar yalnız yeni mesaj webhook-u gələndən sonra görünəcək.",
      );
      setChecked(false);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="siSettings">
      <a className="siBack" href="/admin?section=sales&salesView=offers">
        <ArrowLeft size={15} /> Satışlara qayıt
      </a>
      <div className="siSettingsCard">
        <Instagram size={32} />
        <h1>Admin Instagram bağlantısı</h1>
        <p>
          NEW ERA-nın öz hesabından onlayn təklif linkləri göndərmək üçündür.
          Müştəri Workspace-lərinin hesabları və mesajları burada istifadə
          edilmir.
        </p>
        {error && (
          <p className="siError" role="alert">
            {error}
          </p>
        )}
        {notice && (
          <p className="siNotice" role="status">
            {notice}
          </p>
        )}
        {!data ? (
          <p>Yoxlanır…</p>
        ) : (
          <>
            <h2>
              {data.account ? data.account.displayName : "Hesab qoşulmayıb"}
            </h2>
            {data.account && (
              <>
                <p>Vəziyyət: {instagramState(data.account.state)}</p>
                <p>
                  Tokenin bitmə tarixi:{" "}
                  {new Date(data.account.expiresAt).toLocaleString("az-AZ", {
                    timeZone: "Asia/Baku",
                  })}
                </p>
                <p>
                  Son daxil olan webhook mesajı:{" "}
                  {data.account.lastWebhookAt
                    ? new Date(data.account.lastWebhookAt).toLocaleString(
                        "az-AZ",
                        { timeZone: "Asia/Baku" },
                      )
                    : "hələ yoxdur"}
                </p>
              </>
            )}
            {!data.canManage ? (
              <p>
                Hesabı qoşmaq və ayırmaq üçün platformanın Super Admin-i daxil
                olmalıdır.
              </p>
            ) : !data.configured ? (
              <div className="siWarning">
                <strong>Server ayarları tamamlanmayıb</strong>
                <p>{data.missing.join(", ")}</p>
                <p>
                  Platforma satışları üçün ayrıca Instagram tətbiqi tələb
                  olunur. Quraşdırma təlimatındakı callback və webhook
                  ünvanlarını həmin Meta tətbiqində qeyd edin.
                </p>
              </div>
            ) : data.pending ? (
              <div className="siPending">
                <h3>Bu hesabı platformaya qoşaq?</h3>
                <strong>{data.pending.displayName}</strong>
                <p>Instagram ID: {data.pending.externalId}</p>
                <p>
                  Mövcud bağlantı varsa, bu hesab onu əvəz edəcək. Əvvəlki
                  hesabın yazışmaları yeni alıcı siyahısına qarışmayacaq.
                </p>
                <label className="siCheck">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => setChecked(e.target.checked)}
                  />{" "}
                  Bu hesabın NEW ERA platformasının satış yazışmaları üçün
                  olduğunu təsdiqləyirəm.
                </label>
                <button
                  disabled={busy || !checked}
                  className="siMain"
                  onClick={() => action("confirm-connection")}
                >
                  Bu hesabı qoş
                </button>
              </div>
            ) : (
              <button
                disabled={busy}
                className="siMain"
                onClick={() => action("connect")}
              >
                {data.account
                  ? "Instagram hesabını yenidən qoş"
                  : "Instagram hesabını qoş"}
              </button>
            )}
            {data.canManage &&
              data.account &&
              data.account.state !== "DISCONNECTED" && (
                <button
                  disabled={busy}
                  className="siDisconnect"
                  onClick={() => action("disconnect")}
                >
                  Bağlantını kəs
                </button>
              )}
          </>
        )}
        <div className="siSettingsNote">
          <h3>Göndəriş qaydası</h3>
          <p>
            Instagram Professional hesabı, mesaj icazəsi və işlək webhook tələb
            olunur. Müştəri əvvəlcə bu hesaba mesaj yazmalıdır. Son mesajından
            24 saat ərzində admin təklifi seçib, mətn və alıcını yoxlayaraq
            göndərişi təsdiqləyə bilər.
          </p>
          <p>
            Hesabın şifrəsi NEW ERA-da saxlanmır. Giriş rəsmi Instagram
            pəncərəsində edilir. Meta tətbiqi production üçün hazır deyilsə,
            test rollarından kənar hesablarla mesajlaşma məhdud qala bilər.
          </p>
        </div>
      </div>
    </main>
  );
}

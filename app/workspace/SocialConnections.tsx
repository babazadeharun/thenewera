"use client";
import { useEffect, useRef, useState } from "react";
import { api, type R } from "./shared";
type Props = { url: (op: string) => string; writable: boolean };
const statusNames: Record<string, string> = {
  CONNECTED: "Qoşulub",
  DISCONNECTED: "Qoşulmayıb",
  RECONNECT_REQUIRED: "Yenidən giriş tələb olunur",
  ERROR: "Bağlantı tamamlanmayıb",
  CONNECTING: "Qoşulur…",
};
let sdkLoading: Promise<void> | null = null;
function loadSDK() {
  if ((window as any).FB) return Promise.resolve();
  if (sdkLoading) return sdkLoading;
  sdkLoading = new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.id = "new-era-meta-sdk";
    script.src = "https://connect.facebook.net/en_US/sdk.js";
    script.async = true;
    const timer = window.setTimeout(
      () => reject(Error("Meta pəncərəsi yüklənmədi. Yenidən cəhd edin.")),
      15000,
    );
    script.onload = () => {
      clearTimeout(timer);
      (window as any).FB
        ? resolve()
        : reject(Error("Meta pəncərəsi yüklənmədi."));
    };
    script.onerror = () => {
      clearTimeout(timer);
      reject(Error("Meta pəncərəsi yüklənmədi."));
    };
    document.head.appendChild(script);
  }).catch((e) => {
    sdkLoading = null;
    document.getElementById("new-era-meta-sdk")?.remove();
    throw e;
  });
  return sdkLoading;
}
export default function SocialConnections({ url, writable }: Props) {
  const [data, setData] = useState<R>({}),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false),
    [authId, setAuthId] = useState(""),
    [pending, setPending] = useState<R | null>(null),
    [choice, setChoice] = useState(""),
    [pin, setPin] = useState(""),
    [embedded, setEmbedded] = useState<R | null>(null),
    [oauthURL, setOAuthURL] = useState("");
  const mounted = useRef(true),
    sdkCleanup = useRef<(() => void) | null>(null);
  const pendingURL = (id: string) => {
    const u = new URL(url("social-auth"), location.origin);
    u.searchParams.set("authId", id);
    return u.pathname + u.search;
  };
  const storageKey = () => "new-era-social-auth:" + location.pathname;
  const load = async () => {
    const out = await api(url("social-connections"));
    if (mounted.current) setData(out);
  };
  function remember(id: string) {
    setAuthId(id);
    sessionStorage.setItem(storageKey(), id);
  }
  function clear() {
    setAuthId("");
    setPending(null);
    setChoice("");
    setPin("");
    setEmbedded(null);
    setOAuthURL("");
    sessionStorage.removeItem(storageKey());
    sdkCleanup.current?.();
    sdkCleanup.current = null;
  }
  useEffect(() => {
    mounted.current = true;
    load().catch((e) => setError(e.message));
    const id =
      new URLSearchParams(location.search).get("social_auth") ||
      sessionStorage.getItem(storageKey());
    if (id) remember(id);
    return () => {
      mounted.current = false;
      sdkCleanup.current?.();
    };
  }, []);
  useEffect(() => {
    if (!authId) return;
    let alive = true,
      timer: ReturnType<typeof setTimeout>;
    const poll = async () => {
      try {
        const out = await api(pendingURL(authId));
        if (!alive) return;
        setPending(out);
        setChoice((value) =>
          out.choices?.some((x: R) => x.id === value)
            ? value
            : out.choices?.length === 1
              ? out.choices[0].id
              : "",
        );
        if (out.state === "COMPLETE") {
          setNotice(
            "Hesab Workspace-ə qoşuldu. Yeni mətn mesajları Mesajlar bölməsində görünəcək.",
          );
          clear();
          await load();
          return;
        }
        if (!["ERROR", "CANCELLED", "EXPIRED"].includes(out.state))
          timer = setTimeout(poll, 2500);
      } catch (e) {
        if (alive) setError((e as Error).message);
      }
    };
    const onMessage = (event: MessageEvent) => {
      if (
        event.origin !== location.origin ||
        event.data?.type !== "NEW_ERA_SOCIAL_AUTH" ||
        event.data.authId !== authId
      )
        return;
      clearTimeout(timer);
      poll();
    };
    window.addEventListener("message", onMessage);
    poll();
    return () => {
      alive = false;
      clearTimeout(timer);
      window.removeEventListener("message", onMessage);
    };
  }, [authId]);
  async function start(channel: string) {
    setError("");
    setNotice("");
    setBusy(true);
    const popup =
      channel === "WHATSAPP"
        ? null
        : window.open(
            "about:blank",
            "new-era-social-auth",
            "popup,width=640,height=760",
          );
    try {
      const out = await api(url("social-start"), { channel });
      clear();
      remember(out.authId);
      if (out.mode === "OAUTH") {
        setOAuthURL(out.url);
        if (popup) popup.location.href = out.url;
      } else {
        await loadSDK();
        (window as any).FB.init({
          appId: out.appId,
          version: out.version,
          xfbml: false,
          cookie: false,
        });
        setEmbedded(out);
      }
    } catch (e) {
      popup?.close();
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  function openWhatsApp() {
    if (!embedded || busy) return;
    setError("");
    setBusy(true);
    let done = false,
      code = "",
      wabaIds: string[] = [],
      phoneId = "";
    let timer: ReturnType<typeof setTimeout>;
    const cleanup = () => {
      clearTimeout(timer);
      window.removeEventListener("message", listener);
    };
    const finish = async () => {
      if (done || !code || !wabaIds.length) return;
      done = true;
      cleanup();
      try {
        await api(url("social-finish"), {
          authId: embedded.authId,
          state: embedded.state,
          code,
          wabaIds,
          phoneId: phoneId || undefined,
        });
        setEmbedded(null);
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setBusy(false);
      }
    };
    const listener = (event: MessageEvent) => {
      if (
        !["https://www.facebook.com", "https://web.facebook.com"].includes(
          event.origin,
        )
      )
        return;
      let payload;
      try {
        payload =
          typeof event.data === "string" ? JSON.parse(event.data) : event.data;
      } catch {
        return;
      }
      if (payload?.type !== "WA_EMBEDDED_SIGNUP") return;
      if (["CANCEL", "ERROR"].includes(payload.event)) {
        setError(
          "Meta pəncərəsində qoşulma tamamlanmadı. Yenidən cəhd edə bilərsiniz.",
        );
        cleanup();
        setBusy(false);
        return;
      }
      if (
        ![
          "FINISH",
          "FINISH_ONLY_WABA",
          "FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING",
        ].includes(payload.event)
      )
        return;
      const d = payload.data || {};
      wabaIds = Array.isArray(d.waba_ids)
        ? d.waba_ids.map(String)
        : d.waba_id
          ? [String(d.waba_id)]
          : [];
      phoneId = String(d.phone_number_id || "");
      finish();
    };
    window.addEventListener("message", listener);
    sdkCleanup.current = cleanup;
    timer = setTimeout(() => {
      if (!done) {
        cleanup();
        setBusy(false);
        setError(
          "Meta cavabı alınmadı. Açılan pəncərədə hesab və nömrə seçimini tamamlayın, sonra yenidən başlayın.",
        );
      }
    }, 120000);
    try {
      (window as any).FB.login(
        (response: R) => {
          code = String(response.authResponse?.code || "");
          if (!code) {
            cleanup();
            setBusy(false);
            setError("Hesab icazəsi verilmədi. Yenidən qoşa bilərsiniz.");
            return;
          }
          finish();
        },
        {
          config_id: embedded.configId,
          response_type: "code",
          override_default_response_type: true,
          extras: {
            sessionInfoVersion: embedded.sessionInfoVersion || "4",
            ...(embedded.coexistence
              ? { featureType: "whatsapp_business_app_onboarding" }
              : {}),
          },
        },
      );
    } catch {
      cleanup();
      setBusy(false);
      setError(
        "Meta pəncərəsi açılmadı. Brauzerdə açılan pəncərələrə icazə verin.",
      );
    }
  }
  const selected = pending?.choices?.find((c: R) => c.id === choice);
  async function activate() {
    setBusy(true);
    setError("");
    try {
      await api(url("social-activate"), {
        authId,
        externalId: choice,
        confirm: true,
        pin: pin || undefined,
      });
      clear();
      setNotice("Hesab qoşuldu.");
      await load();
    } catch (e) {
      setError((e as Error).message);
      try {
        setPending(await api(pendingURL(authId)));
      } catch {}
    } finally {
      setBusy(false);
      setPin("");
    }
  }
  return (
    <section className="crmPanel crmSocialConnect">
      <h2>Sosial hesablarınızı qoşun</h2>
      <p>
        Hesabınıza platformanın rəsmi pəncərəsində daxil olun və icazə verin.
        Şifrəniz NEW ERA-ya ötürülmür. Bağlantı yalnız bu şirkətə aiddir.
      </p>
      {error && (
        <p role="alert" className="crmError">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="crmBanner">
          {notice}
        </p>
      )}
      <div className="crmSocialCards">
        {(data.channels || []).map((c: R) => (
          <article key={c.channel}>
            <h3>{c.name}</h3>
            <p>
              <strong>{statusNames[c.state] || "Qoşulmayıb"}</strong>
            </p>
            {c.displayName && <p>{c.displayName}</p>}
            {c.error && <p>{c.error}</p>}
            {c.state === "CONNECTED" && c.expiresAt && (
              <small>
                Giriş icazəsi:{" "}
                {new Date(c.expiresAt).toLocaleDateString("az-AZ")}-dək
              </small>
            )}
            {!c.enabled ? (
              <p>Bu kanalın qoşulmasını NEW ERA komandası aktivləşdirir.</p>
            ) : (
              writable && (
                <button
                  disabled={busy || !!authId || c.state === "CONNECTING"}
                  onClick={() => start(c.channel)}
                >
                  {c.state === "CONNECTED" ? "Yenidən icazə ver" : "Qoş"}
                </button>
              )
            )}
            {(writable || data.canDisconnect) && c.id && c.state !== "DISCONNECTED" && (
              <>
                <button
                  disabled={busy || !writable}
                  onClick={async () => {
                    setBusy(true);
                    setError("");
                    try {
                      const result = await api(url("social-check"), {
                        id: c.id,
                      });
                      if (result.error) setError(result.error);
                      else
                        setNotice(
                          result.ok
                            ? "Bağlantı yoxlandı."
                            : "Qoşulmanı yenidən tamamlayın.",
                        );
                      await load();
                    } catch (e) {
                      setError((e as Error).message);
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  Bağlantını yoxla
                </button>
                <button
                  disabled={busy}
                  onClick={async () => {
                    if (
                      !confirm(
                        c.name +
                          " bağlantısı ayrılsın? Saxlanmış yazışmalar silinməyəcək.",
                      )
                    )
                      return;
                    setBusy(true);
                    try {
                      const result = await api(url("social-disconnect"), {
                        id: c.id,
                      });
                      setNotice(result.notice);
                      await load();
                    } catch (e) {
                      setError((e as Error).message);
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  Ayır
                </button>
              </>
            )}
          </article>
        ))}
      </div>
      {authId && (
        <section className="crmSocialPending" aria-label="Hesab qoşulması">
          <h3>Hesabın qoşulmasını tamamlayın</h3>
          {embedded && (
            <>
              <p>
                Meta pəncərəsində biznesinizi və WhatsApp nömrənizi seçin. Tələb
                olunarsa nömrəni təsdiqləyin.
              </p>
              <button
                className="crmPrimary"
                disabled={busy}
                onClick={openWhatsApp}
              >
                Meta pəncərəsini aç
              </button>
            </>
          )}
          {oauthURL && pending?.state === "PENDING" && (
            <>
              <p>
                Rəsmi giriş pəncərəsində hesabınıza daxil olub icazə verin.
                Pəncərə açılmayıbsa aşağıdakı keçiddən istifadə edin.
              </p>
              <a href={oauthURL} target="_blank" rel="noopener noreferrer">
                Giriş pəncərəsini aç
              </a>
            </>
          )}
          {["EXCHANGING", "SAVING"].includes(pending?.state) && (
            <p role="status">Bağlantı yoxlanılır…</p>
          )}
          {pending?.error && <p role="alert">{pending.error}</p>}
          {pending?.state === "SELECT" && (
            <>
              <label>
                Qoşulacaq hesab
                <select
                  aria-label="Qoşulacaq hesab"
                  disabled={busy}
                  value={choice}
                  onChange={(e) => {
                    setChoice(e.target.value);
                    setPin("");
                  }}
                >
                  <option value="">Hesabı seçin</option>
                  {pending.choices.map((c: R) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
              {selected?.requiresPin && (
                <label>
                  WhatsApp biznes PIN-i
                  <input
                    aria-label="WhatsApp biznes PIN-i"
                    type="password"
                    autoComplete="off"
                    inputMode="numeric"
                    maxLength={6}
                    value={pin}
                    onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
                  />
                  <small>
                    Bu nömrənin 6 rəqəmli biznes təhlükəsizlik PIN-i. Yeni
                    nömrədirsə PIN təyin edin; mövcuddursa onun PIN-indən
                    istifadə edin. API kodu tələb olunmur.
                  </small>
                </label>
              )}
              <p>
                Seçilmiş hesab bu Workspace-ə qoşulacaq. Qoşulma özü heç bir
                mesaj göndərmir.
              </p>
              <button
                className="crmPrimary"
                disabled={
                  busy || !choice || (selected?.requiresPin && pin.length !== 6)
                }
                onClick={activate}
              >
                Seçilmiş hesabı qoş
              </button>
            </>
          )}
          <button
            disabled={busy}
            onClick={async () => {
              try {
                await api(url("social-cancel"), { authId });
                clear();
              } catch (e) {
                setError((e as Error).message);
              }
            }}
          >
            Qoşulmanı bağla
          </button>
        </section>
      )}
      <p>
        Instagram üçün peşəkar hesab, Messenger üçün idarə etdiyiniz Facebook
        səhifəsi tələb olunur. Hazırda yeni mətn yazışmaları dəstəklənir;
        əvvəlki tarixçə və media avtomatik köçürülmür. Cavablar müvafiq kanalın
        icazə verdiyi müddətdə göndərilir.
      </p>
      <style jsx>{`
        .crmSocialCards {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 12px;
        }
        .crmSocialCards article,
        .crmSocialPending {
          border: 1px solid #a5c5cc70;
          border-radius: 14px;
          padding: 18px;
          min-width: 0;
          overflow-wrap: anywhere;
        }
        .crmSocialCards button {
          margin: 8px 8px 0 0;
        }
        .crmSocialPending {
          margin-top: 16px;
        }
        .crmSocialPending label {
          display: flex;
          flex-direction: column;
          gap: 7px;
          margin: 14px 0;
        }
        .crmSocialPending button {
          margin: 10px 10px 0 0;
        }
        .crmSocialPending select,
        .crmSocialPending input {
          max-width: 100%;
          min-width: 0;
        }
        small {
          display: block;
        }
        button:disabled {
          opacity: 0.5;
          cursor: default;
        }
        @media (max-width: 850px) {
          .crmSocialCards {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </section>
  );
}

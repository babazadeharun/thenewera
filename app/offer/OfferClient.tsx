"use client";
import { useEffect, useRef, useState } from "react";
import { LockKeyhole, X } from "lucide-react";
import OfferView, { type OfferData } from "./OfferView";
const titles: Record<string, string> = {
  ACCEPT: "Təklifi qəbul et",
  CHANGE: "Dəyişiklik istə",
  DECLINE: "Təklifdən imtina et",
  MEETING: "Görüş istə",
};
export default function OfferClient({ id }: { id: string }) {
  const [offer, setOffer] = useState<OfferData | null>(null),
    [token, setToken] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [loading, setLoading] = useState(true),
    [action, setAction] = useState(""),
    [message, setMessage] = useState(""),
    [challenge, setChallenge] = useState(""),
    [code, setCode] = useState(""),
    [consent, setConsent] = useState(false),
    [notice, setNotice] = useState(""),
    [cooldown, setCooldown] = useState(0);
  const dialog = useRef<HTMLDialogElement>(null);
  async function call(body: any, t = token) {
    const r = await fetch(`/api/offers/${encodeURIComponent(id)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...body, token: t }),
      cache: "no-store",
      credentials: "omit",
      referrerPolicy: "no-referrer",
    });
    const data = await r.json();
    if (!r.ok) throw Error(data.error || "Sorğu alınmadı.");
    return data;
  }
  useEffect(() => {
    let alive = true;
    const raw = window.location.hash.slice(1);
    setToken(raw);
    if (!/^[a-f0-9]{64}$/.test(raw)) {
      setError("Təklif linki tam deyil. Sizə göndərilmiş orijinal linki açın.");
      setLoading(false);
      return;
    }
    call({ action: "view" }, raw)
      .then((d) => {
        if (alive) {
          setOffer(d.offer);
          void call({ action: "track" }, raw).catch(() => {});
        }
      })
      .catch((e) => {
        if (alive) setError(e.message);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [id]);
  useEffect(() => {
    if (!cooldown) return;
    const timer = setInterval(
      () => setCooldown((n) => Math.max(0, n - 1)),
      1000,
    );
    return () => clearInterval(timer);
  }, [cooldown > 0]);
  function open(a: string) {
    setAction(a);
    setMessage("");
    setChallenge("");
    setCode("");
    setError("");
    setConsent(false);
    dialog.current?.showModal();
  }
  function close() {
    if (!busy) {
      dialog.current?.close();
      setAction("");
      setError("");
    }
  }
  async function sendCode() {
    setBusy(true);
    setError("");
    try {
      const d = await call({ action: "code", response: action, message });
      setChallenge(d.challengeId);
      setCode("");
      setCooldown(60);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!challenge) {
      if (action === "ACCEPT" && !consent) return;
      await sendCode();
      return;
    }
    setBusy(true);
    setError("");
    try {
      await call({ action: "confirm", challengeId: challenge, code });
      const d = await call({ action: "view" });
      setOffer(d.offer);
      setNotice("Cavabınız təsdiqləndi və New Era komandasına qeydə alındı.");
      dialog.current?.close();
      setAction("");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  if (loading)
    return (
      <main className="offerStatus" aria-live="polite">
        Təklif yüklənir…
      </main>
    );
  if (!offer)
    return (
      <main className="offerStatus">
        <LockKeyhole size={28} />
        <h1>Təklif açıla bilmədi</h1>
        <p>{error}</p>
        <a href="/">New Era saytına qayıt</a>
      </main>
    );
  return (
    <>
      {notice && (
        <div className="offerNotice" role="status">
          {notice}
          <button aria-label="Bildirişi bağla" onClick={() => setNotice("")}>
            <X size={16} />
          </button>
        </div>
      )}
      <OfferView offer={offer} onAction={open} />
      <dialog
        className="offerDialog"
        ref={dialog}
        onCancel={(e) => {
          if (busy) e.preventDefault();
          else {
            setAction("");
            setError("");
          }
        }}
      >
        <form onSubmit={submit}>
          <div className="offerDialogHead">
            <h2>{titles[action]}</h2>
            <button
              type="button"
              aria-label="Bağla"
              disabled={busy}
              onClick={close}
            >
              <X size={20} />
            </button>
          </div>
          <p>
            {offer.title} · versiya {offer.version}
          </p>
          {!challenge ? (
            <>
              {action === "ACCEPT" && (
                <>
                  <p>
                    Bu versiyanın xidmətlərini, yekun qiymətini və şərtlərini
                    qəbul etdiyinizi təsdiqləyin.
                  </p>
                  <label className="offerConsent">
                    <input
                      type="checkbox"
                      checked={consent}
                      onChange={(e) => setConsent(e.target.checked)}
                      required
                    />{" "}
                    Təklifin xidmətləri və ödəniş şərtləri ilə tanış oldum və
                    razıyam.
                  </label>
                </>
              )}
              {action === "DECLINE" && (
                <p>İmtinanız yalnız kodla təsdiqdən sonra qeydə alınacaq.</p>
              )}
              <label>
                {action === "MEETING"
                  ? "Uyğun gün, saat və görüş mövzusu"
                  : action === "CHANGE"
                    ? "Hansı dəyişiklikləri istəyirsiniz?"
                    : "Əlavə qeyd (istəyə bağlı)"}
                <textarea
                  maxLength={3000}
                  rows={4}
                  value={message}
                  required={["CHANGE", "MEETING"].includes(action)}
                  onChange={(e) => setMessage(e.target.value)}
                />
              </label>
              <p className="offerMuted">
                Kod təklifin ünvanlandığı {offer.emailHint} ünvanına
                göndəriləcək.
              </p>
            </>
          ) : (
            <>
              <p>
                Kod {offer.emailHint} ünvanına göndərildi. 10 dəqiqə
                etibarlıdır; 5 cəhdiniz var.
              </p>
              <label>
                Təsdiq kodu
                <input
                  autoFocus
                  key={challenge}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                  required
                />
              </label>
              <button
                type="button"
                className="offerQuiet"
                disabled={busy || cooldown > 0}
                onClick={sendCode}
              >
                Yenidən kod göndər{cooldown > 0 ? ` (${cooldown} s)` : ""}
              </button>
            </>
          )}
          {error && (
            <p role="alert" className="offerError">
              {error}
            </p>
          )}
          <button
            className="offerPrimary"
            disabled={busy || (!challenge && action === "ACCEPT" && !consent)}
          >
            {busy
              ? "Gözləyin…"
              : challenge
                ? "Kodu təsdiqlə və cavabı göndər"
                : "Təsdiq kodu göndər"}
          </button>
          <button
            type="button"
            className="offerQuiet"
            disabled={busy}
            onClick={close}
          >
            Geri qayıt
          </button>
        </form>
      </dialog>
    </>
  );
}

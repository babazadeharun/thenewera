"use client";
import { useEffect, useRef, useState } from "react";
import { Instagram, X } from "lucide-react";
import "./sales-instagram.css";
export async function instagramRequest(body?: any, query = "") {
  const r = await fetch("/api/admin/sales/instagram" + query, {
    method: body ? "POST" : "GET",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
  const d = await r.json();
  if (!r.ok) throw Error(d.error || "Instagram sorğusu alınmadı.");
  return d;
}
export const instagramState = (s: string) =>
  (
    ({
      CONNECTED: "Qoşulub",
      DISCONNECTED: "Qoşulmayıb",
      EXPIRED: "İcazənin müddəti bitib",
      ERROR: "Yenidən qoşulmalıdır",
      RECONNECT_REQUIRED: "Yenidən qoşulmalıdır",
      SENDING: "Göndəriş başlayıb — nəticəni yoxlayın",
      API_ACCEPTED: "Instagram API qəbul etdi",
      REJECTED: "Instagram rədd etdi",
      UNCERTAIN: "Nəticə qeyri-müəyyəndir — təkrarlamayın",
      CANCELLED: "Göndəriş başlamadan dayandı",
    }) as Record<string, string>
  )[s] || s;
const at = (s: string) =>
  new Date(s).toLocaleString("az-AZ", { timeZone: "Asia/Baku" });
export function InstagramChannelCard() {
  const [data, setData] = useState<any>(null),
    [error, setError] = useState("");
  useEffect(() => {
    instagramRequest()
      .then(setData)
      .catch((e: any) => setError(e.message));
  }, []);
  return (
    <div className="siChannel">
      <Instagram size={21} />
      <div>
        <strong>Admin Instagram hesabı</strong>
        <p>
          {error ||
            (!data
              ? "Yoxlanır…"
              : data.account
                ? `${data.account.displayName} · ${instagramState(data.account.state)}`
                : "Qoşulmayıb")}
          {data && !data.configured ? " · Server ayarları tamamlanmayıb." : ""}
        </p>
        <small>
          Yalnız platformanın hesabı. Şirkət Workspace-lərinin mesajları
          göstərilmir.
        </small>
      </div>
      <a className="salesSecondary" href="/admin/sales-instagram">
        Instagram bağlantısı
      </a>
    </div>
  );
}
export default function SalesInstagram({
  offer,
  onChanged,
}: {
  offer: any;
  onChanged: () => Promise<void>;
}) {
  const dialog = useRef<HTMLDialogElement>(null),
    [options, setOptions] = useState<any>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [thread, setThread] = useState(""),
    [intro, setIntro] = useState(""),
    [preview, setPreview] = useState<any>(null),
    [checked, setChecked] = useState(false),
    [page, setPage] = useState(1),
    [query, setQuery] = useState("");
  useEffect(() => {
    setOptions(null);
    setPreview(null);
    setNotice("");
    setThread("");
  }, [offer.id]);
  async function load(n = 1, q = query) {
    setBusy(true);
    setError("");
    try {
      const d = await instagramRequest(
        undefined,
        `?offerId=${encodeURIComponent(offer.id)}&page=${n}&q=${encodeURIComponent(q)}`,
      );
      setOptions(d);
      setPage(n);
      setIntro((v) => v || d.defaultIntro);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function open() {
    setPreview(null);
    setThread("");
    setChecked(false);
    setError("");
    setNotice("");
    setQuery("");
    setIntro("");
    dialog.current?.showModal();
    await load(1, "");
  }
  async function showPreview() {
    setBusy(true);
    setError("");
    try {
      const d = await instagramRequest({
        action: "preview",
        offerId: offer.id,
        threadId: thread,
        intro,
      });
      setPreview(d);
      setChecked(false);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function send() {
    if (!preview || !checked) return;
    setBusy(true);
    setError("");
    try {
      const d = await instagramRequest({
        ...preview,
        action: "send",
        confirm: true,
        recipientConfirmed: true,
      });
      setNotice(
        d.state === "API_ACCEPTED"
          ? "Təklifi Instagram API qəbul etdi. Bu, çatdırılma və ya oxunma təsdiqi deyil."
          : instagramState(d.state),
      );
      setPreview(null);
      await load(page);
      await onChanged();
    } catch (e: any) {
      setError(e.message);
      setPreview(null);
      try {
        const d = await instagramRequest(
          undefined,
          `?offerId=${encodeURIComponent(offer.id)}`,
        );
        setOptions(d);
      } catch {}
    } finally {
      setBusy(false);
    }
  }
  const blocked = options?.deliveries?.some((d: any) =>
    ["SENDING", "API_ACCEPTED", "UNCERTAIN"].includes(d.state),
  );
  return (
    <>
      <button className="salesSecondary" onClick={open}>
        <Instagram size={16} /> Instagram ilə göndər
      </button>
      {notice && (
        <p className="siNotice" role="status">
          {notice}
        </p>
      )}
      <dialog
        className="siDialog"
        ref={dialog}
        onCancel={(e) => {
          if (busy) e.preventDefault();
        }}
      >
        <div className="siHead">
          <h3>Instagram ilə təklif göndər</h3>
          <button
            aria-label="Instagram pəncərəsini bağla"
            disabled={busy}
            onClick={() => dialog.current?.close()}
          >
            <X size={19} />
          </button>
        </div>
        <p className="siHelp">
          Müştəri əvvəlcə hesabınıza yazmalıdır. Son daxil olan mesajdan sonra
          24 saatlıq cavab pəncərəsi serverdə yoxlanılır. İstifadəçi adını yazıb
          yeni yazışma başlatmaq olmur.
        </p>
        {options && !options.connected ? (
          <div className="siWarning">
            <p>Platformanın Instagram hesabı qoşulmayıb və ya icazəsi bitib.</p>
            <a href="/admin/sales-instagram">Instagram bağlantısını aç</a>
          </div>
        ) : preview ? (
          <>
            <dl className="siPreviewMeta">
              <div>
                <dt>Göndərən</dt>
                <dd>{preview.sender}</dd>
              </div>
              <div>
                <dt>Instagram alıcısı</dt>
                <dd>
                  {preview.recipient.displayName || "Ad alınmadı"} · ID{" "}
                  {preview.recipient.contact}
                </dd>
              </div>
              <div>
                <dt>Təklifin müştərisi</dt>
                <dd>
                  {preview.customer.name} · {preview.customer.email}
                </dd>
              </div>
              <div>
                <dt>Son daxil olan mesaj</dt>
                <dd>{at(preview.recipient.lastInboundAt)}</dd>
              </div>
            </dl>
            <blockquote>{preview.recipient.lastMessage}</blockquote>
            <h4>Göndəriləcək mətn</h4>
            <pre className="siBody">{preview.body}</pre>
            <p className="siHelp">
              Önbaxış 5 dəqiqə etibarlıdır. Təklif, hesab, mətn və alıcı
              dəyişərsə yenidən yoxlama tələb olunur.
            </p>
            <label className="siCheck">
              <input
                type="checkbox"
                checked={checked}
                onChange={(e) => setChecked(e.target.checked)}
              />{" "}
              Bu Instagram yazışmasının {preview.customer.name} (
              {preview.customer.email}) müştərisinə aid olduğunu və mətnin
              göndərilməsini təsdiqləyirəm.
            </label>
            <div className="siActions">
              <button
                className="salesSecondary"
                disabled={busy}
                onClick={() => {
                  setPreview(null);
                  setChecked(false);
                }}
              >
                Geri — seçimi dəyiş
              </button>
              <button
                className="salesPrimary"
                disabled={busy || !checked}
                onClick={send}
              >
                Təsdiqlə və Instagram-a göndər
              </button>
            </div>
          </>
        ) : options ? (
          <>
            <p>
              Göndərən: <strong>{options.account?.displayName}</strong>
            </p>
            {blocked ? (
              <div className="siWarning">
                Bu versiya üçün göndəriş artıq başlayıb. Nəticəni Instagram-da
                yoxlayın; təkrar göndərilməyəcək.
              </div>
            ) : (
              <>
                <div className="siSearch">
                  <label>
                    Instagram yazışması axtar
                    <input
                      maxLength={200}
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Ad, son mesaj və ya Instagram ID"
                    />
                  </label>
                  <button
                    className="salesSecondary"
                    disabled={busy}
                    onClick={() => {
                      setThread("");
                      void load(1);
                    }}
                  >
                    Axtar
                  </button>
                </div>
                <div className="siThreads">
                  {options.threads.length ? (
                    options.threads.map((t: any) => (
                      <label
                        className={`siThread ${!t.eligible ? "siClosed" : ""}`}
                        key={t.id}
                      >
                        <input
                          type="radio"
                          name="instagram-thread"
                          value={t.id}
                          checked={thread === t.id}
                          disabled={!t.eligible || busy}
                          onChange={() => setThread(t.id)}
                        />
                        <span>
                          <strong>
                            {t.displayName || "Instagram istifadəçisi"} · ID{" "}
                            {t.contact}
                          </strong>
                          <small>
                            {at(t.lastInboundAt)} ·{" "}
                            {t.eligible
                              ? "Cavab pəncərəsi açıqdır"
                              : "24 saat bitib"}
                          </small>
                          <p>{t.lastMessage}</p>
                        </span>
                      </label>
                    ))
                  ) : (
                    <p>
                      Uyğun yazışma yoxdur. Müştəri qoşulmuş Instagram
                      hesabınıza yeni mesaj yazdıqdan və webhook gəldikdən sonra
                      burada görünəcək.
                    </p>
                  )}
                </div>
                <div className="siPaging">
                  <button
                    className="salesSecondary"
                    disabled={busy || page === 1}
                    onClick={() => {
                      setThread("");
                      void load(page - 1);
                    }}
                  >
                    Əvvəlki
                  </button>
                  <span>
                    {page} / {Math.max(1, Math.ceil(options.total / 30))}
                  </span>
                  <button
                    className="salesSecondary"
                    disabled={busy || page * 30 >= options.total}
                    onClick={() => {
                      setThread("");
                      void load(page + 1);
                    }}
                  >
                    Növbəti
                  </button>
                </div>
                <label className="siIntro">
                  Mesajın girişi (link avtomatik əlavə olunur)
                  <textarea
                    maxLength={600}
                    rows={4}
                    value={intro}
                    onChange={(e) => setIntro(e.target.value)}
                  />
                </label>
                <button
                  className="salesPrimary"
                  disabled={busy || !thread || !intro.trim()}
                  onClick={showPreview}
                >
                  Mətnə və alıcıya bax
                </button>
              </>
            )}
            {options.deliveries?.length > 0 && (
              <div className="siHistory">
                <h4>Instagram göndərişləri</h4>
                {options.deliveries.map((d: any) => (
                  <p key={d.id}>
                    <strong>{instagramState(d.state)}</strong> ·{" "}
                    {at(d.createdAt)} · alıcı ID {d.contact}
                    {d.providerMessageId && (
                      <small>Mesaj ID: {d.providerMessageId}</small>
                    )}
                  </p>
                ))}
              </div>
            )}
          </>
        ) : (
          <p>Yüklənir…</p>
        )}
        {error && (
          <p role="alert" className="siError">
            {error}
          </p>
        )}
        {notice && (
          <p role="status" className="siNotice">
            {notice}
          </p>
        )}
        <p className="siHelp">
          Təklifin qəbulu əvvəlki qaydada müştərinin e-poçtuna göndərilən kodla
          təsdiqlənir.
        </p>
      </dialog>
    </>
  );
}

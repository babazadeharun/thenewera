"use client";
import { useEffect, useState } from "react";
import {
  Plus,
  X,
  Copy,
  ArrowLeft,
  ExternalLink,
  FileText,
  Trash2,
} from "lucide-react";
import OfferView, {
  offerDate,
  offerMoney,
  offerStates,
} from "../offer/OfferView";
import "../offer/offer.css";
import "./sales-offers.css";
import SalesInstagram, { InstagramChannelCard } from "./SalesInstagram";
type Props = { deals: any[]; services: any[]; onChanged: () => Promise<void> };
const blankService = () => ({
  title: "",
  description: "",
  deliverables: "",
  duration: "",
  exclusions: "",
  quantity: 1,
  unitPrice: "0",
  billing: "MONTHLY",
});
const blank = () => ({
  dealId: "",
  recipientName: "",
  recipientEmail: "",
  company: "",
  title: "Biznesiniz üçün növbəti addım.",
  introduction:
    "Məqsədlərinizə uyğun hazırladığımız xidmətlərin əhatəsi və əməkdaşlıq şərtləri ilə tanış olun.",
  services: [blankService()],
  currency: "AZN",
  discount: "0",
  terms:
    "İşə başlama tarixi qarşılıqlı razılaşma ilə müəyyən edilir. Ödəniş müddətini, mərhələlərini və əlavə şərtləri burada qeyd edin.",
  expiresAt: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
  billing: "MONTHLY",
});
const toForm = (p: any) => ({
  ...p,
  billing: p.services[0]?.billing || "MONTHLY",
  services: p.services.map((s: any) => ({
    ...s,
    unitPrice: (s.unitMinor / 100).toFixed(2),
  })),
  discount: (p.discountMinor / 100).toFixed(2),
  expiresAt: new Date(p.expiresAt).toISOString().slice(0, 10),
});
export default function SalesOffers({ deals, services, onChanged }: Props) {
  const [items, setItems] = useState<any[]>([]),
    [total, setTotal] = useState(0),
    [page, setPage] = useState(1),
    [detail, setDetail] = useState<any>(null),
    [form, setForm] = useState<any>(null),
    [review, setReview] = useState(""),
    [link, setLink] = useState(""),
    [busy, setBusy] = useState(false),
    [loading, setLoading] = useState(true),
    [message, setMessage] = useState(""),
    [preview, setPreview] = useState(false),
    [checked, setChecked] = useState(false),
    [query, setQuery] = useState("");
  async function api(body?: any, params = "") {
    const r = await fetch("/api/admin/sales/offers" + params, {
      method: body ? "POST" : "GET",
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      cache: "no-store",
    });
    const d = await r.json();
    if (!r.ok) throw Error(d.error || "Sorğu alınmadı.");
    return d;
  }
  async function load(n = page) {
    setLoading(true);
    try {
      const d = await api(undefined, `?page=${n}`);
      setItems(d.items);
      setTotal(d.total);
    } catch (e: any) {
      setMessage(e.message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void load(page);
  }, [page]);
  async function open(id: string) {
    setBusy(true);
    setMessage("");
    try {
      const d = await api(undefined, `?id=${encodeURIComponent(id)}`);
      setDetail({ ...d.offer, versions: d.versions });
      setReview(d.review);
      setLink(d.link || "");
      setForm(null);
      setChecked(false);
      setPreview(false);
    } catch (e: any) {
      setMessage(e.message);
    } finally {
      setBusy(false);
    }
  }
  const field = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));
  const row = (i: number, k: string, v: any) =>
    setForm((f: any) => ({
      ...f,
      services: f.services.map((s: any, n: number) =>
        n === i ? { ...s, [k]: v } : s,
      ),
    }));
  function fresh() {
    setForm(blank());
    setDetail(null);
    setMessage("");
    setPreview(false);
  }
  function selectDeal(id: string) {
    const d = deals.find((x) => x.id === id);
    setForm((f: any) => ({
      ...f,
      dealId: id,
      recipientName:
        d?.contactName ||
        [d?.client?.firstName, d?.client?.lastName].filter(Boolean).join(" "),
      recipientEmail: d?.email || d?.client?.email || "",
      company: d?.client?.company || "",
    }));
  }
  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const d = await api({
        ...form,
        action: "save",
        expiresAt: form.expiresAt + "T19:59:59.999Z",
        services: form.services.map((s: any) => ({
          ...s,
          billing: form.billing,
        })),
      });
      await open(d.offer.id);
      await load();
      setMessage(
        "Qaralama saxlanıldı. Yayımlamazdan əvvəl önbaxışda məzmunu yoxlayın.",
      );
    } catch (e: any) {
      setMessage(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function control(action: string) {
    if (!detail || busy) return;
    if (action === "publish" && !checked) return;
    if (
      !window.confirm(
        action === "publish"
          ? "Bu versiyanı yayımlayıb əvvəlki linki bağlamağı təsdiqləyirsiniz? Məktub ayrıca göndərilir."
          : action === "send"
            ? `${detail.recipientEmail} ünvanına təklif linkini göndərməyi təsdiqləyirsiniz?`
            : "Bu təklif linkini bağlamağı təsdiqləyirsiniz?",
      )
    )
      return;
    setBusy(true);
    setMessage("");
    try {
      await api({ action, id: detail.id, review, confirm: true });
      await open(detail.id);
      await load();
      await onChanged();
      setMessage(
        action === "publish"
          ? "Təklif yayımlandı. Linki paylaşa və ya e-poçtla göndərə bilərsiniz."
          : action === "send"
            ? "Məktubu SMTP qəbul etdi. Bu, inbox-a çatdırılma təsdiqi deyil."
            : "Link bağlandı.",
      );
    } catch (e: any) {
      setMessage(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      setMessage(
        "Xüsusi təklif linki kopyalandı. Yalnız müştəri ilə paylaşın.",
      );
    } catch {
      setMessage(
        "Kopyalama alınmadı. Aşağıdakı linki əl ilə seçib kopyalayın.",
      );
    }
  }
  const subtotal =
    form?.services.reduce(
      (sum: number, s: any) =>
        sum + (Number(s.unitPrice) || 0) * (Number(s.quantity) || 0),
      0,
    ) || 0;
  return (
    <section className="salesOffers">
      <InstagramChannelCard />
      <div className="soHeading">
        <div>
          <h3>Onlayn təkliflər</h3>
          <p>
            Ətraflı xidmətlər, fərdi qiymətlər və qeydiyyatsız müştəri təsdiqi.
          </p>
        </div>
        <button className="salesPrimary" disabled={busy} onClick={fresh}>
          <Plus size={16} /> Yeni təklif
        </button>
      </div>
      {message && (
        <div className="soMessage" role="status">
          {message}
          <button onClick={() => setMessage("")} aria-label="Bildirişi bağla">
            <X size={16} />
          </button>
        </div>
      )}
      {form ? (
        <form className="soEditor" onSubmit={save}>
          <div className="soHeading">
            <h3>
              {form.id ? "Qaralamanı redaktə et" : "Yeni təklif / yeni versiya"}
            </h3>
            <button
              type="button"
              className="salesSecondary"
              disabled={busy}
              onClick={() => setForm(null)}
            >
              <ArrowLeft size={15} /> Geri
            </button>
          </div>
          <p className="soHint">
            Göndərilmiş təklif dəyişmir. Eyni satış üçün yeni qaralama əvvəlki
            versiyanı yalnız yayımlandıqdan sonra əvəz edir. Qəbul edilmiş
            versiya dəyişdirilmir.
          </p>
          <fieldset disabled={busy}>
            <div className="soFields">
              <label>
                Satış
                <select
                  aria-label="Satış"
                  required
                  value={form.dealId}
                  disabled={!!form.id}
                  onChange={(e) => selectDeal(e.target.value)}
                >
                  <option value="">Satışı seçin</option>
                  {deals
                    .filter(
                      (d) =>
                        `${d.title} ${d.contactName} ${d.email}`
                          .toLowerCase()
                          .includes(query.toLowerCase()) ||
                        d.id === form.dealId,
                    )
                    .map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.title} · {d.email || "e-poçt yoxdur"}
                      </option>
                    ))}
                </select>
              </label>
              <label>
                Satış seçimi üçün axtarış
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Ad, satış və ya e-poçt"
                />
              </label>
              <label>
                Əlaqə şəxsi
                <input
                  required
                  maxLength={160}
                  value={form.recipientName}
                  onChange={(e) => field("recipientName", e.target.value)}
                />
              </label>
              <label>
                Müştərinin e-poçtu
                <input
                  required
                  type="email"
                  maxLength={254}
                  value={form.recipientEmail}
                  onChange={(e) => field("recipientEmail", e.target.value)}
                />
              </label>
              <label>
                Şirkət
                <input
                  maxLength={200}
                  value={form.company}
                  onChange={(e) => field("company", e.target.value)}
                />
              </label>
              <label>
                Təklifin başlığı
                <input
                  required
                  maxLength={200}
                  value={form.title}
                  onChange={(e) => field("title", e.target.value)}
                />
              </label>
            </div>
            <label>
              Giriş mətni
              <textarea
                aria-label="Giriş mətni"
                rows={3}
                maxLength={6000}
                value={form.introduction}
                onChange={(e) => field("introduction", e.target.value)}
              />
            </label>
            <div className="soFields">
              <label>
                Valyuta
                <select
                  aria-label="Valyuta"
                  value={form.currency}
                  onChange={(e) => field("currency", e.target.value)}
                >
                  {["AZN", "USD", "EUR"].map((x) => (
                    <option key={x}>{x}</option>
                  ))}
                </select>
              </label>
              <label>
                Ödəniş dövrü
                <select
                  aria-label="Ödəniş dövrü"
                  value={form.billing}
                  onChange={(e) => field("billing", e.target.value)}
                >
                  <option value="MONTHLY">Aylıq</option>
                  <option value="ONCE">Birdəfəlik</option>
                </select>
              </label>
              <label>
                Etibarlılıq tarixi (Bakı vaxtı ilə günün sonu)
                <input
                  required
                  type="date"
                  min={new Date().toISOString().slice(0, 10)}
                  value={form.expiresAt}
                  onChange={(e) => field("expiresAt", e.target.value)}
                />
              </label>
              <label>
                Ümumi endirim ({form.currency}
                {form.billing === "MONTHLY" ? " / ay" : ""})
                <input
                  required
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.discount}
                  onChange={(e) => field("discount", e.target.value)}
                />
              </label>
            </div>
            <h3>Xidmətlər və təhvil veriləcək işlər</h3>
            {form.services.map((s: any, i: number) => (
              <section className="soService" key={i}>
                <div className="soHeading">
                  <h4>Xidmət {i + 1}</h4>
                  <button
                    type="button"
                    className="salesSecondary"
                    disabled={form.services.length === 1}
                    aria-label={`Xidmət ${i + 1} sil`}
                    onClick={() =>
                      field(
                        "services",
                        form.services.filter((_: any, n: number) => n !== i),
                      )
                    }
                  >
                    <Trash2 size={15} /> Sil
                  </button>
                </div>
                <label>
                  Mövcud xidmətdən başlıq seç (istəyə bağlı)
                  <select
                    aria-label="Mövcud xidmətdən başlıq seç"
                    value=""
                    onChange={(e) =>
                      row(
                        i,
                        "title",
                        services.find((x) => x.id === e.target.value)?.name ||
                          s.title,
                      )
                    }
                  >
                    <option value="">Seçin və ya başlığı özünüz yazın</option>
                    {services.map((x) => (
                      <option key={x.id} value={x.id}>
                        {x.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Xidmətin adı
                  <input
                    required
                    maxLength={160}
                    value={s.title}
                    onChange={(e) => row(i, "title", e.target.value)}
                  />
                </label>
                <label>
                  Görüləcək işlərin ətraflı təsviri
                  <textarea
                    aria-label="Görüləcək işlərin ətraflı təsviri"
                    required
                    rows={4}
                    maxLength={6000}
                    value={s.description}
                    onChange={(e) => row(i, "description", e.target.value)}
                    placeholder="Məsələn: Instagram və Facebook hesabları üçün kontent planı, dizayn və idarəetmə."
                  />
                </label>
                <label>
                  Müştəri nə əldə edəcək? Həcm və təhvil verilənlər
                  <textarea
                    aria-label="Müştəri nə əldə edəcək? Həcm və təhvil verilənlər"
                    required
                    rows={4}
                    maxLength={6000}
                    value={s.deliverables}
                    onChange={(e) => row(i, "deliverables", e.target.value)}
                    placeholder={
                      "12 post dizaynı\n4 Reels montajı\nAylıq kontent planı və nəticə hesabatı"
                    }
                  />
                </label>
                <label>
                  Başlama / təhvil müddəti
                  <input
                    required
                    maxLength={500}
                    value={s.duration}
                    onChange={(e) => row(i, "duration", e.target.value)}
                    placeholder="Razılaşmadan sonra 5 iş günü / hər ay"
                  />
                </label>
                <label>
                  Qiymətə daxil olmayan işlər və xərclər
                  <textarea
                    aria-label="Qiymətə daxil olmayan işlər və xərclər"
                    rows={2}
                    maxLength={3000}
                    value={s.exclusions}
                    onChange={(e) => row(i, "exclusions", e.target.value)}
                    placeholder="Məsələn: reklam büdcəsi, studiya və ayrıca çəkiliş xərcləri."
                  />
                </label>
                <div className="soFields">
                  <label>
                    Say
                    <input
                      required
                      type="number"
                      min="1"
                      max="10000"
                      step="1"
                      value={s.quantity}
                      onChange={(e) => row(i, "quantity", e.target.value)}
                    />
                  </label>
                  <label>
                    Vahid qiyməti ({form.currency})
                    <input
                      required
                      type="number"
                      min="0"
                      max="9999999.99"
                      step="0.01"
                      value={s.unitPrice}
                      onChange={(e) => row(i, "unitPrice", e.target.value)}
                    />
                  </label>
                </div>
                <strong className="soRowTotal">
                  Xidmətin cəmi:{" "}
                  {offerMoney(
                    Math.round(
                      (Number(s.unitPrice) || 0) *
                        (Number(s.quantity) || 0) *
                        100,
                    ),
                    form.currency,
                  )}
                  {form.billing === "MONTHLY" ? " / ay" : ""}
                </strong>
              </section>
            ))}
            <button
              type="button"
              className="salesSecondary"
              disabled={form.services.length >= 30}
              onClick={() =>
                field("services", [...form.services, blankService()])
              }
            >
              <Plus size={15} /> Xidmət əlavə et
            </button>
            <label className="soTerms">
              İşin təşkili və ödəniş şərtləri
              <textarea
                aria-label="İşin təşkili və ödəniş şərtləri"
                required
                rows={5}
                maxLength={6000}
                value={form.terms}
                onChange={(e) => field("terms", e.target.value)}
              />
            </label>
            <p className="soTotal">
              Yekun:{" "}
              {offerMoney(
                Math.round((subtotal - (Number(form.discount) || 0)) * 100),
                form.currency,
              )}
              {form.billing === "MONTHLY" ? " / ay" : ""}
            </p>
            <p className="soHint">
              Hesablama serverdə yenidən yoxlanır. Aylıq və birdəfəlik xidmətlər
              üçün ayrı təkliflər hazırlayın.
            </p>
            <button className="salesPrimary">
              <FileText size={16} />
              {busy ? "Saxlanılır…" : "Qaralamanı saxla"}
            </button>
          </fieldset>
        </form>
      ) : detail ? (
        <>
          <div className="soHeading">
            <div>
              <h3>{detail.title}</h3>
              <p>
                {detail.recipientName} · {detail.recipientEmail} · v
                {detail.version}
              </p>
            </div>
            <button
              className="salesSecondary"
              onClick={() => {
                setDetail(null);
                setPreview(false);
              }}
            >
              <ArrowLeft size={15} /> Siyahı
            </button>
          </div>
          <div className="soDetailMeta">
            <span>{offerStates[detail.state]}</span>
            <span>{offerMoney(detail.totalMinor, detail.currency)}</span>
            <span>Son tarix: {offerDate(detail.expiresAt)}</span>
            <span>
              E-poçt:{" "}
              {
                (
                  {
                    NONE: "göndərilməyib",
                    SENDING: "emal edilir; təkrarlamayın",
                    SENT: "SMTP qəbul etdi",
                    FAILED: "uğursuz",
                    UNCERTAIN: "nəticə qeyri-müəyyəndir",
                  } as any
                )[detail.mailState]
              }
            </span>
          </div>
          <div className="soActions">
            {link &&
              ["OPEN", "CHANGES_REQUESTED", "MEETING_REQUESTED"].includes(
                detail.state,
              ) && (
                <SalesInstagram
                  offer={detail}
                  onChanged={async () => {
                    await onChanged();
                    await open(detail.id);
                  }}
                />
              )}
            <button
              className="salesSecondary"
              disabled={busy}
              onClick={() => open(detail.id)}
            >
              Yenilə
            </button>
            <button
              className="salesSecondary"
              onClick={() => setPreview(!preview)}
            >
              {preview ? "Önbaxışı bağla" : "Müştəri görünüşü"}
            </button>
            {detail.state === "DRAFT" ? (
              <button
                className="salesSecondary"
                disabled={busy}
                onClick={() => setForm(toForm(detail))}
              >
                Redaktə et
              </button>
            ) : (
              detail.state !== "ACCEPTED" && (
                <button
                  className="salesSecondary"
                  disabled={busy || !detail.dealId}
                  onClick={() => {
                    const f = toForm(detail);
                    delete f.id;
                    delete f.updatedAt;
                    setForm(f);
                    setPreview(false);
                  }}
                >
                  Yeni versiya hazırla
                </button>
              )
            )}
            {link && (
              <>
                <button className="salesSecondary" onClick={copy}>
                  <Copy size={15} /> Linki kopyala
                </button>
                <a
                  className="salesSecondary"
                  href={link}
                  target="_blank"
                  rel="noreferrer"
                >
                  Səhifəni aç <ExternalLink size={15} />
                </a>
                {["OPEN", "CHANGES_REQUESTED", "MEETING_REQUESTED"].includes(
                  detail.state,
                ) && (
                  <button
                    className="salesPrimary"
                    disabled={
                      busy ||
                      ["SENDING", "SENT", "UNCERTAIN"].includes(
                        detail.mailState,
                      )
                    }
                    onClick={() => control("send")}
                  >
                    E-poçtla göndər
                  </button>
                )}
              </>
            )}
            {!["ACCEPTED", "REVOKED", "SUPERSEDED"].includes(detail.state) && (
              <button
                className="salesSecondary"
                disabled={busy}
                onClick={() => control("revoke")}
              >
                Linki bağla
              </button>
            )}
          </div>
          {link && (
            <label className="soLink">
              Xüsusi müştəri linki
              <input readOnly value={link} onFocus={(e) => e.target.select()} />
            </label>
          )}
          {detail.state === "DRAFT" && (
            <div className="soPublish">
              <label>
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(e) => setChecked(e.target.checked)}
                />{" "}
                Xidmətləri, məbləği, alıcını və şərtləri yoxladım. Yeni versiya
                yayımlananda əvvəlki link bağlanacaq.
              </label>
              <button
                className="salesPrimary"
                disabled={busy || !checked}
                onClick={() => control("publish")}
              >
                Təsdiqlə və link yarat
              </button>
              <p>
                Yayımlamaq məktub göndərmir. Göndəriş ayrıca təsdiq tələb edir.
              </p>
            </div>
          )}
          {preview && (
            <div className="soPreview">
              <OfferView offer={detail} preview />
            </div>
          )}
          <div className="soStats">
            <p>
              İlk açılış:{" "}
              {detail.firstViewedAt
                ? new Date(detail.firstViewedAt).toLocaleString("az-AZ")
                : "yoxdur"}
            </p>
            <p>
              Son açılış:{" "}
              {detail.lastViewedAt
                ? new Date(detail.lastViewedAt).toLocaleString("az-AZ")
                : "yoxdur"}
            </p>
            <p>
              Linkin açılması insanın oxuduğunu sübut etmir. Qəbul yalnız e-poçt
              kodu ilə qeydə alınır.
            </p>
            {detail.responseMessage && (
              <p className="soResponse">
                Müştərinin qeydi: {detail.responseMessage}
              </p>
            )}
          </div>
          <h4>Versiyalar</h4>
          <div className="soActions">
            {detail.versions?.map((v: any) => (
              <button
                key={v.id}
                className="salesSecondary"
                disabled={busy || v.id === detail.id}
                onClick={() => open(v.id)}
              >
                v{v.version} · {offerStates[v.state]} ·{" "}
                {offerMoney(v.totalMinor, v.currency)}
              </button>
            ))}
          </div>
          <h4>Fəaliyyət tarixçəsi</h4>
          <ul className="soHistory">
            {detail.events?.map((e: any) => (
              <li key={e.id}>
                <b>
                  {(
                    {
                      DRAFT_CREATED: "Qaralama yaradıldı",
                      DRAFT_UPDATED: "Qaralama dəyişdirildi",
                      PUBLISHED: "Yayımlandı",
                      SUPERSEDED: "Yeni versiya ilə əvəzləndi",
                      REVOKED: "Link bağlandı",
                      LINK_VIEWED: "Link açıldı",
                      EMAIL_ATTEMPT: "Məktub göndərişi başladıldı",
                      EMAIL_SMTP_ACCEPTED: "Məktubu SMTP qəbul etdi",
                      INSTAGRAM_ATTEMPT: "Instagram göndərişi başladı",
                      INSTAGRAM_API_ACCEPTED: "Instagram API mesajı qəbul etdi",
                      INSTAGRAM_REJECTED: "Instagram göndərişi rədd etdi",
                      INSTAGRAM_UNCERTAIN:
                        "Instagram nəticəsi qeyri-müəyyəndir",
                      INSTAGRAM_CANCELLED:
                        "Instagram göndərişi başlamadan dayandı",
                      ACCEPTED: "Müştəri qəbul etdi",
                      DECLINED: "Müştəri imtina etdi",
                      CHANGES_REQUESTED: "Dəyişiklik istənildi",
                      MEETING_REQUESTED: "Görüş istənildi",
                    } as any
                  )[e.type] || e.type}
                </b>
                <time>{new Date(e.createdAt).toLocaleString("az-AZ")}</time>
                {e.details && <p>{e.details}</p>}
                <small>
                  {e.actorId ? "Admin əməliyyatı" : "Müştəri / link hadisəsi"}
                </small>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <>
          <p className="soHint">
            Qaralama → önbaxış → təsdiqlə və yayımla → linki paylaş / e-poçtla
            göndər → kodla müştəri cavabı. Müştəridən qeydiyyat tələb olunmur.
          </p>
          {loading ? (
            <p>Yüklənir…</p>
          ) : items.length ? (
            <div className="soList">
              {items.map((p) => (
                <button disabled={busy} key={p.id} onClick={() => open(p.id)}>
                  <span>
                    <strong>{p.title}</strong>
                    <small>
                      {p.company || p.recipientName} · {p.recipientEmail}
                    </small>
                  </span>
                  <span>
                    <b>{offerMoney(p.totalMinor, p.currency)}</b>
                    <small>
                      v{p.version} · {offerStates[p.state]}
                    </small>
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <p>Hələ onlayn təklif yoxdur. “Yeni təklif” ilə başlayın.</p>
          )}
          <div className="soPaging">
            <button
              className="salesSecondary"
              disabled={page === 1 || loading}
              onClick={() => setPage((n) => n - 1)}
            >
              Əvvəlki
            </button>
            <span>
              {page} / {Math.max(1, Math.ceil(total / 30))}
            </span>
            <button
              className="salesSecondary"
              disabled={page * 30 >= total || loading}
              onClick={() => setPage((n) => n + 1)}
            >
              Növbəti
            </button>
          </div>
        </>
      )}
    </section>
  );
}

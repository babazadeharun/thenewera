"use client";
import {
  ArrowRight,
  CalendarDays,
  Check,
  Clock3,
  LockKeyhole,
  Layers3,
} from "lucide-react";
export type OfferData = {
  id: string;
  version: number;
  state: string;
  recipientName: string;
  company: string;
  title: string;
  introduction: string;
  services: any[];
  currency: string;
  discountMinor: number;
  totalMinor: number;
  terms: string;
  expiresAt: string;
  acceptedAt?: string | null;
  responseMessage?: string | null;
  emailHint?: string;
  responseEnabled?: boolean;
};
export const offerMoney = (minor: number, currency: string) => {
  const absolute = Math.abs(minor);
  return `${minor < 0 ? "-" : ""}${Math.floor(absolute / 100)
    .toString()
    .replace(
      /\B(?=(\d{3})+(?!\d))/g,
      ".",
    )},${String(absolute % 100).padStart(2, "0")} ${currency}`;
};
export const offerDate = (v: string) => {
  const d = new Date(new Date(v).getTime() + 4 * 3600000);
  return `${d.getUTCDate()} ${["yanvar", "fevral", "mart", "aprel", "may", "iyun", "iyul", "avqust", "sentyabr", "oktyabr", "noyabr", "dekabr"][d.getUTCMonth()]} ${d.getUTCFullYear()}`;
};
export const offerStates: Record<string, string> = {
  DRAFT: "Qaralama",
  OPEN: "Cavab gözlənilir",
  ACCEPTED: "Qəbul edilib",
  DECLINED: "İmtina edilib",
  CHANGES_REQUESTED: "Dəyişiklik istənilib",
  MEETING_REQUESTED: "Görüş istənilib",
  REVOKED: "Link bağlanıb",
  SUPERSEDED: "Yeni versiya ilə əvəzlənib",
};
export default function OfferView({
  offer: p,
  onAction,
  preview = false,
}: {
  offer: OfferData;
  onAction?: (action: string) => void;
  preview?: boolean;
}) {
  const actionable =
    ["OPEN", "CHANGES_REQUESTED", "MEETING_REQUESTED"].includes(p.state) &&
    Date.parse(p.expiresAt) > Date.now();
  const monthly = p.services[0]?.billing === "MONTHLY";
  return (
    <div className="offerPage">
      <header className="offerHeader">
        <a href="/" aria-label="New Era ana səhifə">
          NEW ERA<span>®</span>
        </a>
        <small>
          <LockKeyhole size={14} />
          {preview ? "Admin önbaxışı" : "Məxfi təklif"}
        </small>
      </header>
      <main className="offerMain">
        <section className="offerHero">
          <div>
            <p className="offerEyebrow">FƏRDİ TƏKLİF · VERSİYA {p.version}</p>
            <h1>{p.title}</h1>
            <p className="offerFor">
              {p.company || p.recipientName} üçün hazırlanıb.
            </p>
            {p.introduction && <p className="offerIntro">{p.introduction}</p>}
          </div>
          <img
            className="offerArt"
            src="/redesign/events/photos/events-hero-apollo-glass.png"
            alt=""
          />
        </section>
        <div className="offerColumns">
          <div className="offerContent">
            <section>
              <p className="offerEyebrow">ƏMƏKDAŞLIĞIN ƏHATƏSİ</p>
              <h2>Sizin üçün nə edəcəyik?</h2>
              <p className="offerMuted">
                Xidmətlərin həcmi, təhvil veriləcək işlər və şərtlər aşağıda
                göstərilib.
              </p>
              <div className="offerServices">
                {p.services.map((s, i) => (
                  <article key={i} className="offerService">
                    <div className="offerServiceHead">
                      <span className="offerNumber">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <div>
                        <h3>{s.title}</h3>
                        <p>
                          {s.quantity} × {offerMoney(s.unitMinor, p.currency)} ·{" "}
                          {s.billing === "MONTHLY" ? "aylıq" : "birdəfəlik"}
                        </p>
                      </div>
                      <strong>
                        {offerMoney(s.quantity * s.unitMinor, p.currency)}
                      </strong>
                    </div>
                    <p className="offerText">{s.description}</p>
                    <div className="offerDetail">
                      <h4>
                        <Check size={16} /> Əldə edəcəkləriniz
                      </h4>
                      <p>{s.deliverables}</p>
                    </div>
                    <div className="offerDetail">
                      <h4>
                        <Clock3 size={16} /> Təhvil müddəti
                      </h4>
                      <p>{s.duration}</p>
                    </div>
                    {s.exclusions && (
                      <div className="offerExclusions">
                        <h4>Xidmət haqqına daxil deyil</h4>
                        <p>{s.exclusions}</p>
                      </div>
                    )}
                  </article>
                ))}
              </div>
            </section>
            <section className="offerTerms">
              <p className="offerEyebrow">ŞƏRTLƏR</p>
              <h2>İş və ödəniş qaydaları</h2>
              <p>{p.terms}</p>
            </section>
          </div>
          <aside className="offerAside">
            <section className="offerSummary">
              <div className="offerSummaryTop">
                <Layers3 size={19} />
                <span>{p.responseEnabled === false && p.state === "OPEN" ? "Baxış üçün yayımlanıb" : offerStates[p.state] || p.state}</span>
              </div>
              <h2>Təklifin xülasəsi</h2>
              <p className="offerMuted">
                {monthly ? "Aylıq xidmət haqqı" : "Birdəfəlik xidmət haqqı"}
              </p>
              <div className="offerTotal">
                {offerMoney(p.totalMinor, p.currency)}
                {monthly && <small>/ ay</small>}
              </div>
              <dl>
                <div>
                  <dt>Xidmətlərin cəmi</dt>
                  <dd>
                    {offerMoney(p.totalMinor + p.discountMinor, p.currency)}
                  </dd>
                </div>
                {p.discountMinor > 0 && (
                  <div>
                    <dt>Endirim{monthly ? " / ay" : ""}</dt>
                    <dd>−{offerMoney(p.discountMinor, p.currency)}</dd>
                  </div>
                )}
                <div>
                  <dt>Etibarlıdır</dt>
                  <dd>{offerDate(p.expiresAt)}</dd>
                </div>
                <div>
                  <dt>Versiya</dt>
                  <dd>{p.version}</dd>
                </div>
              </dl>
              {p.state === "ACCEPTED" ? (
                <div className="offerReceipt">
                  <Check size={22} />
                  <h3>Təklif qəbul edildi</h3>
                  <p>
                    E-poçt kodu ilə təsdiqlənib.
                    {p.acceptedAt && ` ${offerDate(p.acceptedAt)}`}
                  </p>
                </div>
              ) : p.state === "DECLINED" ? (
                <p className="offerReceipt">İmtinanız qeydə alınıb.</p>
              ) : (actionable || preview) && p.responseEnabled === false ? (
                <div className="offerReceipt">
                  <h3>Təkliflə tanış olun</h3>
                  <p>Şərtləri razılaşdırmaq, dəyişiklik və ya görüş istəmək üçün təklifi göndərən NEW ERA nümayəndəsi ilə əlaqə saxlayın.</p>
                </div>
              ) : actionable || preview ? (
                <>
                  <button
                    disabled={preview}
                    className="offerPrimary"
                    onClick={() => onAction?.("ACCEPT")}
                  >
                    Təklifi qəbul et <ArrowRight size={17} />
                  </button>
                  <small className="offerCodeNote">
                    Qəbul e-poçt kodu ilə təsdiqlənir.
                  </small>
                  <button
                    disabled={preview}
                    className="offerSecondary"
                    onClick={() => onAction?.("CHANGE")}
                  >
                    Dəyişiklik istə
                  </button>
                  <button
                    disabled={preview}
                    className="offerQuiet"
                    onClick={() => onAction?.("DECLINE")}
                  >
                    İmtina et
                  </button>
                </>
              ) : (
                <p className="offerMuted">
                  Bu versiya üzrə cavab vermək mümkün deyil.
                </p>
              )}
              {p.responseMessage && (
                <div className="offerPrevious">
                  <strong>Son qeydiniz:</strong>
                  <p>{p.responseMessage}</p>
                </div>
              )}
            </section>
            {(actionable || preview) && p.responseEnabled !== false && (
              <section className="offerMeeting">
                <CalendarDays size={22} />
                <div>
                  <h3>Suallarınız var?</h3>
                  <p>Uyğun vaxtı yazın, görüşü birlikdə razılaşdıraq.</p>
                  <button
                    disabled={preview}
                    onClick={() => onAction?.("MEETING")}
                  >
                    Görüş istə <ArrowRight size={14} />
                  </button>
                </div>
              </section>
            )}
            <p className="offerFootnote">
              Bu səhifədə ödəniş tutulmur. Qəbul ayrıca elektron imza xidməti
              deyil.
            </p>
          </aside>
        </div>
      </main>
      <footer className="offerFooter">
        <span>
          <LockKeyhole size={13} /> Qeydiyyat tələb olunmur
        </span>
        <span>Linki yalnız aidiyyəti şəxslərlə paylaşın.</span>
      </footer>
    </div>
  );
}

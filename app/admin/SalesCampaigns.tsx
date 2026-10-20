"use client";
import { useEffect, useState } from "react";
import "./sales-campaigns.css";
type R = Record<string, any>;
const labels: Record<string, string> = {
  DRAFT: "Qaralama",
  ACTIVE: "Aktiv",
  PAUSED: "Fasilədə",
  CANCELLED: "Ləğv edilib",
  PENDING: "Növbədə",
  SENDING: "Göndərilir",
  COMPLETED: "Ardıcıllıq göndərildi",
  SENT: "SMTP qəbul etdi",
  REPLIED: "Cavab alındı",
  REVIEW: "Əl ilə yoxlayın",
  STOPPED: "Dayandırılıb",
  UNSUBSCRIBED: "Göndərişdən imtina",
  FAILED: "Göndərilmədi",
  UNCERTAIN: "Nəticə dəqiq deyil",
  ATTEMPTING: "Cəhd edilir",
};
const dt = (s: string) =>
  s ? new Date(s).toLocaleString("az-AZ", { timeZone: "Asia/Baku" }) : "—";
const initialSteps = [
  {
    afterDays: 0,
    subject: "{{company}} üçün əməkdaşlıq təklifi",
    body: "Salam {{name}},\n\n{{company}} üçün {{service}} istiqamətində əməkdaşlıq təklifimizi müzakirə etmək istərdik. Sizin üçün maraqlıdırmı?\n\nNEW ERA komandası",
  },
  {
    afterDays: 3,
    subject: "Əməkdaşlıq təklifimiz barədə",
    body: "Salam {{name}},\n\nƏvvəlki təklifimizlə bağlı fikrinizi öyrənmək istərdik. {{company}} üçün uyğun variantı qısa görüşdə müzakirə edə bilərik.\n\nNEW ERA komandası",
  },
  {
    afterDays: 4,
    subject: "Təklifimizlə bağlı son xatırlatma",
    body: "Salam {{name}},\n\nBu mövzu hazırda aktualdırsa, sizə uyğun vaxtı bildirə bilərsiniz. Bu, təklifimiz üzrə son xatırlatmadır.\n\nNEW ERA komandası",
  },
];
async function api(body?: R, query = "") {
  const r = await fetch("/api/admin/sales/campaigns" + query, {
      method: body ? "POST" : "GET",
      headers: body ? { "Content-Type": "application/json" } : {},
      ...(body ? { body: JSON.stringify(body) } : {}),
      cache: "no-store",
    }),
    d = await r.json();
  if (!r.ok) throw Error(d.error || "Kampaniya əməliyyatı alınmadı.");
  return d;
}
export default function SalesCampaigns({
  deals,
  onChanged,
}: {
  deals: R[];
  onChanged: () => Promise<void>;
}) {
  const [list, setList] = useState<R>({ items: [] }),
    [detail, setDetail] = useState<R | null>(null),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false),
    [composer, setComposer] = useState(false),
    [review, setReview] = useState(false),
    [confirmed, setConfirmed] = useState(false);
  const [selected, setSelected] = useState<string[]>([]),
    [search, setSearch] = useState(""),
    [source, setSource] = useState(""),
    [onlyTodo, setOnlyTodo] = useState(true),
    [stepCount, setStepCount] = useState(3),
    [sequence, setSequence] = useState(initialSteps),
    [form, setForm] = useState({
      name: "",
      dailyLimit: 20,
      startHour: 9,
      endHour: 18,
      weekdaysOnly: true,
      startsAt: "",
    });
  const available = deals.filter(
    (d) =>
      !["WON", "LOST", "NEGOTIATION"].includes(d.stage) &&
      ![
        "SENT",
        "WAITING",
        "RESPONDED",
        "INTERESTED",
        "MEETING",
        "ACCEPTED",
        "DECLINED",
      ].includes(d.proposalStatus) &&
      Boolean(d.email || d.client?.email),
  );
  const filtered = available.filter(
    (d) =>
      (!onlyTodo || ["TODO", "DRAFT", null, ""].includes(d.proposalStatus)) &&
      (!source || d.source === source) &&
      `${d.title} ${d.contactName || ""} ${d.email || d.client?.email || ""} ${d.notes || ""} ${d.service?.name || ""}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  async function load() {
    try {
      setList(await api());
    } catch (e) {
      setError((e as Error).message);
    }
  }
  useEffect(() => {
    void load();
    const t = setInterval(() => {
      if (document.visibilityState === "visible") void load();
    }, 30000);
    return () => clearInterval(t);
  }, []);
  async function open(id: string, page = 1) {
    setError("");
    setBusy(true);
    try {
      setDetail(
        await api(
          undefined,
          "?" + new URLSearchParams({ id, page: String(page) }),
        ),
      );
      setConfirmed(false);
      setReview(false);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function action(b: R) {
    setError("");
    setNotice("");
    setBusy(true);
    try {
      const d = await api(b);
      if (b.action === "run")
        setNotice(
          d.state === "DISABLED"
            ? "Serverdə kampaniya göndərişi aktiv deyil."
            : `Emal tamamlandı: ${d.sent} məktub SMTP tərəfindən qəbul edildi.`,
        );
      else setNotice("Dəyişiklik saxlanıldı.");
      await load();
      if (detail)
        setDetail(
          await api(undefined, "?id=" + encodeURIComponent(detail.campaign.id)),
        );
      await onChanged();
      setConfirmed(false);
      setReview(false);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function create() {
    setBusy(true);
    setError("");
    try {
      const d = await api({
        action: "create",
        ...form,
        startsAt: form.startsAt
          ? new Date(form.startsAt).toISOString()
          : undefined,
        steps: sequence.slice(0, stepCount),
        dealIds: selected,
      });
      setDetail(d);
      setComposer(false);
      setReview(true);
      setConfirmed(false);
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="salesCampaigns">
      <div className="campaignHead">
        <div>
          <h3>Təklif kampaniyaları</h3>
          <p>
            Seçilmiş alıcılar, təsdiqlənən məktublar və cavabda dayanan
            xatırlatmalar.
          </p>
        </div>
        <button
          className="salesPrimary"
          disabled={busy || !list.config?.ready}
          onClick={() => {
            setComposer(true);
            setError("");
          }}
        >
          Yeni kampaniya
        </button>
      </div>
      {error && (
        <p className="campaignError" role="alert">
          {error}
        </p>
      )}
      {notice && (
        <p className="campaignNotice" role="status">
          {notice}
        </p>
      )}
      <section className="campaignBox">
        <strong>Göndərən: {list.config?.sender || "Qurulmayıb"}</strong>
        <p>
          Cavab poçtu: {list.config?.replyTo || "Qurulmayıb"} · Platforma üzrə
          gündəlik limit: {list.config?.globalLimit || "—"}
        </p>
        {!list.config?.ready && (
          <p className="campaignError">
            SMTP, IMAP, HTTPS ünvanı və kampaniya açarı serverdə
            hazırlanmalıdır.
          </p>
        )}
        {list.config?.ready && !list.config.enabled && (
          <p>
            Göndəriş serverdə söndürülüb. Qaralama hazırlamaq olar; təsdiqli
            göndəriş üçün administrator aktivləşdirməlidir.
          </p>
        )}
        <p>
          Son uğurlu emal: {dt(list.worker?.lastCheckedAt)}. Avtomatik işləmə
          üçün scheduler qoşulmalıdır.
        </p>
        {list.worker?.lastError && (
          <p className="campaignError">{list.worker.lastError}</p>
        )}
        <button
          className="salesSecondary"
          disabled={busy || !list.config?.ready || !list.config?.enabled}
          onClick={() => {
            if (
              confirm(
                "Təsdiqlənmiş aktiv kampaniyaların növbəsi emal edilsin? Uyğun olduqda bir məktub göndərilə bilər.",
              )
            )
              void action({ action: "run", confirm: true });
          }}
        >
          Növbəni indi emal et
        </button>
      </section>
      <p className="campaignSmall">
        “SMTP qəbul etdi” məktubun inbox-a çatmasını və ya oxunmasını
        təsdiqləmir. Bu versiyada e-poçt mətnləri göndərilir; WhatsApp
        kampaniyası, AI fərdiləşdirməsi və fayl əlavələri daxil deyil.
      </p>
      <div className="campaignList">
        {list.items.map((c: R) => (
          <button
            key={c.id}
            className={
              "campaignItem " + (detail?.campaign.id === c.id ? "selected" : "")
            }
            onClick={() => void open(c.id)}
          >
            <strong>{c.name}</strong>
            <span>
              {labels[c.state] || c.state} · {c._count.recipients} alıcı
            </span>
            <small>
              {Object.entries(c.counts || {})
                .map(([s, n]) => `${labels[s] || s}: ${n}`)
                .join(" · ")}
            </small>
          </button>
        ))}
        {!list.items.length && <p>Hələ kampaniya yoxdur.</p>}
      </div>
      {detail && (
        <section className="campaignBox">
          <div className="campaignHead">
            <div>
              <h3>{detail.campaign.name}</h3>
              <p>
                {labels[detail.campaign.state]} · {detail.total} alıcı · Gündə{" "}
                {detail.campaign.dailyLimit} məktub · Bakı vaxtı{" "}
                {detail.campaign.startHour}:00–{detail.campaign.endHour}:00
              </p>
              <p>
                Başlama: {dt(detail.campaign.startsAt)} ·{" "}
                {detail.campaign.weekdaysOnly
                  ? "Yalnız iş günləri"
                  : "Həftənin bütün günləri"}
              </p>
            </div>
            <button
              className="salesSecondary"
              disabled={busy}
              onClick={() => void open(detail.campaign.id, detail.page)}
            >
              Yenilə
            </button>
          </div>
          {detail.skipped?.length > 0 && (
            <details>
              <summary>{detail.skipped.length} qeyd kənarda qaldı</summary>
              {detail.skipped.map((s: R, i: number) => (
                <p key={i}>
                  {s.title}: {s.reason}
                </p>
              ))}
            </details>
          )}
          <div className="campaignActions">
            {["DRAFT", "PAUSED"].includes(detail.campaign.state) && (
              <button
                disabled={busy}
                className="salesPrimary"
                onClick={() => {
                  setReview(!review);
                  setConfirmed(false);
                }}
              >
                Məktublara bax və təsdiqlə
              </button>
            )}
            {detail.campaign.state === "ACTIVE" && (
              <button
                disabled={busy}
                className="salesSecondary"
                onClick={() =>
                  void action({ id: detail.campaign.id, action: "pause" })
                }
              >
                Fasilə ver
              </button>
            )}
            {["DRAFT", "ACTIVE", "PAUSED"].includes(detail.campaign.state) && (
              <button
                disabled={busy}
                className="salesSecondary"
                onClick={() => {
                  if (
                    confirm(
                      "Kampaniya ləğv edilsin? Sonrakı göndərişlər dayanacaq. Artıq başlanmış məktub geri çağırılmır.",
                    )
                  )
                    void action({ id: detail.campaign.id, action: "cancel" });
                }}
              >
                Kampaniyanı ləğv et
              </button>
            )}
          </div>
          {review && (
            <div className="campaignReview">
              <h4>Göndərişdən əvvəl yoxlama</h4>
              <p>
                Göndərən: {detail.campaign.sender} · Cavab ünvanı:{" "}
                {detail.campaign.replyTo}
              </p>
              <p>
                İlk məktubdan sonra intervallar:{" "}
                {(detail.campaign.steps as R[])
                  .slice(1)
                  .map((s) => s.afterDays + " gün")
                  .join(", ") || "Xatırlatma yoxdur"}
                . Cavab, görüş, imtina və ya bağlanmış satış olduqda ardıcıllıq
                dayanır.
              </p>
              <label className="campaignCheck">
                <input
                  type="checkbox"
                  checked={confirmed}
                  onChange={(e) => setConfirmed(e.target.checked)}
                />{" "}
                {detail.total} alıcını, göndəriş vaxtını və aşağıda baxış üçün
                göstərilən bütün məktub addımlarını yoxladım. Bu ardıcıllığın
                avtomatik göndərilməsini təsdiqləyirəm.
              </label>
              <button
                className="salesPrimary"
                disabled={!confirmed || busy || !list.config?.enabled}
                onClick={() =>
                  void action({
                    id: detail.campaign.id,
                    action:
                      detail.campaign.state === "DRAFT" ? "approve" : "resume",
                    reviewKey: detail.reviewKey,
                    confirm: true,
                  })
                }
              >
                Təsdiqlə və növbəyə qoy
              </button>
            </div>
          )}
          <div className="campaignRecipients">
            {detail.recipients.map((r: R) => (
              <article key={r.id} className="campaignRecipient">
                <div className="campaignHead">
                  <div>
                    <strong>{r.fields.company}</strong>
                    <p>
                      {r.fields.name} · {r.email}
                    </p>
                    <span className={"campaignBadge " + r.state.toLowerCase()}>
                      {labels[r.state] || r.state}
                    </span>
                  </div>
                  <div>
                    <small>Son göndəriş: {dt(r.lastSentAt)}</small>
                    <p>
                      Növbəti vaxt: {r.state === "PENDING" ? dt(r.nextAt) : "—"}
                    </p>
                  </div>
                </div>
                {r.stopReason && <p>{r.stopReason}</p>}
                <details open={review}>
                  <summary>Məktublar və göndəriş tarixçəsi</summary>
                  {r.preview.map((p: R, i: number) => (
                    <div key={i} className="campaignPreview">
                      <strong>
                        {i === 0 ? "Əsas təklif" : `Xatırlatma ${i}`} —{" "}
                        {p.subject}
                      </strong>
                      <pre>{p.text}</pre>
                      <small>
                        {labels[
                          r.deliveries.find((x: R) => x.step === i)?.state
                        ] || "Göndərilməyib"}
                      </small>
                    </div>
                  ))}
                </details>
                <div className="campaignActions">
                  <button
                    disabled={busy}
                    onClick={() =>
                      void action({
                        action: "recipient",
                        recipientId: r.id,
                        outcome: "reply",
                      })
                    }
                  >
                    Cavab alındı
                  </button>
                  <button
                    disabled={busy}
                    onClick={() =>
                      void action({
                        action: "recipient",
                        recipientId: r.id,
                        outcome: "meeting",
                      })
                    }
                  >
                    Görüş təyin edildi
                  </button>
                  <button
                    disabled={busy}
                    onClick={() =>
                      void action({
                        action: "recipient",
                        recipientId: r.id,
                        outcome: "declined",
                      })
                    }
                  >
                    İmtina etdi
                  </button>
                  <button
                    disabled={busy}
                    onClick={() =>
                      void action({
                        action: "recipient",
                        recipientId: r.id,
                        outcome: "stop",
                      })
                    }
                  >
                    Dayandır
                  </button>
                  <button
                    disabled={busy}
                    onClick={() => {
                      if (
                        confirm(
                          `${r.email} üçün bütün gələcək təklif kampaniyaları dayandırılsın?`,
                        )
                      )
                        void action({
                          action: "recipient",
                          recipientId: r.id,
                          outcome: "unsubscribe",
                        });
                    }}
                  >
                    Göndərişdən çıxar
                  </button>
                </div>
              </article>
            ))}
          </div>
          <div className="campaignActions">
            <button
              disabled={busy || detail.page <= 1}
              onClick={() => void open(detail.campaign.id, detail.page - 1)}
            >
              Əvvəlki
            </button>
            <span>
              {detail.page} / {Math.max(1, Math.ceil(detail.total / 50))}
            </span>
            <button
              disabled={busy || detail.page * 50 >= detail.total}
              onClick={() => void open(detail.campaign.id, detail.page + 1)}
            >
              Növbəti
            </button>
          </div>
        </section>
      )}
      {composer && (
        <div className="campaignBackdrop">
          <section
            className="campaignModal"
            role="dialog"
            aria-modal="true"
            aria-label="Yeni təklif kampaniyası"
          >
            <div className="campaignHead">
              <h3>Yeni təklif kampaniyası</h3>
              <button disabled={busy} onClick={() => setComposer(false)}>
                Bağla
              </button>
            </div>
            {error && (
              <p role="alert" className="campaignError">
                {error}
              </p>
            )}
            <div className="campaignGrid">
              <label>
                Kampaniya adı
                <input
                  value={form.name}
                  maxLength={120}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </label>
              <label>
                Gündəlik limit
                <input
                  type="number"
                  min={1}
                  max={Math.min(100, list.config?.globalLimit || 50)}
                  value={form.dailyLimit}
                  onChange={(e) =>
                    setForm({ ...form, dailyLimit: Number(e.target.value) })
                  }
                />
              </label>
              <label>
                Başlama tarixi — cihazının yerli vaxtı
                <input
                  type="datetime-local"
                  value={form.startsAt}
                  onChange={(e) =>
                    setForm({ ...form, startsAt: e.target.value })
                  }
                />
              </label>
              <label>
                Xatırlatma sayı
                <select
                  value={stepCount}
                  onChange={(e) => setStepCount(Number(e.target.value))}
                >
                  <option value={1}>Xatırlatma yoxdur</option>
                  <option value={2}>1 xatırlatma</option>
                  <option value={3}>2 xatırlatma</option>
                </select>
              </label>
              <label>
                Başlama saatı — Bakı
                <input
                  type="number"
                  min={0}
                  max={23}
                  value={form.startHour}
                  onChange={(e) =>
                    setForm({ ...form, startHour: Number(e.target.value) })
                  }
                />
              </label>
              <label>
                Bitmə saatı — Bakı
                <input
                  type="number"
                  min={1}
                  max={24}
                  value={form.endHour}
                  onChange={(e) =>
                    setForm({ ...form, endHour: Number(e.target.value) })
                  }
                />
              </label>
            </div>
            <label className="campaignCheck">
              <input
                type="checkbox"
                checked={form.weekdaysOnly}
                onChange={(e) =>
                  setForm({ ...form, weekdaysOnly: e.target.checked })
                }
              />
              Yalnız bazar ertəsi–cümə göndər
            </label>
            <h4>Alıcıları seç — {selected.length} seçilib</h4>
            <div className="campaignGrid">
              <input
                aria-label="Alıcı axtarışı"
                placeholder="Ad, sahə, e-poçt və ya qeyd üzrə axtar"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <select
                aria-label="Mənbə filtri"
                value={source}
                onChange={(e) => setSource(e.target.value)}
              >
                <option value="">Bütün mənbələr</option>
                {Array.from(
                  new Set(available.map((d) => d.source).filter(Boolean)),
                ).map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <label className="campaignCheck">
              <input
                type="checkbox"
                checked={onlyTodo}
                onChange={(e) => setOnlyTodo(e.target.checked)}
              />
              Təklif göndərilməli olanlar / qaralamalar
            </label>
            <div className="campaignActions">
              <button
                onClick={() =>
                  setSelected(
                    Array.from(
                      new Set([...selected, ...filtered.map((d) => d.id)]),
                    ).slice(0, 300),
                  )
                }
              >
                Filtrdəki alıcıları seç
              </button>
              <button onClick={() => setSelected([])}>Seçimi təmizlə</button>
            </div>
            <div className="campaignPicker">
              {filtered.map((d) => (
                <label className="campaignCheck" key={d.id}>
                  <input
                    type="checkbox"
                    checked={selected.includes(d.id)}
                    onChange={(e) =>
                      setSelected(
                        e.target.checked
                          ? [...selected, d.id].slice(0, 300)
                          : selected.filter((x) => x !== d.id),
                      )
                    }
                  />
                  <span>
                    <strong>{d.title}</strong>
                    <small>
                      {d.contactName} · {d.email || d.client?.email}
                    </small>
                  </span>
                </label>
              ))}
              {!filtered.length && <p>Bu filtrə uyğun alıcı yoxdur.</p>}
            </div>
            <p>
              Dəyişənlər: <code>{"{{name}}, {{company}}, {{service}}"}</code>.
              Hər alıcının hazırlanmış mətni qaralamada görünəcək. Xatırlatma
              intervalı əvvəlki məktubdan hesablanır.
            </p>
            {sequence.slice(0, stepCount).map((s, i) => (
              <fieldset key={i}>
                <legend>{i === 0 ? "Əsas təklif" : `Xatırlatma ${i}`}</legend>
                {i > 0 && (
                  <label>
                    Əvvəlki məktubdan neçə gün sonra
                    <input
                      type="number"
                      min={1}
                      max={30}
                      value={s.afterDays}
                      onChange={(e) =>
                        setSequence(
                          sequence.map((x, j) =>
                            j === i
                              ? { ...x, afterDays: Number(e.target.value) }
                              : x,
                          ),
                        )
                      }
                    />
                  </label>
                )}
                <label>
                  Mövzu
                  <input
                    maxLength={200}
                    value={s.subject}
                    onChange={(e) =>
                      setSequence(
                        sequence.map((x, j) =>
                          j === i ? { ...x, subject: e.target.value } : x,
                        ),
                      )
                    }
                  />
                </label>
                <label>
                  Məktub mətni
                  <textarea
                    rows={6}
                    maxLength={12000}
                    value={s.body}
                    onChange={(e) =>
                      setSequence(
                        sequence.map((x, j) =>
                          j === i ? { ...x, body: e.target.value } : x,
                        ),
                      )
                    }
                  />
                </label>
              </fieldset>
            ))}
            <button
              className="salesPrimary"
              disabled={busy || !selected.length || !form.name.trim()}
              onClick={() => void create()}
            >
              {busy ? "Hazırlanır…" : "Qaralamanı hazırla — məktub göndərilmir"}
            </button>
          </section>
        </div>
      )}
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import styles from "./whatsapp.module.css";

type Contact = { phone: string; name: string; stage: string; consentAt: string | null;
  optedOutAt: string | null; lastInboundAt: string | null; followUpAt: string | null };
type Data = { hasPublicProposal: boolean; aiConfigured: boolean; configured: boolean; template: string; canReply: boolean; selected?: Contact;
  contacts: Contact[]; offers: { id: string; title: string; recipientName: string }[];
  messages: { id: string; direction: string; status: string; body: string; createdAt: string }[] };
const stageLabels: Record<string, string> = {
  NEW: "Yeni", INTERESTED: "Maraqlanır", FOLLOW_UP: "Təkrar əlaqə", MEETING: "Görüş", WON: "Qazanıldı", LOST: "Bağlandı",
};
const deliveryLabels: Record<string, string> = {
  PENDING: "Göndərilir", ACCEPTED: "Meta qəbul etdi", SENT: "Göndərildi", DELIVERED: "Çatdı",
  READ: "Oxundu", FAILED: "Göndəriş alınmadı", RECEIVED: "Gələn mesaj", UNKNOWN: "Status dəqiqləşdirilir",
};
const drafts = [
  ["Ehtiyacı öyrən", "Salam! The New Era komandasından yazırıq. Bu ay daha çox müraciət almaq istədiyiniz xidmət hansıdır?"],
  ["Təklif et", "Bir xidmətinizi seçib ona uyğun reklam və qeydiyyat axını qura bilərik. Sizin üçün prioritet xidməti və hazırda istifadə etdiyiniz müraciət kanalını öyrənə bilərik?"],
  ["Görüş təklif et", "Uyğundursa, qısa görüşdə ehtiyacınızı və sizə uyğun paketləri müzakirə edək. Hansı gün və saat sizə uyğundur?"],
];
const api = "/api/admin/sales/whatsapp";
const stamp = (value: string) => new Date(value).toLocaleString("az-AZ", { timeZone: "Asia/Baku" });
export default function WhatsappInbox() {
  const [data, setData] = useState<Data>(), [phone, setPhone] = useState(""),
    [query, setQuery] = useState(""), [filter, setFilter] = useState("all"), [offerId, setOffer] = useState(""), [draft, setDraft] = useState(""),
    [note, setNote] = useState(""), [date, setDate] = useState(""),
    [error, setError] = useState(""), [busy, setBusy] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    async function refresh() {
      try {
        const response = await fetch(api + "?phone=" + encodeURIComponent(phone), { cache: "no-store", signal: controller.signal });
        const result = await response.json();
        if (!response.ok) throw Error(result.error);
        if (!controller.signal.aborted) setData(result);
      } catch (err) {
        if (!controller.signal.aborted) setError(err instanceof Error ? err.message : "Məlumat alınmadı.");
      }
    }
    void refresh();
    const interval = setInterval(refresh, 8000);
    return () => { controller.abort(); clearInterval(interval); };
  }, [phone]);
  async function perform(body: object) {
    setBusy(true); setError("");
    try {
      const response = await fetch(api, { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, ...body }) });
      const result = await response.json();
      if (!response.ok) throw Error(result.error);
      if (typeof result.draft === "string") setDraft(result.draft);
      else setData(result);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Əməliyyat alınmadı.");
      return false;
    } finally { setBusy(false); }
  }
  const active = data?.selected?.phone === phone ? data.selected : undefined;
  const contacts = data?.contacts.filter(c =>
    (c.name + " " + c.phone).toLocaleLowerCase("az-AZ").includes(query.toLocaleLowerCase("az-AZ")) &&
    (filter === "all" || (filter === "inbound" && c.lastInboundAt) ||
      (filter === "followup" && c.followUpAt && Date.parse(c.followUpAt) <= Date.now())));
  return <main className={styles.page}>
    <a href="/admin">← Admin panel</a><h1>WhatsApp satış paneli</h1>
    <p>{data?.configured ? `Meta ayarları daxil edilib · ${data.template}` : "Meta bağlantısı üçün server ayarları tələb olunur."}</p>
    {error && <p role="alert" className={styles.error}>{error}</p>}
    <div className={styles.layout}>
      <aside><label>Müştəri axtar<input value={query} onChange={e => setQuery(e.target.value)} placeholder="Ad və ya telefon"/></label>
        <label>Filtr<select value={filter} onChange={e => setFilter(e.target.value)}>
          <option value="all">Bütün əlaqələr</option><option value="inbound">Gələn mesajı olanlar</option>
          <option value="followup">Təkrar əlaqə vaxtı çatanlar</option>
        </select></label><p>{contacts?.length ?? 0} əlaqə</p>
        <div className={styles.contacts}>{contacts?.map(c => <button key={c.phone} disabled={busy} aria-pressed={phone === c.phone}
          onClick={() => { setPhone(c.phone); setOffer(""); setDraft(""); setNote(""); setDate(""); setError(""); }}>
          <strong>{c.name}</strong><small>+{c.phone} · {stageLabels[c.stage] || c.stage}</small>
          {c.lastInboundAt && <small>Son gələn mesaj: {stamp(c.lastInboundAt)}</small>}
          {c.followUpAt && <small>Təkrar əlaqə: {stamp(c.followUpAt)}</small>}
        </button>)}</div>
      </aside>
      {active ? <section>
        <h2>{active.name}</h2><p>+{active.phone} · {active.optedOutAt ? "Göndəriş dayandırılıb" : active.consentAt ? "Marketinq razılığı qeyd olunub" : "Marketinq razılığı qeyd edilməyib"}</p>
        <div className={styles.history} aria-label="Mesaj tarixçəsi">
          {data?.messages.length ? data.messages.map(m => <article key={m.id} data-direction={m.direction}>
            <small>{deliveryLabels[m.status] || m.status} · {stamp(m.createdAt)}</small><p>{m.body}</p>
          </article>) : <p>Yazışma yoxdur.</p>}
        </div>
        <div className={styles.group}>
          <label>Yayımlanmış təklif<select value={offerId} onChange={e => setOffer(e.target.value)}><option value="">Təklif seçin</option>
            {data?.hasPublicProposal && <option value="PUBLIC">Ümumi paket təqdimatı</option>}
            {data?.offers.map(o => <option key={o.id} value={o.id}>{o.title} · {o.recipientName}</option>)}</select></label>
          <button disabled={busy || !offerId || !active.consentAt || !!active.optedOutAt || !data?.configured}
            onClick={() => void perform({ action: "send", offerId, requestKey: crypto.randomUUID() })}>Təklifi WhatsApp-a göndər</button>
        </div>
        <h3>Satış köməkçisi</h3>
        <p>Hazır mətni seçin, müştəriyə uyğun redaktə edin və cavabı göndərin.</p>
        <div className={styles.group}>{drafts.map(([label, text]) => <button key={label} onClick={() => setDraft(text)}>{label}</button>)}
          {data?.aiConfigured && <button disabled={busy || !active.lastInboundAt} onClick={() => void perform({ action: "draft" })}>AI cavab layihəsi hazırla</button>}</div>
        <textarea aria-label="Cavab mətni" value={draft} maxLength={4096} onChange={e => setDraft(e.target.value)} placeholder="Cavab yazın"/>
        <button disabled={busy || !draft.trim() || !data?.canReply || !data.configured || !!active.optedOutAt}
          onClick={async () => { if (await perform({ action: "send", text: draft, requestKey: crypto.randomUUID() })) setDraft(""); }}>Cavabı göndər</button>
        {!data?.canReply && <p>Son gələn mesajdan sonra 24 saatlıq cavab pəncərəsi açılır.</p>}
        <details><summary>Satış mərhələsi və təkrar əlaqə</summary>
          <div className={styles.group}>
            <label>Mərhələ<select disabled={busy} value={active.stage} onChange={e => void perform({ action: "stage", stage: e.target.value, followUp: active.followUpAt })}>
              {Object.entries(stageLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select></label>
            <label>Təkrar əlaqə vaxtı (Bakı)<input type="datetime-local" value={date} onChange={e => setDate(e.target.value)}/></label>
            <button disabled={busy || !date} onClick={() => void perform({ action: "stage", stage: active.stage, followUp: date + "+04:00" })}>Vaxtı saxla</button>
            {active.followUpAt && <button disabled={busy} onClick={() => void perform({ action: "stage", stage: active.stage })}>Vaxtı sil</button>}
          </div>
        </details>
        <details><summary>Marketinq razılığı</summary>
          <div className={styles.group}><label>Razılığın mənbəyi<input value={note} maxLength={400} onChange={e => setNote(e.target.value)} placeholder="Müştərinin razılıq verdiyi kanal və tarix"/></label>
            <button disabled={busy || !note.trim()} onClick={() => void perform({ action: "consent", note })}>Razılığı qeyd et</button>
            <button disabled={busy || !!active.optedOutAt} onClick={() => void perform({ action: "stop" })}>Göndərişi dayandır</button></div>
        </details>
      </section> : <section><p>Yazışmanı açmaq üçün müştəri seçin.</p></section>}
    </div>
  </main>;
}

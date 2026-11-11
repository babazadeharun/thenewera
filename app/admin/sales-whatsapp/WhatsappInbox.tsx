"use client";

import { useEffect, useState } from "react";
import styles from "./whatsapp.module.css";

type Contact = { salesCrm: boolean; phone: string; name: string; stage: string; consentAt: string | null;
  optedOutAt: string | null; lastInboundAt: string | null; followUpAt: string | null };
type Data = { databaseReady: boolean; missingDealPhone: boolean; hasPublicProposal: boolean; aiConfigured: boolean; configured: boolean; template: string; canReply: boolean; selected?: Contact;
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
    [query, setQuery] = useState(""), [filter, setFilter] = useState("crm"), [offerId, setOffer] = useState(""), [draft, setDraft] = useState(""),
    [note, setNote] = useState(""), [date, setDate] = useState(""),
    [error, setError] = useState(""), [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [connection, setConnection] = useState("");
  const [copied, setCopied] = useState(false);
  const [sending, setSending] = useState(false);
  const [batchStatus, setBatchStatus] = useState("");
  const [batchErrors, setBatchErrors] = useState<string[]>([]);
  const webhookUrl = "https://www.thenewera.space/api/sales-whatsapp/webhook";
  useEffect(() => {
    const controller = new AbortController();
    async function refresh() {
      try {
        const params = new URLSearchParams({ phone });
        if (!phone) {
          const deal = new URLSearchParams(window.location.search).get("deal");
          if (deal) params.set("deal", deal);
        }
        const response = await fetch(api + "?" + params.toString(), { cache: "no-store", signal: controller.signal });
        const result = await response.json();
        if (!response.ok) throw Error(result.error);
        if (!controller.signal.aborted) {
          setData(result);
          if (!phone && result.selected?.phone) setPhone(result.selected.phone);
        }
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
      if (result.connection) setConnection([result.connection.number, result.connection.name].filter(Boolean).join(" · "));
      else if (typeof result.draft === "string") setDraft(result.draft);
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
    (filter === "all" || (filter === "crm" && c.salesCrm) || (filter === "inbound" && c.lastInboundAt) ||
      (filter === "followup" && c.followUpAt && Date.parse(c.followUpAt) <= Date.now())));
  async function sendSelected() {
    const targets = data?.contacts.filter(c => selected.includes(c.phone) && c.salesCrm && c.consentAt && !c.optedOutAt) ?? [];
    if (!targets.length || !data?.configured || !data.databaseReady || !data.hasPublicProposal) return;
    if (!window.confirm(`Ümumi paket təqdimatı seçilmiş ${targets.length} CRM əlaqəsinə göndərilsin?`)) return;
    setSending(true); setBatchErrors([]); setBatchStatus(`0 / ${targets.length} emal olundu`);
    let sent = 0;
    const errors: string[] = [];
    try {
      for (const [index, contact] of targets.entries()) {
        try {
          const response = await fetch(api, { method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "send", phone: contact.phone, offerId: "PUBLIC",
              requestKey: crypto.randomUUID(), compact: true }) });
          const result = await response.json();
          if (!response.ok) throw Error(result.error || "Göndəriş alınmadı.");
          sent++;
          setSelected(previous => previous.filter(number => number !== contact.phone));
        } catch (error) {
          errors.push(`${contact.name}: ${error instanceof Error ? error.message : "Göndəriş alınmadı."}`);
        }
        setBatchStatus(`${index + 1} / ${targets.length} emal olundu · ${sent} Meta tərəfindən qəbul edildi`);
      }
      setBatchErrors(errors);
    } finally { setSending(false); }
  }
  const locked = busy || sending || data?.databaseReady === false;
  return <main className={styles.page}>
    <header className={styles.header}>
      <div><a href="/admin">← İdarəetmə mərkəzi</a><h1>WhatsApp satış paneli</h1>
        <p>Satış CRM əlaqələrinə təklif göndərin və cavabları bir yerdə izləyin.</p></div>
      <a className={styles.action} href="#whatsapp-connection" onClick={() => {
        const details = document.getElementById("whatsapp-connection");
        if (details instanceof HTMLDetailsElement) details.open = true;
      }}>WhatsApp-ı qoş</a>
    </header>
    <details id="whatsapp-connection" className={styles.setup} open={data?.configured === false ? true : undefined}>
      <summary>WhatsApp Business bağlantısı · {connection ? "Nömrə təsdiqləndi" : data?.configured ? "Server ayarları var" : "Quraşdırma tələb olunur"}</summary>
      <ol>
        <li><a href="https://developers.facebook.com/apps/" target="_blank" rel="noreferrer">Meta for Developers</a> bölməsində tətbiqinizi açın. WhatsApp quraşdırmasından nömrə ID-sini və göndəriş icazəli tokeni götürün.</li>
        <li><a href="https://vercel.com/newera7/thenewera/settings/environment-variables" target="_blank" rel="noreferrer">Vercel → Environment Variables</a> bölməsində Production üçün aşağıdakı ayarları əlavə edin və yenidən yayımlayın.</li>
        <li>Meta-da bu webhook ünvanını və eyni Verify Token-i daxil edin, sonra <code>messages</code> hadisəsinə abunə olun.</li>
      </ol>
      <div className={styles.keys}><code>SALES_WHATSAPP_ACCESS_TOKEN</code><code>SALES_WHATSAPP_PHONE_NUMBER_ID</code>
        <code>SALES_WHATSAPP_APP_SECRET</code><code>SALES_WHATSAPP_VERIFY_TOKEN</code><code>SALES_WHATSAPP_GRAPH_VERSION</code>
        <code>SALES_WHATSAPP_TEMPLATE_NAME</code><code>SALES_WHATSAPP_TEMPLATE_LANGUAGE</code></div>
      <p>Ümumi təqdimatın HTTPS linki üçün <code>SALES_WHATSAPP_PUBLIC_PROPOSAL_URL</code> əlavə edin. Meta-da şablon gövdəsinin bir parametri həmin link üçün ayrılmalıdır.</p>
      <div className={styles.group}><input aria-label="Webhook ünvanı" readOnly value={webhookUrl}/>
        <button onClick={async () => { try { await navigator.clipboard.writeText(webhookUrl); setCopied(true); } catch { setError("Webhook ünvanını mətn sahəsindən kopyalayın."); } }}>{copied ? "Kopyalandı" : "Webhook-u kopyala"}</button>
        <button disabled={busy || sending || !data?.configured} onClick={() => void perform({ action: "verify-connection" })}>Meta nömrəsini yoxla</button></div>
      {connection && <p role="status">Meta nömrəsi təsdiqləndi: {connection}. Gələn cavabı sınaq mesajı ilə yoxlayın.</p>}
    </details>
    {data?.databaseReady === false && <p role="alert" className={styles.notice}>Satış CRM siyahısı açıqdır. Yazışma tarixçəsi və göndəriş üçün canlı bazada <code>npm run db:deploy</code> işlədilməlidir.</p>}
    {data?.missingDealPhone && <p role="alert" className={styles.notice}>Bu Satış CRM qeydində istifadə oluna bilən telefon nömrəsi tapılmadı.</p>}
    {error && <p role="alert" className={styles.error}>{error}</p>}
    <div className={styles.layout}>
      <aside><label>Müştəri axtar<input value={query} onChange={e => setQuery(e.target.value)} placeholder="Ad və ya telefon"/></label>
        <label>Filtr<select value={filter} onChange={e => setFilter(e.target.value)}>
          <option value="crm">Satış CRM əlaqələri</option><option value="all">Bütün əlaqələr</option><option value="inbound">Gələn mesajı olanlar</option>
          <option value="followup">Təkrar əlaqə vaxtı çatanlar</option>
        </select></label><p>{contacts ? `${contacts.length} əlaqə` : error ? "Əlaqələr yüklənmədi." : "Əlaqələr yüklənir…"}</p>
        <div className={styles.bulk}>
          <strong>{selected.length} seçilib</strong>
          <button disabled={locked || !selected.length || !data?.configured || !data.hasPublicProposal}
            onClick={() => void sendSelected()}>Seçilənlərə ümumi təklif göndər</button>
          {selected.length > 0 && <button disabled={sending} onClick={() => setSelected([])}>Seçimi təmizlə</button>}
          {!data?.hasPublicProposal && <small>Ümumi göndəriş üçün təqdimat linkini WhatsApp ayarlarında qurun.</small>}
          {batchStatus && <small role="status">{batchStatus}</small>}
          {batchErrors.length > 0 && <ul>{batchErrors.map((message, index) => <li key={index}>{message}</li>)}</ul>}
        </div>
        <div className={styles.contacts}>{contacts?.map(c => <div className={styles.contactRow} key={c.phone}>
          {c.salesCrm && <input type="checkbox" aria-label={`${c.name} seç`} checked={selected.includes(c.phone)}
            disabled={locked || !c.consentAt || !!c.optedOutAt} onChange={e => {
              const checked = e.target.checked;
              setSelected(previous => checked ? [...previous, c.phone] : previous.filter(number => number !== c.phone));
            }}/>}
          <button disabled={busy || sending} aria-pressed={phone === c.phone}
          onClick={() => { setPhone(c.phone); setOffer(""); setDraft(""); setNote(""); setDate(""); setError(""); }}>
          <strong>{c.name}</strong><small>+{c.phone} · {stageLabels[c.stage] || c.stage}{c.salesCrm && !c.consentAt ? " · Razılıq qeyd edilməyib" : ""}</small>
          {c.lastInboundAt && <small>Son gələn mesaj: {stamp(c.lastInboundAt)}</small>}
          {c.followUpAt && <small>Təkrar əlaqə: {stamp(c.followUpAt)}</small>}
        </button></div>)}</div>
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
          <button disabled={locked || !offerId || !active.consentAt || !!active.optedOutAt || !data?.configured}
            onClick={() => void perform({ action: "send", offerId, requestKey: crypto.randomUUID() })}>Təklifi WhatsApp-a göndər</button>
        </div>
        <h3>Satış köməkçisi</h3>
        <p>Hazır mətni seçin, müştəriyə uyğun redaktə edin və cavabı göndərin.</p>
        <div className={styles.group}>{drafts.map(([label, text]) => <button key={label} onClick={() => setDraft(text)}>{label}</button>)}
          {data?.aiConfigured && <button disabled={locked || !active.lastInboundAt} onClick={() => void perform({ action: "draft" })}>AI cavab layihəsi hazırla</button>}</div>
        <textarea aria-label="Cavab mətni" value={draft} maxLength={4096} onChange={e => setDraft(e.target.value)} placeholder="Cavab yazın"/>
        <button disabled={locked || !draft.trim() || !data?.canReply || !data.configured || !!active.optedOutAt}
          onClick={async () => { if (await perform({ action: "send", text: draft, requestKey: crypto.randomUUID() })) setDraft(""); }}>Cavabı göndər</button>
        {!data?.canReply && <p>Son gələn mesajdan sonra 24 saatlıq cavab pəncərəsi açılır.</p>}
        <details><summary>Satış mərhələsi və təkrar əlaqə</summary>
          <div className={styles.group}>
            <label>Mərhələ<select disabled={locked} value={active.stage} onChange={e => void perform({ action: "stage", stage: e.target.value, followUp: active.followUpAt })}>
              {Object.entries(stageLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select></label>
            <label>Təkrar əlaqə vaxtı (Bakı)<input type="datetime-local" value={date} onChange={e => setDate(e.target.value)}/></label>
            <button disabled={locked || !date} onClick={() => void perform({ action: "stage", stage: active.stage, followUp: date + "+04:00" })}>Vaxtı saxla</button>
            {active.followUpAt && <button disabled={locked} onClick={() => void perform({ action: "stage", stage: active.stage })}>Vaxtı sil</button>}
          </div>
        </details>
        <details><summary>Marketinq razılığı</summary>
          <div className={styles.group}><label>Razılığın mənbəyi<input value={note} maxLength={400} onChange={e => setNote(e.target.value)} placeholder="Müştərinin razılıq verdiyi kanal və tarix"/></label>
            <button disabled={locked || !note.trim()} onClick={() => void perform({ action: "consent", note })}>Razılığı qeyd et</button>
            <button disabled={locked || !!active.optedOutAt} onClick={() => void perform({ action: "stop" })}>Göndərişi dayandır</button></div>
        </details>
      </section> : <section><p>Yazışmanı açmaq üçün müştəri seçin.</p></section>}
    </div>
  </main>;
}

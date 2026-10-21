'use client';
import { useEffect, useRef, useState } from 'react';
import { Copy, ExternalLink, Instagram, Search, X } from 'lucide-react';
import { outreachStatuses, outreachTemplates, fillOutreachTemplate, statusLabel } from '@/lib/sales/prospecting-shared';
import './sales-prospecting.css';
const endpoint = '/api/admin/sales/prospecting';
async function api(body?: any, query = '', signal?: AbortSignal) {
  const r = await fetch(endpoint + query, { method: body ? 'POST' : 'GET', cache: 'no-store', headers: body ? { 'Content-Type': 'application/json' } : undefined, body: body ? JSON.stringify(body) : undefined, signal });
  const d = await r.json();
  if (!r.ok) throw Error(d.error || 'Sorğu alınmadı.');
  return d;
}
const when = (s?: string) => s ? new Date(s).toLocaleString('az-AZ', { timeZone: 'Asia/Baku' }) : '—';
export default function SalesProspecting() {
  const [query, setQuery] = useState(''), [filter, setFilter] = useState('ALL'), [page, setPage] = useState(1);
  const [data, setData] = useState<any>(null), [error, setError] = useState(''), [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(''), [detail, setDetail] = useState<any>(null), [detailError, setDetailError] = useState('');
  const [revision, setRevision] = useState(0);
  const closeButton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const c = new AbortController(); setLoading(true); setError('');
    const timer = setTimeout(() => {
      api(undefined, '?' + new URLSearchParams({ q: query, status: filter, page: String(page) }), c.signal)
        .then(setData).catch(e => { if (!c.signal.aborted) setError(e.message); }).finally(() => { if (!c.signal.aborted) setLoading(false); });
    }, 250);
    return () => { clearTimeout(timer); c.abort(); };
  }, [query, filter, page, revision]);
  useEffect(() => {
    if (!selected) { setDetail(null); return; }
    const c = new AbortController(); setDetail(null); setDetailError('');
    api(undefined, '?id=' + encodeURIComponent(selected), c.signal).then(setDetail).catch(e => { if (!c.signal.aborted) setDetailError(e.message); });
    return () => c.abort();
  }, [selected]);
  useEffect(() => {
    if (!selected) return;
    const previous = document.activeElement as HTMLElement | null;
    const oldOverflow = document.body.style.overflow; document.body.style.overflow = 'hidden'; closeButton.current?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelected('');
      if (e.key === 'Tab') {
        const nodes = Array.from(document.querySelectorAll<HTMLElement>('.spDialog button:not(:disabled), .spDialog input, .spDialog select, .spDialog textarea, .spDialog a[href]'));
        const first = nodes[0], last = nodes[nodes.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); }
      }
    };
    document.addEventListener('keydown', key);
    return () => { document.body.style.overflow = oldOverflow; document.removeEventListener('keydown', key); previous?.focus(); };
  }, [selected]);
  return <section className="spRoot">
    <header className="spHeading"><Instagram size={26}/><div><h2>Instagram əlaqələri</h2><p>Yeni potensial müştərilərlə fərdi əlaqə və nəticələrin izlənməsi.</p></div></header>
    <p className="spHint">Mesajı hazırlayın → kopyalayın → Instagram profilindən özünüz göndərin → nəticəni qeyd edin. Profilin açılması və kopyalama göndəriş sayılmır. Bu bölmə Instagram API bağlantısı olmadan da işləyir.</p>
    <div className="spTools"><label><Search size={17}/><input aria-label="Müştəri və Instagram profili axtar" value={query} onChange={e => { setQuery(e.target.value); setPage(1); }} placeholder="Müştəri, şirkət və ya @profil…"/></label><select aria-label="Əlaqə statusu" value={filter} onChange={e => { setFilter(e.target.value); setPage(1); }}><option value="ALL">Bütün əlaqə statusları</option>{outreachStatuses.map(([v,l]) => <option key={v} value={v}>{l}</option>)}</select></div>
    {error && <p role="alert" className="spError">{error} <button onClick={() => setRevision(x => x + 1)}>Yenidən yoxla</button></p>}
    {loading ? <p role="status">Yüklənir…</p> : !error && <>
      <p className="spMuted">{data?.total || 0} satış qeydi. Müştərilər mövcud Satış CRM siyahısından götürülür; profil məlumatını ilk dəfə açarkən əlavə edin.</p>
      <div className="spRows">{data?.items.map((d: any) => <button className="spRow" key={d.id} onClick={() => setSelected(d.id)}><span><strong>{d.client?.company || d.contactName || d.title}</strong><small>{d.title}</small></span><span>{d.instagramProspect?.username ? '@' + d.instagramProspect.username : 'Profil əlavə et'}</span><span className="spBadge">{statusLabel(d.instagramProspect?.status || 'NEW')}</span><small>Son əlaqə: {when(d.instagramProspect?.lastContactAt)}</small></button>)}</div>
      {!data?.items.length && <p>Nəticə yoxdur. “Yeni satış” və ya “Fayldan idxal et” ilə potensial müştəriləri əlavə edə bilərsiniz.</p>}
      <nav className="spPages" aria-label="Əlaqə siyahısının səhifələri"><button disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Əvvəlki</button><span>{page} / {Math.max(1, Math.ceil((data?.total || 0) / 25))}</span><button disabled={page * 25 >= (data?.total || 0)} onClick={() => setPage(p => p + 1)}>Növbəti</button></nav>
    </>}
    {selected && <div className="spBackdrop" onMouseDown={e => { if (e.target === e.currentTarget) setSelected(''); }}><div className="spDialog" role="dialog" aria-modal="true" aria-labelledby="spTitle"><div className="spDialogHead"><h3 id="spTitle">Fərdi Instagram əlaqəsi</h3><button ref={closeButton} aria-label="Bağla" onClick={() => setSelected('')}><X/></button></div>{detailError ? <p role="alert" className="spError">{detailError}</p> : !detail ? <p>Yüklənir…</p> : <Composer key={detail.deal.id} initial={detail} changed={() => setRevision(x => x + 1)}/>}</div></div>}
  </section>;
}
function Composer({ initial, changed }: { initial: any; changed: () => void }) {
  const [data, setData] = useState(initial), [username, setUsername] = useState(initial.deal.instagramProspect?.username || initial.suggestedUsername || '');
  const [draft, setDraft] = useState(initial.deal.instagramProspect?.draft || ''), [status, setStatus] = useState(initial.deal.instagramProspect?.status || 'NEW');
  const [offerId, setOfferId] = useState(''), [link, setLink] = useState(''), [busy, setBusy] = useState(false), [notice, setNotice] = useState(''), [error, setError] = useState(''), [confirmed, setConfirmed] = useState(false);
  const [template, setTemplate] = useState('intro');
  const preview = useRef<HTMLTextAreaElement>(null);
  const prospect = data.deal.instagramProspect, blocked = prospect?.status === 'DO_NOT_CONTACT';
  const dirty = username !== (prospect?.username || '') || draft !== (prospect?.draft || '');
  const body = [draft.trim(), link].filter(Boolean).join('\n\n');
  async function run(fn: () => Promise<void>) { setBusy(true); setError(''); setNotice(''); try { await fn(); } catch (e: any) { setError(e.message); } finally { setBusy(false); } }
  async function refresh() { const d = await api(undefined, '?id=' + encodeURIComponent(data.deal.id)); setData(d); setUsername(d.deal.instagramProspect?.username || ''); setDraft(d.deal.instagramProspect?.draft || ''); setStatus(d.deal.instagramProspect?.status || 'NEW'); setConfirmed(false); changed(); }
  async function copy() {
    if (!body || blocked) return;
    setError(''); setNotice('');
    try { await navigator.clipboard.writeText(body); setNotice('Mesaj kopyalandı. Instagram-da özünüz göndərin, sonra statusu ayrıca qeyd edin.'); }
    catch { preview.current?.focus(); preview.current?.select(); setNotice('Mesaj seçildi. Ctrl+C və ya cihazınızın kopyalama əmri ilə kopyalayın.'); }
  }
  return <>
    <h4>{data.deal.client?.company || data.deal.contactName || data.deal.title}</h4>
    <label className="spField">Instagram istifadəçi adı və ya profil linki<input maxLength={200} value={username} onChange={e => setUsername(e.target.value)} placeholder="@istifadəçi_adı və ya https://www.instagram.com/…"/></label>
    <div className="spTools"><select aria-label="Mesaj nümunəsi" value={template} onChange={e => setTemplate(e.target.value)}>{outreachTemplates.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}</select><button disabled={busy || blocked} onClick={() => { if (draft.trim() && !window.confirm('Mövcud qaralama seçilən nümunə ilə əvəz edilsin?')) return; setDraft(fillOutreachTemplate(outreachTemplates.find(t => t.id === template)!.text, data.deal.contactName || data.deal.client?.firstName || '', data.deal.client?.company || '')); setLink(''); }}>Nümunəni uyğunlaşdır</button></div>
    <label className="spField">Fərdi mesaj qaralaması<textarea rows={5} maxLength={4000} value={draft} onChange={e => setDraft(e.target.value)}/></label>
    <div className="spActions"><button className="spPrimary" disabled={busy || !dirty} onClick={() => run(async () => { await api({ action: 'save', dealId: data.deal.id, version: prospect?.version || 0, username, draft }); await refresh(); setNotice('Profil və qaralama yadda saxlanıldı.'); })}>Profil və qaralamanı saxla</button>{prospect?.username && !dirty && <a href={'https://www.instagram.com/' + prospect.username + '/'} target="_blank" rel="noopener noreferrer"><ExternalLink size={16}/> Instagram profilini aç</a>}</div>
    {dirty && <p className="spMuted">Profil keçidini açmadan və status qeyd etmədən əvvəl dəyişiklikləri saxlayın.</p>}
    <label className="spField">Bu satışın aktiv onlayn təklifi (istəyə bağlı)<select value={offerId} onChange={e => { setOfferId(e.target.value); setLink(''); }}><option value="">Təklif seçilməyib</option>{data.offers.map((o: any) => <option key={o.id} value={o.id}>{o.title} · v{o.version}{o.firstViewedAt ? ' · Baxılıb' : ''}</option>)}</select></label>
    <button disabled={busy || !offerId || blocked} onClick={() => run(async () => { const d = await api({ action: 'offer-link', dealId: data.deal.id, offerId }); setLink(d.link); setNotice('Təklif linki aşağıdakı mesaja əlavə edildi.'); })}>Təklif linkini mesaja əlavə et</button>
    {!data.offers.length && <p className="spMuted">Aktiv yayımlanmış təklif yoxdur. “Onlayn təkliflər” bölməsindən bu satış üçün hazırlayın. Baxış və müştəri cavabları həmin bölmədə izlənir.</p>}
    <label className="spField">Kopyalanacaq mesaj<textarea ref={preview} readOnly rows={5} value={body}/></label>
    <button disabled={!body || busy || blocked} onClick={copy}><Copy size={16}/> Mesajı kopyala</button>
    {blocked && <p className="spError">Bu müştəri “Əlaqə saxlamayın” kimi qeyd olunub. Kopyalama və təklif linki əlavə etmək dayandırılıb.</p>}
    <hr/>
    <label className="spField">Əlaqənin nəticəsi<select value={status} onChange={e => { setStatus(e.target.value); setConfirmed(false); }}>{outreachStatuses.map(([v,l]) => <option key={v} value={v}>{l}</option>)}</select></label>
    {['FIRST_SENT','OFFER_SHARED'].includes(status) && <label className="spCheck"><input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)}/> Mesajı / təklif linkini Instagram-da özüm göndərmişəm.</label>}
    <button className="spPrimary" disabled={busy || dirty || status === (prospect?.status || 'NEW') || (['FIRST_SENT','OFFER_SHARED'].includes(status) && !confirmed)} onClick={() => run(async () => { await api({ action: 'status', dealId: data.deal.id, version: prospect?.version || 0, status, confirm: confirmed }); await refresh(); setNotice('Əlaqə statusu qeydə alındı.'); })}>Nəticəni qeyd et</button>
    <p className="spMuted">Bunlar operatorun qeydləridir; Instagram-dan çatdırılma, oxunma və ya cavab təsdiqi deyil. Satış mərhələsi və mövcud təklif statusu dəyişmir.</p>
    {error && <p role="alert" className="spError">{error}</p>}{notice && <p role="status" className="spNotice">{notice}</p>}
    <h4>Əlaqə tarixçəsi</h4>{data.history.length ? <ul className="spHistory">{data.history.map((h: any) => <li key={h.id}><small>{when(h.createdAt)}</small><p>{h.text}</p></li>)}</ul> : <p className="spMuted">Hələ qeyd yoxdur.</p>}
  </>;
}

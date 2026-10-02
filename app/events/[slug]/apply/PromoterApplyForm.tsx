'use client';
import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';

const socials = ['INSTAGRAM','TIKTOK','FACEBOOK','YOUTUBE','TELEGRAM','OTHER'];

type Social = { platform: string; username: string; profileUrl: string; followerCount: string; notes: string };
const blank = (): Social => ({ platform: 'INSTAGRAM', username: '', profileUrl: '', followerCount: '', notes: '' });

export default function PromoterApplyForm({ eventSlug, eventName, verified = false }: { eventSlug: string; eventName: string; verified?: boolean }) {
  const router = useRouter();
  const [form, setForm] = useState({ firstName:'', lastName:'', email:'', phone:'', city:'', address:'', password:'', experience:'', previousEventPromotion:'', salesExperience:'', approximateAudience:'', notes:'' });
  const [socialAccounts, setSocialAccounts] = useState<Social[]>([blank()]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(verified);
  const update = (key: string, value: string) => setForm((f) => ({ ...f, [key]: value }));
  const updateSocial = (index: number, key: keyof Social, value: string) => setSocialAccounts((all) => all.map((s,i)=>i===index?{...s,[key]:value}:s));

  async function submit(e: FormEvent) {
    e.preventDefault(); setError(''); setLoading(true);
    try {
      const res = await fetch(`/api/events/${eventSlug}/apply`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ ...form, socialAccounts }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Müraciət göndərilmədi.');
      if (data.verificationRequired) {
        router.push(`/verify?identifier=${encodeURIComponent(data.identifier)}&target=${encodeURIComponent(data.target || '')}&flow=promoter&eventSlug=${encodeURIComponent(eventSlug)}`);
        return;
      }
      setSuccess(true);
    } catch (err) { setError(err instanceof Error ? err.message : 'Müraciət göndərilmədi.'); }
    finally { setLoading(false); }
  }

  if (success) return <div className="promoterSuccess"><div className="promoterSuccessMark">✓</div><div className="eventsEyebrow">APPLICATION RECEIVED</div><h2>Müraciətin qəbul edildi.</h2><p><strong>{eventName}</strong> üçün müraciətin və e-poçt təsdiqin uğurla tamamlandı. New Era komandası müraciətini nəzərdən keçirəcək. Təsdiqdən sonra promoter hesabın aktivləşdiriləcək.</p><button onClick={()=>router.push('/events')} className="eventPrimaryCta">Tədbirlərə qayıt <span>→</span></button></div>;

  return <form className="promoterForm" onSubmit={submit}>
    <section className="promoterFormSection"><div className="promoterFormTitle"><span>01</span><div><strong>Personal information</strong><small>Əlaqə və əsas məlumatların</small></div></div><div className="promoterFormGrid">
      <label>Ad *<input value={form.firstName} onChange={e=>update('firstName',e.target.value)} required /></label>
      <label>Soyad *<input value={form.lastName} onChange={e=>update('lastName',e.target.value)} required /></label>
      <label>E-poçt *<input type="email" value={form.email} onChange={e=>update('email',e.target.value)} required /></label>
      <label>Telefon *<input value={form.phone} onChange={e=>update('phone',e.target.value)} required /></label>
      <label>Şəhər<input value={form.city} onChange={e=>update('city',e.target.value)} /></label>
      <label>Ünvan<input value={form.address} onChange={e=>update('address',e.target.value)} /></label>
      <label className="full">Hesab şifrəsi *<input type="password" minLength={8} value={form.password} onChange={e=>update('password',e.target.value)} required /><small className="fieldHint">Hesab yalnız müraciət təsdiqləndikdən sonra aktiv olacaq.</small></label>
    </div></section>
    <section className="promoterFormSection"><div className="promoterFormTitle"><span>02</span><div><strong>Promotion information</strong><small>Promoter təcrübən və auditoriyan</small></div></div><div className="promoterFormGrid">
      <label className="full">Promoter təcrübəsi<textarea value={form.experience} onChange={e=>update('experience',e.target.value)} /></label>
      <label className="full">Əvvəlki tədbir promotion təcrübəsi<textarea value={form.previousEventPromotion} onChange={e=>update('previousEventPromotion',e.target.value)} /></label>
      <label className="full">Satış təcrübəsi<textarea value={form.salesExperience} onChange={e=>update('salesExperience',e.target.value)} /></label>
      <label>Təxmini auditoriya<input type="number" min="0" value={form.approximateAudience} onChange={e=>update('approximateAudience',e.target.value)} /></label>
      <label>Qeydlər<textarea value={form.notes} onChange={e=>update('notes',e.target.value)} /></label>
    </div></section>
    <section className="promoterFormSection"><div className="promoterFormTitle"><span>03</span><div><strong>Social media</strong><small>Promotion etdiyin platformalar</small></div></div>
      <div className="socialForms">{socialAccounts.map((s,i)=><div className="socialForm" key={i}><select value={s.platform} onChange={e=>updateSocial(i,'platform',e.target.value)}>{socials.map(x=><option key={x} value={x}>{x[0]+x.slice(1).toLowerCase()}</option>)}</select><input placeholder="@username" value={s.username} onChange={e=>updateSocial(i,'username',e.target.value)} /><input placeholder="Profil URL" value={s.profileUrl} onChange={e=>updateSocial(i,'profileUrl',e.target.value)} /><input type="number" min="0" placeholder="Followers" value={s.followerCount} onChange={e=>updateSocial(i,'followerCount',e.target.value)} /><input placeholder="Qeyd" value={s.notes} onChange={e=>updateSocial(i,'notes',e.target.value)} />{socialAccounts.length>1&&<button type="button" onClick={()=>setSocialAccounts(a=>a.filter((_,x)=>x!==i))}>×</button>}</div>)}<button type="button" className="addSocial" onClick={()=>setSocialAccounts(a=>[...a,blank()])}>+ Platform əlavə et</button></div>
    </section>
    {error && <div className="promoterFormError">{error}</div>}
    <div className="promoterSubmitRow"><span>Göndərməklə məlumatlarının New Era tərəfindən promoter müraciətinin qiymətləndirilməsi üçün işlənməsinə razılıq verirsən.</span><button disabled={loading} className="eventPrimaryCta" type="submit">{loading ? 'Göndərilir…' : 'Müraciəti göndər'} <span>→</span></button></div>
  </form>;
}

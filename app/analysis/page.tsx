'use client';

import { FormEvent, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, Check, Clock3, Globe2, Mail, ShieldCheck } from 'lucide-react';

type AuditForm = {
  name: string;
  email: string;
  phone: string;
  company: string;
  website: string;
  industry: string;
  market: string;
  companySize: string;
  instagram: string;
  facebook: string;
  linkedin: string;
  tiktok: string;
  otherSocial: string;
  goal: string;
  audience: string;
  challenge: string;
  competitors: string;
  channels: string;
  auditFocus: string;
  notes: string;
  websiteAccess: string;
};

const initialForm: AuditForm = {
  name: '', email: '', phone: '', company: '', website: '', industry: '', market: '', companySize: '',
  instagram: '', facebook: '', linkedin: '', tiktok: '', otherSocial: '', goal: '', audience: '',
  challenge: '', competitors: '', channels: '', auditFocus: '', notes: '', websiteAccess: '',
};

const steps = [
  { title: 'Sizin haqqınızda', label: 'Əlaqə və şirkət məlumatları' },
  { title: 'Biznesiniz', label: 'Sahə və bazar haqqında' },
  { title: 'Sosial media', label: 'Mövcud rəqəmsal kanallar' },
  { title: 'Audit sualları', label: 'Məqsəd və əsas ehtiyaclar' },
  { title: 'Yoxlama', label: 'Məlumatları təsdiqləyin' },
];

function Field({ label, value, onChange, placeholder, required = false, type = 'text' }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string; required?: boolean; type?: string }) {
  return <label className="auditField"><span>{label}{required && <em> *</em>}</span><input required={required} type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} /></label>;
}

function TextField({ label, value, onChange, placeholder, required = false }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string; required?: boolean }) {
  return <label className="auditField"><span>{label}{required && <em> *</em>}</span><textarea required={required} rows={4} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} /></label>;
}

export default function AnalysisPage() {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<AuditForm>(initialForm);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false);

  const progress = useMemo(() => `${step + 1} / ${steps.length}`, [step]);
  const update = (key: keyof AuditForm, value: string) => setForm((current) => ({ ...current, [key]: value }));

  function validateCurrentStep() {
    if (step === 0 && (!form.name.trim() || !form.email.trim() || !form.company.trim())) return 'Ad, iş e-poçtu və şirkət adı mütləq doldurulmalıdır.';
    if (step === 1 && (!form.industry.trim() || !form.market.trim() || !form.goal.trim())) return 'Sahə, bazar və əsas məqsəd məlumatlarını tamamlayın.';
    if (step === 3 && (!form.audience.trim() || !form.challenge.trim() || !form.auditFocus.trim())) return 'Hədəf auditoriya, əsas problem və audit istiqamətini yazın.';
    return '';
  }

  function next() {
    const message = validateCurrentStep();
    if (message) { setError(message); return; }
    setError('');
    setStep((current) => Math.min(current + 1, steps.length - 1));
  }

  function back() {
    setError('');
    setStep((current) => Math.max(current - 1, 0));
  }

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const message = validateCurrentStep();
    if (message) { setError(message); return; }
    setSending(true);
    setError('');
    try {
      const response = await fetch('/api/business-audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Müraciəti göndərmək mümkün olmadı.');
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Müraciəti göndərmək mümkün olmadı.');
    } finally {
      setSending(false);
    }
  }

  if (submitted) {
    return <main className="innerPage auditPage"><div className="container auditSuccess"><div className="auditSuccessIcon"><Check size={28}/></div><div className="eyebrow">BİZNES AUDİT MÜRACİƏTİ</div><h1>Müraciətiniz <span>qəbul edildi.</span></h1><p>Məlumatlarınız New Era komandası tərəfindən nəzərdən keçiriləcək. <strong>3 iş günü ərzində sizə audit nəticəsi və təkliflər e-poçt vasitəsilə göndəriləcəkdir.</strong></p><div className="auditSuccessMeta"><span><Mail size={16}/> {form.email}</span><span><Clock3 size={16}/> Nəticə: 3 iş günü ərzində</span></div><Link className="primary" href="/">Əsas səhifəyə qayıt <ArrowRight size={17}/></Link></div></main>;
  }

  return <main className="innerPage auditPage">
    <div className="container auditTop"><Link className="back" href="/"><ArrowLeft size={15}/> Əsas səhifə</Link><div className="auditTopMeta"><span><Clock3 size={15}/> Orta hesabla 2–3 dəqiqə</span><span><ShieldCheck size={15}/> Məlumatlarınız məxfi saxlanılır</span></div></div>
    <div className="container auditHero"><div className="eyebrow">NEW ERA · BİZNES AUDİT</div><h1>Biznesinizi <span>yeni baxışla</span> analiz edək.</h1><p>Qısa sorğunu cavablandırın. Bu məlumatlar avtomatik AI analizi üçün deyil — New Era-nın real mütəxəssisləri tərəfindən biznesinizin marketinq və kommunikasiya vəziyyətini qiymətləndirmək üçün istifadə olunacaq.</p></div>

    <div className="container auditLayout">
      <aside className="auditProgress"><div className="auditProgressHead"><strong>Audit sorğusu</strong><span>{progress}</span></div><div className="auditProgressList">{steps.map((item, index) => <button key={item.title} type="button" className={index === step ? 'active' : index < step ? 'done' : ''} onClick={() => index < step && setStep(index)}><i>{index < step ? <Check size={12}/> : index + 1}</i><span><b>{item.title}</b><small>{item.label}</small></span></button>)}</div><div className="auditTime"><Clock3 size={17}/><div><strong>2–3 dəqiqə</strong><small>Sorğunu tamamlamak üçün orta vaxt</small></div></div></aside>

      <form className="auditForm" onSubmit={submit}>
        <div className="auditFormHead"><div><small>MƏRHƏLƏ {String(step + 1).padStart(2, '0')}</small><h2>{steps[step].title}</h2><p>{steps[step].label}</p></div><span className="auditCounter">{progress}</span></div>

        {step === 0 && <div className="auditFields"><div className="auditGrid2"><Field label="Ad və soyad" value={form.name} onChange={(v) => update('name', v)} placeholder="Ad Soyad" required/><Field label="İş e-poçtu" value={form.email} onChange={(v) => update('email', v)} placeholder="siz@sirket.az" required type="email"/></div><div className="auditGrid2"><Field label="Telefon" value={form.phone} onChange={(v) => update('phone', v)} placeholder="+994 ..."/><Field label="Şirkət adı" value={form.company} onChange={(v) => update('company', v)} placeholder="Şirkətiniz" required/></div><Field label="Vebsayt" value={form.website} onChange={(v) => update('website', v)} placeholder="https://..."/></div>}

        {step === 1 && <div className="auditFields"><div className="auditGrid2"><Field label="Biznes sahəsi" value={form.industry} onChange={(v) => update('industry', v)} placeholder="məs. pərakəndə, restoran, IT" required/><Field label="Əsas bazar" value={form.market} onChange={(v) => update('market', v)} placeholder="Azərbaycan / region / beynəlxalq" required/></div><Field label="Şirkət ölçüsü" value={form.companySize} onChange={(v) => update('companySize', v)} placeholder="məs. 10–50 əməkdaş"/><TextField label="Hazırda biznesinizin əsas məqsədi nədir?" value={form.goal} onChange={(v) => update('goal', v)} placeholder="Məs. satışları artırmaq, brendi yeniləmək, yeni bazara çıxmaq..." required/></div>}

        {step === 2 && <div className="auditFields"><div className="auditSocialIntro"><Globe2 size={19}/><p>Sosial media hesablarınızı paylaşın. İctimai profillərdən istifadə edəcəyik; şifrə və giriş məlumatları tələb olunmur.</p></div><div className="auditGrid2"><Field label="Instagram" value={form.instagram} onChange={(v) => update('instagram', v)} placeholder="instagram.com/..."/><Field label="Facebook" value={form.facebook} onChange={(v) => update('facebook', v)} placeholder="facebook.com/..."/></div><div className="auditGrid2"><Field label="LinkedIn" value={form.linkedin} onChange={(v) => update('linkedin', v)} placeholder="linkedin.com/..."/><Field label="TikTok" value={form.tiktok} onChange={(v) => update('tiktok', v)} placeholder="tiktok.com/@..."/></div><Field label="Digər sosial / platforma" value={form.otherSocial} onChange={(v) => update('otherSocial', v)} placeholder="YouTube, X, Google Business və s."/><TextField label="Hazırda hansı marketinq kanallarından istifadə edirsiniz?" value={form.channels} onChange={(v) => update('channels', v)} placeholder="Sosial media, reklam, e-poçt, influencer, SEO və s."/></div>}

        {step === 3 && <div className="auditFields"><TextField label="Hədəf auditoriyanız kimdir?" value={form.audience} onChange={(v) => update('audience', v)} placeholder="Kimə satırsınız və əsas müştəriniz kimdir?" required/><TextField label="Hazırda ən böyük marketinq probleminiz nədir?" value={form.challenge} onChange={(v) => update('challenge', v)} placeholder="Nəyin işləmədiyini və ya sizi narahat edən məqamları yazın." required/><TextField label="Rəqibləriniz kimlərdir?" value={form.competitors} onChange={(v) => update('competitors', v)} placeholder="Mümkündürsə, 2–5 əsas rəqib qeyd edin."/><TextField label="Auditi əsasən hansı mövzu üzrə istəyirsiniz?" value={form.auditFocus} onChange={(v) => update('auditFocus', v)} placeholder="Brend, sosial media, reklam, vebsayt, kommunikasiya, satış hunisi və s." required/><TextField label="Əlavə qeyd" value={form.notes} onChange={(v) => update('notes', v)} placeholder="Ekspertlərin bilməsini istədiyiniz əlavə məlumat varsa yazın."/></div>}

        {step === 4 && <div className="auditReview"><div className="auditReviewBlock"><small>ƏLAQƏ</small><strong>{form.name}</strong><span>{form.email} · {form.phone || 'Telefon qeyd edilməyib'}</span><span>{form.company} · {form.website || 'Vebsayt qeyd edilməyib'}</span></div><div className="auditReviewBlock"><small>BİZNES</small><strong>{form.industry}</strong><span>{form.market} · {form.companySize || 'Ölçü qeyd edilməyib'}</span><p>{form.goal}</p></div><div className="auditReviewBlock"><small>SOSİAL MEDIA</small><span>{[form.instagram, form.facebook, form.linkedin, form.tiktok, form.otherSocial].filter(Boolean).join(' · ') || 'Sosial media hesabı qeyd edilməyib'}</span><p>{form.channels || 'Marketinq kanalları qeyd edilməyib'}</p></div><div className="auditReviewBlock"><small>AUDİT</small><strong>{form.auditFocus}</strong><p>{form.challenge}</p><span>Auditoriya: {form.audience}</span></div><div className="auditReviewNotice"><Check size={17}/><p>Müraciəti göndərdikdən sonra məlumatlarınız New Era komandası tərəfindən nəzərdən keçiriləcək. <strong>Audit nəticəsi 3 iş günü ərzində e-poçtunuza göndəriləcəkdir.</strong></p></div></div>}

        {error && <div className="auditError">{error}</div>}
        <div className="auditFormActions">{step > 0 ? <button type="button" className="secondary" onClick={back}><ArrowLeft size={16}/> Geri</button> : <span/>}{step < steps.length - 1 ? <button type="button" className="primary" onClick={next}>Növbəti <ArrowRight size={16}/></button> : <button type="submit" className="primary" disabled={sending}>{sending ? 'Göndərilir…' : 'Audit müraciətini göndər'} {!sending && <ArrowRight size={16}/>}</button>}</div>
      </form>
    </div>
  </main>;
}

'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, ShieldCheck } from 'lucide-react';

export default function VerifyPage() {
  const [identifier, setIdentifier] = useState('');
  const [target, setTarget] = useState('');
  const [flow, setFlow] = useState<'client' | 'promoter'>('client');
  const [eventSlug, setEventSlug] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    setIdentifier(q.get('identifier') || '');
    setTarget(q.get('target') || q.get('identifier') || '');
    setFlow(q.get('flow') === 'promoter' ? 'promoter' : 'client');
    setEventSlug(q.get('eventSlug') || '');
  }, []);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setNotice('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, code }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Kod yanlışdır və ya vaxtı bitib.');
        return;
      }

      if (flow === 'promoter') {
        const destination = eventSlug ? `/events/${encodeURIComponent(eventSlug)}/apply?verified=1` : '/events';
        window.location.href = destination;
        return;
      }

      if (data.user?.client) localStorage.setItem('new-era-client-session', JSON.stringify(data.user.client));
      window.location.href = '/account';
    } catch {
      setError('Hazırda New Era ilə əlaqə yaratmaq mümkün olmadı.');
    } finally {
      setLoading(false);
    }
  }

  async function resend() {
    setError('');
    setNotice('');
    setResending(true);
    try {
      const res = await fetch('/api/auth/resend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Yeni kodu göndərmək mümkün olmadı.');
        return;
      }
      setTarget(data.target || target);
      setNotice('Yeni təsdiq kodu göndərildi.');
    } catch {
      setError('Hazırda New Era ilə əlaqə yaratmaq mümkün olmadı.');
    } finally {
      setResending(false);
    }
  }

  return (
    <main className="authPage">
      <div className="authGlow" />
      <div className="authCard">
        <Link className="authBrand" href="/">
          <img src="/new-era-logo-header.png" alt="New Era" />
        </Link>
        <div className="eyebrow">E-POÇT TƏSDİQİ</div>
        <h1>{flow === 'promoter' ? <>Müraciəti <span>təsdiqləyin.</span></> : <>Bir addım <span>qalıb.</span></>}</h1>
        <p className="authIntro">
          6 rəqəmli təsdiq kodunu <strong>{target || 'e-poçtunuza'}</strong> ünvanına göndərdik. Bu kod e-poçt ünvanına çıxışınız olduğunu təsdiqləyir.
        </p>

        <form onSubmit={submit} className="authForm">
          <label>
            Təsdiq kodu
            <input
              required
              inputMode="numeric"
              pattern="[0-9]{6}"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="123456"
              autoComplete="one-time-code"
              autoFocus
            />
          </label>

          {error && <div className="authError">{error}</div>}
          {notice && <div className="authNotice">{notice}</div>}

          <button disabled={loading || code.length !== 6} className="primary authSubmit" type="submit">
            {loading ? 'Yoxlanılır…' : 'E-poçtu təsdiqlə'} {!loading && <ArrowRight size={16} />}
          </button>

          <button disabled={resending} type="button" className="secondary authResend" onClick={resend}>
            {resending ? 'Göndərilir…' : 'Yeni kod göndər'}
          </button>
        </form>

        <div className="verificationHint">
          <ShieldCheck size={17} />
          <span>Kod 10 dəqiqə ərzində etibarlıdır, bir dəfə istifadə olunur və təhlükəsizlik üçün serverdə açıq şəkildə saxlanılmır.</span>
        </div>

        <div className="authFoot">
          E-poçt ünvanı səhvdir? <Link href={flow === 'promoter' && eventSlug ? `/events/${encodeURIComponent(eventSlug)}/apply` : '/register'}>Geri qayıt</Link>
        </div>
      </div>
    </main>
  );
}

'use client';
import '../auth-reference.css';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { safeNext } from '@/lib/crm/policy';
import { getAccountHomePath } from '@/lib/account-routing';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
        }),
      });

      const data = await res.json();

      if (data.verificationRequired) {
        window.location.href = `/verify?identifier=${encodeURIComponent(data.identifier)}&target=${encodeURIComponent(data.target || '')}&flow=client${safeNext(new URLSearchParams(window.location.search).get('next')) ? '&next=' + encodeURIComponent(safeNext(new URLSearchParams(window.location.search).get('next'))!) : ''}`;
        return;
      }

      if (!res.ok) {
        setError(data.error || 'E-poçt və ya şifrə yanlışdır.');
        return;
      }

      if (data.user?.client) {
        localStorage.setItem(
          'new-era-client-session',
          JSON.stringify(data.user.client)
        );
      }

      window.location.href = safeNext(new URLSearchParams(window.location.search).get('next')) || getAccountHomePath(data.user?.role);
    } catch {
      setError('Hazırda New Era ilə əlaqə yaratmaq mümkün olmadı.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="authPage authReference authLogin">
      <div className="authGlow" />

      <div className="authCard">
        <Link className="authBrand" href="/">
          <img src="/new-era-logo.png" alt="New Era" />
        </Link>

        <div className="eyebrow">MÜŞTƏRİ PORTALI</div>

        <h1>
          Xoş gəlmisiniz <span>geri.</span>
        </h1>

        <p className="authIntro">
          Şirkətinizi, brief-ləri və New Era layihələrinizi idarə etmək üçün daxil olun.
        </p>

        <form onSubmit={submit} className="authForm">
          <label>
            İş e-poçtu
            <input
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@company.com"
            />
          </label>

          <label>
            Şifrə
            <input
              required
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Şifrəniz"
            />
          </label>

          {error && <div className="authError">{error}</div>}

          <button
            disabled={loading}
            className="primary authSubmit"
            type="submit"
          >
            {loading ? 'Daxil olunur…' : 'Daxil ol'}
            {!loading && <ArrowRight size={16} />}
          </button>

          <div className="authFoot">
            New Era-da yenisiniz?{' '}
            <Link href="/register" onClick={e=>{const next=safeNext(new URLSearchParams(location.search).get('next'));if(next){e.preventDefault();location.href='/register?next='+encodeURIComponent(next)}}}>Müştəri hesabı yaradın</Link>
          </div>
        </form>

        <div className="authPrivacy">
          Sessiyanız HTTP-only server cookie-si ilə qorunur. Şifrəniz brauzerdə saxlanılmır.
        </div>
      </div>
    </main>
  );
}
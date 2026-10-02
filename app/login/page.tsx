'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

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
        window.location.href = `/verify?identifier=${encodeURIComponent(data.identifier)}&target=${encodeURIComponent(data.target || '')}&flow=client`;
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

      if (['ADMIN', 'SUPER_ADMIN', 'EVENTS_ADMIN', 'EVENTS_FINANCE'].includes(data.user?.role)) {
        window.location.href = data.user?.role === 'EVENTS_FINANCE' ? '/admin/events' : '/admin';
      } else if (data.user?.role === 'PROMOTER') {
        window.location.href = '/promoter';
      } else {
        window.location.href = '/account';
      }
    } catch {
      setError('Hazırda New Era ilə əlaqə yaratmaq mümkün olmadı.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="authPage">
      <div className="authGlow" />

      <div className="authCard">
        <Link className="authBrand" href="/">
          <img src="/new-era-logo-header.png" alt="New Era" />
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
            <Link href="/register">Müştəri hesabı yaradın</Link>
          </div>
        </form>

        <div className="authPrivacy">
          Sessiyanız HTTP-only server cookie-si ilə qorunur. Şifrəniz brauzerdə saxlanılmır.
        </div>
      </div>
    </main>
  );
}
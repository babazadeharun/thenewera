'use client';

import { useEffect, useRef, useState } from 'react';
import { Building2, ImagePlus, Pencil, RefreshCw, Trash2, Upload } from 'lucide-react';

type Media = {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  width: number | null;
  height: number | null;
  url: string;
  category: string;
  alt: string | null;
  createdAt: string;
};

async function api(path: string, init?: RequestInit) {
  const response = await fetch(path, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Request failed');
  return data;
}

function formatSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export default function CollaborationsManager() {
  const [logos, setLogos] = useState<Media[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [companyName, setCompanyName] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const inputRef = useRef<HTMLInputElement | null>(null);

  async function load() {
    setBusy(true);
    try {
      const data = await api('/api/admin/media?category=PARTNER_LOGO');
      setLogos(data.media || []);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Loqolar yüklənmədi.');
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function addLogo() {
    if (!file) {
      setMessage('Əvvəlcə şirkət loqosunu seçin.');
      return;
    }
    if (!companyName.trim()) {
      setMessage('Şirkətin adını daxil edin.');
      return;
    }

    setBusy(true);
    setMessage('');
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('category', 'PARTNER_LOGO');
      form.append('alt', companyName.trim());

      const response = await fetch('/api/admin/media', { method: 'POST', body: form });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Loqo yüklənmədi.');

      setFile(null);
      setCompanyName('');
      if (inputRef.current) inputRef.current.value = '';
      setMessage('Şirkət loqosu əlavə edildi. Public səhifədə avtomatik görünəcək.');
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Loqo yüklənmədi.');
    } finally {
      setBusy(false);
    }
  }

  async function renameLogo(logo: Media) {
    const nextName = window.prompt('Şirkətin adı:', logo.alt || logo.originalName);
    if (nextName === null) return;
    const trimmed = nextName.trim();
    if (!trimmed) return;

    setBusy(true);
    try {
      await api('/api/admin/media', {
        method: 'PATCH',
        body: JSON.stringify({ id: logo.id, alt: trimmed }),
      });
      setMessage('Şirkət adı yeniləndi.');
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Şirkət adı yenilənmədi.');
    } finally {
      setBusy(false);
    }
  }

  async function removeLogo(logo: Media) {
    if (!window.confirm(`“${logo.alt || logo.originalName}” loqosunu silmək istəyirsiniz?`)) return;

    setBusy(true);
    try {
      await api(`/api/admin/media?id=${encodeURIComponent(logo.id)}`, { method: 'DELETE' });
      setMessage('Loqo silindi.');
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Loqo silinmədi.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="collaborationsManager">
      <div className="collaborationsHeader">
        <div>
          <small>ƏMƏKDAŞLIQLAR</small>
          <h2>Birlikdə işlədiyimiz şirkətlər</h2>
          <p>Public səhifədəki əməkdaş şirkət loqolarını buradan əlavə edin, adını dəyişin və silin.</p>
        </div>
        <button type="button" className="collaborationsRefresh" onClick={load} disabled={busy}>
          <RefreshCw size={15} /> Yenilə
        </button>
      </div>

      <div className="collaborationsAdd adminPanel">
        <div className="collaborationsAddIcon"><ImagePlus size={20} /></div>
        <div className="collaborationsAddCopy">
          <small>YENİ ƏMƏKDAŞ</small>
          <h3>Şirkət loqosu əlavə et</h3>
          <p>PNG, JPG, WEBP və ya SVG loqonu yükləyin. Əlavə etdikdən sonra public bölmədə avtomatik görünəcək.</p>
        </div>
        <div className="collaborationsForm">
          <label>
            Şirkətin adı
            <input value={companyName} onChange={event => setCompanyName(event.target.value)} placeholder="Məsələn: ProBet" />
          </label>
          <label className="collaborationsFile">
            Loqo faylı
            <div className="collaborationsFileRow">
              <button type="button" onClick={() => inputRef.current?.click()} disabled={busy}>
                <Upload size={14} /> Fayl seç
              </button>
              <span title={file?.name}>{file?.name || 'Fayl seçilməyib'}</span>
            </div>
            <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" hidden onChange={event => setFile(event.target.files?.[0] || null)} />
          </label>
          <button type="button" className="collaborationsAddButton" onClick={addLogo} disabled={busy}>
            <ImagePlus size={15} /> {busy ? 'Yüklənir…' : 'Əməkdaşlığı əlavə et'}
          </button>
        </div>
      </div>

      {message && <div className="collaborationsMessage">{message}</div>}

      <div className="collaborationsList">
        <div className="collaborationsListHead">
          <div><small>AKTİV LOQOLAR</small><h3>{logos.length} şirkət</h3></div>
          <Building2 size={18} />
        </div>

        {logos.length === 0 ? (
          <div className="collaborationsEmpty">
            <Building2 size={28} />
            <h3>Hələ şirkət loqosu əlavə edilməyib</h3>
            <p>Yuxarıdakı formadan ilk əməkdaş şirkətin loqosunu əlavə edin.</p>
          </div>
        ) : (
          <div className="collaborationsGrid">
            {logos.map(logo => (
              <article className="collaborationAdminCard" key={logo.id}>
                <div className="collaborationAdminLogo"><img src={logo.url} alt={logo.alt || logo.originalName} /></div>
                <div className="collaborationAdminInfo">
                  <strong>{logo.alt || logo.originalName}</strong>
                  <span>{logo.originalName} · {formatSize(logo.size)}</span>
                </div>
                <div className="collaborationAdminActions">
                  <button type="button" onClick={() => renameLogo(logo)} disabled={busy} title="Şirkət adını dəyiş">
                    <Pencil size={14} /> Adı dəyiş
                  </button>
                  <button type="button" className="danger" onClick={() => removeLogo(logo)} disabled={busy} title="Loqonu sil">
                    <Trash2 size={14} /> Sil
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

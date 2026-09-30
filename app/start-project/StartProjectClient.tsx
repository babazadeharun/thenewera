'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

const services = [
  'Graphic Design',
  'Branding',
  'Video Production',
  'Photography',
  'Social Media',
  'Web Design & Development',
  'Marketing & SEO',
];
const serviceLabels: Record<string,string> = {
  'Graphic Design':'Qrafik dizayn',
  'Branding':'Brendinq',
  'Video Production':'Video istehsalı',
  'Photography':'Fotoqrafiya',
  'Social Media':'Sosial media',
  'Web Design & Development':'Veb dizayn və proqramlaşdırma',
  'Marketing & SEO':'Marketinq və SEO',
};

const creatorCatalog = [
  {
    slug: 'aysel-m',
    name: 'Aysel M.',
    role: 'Qrafik dizayner',
    services: ['Graphic Design', 'Branding', 'Social Media'],
  },
  {
    slug: 'rashad-a',
    name: 'Rashad A.',
    role: 'Videoqraf',
    services: ['Video Production'],
  },
  {
    slug: 'leyla-q',
    name: 'Leyla Q.',
    role: 'Brend dizayneri',
    services: ['Branding', 'Graphic Design'],
  },
  {
    slug: 'tural-s',
    name: 'Tural S.',
    role: 'Veb proqramçı',
    services: ['Web Design & Development'],
  },
  {
    slug: 'nigar-r',
    name: 'Nigar R.',
    role: 'Sosial media strateqi',
    services: ['Social Media', 'Marketing & SEO'],
  },
  {
    slug: 'kamran-h',
    name: 'Kamran H.',
    role: 'Performance marketoloq',
    services: ['Marketing & SEO', 'Social Media'],
  },
];

export default function StartProjectClient() {
  const params = useSearchParams();

  const [sent, setSent] = useState(false);
  const [projectId, setProjectId] = useState('');

  const [form, setForm] = useState({
    name: '',
    email: '',
    company: '',
    service: '',
    title: '',
    brief: '',
    goal: '',
    audience: '',
    deliverables: '',
    references: '',
    budget: 'Flexible',
    deadline: '',
    creator: 'Fərq etmir',
  });

  const matchingCreators = useMemo(
    () =>
      form.service
        ? creatorCatalog.filter((creator) =>
            creator.services.includes(form.service)
          )
        : creatorCatalog,
    [form.service]
  );

  useEffect(() => {
    const requestedCreator = params.get('creator');
    const requestedXidmət = params.get('service');

    if (requestedXidmət) {
      setForm((current) => ({
        ...current,
        service: services.includes(requestedXidmət)
          ? requestedXidmət
          : current.service,
      }));
    }

    if (requestedCreator) {
      const found = creatorCatalog.find(
        (creator) => creator.slug === requestedCreator
      );

      if (found) {
        setForm((current) => ({
          ...current,
          creator: `${found.name} — ${found.role}`,
        }));
      }
    }

    const session = localStorage.getItem('new-era-client-session');

    if (!session) {
      window.location.href = '/login';
      return;
    }

    try {
      const client = JSON.parse(session);

      setForm((current) => ({
        ...current,
        name: `${client.firstName || ''} ${client.lastName || ''}`.trim(),
        email: client.email || '',
        company: client.company || '',
      }));
    } catch {
      // Ignore invalid local session data.
    }
  }, [params]);

  function update(key: string, value: string) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || 'Brief göndərmək mümkün olmadı.');
        return;
      }

      setProjectId(data.project.id);
      setSent(true);
    } catch {
      alert('Hazırda New Era ilə əlaqə yaratmaq mümkün olmadı.');
    }
  }

  return (
    <main className="innerPage">
      <div className="container formPage">
        <Link className="back" href="/">
          ← New Era
        </Link>

        <div className="eyebrow">
          LAYİHƏYƏ BAŞLAYIN · MÜŞTƏRİ İŞ MƏKANI
        </div>

        <h1>
          Nə yaratmaq istədiyinizi
          <br />
          <span>deyin.</span>
        </h1>

        <p>
          Brief-i bir dəfə göndərin. New Era mütəxəssisi,
          ünsiyyəti və təhvili platforma daxilində idarə edir.
        </p>

        {sent ? (
          <div className="successBox">
            <div className="successIcon">✓</div>

            <h2>Brief qəbul edildi.</h2>

            <p>
              Layihəniz <strong>{projectId}</strong> is now in{' '}
              <strong>Brief göndərildi</strong>. New Era brief-i nəzərdən keçirəcək
              və onu layihə mərhələləri üzrə irəlilədəcək.
            </p>

            <div className="successActions">
              <Link className="primary" href="/projects">
                Layihələrimi aç
              </Link>

              <Link className="secondary" href="/creators">
                Mütəxəssisləri kəşf et
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={submit} className="projectForm">
            <div className="formSection">
              <small>MÜŞTƏRİ HESABI</small>

              <h3>Şirkətinizin iş məkanı</h3>

              <div className="accountBrief">
                <strong>{form.name}</strong>

                <span>{form.company}</span>

                <small>{form.email}</small>

                <a href="/account">Hesabı idarə et →</a>
              </div>
            </div>

            <div className="formSection">
              <small>LAYİHƏ BRİFİ</small>

              <h3>Nə yaradırıq?</h3>

              <div className="formSplit">
                <label>
                  Xidmət

                  <select
                    required
                    value={form.service}
                    onChange={(e) => {
                      update('service', e.target.value);
                      update('creator', 'Fərq etmir');
                    }}
                  >
                    <option value="" disabled>
                      Xidmət seçin
                    </option>

                    {services.map((service) => (
                      <option key={service} value={service}>
                        {service}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  Üstünlük verilən mütəxəssis

                  <select
                    value={form.creator}
                    onChange={(e) => update('creator', e.target.value)}
                  >
                    <option value="Fərq etmir">Fərq etmir</option>

                    {matchingCreators.map((creator) => (
                      <option key={creator.slug}>
                        {creator.name} — {creator.role}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="creatorPick">
                <small>
                  {form.service
                    ? 'UYĞUN MÜTƏXƏSSİSLƏR'
                    : 'MÜTƏXƏSSİS SEÇİMİ'}
                </small>

                <p>
                  {form.service
                    ? `${matchingCreators.length} mütəxəssis${
                        matchingCreators.length === 1 ? '' : 's'
                      } bu xidmətə uyğundur.`
                    : 'Seç a service first to see the relevant mütəxəssiss, or let New Era recommend the right fit.'}
                </p>

                <div className="creatorChoices">
                  {(form.service
                    ? matchingCreators
                    : creatorCatalog.slice(0, 3)
                  ).map((creator) => {
                    const creatorValue = `${creator.name} — ${creator.role}`;

                    return (
                      <button
                        type="button"
                        key={creator.slug}
                        className={
                          form.creator === creatorValue ? 'selected' : ''
                        }
                        onClick={() =>
                          update('creator', creatorValue)
                        }
                      >
                        <strong>{creator.name}</strong>

                        <span>
                          {creator.role} ·{' '}
                          {form.creator === creatorValue
                            ? 'Seçildi'
                            : 'Seç'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <label>
                Layihə adı

                <input
                  required
                  value={form.title}
                  onChange={(e) => update('title', e.target.value)}
                  placeholder="məs. yeni məhsul üçün Instagram kampaniyası"
                />
              </label>

              <label>
                Brief

                <textarea
                  required
                  rows={5}
                  value={form.brief}
                  onChange={(e) => update('brief', e.target.value)}
                  placeholder="New Era-ya tam konteksti, üslub istiqamətini və vacib istinadları yazın."
                />
              </label>

              <div className="formSplit">
                <label>
                  Layihənin məqsədi

                  <input
                    required
                    value={form.goal}
                    onChange={(e) => update('goal', e.target.value)}
                    placeholder="Bu layihə nə əldə etməlidir?"
                  />
                </label>

                <label>
                  Hədəf auditoriya

                  <input
                    value={form.audience}
                    onChange={(e) => update('audience', e.target.value)}
                    placeholder="Kimlər üçündür?"
                  />
                </label>
              </div>

              <label>
                Gözlənilən təhvil işləri

                <input
                  required
                  value={form.deliverables}
                  onChange={(e) =>
                    update('deliverables', e.target.value)
                  }
                  placeholder="məs. loqo, 12 paylaşım, 3 story şablonu"
                />
              </label>

              <label>
                İstinadlar / linklər

                <input
                  value={form.references}
                  onChange={(e) =>
                    update('references', e.target.value)
                  }
                  placeholder="İstinad, qovluq və ya ilham linklərini əlavə edin"
                />
              </label>

              <div className="formSplit">
                <label>
                  Büdcə

                  <select
                    value={form.budget}
                    onChange={(e) =>
                      update('budget', e.target.value)
                    }
                  >
                    <option value="Flexible">Çevik</option>
                    <option>300–700 AZN</option>
                    <option>700–1,500 AZN</option>
                    <option>1,500–3,000 AZN</option>
                    <option>3,000+ AZN</option>
                  </select>
                </label>

                <label>
                  Son tarix

                  <input
                    type="date"
                    value={form.deadline}
                    onChange={(e) =>
                      update('deadline', e.target.value)
                    }
                  />
                </label>
              </div>
            </div>

            <button className="primary" type="submit">
              Layihə brief-ini göndərin →
            </button>

            <div className="privateNote">
              Your brief and future project communication stay inside New
              Era. Creator personal contact details are not published.
            </div>
          </form>
        )}
      </div>
    </main>
  );
}
'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

const creators = [
  {
    slug: 'aysel-m',
    name: 'Aysel M.',
    role: 'Vizual dizayner',
    meta: '4.9 · 28 reviews · 32 projects',
    style: 'violet',
    initials: 'AM',
    preset: 'graphic-designer',
    skills: ['Sosial dizayn', 'Kampaniyalar', 'Qablaşdırma'],
    services: ['graphic-design', 'branding', 'social-media'],
  },
  {
    slug: 'rashad-a',
    name: 'Rashad A.',
    role: 'Rejissor / Videoqraf',
    meta: '4.8 · 24 reviews · 18 projects',
    style: 'blue',
    initials: 'RA',
    preset: 'videographer',
    skills: ['Reklam', 'Reels', 'Montaj'],
    services: ['video-motion'],
  },
  {
    slug: 'leyla-q',
    name: 'Leyla Q.',
    role: 'Brend dizayneri',
    meta: '4.9 · 32 reviews · 21 projects',
    style: 'pink',
    initials: 'LQ',
    preset: 'branding-specialist',
    skills: ['Brendinq', 'Kimlik', 'Art-direksiya'],
    services: ['branding', 'graphic-design'],
  },
  {
    slug: 'tural-s',
    name: 'Tural S.',
    role: 'Veb proqramçı',
    meta: '4.7 · 19 reviews · 14 projects',
    style: 'cyan',
    initials: 'TS',
    preset: 'web-developer',
    skills: ['Next.js', 'E-ticarət', 'Veb tətbiqlər'],
    services: ['web-design', 'development'],
  },
  {
    slug: 'nigar-r',
    name: 'Nigar R.',
    role: 'Sosial media strateqi',
    meta: '4.9 · 21 reviews · 26 projects',
    style: 'gold',
    initials: 'NR',
    preset: 'marketing-specialist',
    skills: ['Strategiya', 'Məzmun', 'Kampaniyalar'],
    services: ['social-media', 'marketing-seo'],
  },
  {
    slug: 'kamran-h',
    name: 'Kamran H.',
    role: 'Performance marketoloq',
    meta: '4.8 · 17 reviews · 22 projects',
    style: 'green',
    initials: 'KH',
    preset: 'marketing-specialist',
    skills: ['Meta reklamları', 'Google reklamları', 'Analitika'],
    services: ['marketing-seo', 'social-media'],
  },
];

export default function CreatorsClient() {
  const params = useSearchParams();

  const service = params.get('service') || '';

  const serviceLabels: Record<string, string> = {
    'graphic-design': 'Qrafik dizayn',
    branding: 'Brendinq',
    'video-motion': 'Video istehsalı',
    photography: 'Fotoqrafiya',
    'social-media': 'Sosial media',
    'web-design': 'Veb dizayn və proqramlaşdırma',
    development: 'Veb dizayn və proqramlaşdırma',
    'marketing-seo': 'Marketinq və SEO',
  };

  const serviceLabel =
    serviceLabels[service] ||
    (service
      ? service
          .replaceAll('-', ' ')
          .replace(/\b\w/g, (m) => m.toUpperCase())
      : '');

  const filtered = service
    ? creators.filter((creator) => creator.services.includes(service))
    : creators;

  return (
    <main className="innerPage">
      <div className="container innerHero">
        <Link className="back" href="/">
          ← New Era
        </Link>

        <div className="eyebrow">SEÇİLMİŞ MÜTƏXƏSSİS ŞƏBƏKƏSİ</div>

        <h1>
          {service ? (
            <>
              Bu xidmət üzrə
              <br />
              <span>{serviceLabel}.</span>
            </>
          ) : (
            <>
              Özünüzə uyğun
              <br />
              <span>kreativ mütəxəssisi tapın.</span>
            </>
          )}
        </h1>

        <p>
          {service
            ? `${serviceLabel} üzrə uyğunlaşdırılmış mütəxəssisləri kəşf edin. Hər profil bacarıqlar, portfolio işləri və əlçatanlıq əsasında seçilib.`
            : 'Hər mütəxəssis gördüyü işlərlə təqdim olunur. Şəxsi əlaqə məlumatları gizli saxlanılır; layihələr New Era daxilində başlayır.'}
        </p>

        <div className="filterBar">
          <Link
            className={!service ? 'active' : ''}
            href="/creators"
          >
            Hamısı
          </Link>

          <Link
            className={
              service === 'graphic-design' || service === 'branding'
                ? 'active'
                : ''
            }
            href="/creators?service=graphic-design"
          >
            Dizayn
          </Link>

          <Link
            className={service === 'video-motion' ? 'active' : ''}
            href="/creators?service=video-motion"
          >
            Video
          </Link>

          <Link
            className={
              service === 'social-media' || service === 'marketing-seo'
                ? 'active'
                : ''
            }
            href="/creators?service=social-media"
          >
            Marketinq
          </Link>

          <Link
            className={
              service === 'web-design' || service === 'development'
                ? 'active'
                : ''
            }
            href="/creators?service=development"
          >
            Proqramlaşdırma
          </Link>
        </div>
      </div>

      <div className="container creatorMatchNote">
        <span>
          {filtered.length} uyğun mütəxəssis
          {filtered.length === 1 ? '' : 's'}
        </span>

        {service && (
          <Link
            href={`/start-project?service=${encodeURIComponent(
              service
            )}`}
          >
            Bu xidmətlə başlayın →
          </Link>
        )}
      </div>

      <div className="container creatorGrid large">
        {filtered.map((creator) => (
          <article className="creatorCard" key={creator.slug}>
            <div className={`portrait ${creator.style}`}>
              <img
                src={`/creator-presets/${creator.preset}.jpg`}
                alt=""
              />

              <span className="available">Mövcuddur</span>
            </div>

            <div className="creatorBody">
              <h3>{creator.name}</h3>

              <p>{creator.role}</p>

              <div className="rating">
                ★ {creator.meta}
              </div>

              <div className="creatorTags">
                {creator.skills.map((skill) => (
                  <span key={skill}>{skill}</span>
                ))}
              </div>

              <Link
                className="profileBtn"
                href={`/creators/${creator.slug}?service=${service}`}
              >
                Portfolioya bax <span>→</span>
              </Link>
            </div>
          </article>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="container emptyMatch">
          <h2>Hələ dəqiq uyğun mütəxəssis tapılmadı.</h2>

          <p>
            New Era brief-i nəzərdən keçirib ən uyğun
            mövcud mütəxəssisi təyin edə bilər.
          </p>

          <Link className="primary" href="/start-project">
            Brief göndərin →
          </Link>
        </div>
      )}
    </main>
  );
}
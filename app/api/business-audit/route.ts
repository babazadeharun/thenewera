import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const required = ['name', 'email', 'company', 'industry', 'market', 'goal', 'audience', 'challenge', 'auditFocus'] as const;

function clean(value: unknown, max = 3000) {
  return String(value ?? '').trim().slice(0, max);
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[char] || char);
}

function row(label: string, value: string) {
  return `<tr><td style="padding:8px 12px;border-bottom:1px solid #242638;color:#8f95a8;width:180px">${escapeHtml(label)}</td><td style="padding:8px 12px;border-bottom:1px solid #242638;color:#f4f5ff;white-space:pre-wrap">${escapeHtml(value || 'Qeyd edilməyib')}</td></tr>`;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (body?.websiteAccess) return NextResponse.json({ ok: true });

    const data: Record<string, string> = {};
    for (const key of Object.keys(body || {})) data[key] = clean(body[key]);
    const missing = required.find((key) => !data[key]);
    if (missing) return NextResponse.json({ error: 'Zəhmət olmasa tələb olunan sahələri tamamlayın.' }, { status: 400 });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) return NextResponse.json({ error: 'Düzgün e-poçt ünvanı daxil edin.' }, { status: 400 });

    const settings = await prisma.siteSetting.findUnique({ where: { id: 'main' } }).catch(() => null);
    const apiKey = process.env.RESEND_API_KEY;
    const from = process.env.EMAIL_FROM;
    const to = process.env.AUDIT_TO_EMAIL || settings?.contactEmail || from;
    if (!apiKey || !from || !to) return NextResponse.json({ error: 'Audit müraciət sistemi hələ e-poçt üçün konfiqurasiya edilməyib.' }, { status: 503 });

    const html = `<div style="font-family:Arial,sans-serif;background:#050711;color:#f5f6ff;padding:32px"><div style="max-width:760px;margin:auto"><div style="letter-spacing:.18em;color:#a06eff;font-size:12px;font-weight:700">NEW ERA · BİZNES AUDİT</div><h1 style="font-size:30px;margin:12px 0 8px">Yeni audit müraciəti</h1><p style="color:#aeb3c2">Müraciət edən şəxs audit nəticəsinin 3 iş günü ərzində göndəriləcəyini görüb.</p><table style="width:100%;border-collapse:collapse;margin-top:24px;background:#0a0d18;border:1px solid #242638">${row('Ad və soyad', data.name)}${row('E-poçt', data.email)}${row('Telefon', data.phone)}${row('Şirkət', data.company)}${row('Vebsayt', data.website)}${row('Biznes sahəsi', data.industry)}${row('Əsas bazar', data.market)}${row('Şirkət ölçüsü', data.companySize)}${row('Instagram', data.instagram)}${row('Facebook', data.facebook)}${row('LinkedIn', data.linkedin)}${row('TikTok', data.tiktok)}${row('Digər sosial', data.otherSocial)}${row('Marketinq kanalları', data.channels)}${row('Biznes məqsədi', data.goal)}${row('Hədəf auditoriya', data.audience)}${row('Əsas problem', data.challenge)}${row('Rəqiblər', data.competitors)}${row('Audit istiqaməti', data.auditFocus)}${row('Əlavə qeyd', data.notes)}</table></div></div>`;

    const internal = await fetch('https://api.resend.com/emails', {
      method: 'POST', headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to: [to], reply_to: data.email, subject: `New Era — Yeni Biznes Audit müraciəti: ${data.company}`, html }),
    });
    if (!internal.ok) return NextResponse.json({ error: 'Müraciəti qəbul etmək mümkün olmadı. Bir qədər sonra yenidən cəhd edin.' }, { status: 502 });

    const confirmationHtml = `<div style="font-family:Arial,sans-serif;background:#050711;color:#f5f6ff;padding:32px"><div style="max-width:620px;margin:auto"><div style="letter-spacing:.18em;color:#a06eff;font-size:12px;font-weight:700">NEW ERA · BİZNES AUDİT</div><h1 style="font-size:30px;margin:12px 0">Müraciətiniz qəbul edildi.</h1><p style="color:#c2c6d2;line-height:1.7">Salam ${escapeHtml(data.name)}, biznes audit sorğunuzu qəbul etdik. New Era komandası məlumatlarınızı real mütəxəssislər tərəfindən nəzərdən keçirəcək.</p><div style="margin:24px 0;padding:18px;border:1px solid #302b4a;background:#0b0d19;border-radius:12px"><strong style="color:#c8adff">Audit nəticəsi 3 iş günü ərzində sizə e-poçt vasitəsilə göndəriləcəkdir.</strong></div><p style="color:#777e91">Təşəkkür edirik,<br/>New Era</p></div></div>`;
    await fetch('https://api.resend.com/emails', {
      method: 'POST', headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to: [data.email], subject: 'New Era — Biznes Audit müraciətiniz qəbul edildi', html: confirmationHtml }),
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('business audit submission', error);
    return NextResponse.json({ error: 'Müraciəti göndərmək mümkün olmadı.' }, { status: 500 });
  }
}

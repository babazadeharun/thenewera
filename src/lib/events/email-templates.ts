function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

export function promoterApprovalEmail({
  firstName,
  eventName,
  promoterPrice,
}: {
  firstName: string;
  eventName: string;
  promoterPrice: string;
}) {
  const name = escapeHtml(firstName);
  const event = escapeHtml(eventName);
  const price = escapeHtml(promoterPrice);

  return {
    subject: `New Era Events — ${eventName} üçün müraciətiniz təsdiqləndi`,

    text: `Salam ${firstName},

Sizin ${eventName} tədbiri üzrə promoter müraciətiniz New Era Events komandası tərəfindən təsdiqləndi.

Promoter qiyməti: ${promoterPrice} AZN

Artıq promoter hesabınız aktivdir.

Promoter paneli:
https://thenewera.space/promoter

New Era Events`,

    html: `
      <div style="font-family:Arial,sans-serif;background:#f5f5f5;padding:40px 20px;">
        <div style="max-width:600px;margin:0 auto;background:#ffffff;padding:40px;border-radius:16px;">
          <div style="font-size:24px;font-weight:700;margin-bottom:30px;">
            NEW ERA EVENTS
          </div>

          <h1 style="font-size:28px;margin-bottom:20px;">
            Müraciətiniz təsdiqləndi
          </h1>

          <p style="font-size:16px;line-height:1.6;">
            Salam ${name},
          </p>

          <p style="font-size:16px;line-height:1.6;">
            Sizin <strong>${event}</strong> tədbiri üzrə promoter müraciətiniz
            New Era Events komandası tərəfindən təsdiqləndi.
          </p>

          <div style="background:#f5f5f5;padding:20px;border-radius:12px;margin:25px 0;">
            <div style="font-size:13px;color:#666;">
              PROMOTER QİYMƏTİ
            </div>

            <div style="font-size:28px;font-weight:700;margin-top:6px;">
              ${price} AZN
            </div>
          </div>

          <p style="font-size:16px;line-height:1.6;">
            Artıq promoter hesabınız aktivdir. Hesabınıza daxil olaraq
            tədbir, bilet, satış və maliyyə məlumatlarını idarə edə bilərsiniz.
          </p>

          <a
            href="https://thenewera.space/promoter"
            style="display:inline-block;background:#111;color:#fff;text-decoration:none;padding:14px 22px;border-radius:10px;margin-top:15px;"
          >
            Promoter panelinə daxil ol
          </a>

          <p style="font-size:13px;color:#777;margin-top:35px;line-height:1.5;">
            Bu email New Era Events sistemi tərəfindən avtomatik göndərilib.
          </p>
        </div>
      </div>
    `,
  };
}

export function promoterRejectionEmail({
  firstName,
  eventName,
  reason,
}: {
  firstName: string;
  eventName: string;
  reason?: string | null;
}) {
  const name = escapeHtml(firstName);
  const event = escapeHtml(eventName);

  const rejectionReason = reason
    ? escapeHtml(reason)
    : 'Müraciət bu mərhələdə təsdiqlənmədi.';

  return {
    subject: `New Era Events — ${eventName} müraciəti barədə`,

    text: `Salam ${firstName},

${eventName} tədbiri üzrə promoter müraciətiniz bu mərhələdə təsdiqlənmədi.

Qeyd:
${reason || 'Müraciət bu mərhələdə təsdiqlənmədi.'}

Gələcək tədbirlər üçün yeni müraciətlərə açığıq.

New Era Events`,

    html: `
      <div style="font-family:Arial,sans-serif;background:#f5f5f5;padding:40px 20px;">
        <div style="max-width:600px;margin:0 auto;background:#ffffff;padding:40px;border-radius:16px;">
          <div style="font-size:24px;font-weight:700;margin-bottom:30px;">
            NEW ERA EVENTS
          </div>

          <h1 style="font-size:28px;margin-bottom:20px;">
            Müraciətiniz barədə
          </h1>

          <p style="font-size:16px;line-height:1.6;">
            Salam ${name},
          </p>

          <p style="font-size:16px;line-height:1.6;">
            <strong>${event}</strong> tədbiri üzrə promoter müraciətiniz
            bu mərhələdə təsdiqlənmədi.
          </p>

          <div style="background:#f5f5f5;padding:20px;border-radius:12px;margin:25px 0;">
            <div style="font-size:13px;color:#666;">
              QEYD
            </div>

            <div style="font-size:15px;line-height:1.6;margin-top:8px;">
              ${rejectionReason}
            </div>
          </div>

          <p style="font-size:16px;line-height:1.6;">
            Gələcək tədbirlər üçün yeni müraciətlərə açığıq.
          </p>

          <p style="font-size:13px;color:#777;margin-top:35px;line-height:1.5;">
            Bu email New Era Events sistemi tərəfindən avtomatik göndərilib.
          </p>
        </div>
      </div>
    `,
  };
}

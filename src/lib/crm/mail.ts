export function appOrigin() {
  const configured = (
    process.env.CRM_APP_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.SITE_URL ||
    ""
  ).trim();
  if (!configured)
    throw Object.assign(new Error("CRM_APP_URL_MISSING"), {
      code: "CRM_APP_URL_MISSING",
    });
  try {
    const u = new URL(configured);
    if (
      u.protocol !== "https:" ||
      u.username ||
      u.password ||
      u.search ||
      u.hash
    )
      throw Error();
    return u.origin;
  } catch {
    throw Object.assign(new Error("CRM_APP_URL_INVALID"), {
      code: "CRM_APP_URL_INVALID",
    });
  }
}
export function mailError(error: unknown) {
  const e = error as {
    code?: unknown;
    message?: unknown;
    responseCode?: unknown;
  };
  let code = String(e?.code || "UNKNOWN");
  if (e?.message === "MAIL_SMTP_CONFIG_MISSING")
    code = "MAIL_SMTP_CONFIG_MISSING";
  if (!/^[A-Z0-9_]{1,60}$/.test(code)) code = "UNKNOWN";
  const messages: Record<string, string> = {
    CRM_APP_URL_MISSING: "Dəvət ünvanı qurulmayıb: CRM_APP_URL.",
    CRM_APP_URL_INVALID:
      "CRM_APP_URL yalnız düzgün HTTPS sayt ünvanı olmalıdır.",
    MAIL_SMTP_CONFIG_MISSING:
      "Göndərən poçtun SMTP host, istifadəçi və ya şifrəsi qurulmayıb.",
    EAUTH: "Göndərən poçtun SMTP giriş məlumatları qəbul edilmədi.",
    EENVELOPE: "SMTP göndərən və ya alıcı ünvanını qəbul etmədi.",
    ENOTFOUND: "SMTP server ünvanı tapılmadı.",
    EAI_AGAIN: "SMTP server ünvanı müvəqqəti həll olunmadı.",
    ETIMEDOUT: "SMTP bağlantısının vaxtı bitdi.",
    ECONNECTION: "SMTP serverinə bağlantı alınmadı.",
    ECONNREFUSED: "SMTP serveri bağlantını rədd etdi.",
    ESOCKET: "SMTP/TLS bağlantısı alınmadı.",
    REJECTED: "SMTP məktubun alıcısını qəbul etmədi.",
  };
  return {
    code,
    responseCode:
      typeof e?.responseCode === "number" ? e.responseCode : undefined,
    message:
      messages[code] ||
      "E-poçt göndərişi təsdiqlənmədi. Göndəriş jurnalını yoxlayın.",
  };
}
export async function mailHealth(verify = false) {
  const { smtpConfigured } = await import("@/lib/mail/smtp");
  let url = "OK";
  try {
    appOrigin();
  } catch (e) {
    url = mailError(e).code;
  }
  const sender =
    process.env.MAIL_FROM_ADDRESS ||
    process.env.MAIL_SMTP_USER ||
    process.env.EVENT_EMAIL_USER ||
    "";
  const health = {
    url,
    smtpConfigured: smtpConfigured(),
    sender: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(sender)
      ? sender
      : "Göndərən ünvanı müəyyən edilmədi",
    verified: false,
    message: "",
  };
  if (!verify || !health.smtpConfigured) return health;
  try {
    const nodemailer = (await import("nodemailer")).default,
      port = Number(
        process.env.MAIL_SMTP_PORT || process.env.EVENT_EMAIL_PORT || 465,
      );
    const transport = nodemailer.createTransport({
      host: process.env.MAIL_SMTP_HOST || process.env.EVENT_EMAIL_HOST,
      port,
      secure:
        String(process.env.MAIL_SMTP_SECURE ?? port === 465).toLowerCase() !==
        "false",
      auth: {
        user: process.env.MAIL_SMTP_USER || process.env.EVENT_EMAIL_USER,
        pass:
          process.env.MAIL_SMTP_PASSWORD || process.env.EVENT_EMAIL_PASSWORD,
      },
      connectionTimeout: 5000,
      greetingTimeout: 5000,
      socketTimeout: 5000,
    });
    try {
      await transport.verify();
      health.verified = true;
      health.message =
        "SMTP bağlantısı təsdiqləndi. Test məktubu göndərilmədi.";
    } finally {
      transport.close();
    }
  } catch (e) {
    const detail = mailError(e);
    health.message = detail.message + " [" + detail.code + "]";
  }
  return health;
}

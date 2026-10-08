import { NextResponse } from 'next/server';
import tls from 'node:tls';
import { requireMailAdmin } from '@/lib/mail/auth';

export async function GET() {
  const { response } = await requireMailAdmin();
  if (response) return response;

  const host = process.env.MAIL_IMAP_HOST || '';
  const port = Number(process.env.MAIL_IMAP_PORT || 993);
  const user = process.env.MAIL_IMAP_USER || '';
  const password = process.env.MAIL_IMAP_PASSWORD || '';

  if (!host || !user || !password) {
    return NextResponse.json(
      { ok: false, stage: 'config', error: 'IMAP config missing' },
      { status: 500 }
    );
  }

  const started = Date.now();

  try {
    const result = await new Promise<{
      greeting: string;
      loginResponse: string;
    }>((resolve, reject) => {
      const socket = tls.connect({
        host,
        port,
        servername: host,
        rejectUnauthorized: true,
      });

      socket.setEncoding('utf8');

      let buffer = '';
      let stage: 'greeting' | 'login' = 'greeting';

      const timer = setTimeout(() => {
        socket.destroy();
        reject(new Error(`IMAP_${stage.toUpperCase()}_TIMEOUT`));
      }, 30000);

      socket.on('data', (chunk) => {
        buffer += chunk;

        if (stage === 'greeting' && /\r\n/.test(buffer)) {
          const login = `A0001 LOGIN "${user.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}" "${password.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"\r\n`;
          socket.write(login);
          stage = 'login';
          buffer = '';
          return;
        }

        if (stage === 'login' && /(?:^|\r\n)A0001\s+(OK|NO|BAD)\b/i.test(buffer)) {
          clearTimeout(timer);

          const loginResponse =
            buffer.match(/(?:^|\r\n)A0001\s+(OK|NO|BAD)[^\r\n]*/i)?.[0] ||
            '';

          socket.end();

          resolve({
            greeting: 'received',
            loginResponse,
          });
        }
      });

      socket.on('error', (err) => {
        clearTimeout(timer);
        reject(err);
      });
    });

    return NextResponse.json({
      ok: /\bOK\b/i.test(result.loginResponse),
      host,
      port,
      elapsedMs: Date.now() - started,
      ...result,
    });
  } catch (e) {
    return NextResponse.json(
      {
        ok: false,
        host,
        port,
        elapsedMs: Date.now() - started,
        error: e instanceof Error ? e.message : 'UNKNOWN_ERROR',
      },
      { status: 502 }
    );
  }
}

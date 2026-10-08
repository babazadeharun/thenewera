import { NextResponse } from 'next/server';
import tls from 'node:tls';
import { requireMailAdmin } from '@/lib/mail/auth';

export async function GET() {
  const { response } = await requireMailAdmin();

  if (response) return response;

  const host = process.env.MAIL_IMAP_HOST || '';
  const port = Number(process.env.MAIL_IMAP_PORT || 993);

  if (!host) {
    return NextResponse.json(
      {
        ok: false,
        stage: 'config',
        error: 'MAIL_IMAP_HOST missing',
      },
      { status: 500 }
    );
  }

  const started = Date.now();

  try {
    const result = await new Promise<{
      greeting: string;
      elapsedMs: number;
    }>((resolve, reject) => {
      const socket = tls.connect({
        host,
        port,
        servername: host,
        rejectUnauthorized: true,
      });

      let data = '';

      const timer = setTimeout(() => {
        socket.destroy();
        reject(new Error('TLS_TIMEOUT'));
      }, 30000);

      socket.setEncoding('utf8');

      socket.once('secureConnect', () => {
        socket.once('data', (chunk) => {
          data += chunk;

          clearTimeout(timer);
          socket.end();

          resolve({
            greeting: data.slice(0, 300),
            elapsedMs: Date.now() - started,
          });
        });
      });

      socket.once('error', (err) => {
        clearTimeout(timer);
        reject(err);
      });
    });

    return NextResponse.json({
      ok: true,
      host,
      port,
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
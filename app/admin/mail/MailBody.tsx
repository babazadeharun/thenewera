'use client';

/** No scripts, same-origin access, forms or top navigation in received mail. */
export default function MailBody({ html }: { html: string }) {
  const document = `<!doctype html><html><head><meta charset="utf-8"><meta name="referrer" content="no-referrer"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src https: http:; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'; connect-src 'none'"><style>html,body{margin:0;padding:0;font:14px/1.6 Arial,sans-serif;color:#263b45;overflow-wrap:anywhere}body{padding:8px}img,table{max-width:100%}img{height:auto}pre{white-space:pre-wrap}a{color:#008c9b}</style></head><body>${html}</body></html>`;
  return <iframe title="Məktubun məzmunu" sandbox="allow-popups allow-popups-to-escape-sandbox" referrerPolicy="no-referrer" srcDoc={document} style={{ width: '100%', minHeight: 420, height: '65vh', border: 0, background: '#fff' }} />;
}

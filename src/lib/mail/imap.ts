import net from 'node:net';
import tls from 'node:tls';

export type MailAddress = { name?: string; address: string };
export type ImapAttachment = { filename: string; mimeType: string; size: number; content: Buffer };
export type ImapMessage = {
  uid: number;
  flags: string[];
  messageId?: string;
  inReplyTo?: string;
  references?: string;
  from: MailAddress[];
  to: MailAddress[];
  cc: MailAddress[];
  bcc: MailAddress[];
  subject: string;
  date: string;
  text: string;
  html: string;
  attachments: ImapAttachment[];
};

const host = () => process.env.MAIL_IMAP_HOST || '';
const port = () => Number(process.env.MAIL_IMAP_PORT || 993);
const secure = () => String(process.env.MAIL_IMAP_SECURE ?? 'true').toLowerCase() !== 'false';
const user = () => process.env.MAIL_IMAP_USER || '';
const password = () => process.env.MAIL_IMAP_PASSWORD || '';
const timeoutMs = () => Math.min(Math.max(Number(process.env.MAIL_IMAP_TIMEOUT_MS || 15000), 5000), 30000);

export function mailConfigured() {
  return Boolean(host() && user() && password());
}

function quote(value: string) {
  return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

function encodeModifiedUtf7(input: string) {
  return input.replace(/[^\x20-\x7e&]+|&/g, (chunk) => {
    if (chunk === '&') return '&-';
    const bytes = Buffer.from(chunk, 'utf16le');
    const swapped = Buffer.alloc(bytes.length);
    for (let i = 0; i < bytes.length; i += 2) { swapped[i] = bytes[i + 1]; swapped[i + 1] = bytes[i]; }
    return `&${swapped.toString('base64').replace(/\//g, ',').replace(/=+$/, '')}-`;
  });
}

class ImapConnection {
  private socket: net.Socket | tls.TLSSocket | null = null;
  private buffer = Buffer.alloc(0);
  private tag = 0;

  async connect() {
    if (!mailConfigured()) throw new Error('MAIL_IMAP_CONFIG_MISSING');
    this.socket = secure() ? tls.connect({ host: host(), port: port(), servername: host(), rejectUnauthorized: true }) : net.connect({ host: host(), port: port() });
    this.socket.pause();
    this.socket.setTimeout(timeoutMs());
    await this.waitForGreeting();
    await this.command(`LOGIN ${quote(user())} ${quote(password())}`);
  }

  private readChunk(): Promise<void> {
    if (!this.socket) throw new Error('MAIL_IMAP_NOT_CONNECTED');
    return new Promise((resolve, reject) => {
      const socket = this.socket!;
      const onData = (chunk: Buffer) => { cleanup(); socket.pause(); this.buffer = Buffer.concat([this.buffer, chunk]); resolve(); };
      const onError = (err: Error) => { cleanup(); reject(err); };
      const onTimeout = () => { cleanup(); reject(new Error('MAIL_IMAP_TIMEOUT')); };
      const cleanup = () => { socket.off('data', onData); socket.off('error', onError); socket.off('timeout', onTimeout); };
      socket.once('data', onData); socket.once('error', onError); socket.once('timeout', onTimeout);
      socket.resume();
    });
  }

  private async waitForGreeting() {
    while (true) {
      const lineEnd = this.buffer.indexOf('\r\n');
      if (lineEnd >= 0) { const line = this.buffer.subarray(0, lineEnd).toString('utf8'); this.buffer = this.buffer.subarray(lineEnd + 2); if (/^\*\s+OK/i.test(line)) return; if (/^\*\s+PREAUTH/i.test(line)) return; if (/^\*\s+NO/i.test(line)) throw new Error('MAIL_IMAP_LOGIN_FAILED'); }
      else await this.readChunk();
    }
  }

  private async readUntilTag(tag: string) {
    const marker = Buffer.from(tag + " ");
    while (true) {
      const index = this.buffer.indexOf(marker);
      if (index >= 0) {
        const end = this.buffer.indexOf('\r\n', index + marker.length);
        if (end >= 0) return this.buffer.subarray(0, end + 2);
      }
      await this.readChunk();
    }
  }

  async command(command: string) {
    if (!this.socket) throw new Error('MAIL_IMAP_NOT_CONNECTED');
    const tag = `A${String(++this.tag).padStart(4, '0')}`;
    this.socket.write(`${tag} ${command}\r\n`);
    const response = await this.readUntilTag(tag);
    this.buffer = Buffer.alloc(0);
    const text = response.toString('utf8');
    const final = text.match(new RegExp(`(?:^|\\r?\\n)${tag}\\s+(OK|NO|BAD)\\b[^\\r\\n]*`, 'i'))?.[0] || '';
    if (!/\bOK\b/i.test(final)) {
      const error = /\b(NO|BAD)\b[^\r\n]*/i.exec(final)?.[0] || 'IMAP command failed';
      throw new Error(error);
    }
    return response;
  }

  async logout() {
    try { if (this.socket && !this.socket.destroyed) { this.socket.write(`A${String(++this.tag).padStart(4, '0')} LOGOUT\r\n`); } } catch { /* ignore */ }
    try { this.socket?.end(); } catch { /* ignore */ }
    this.socket = null;
  }

  async select(folder: string) { await this.command(`SELECT ${quote(encodeModifiedUtf7(folder))}`); }

  async list() {
    const response = await this.command('LIST "" "*"');
    return response.toString('utf8').split(/\r\n/).filter(Boolean).map((line) => {
      const match = line.match(/^\*\s+LIST\s+\([^)]*\)\s+"[^"]*"\s+(.+)$/i);
      if (!match) return null;
      return match[1].replace(/^"|"$/g, '').replace(/\\(["\\])/g, '$1');
    }).filter((v): v is string => Boolean(v));
  }

  async search(criteria: string) {
    const response = await this.command(`UID SEARCH ${criteria}`);
    const line = response.toString('utf8').split(/\r\n/).find((x) => /^\* SEARCH/i.test(x)) || '';
    return (line.replace(/^\*\s+SEARCH\s*/i, '').trim().match(/\d+/g) || []).map(Number);
  }

  async fetchOverview(uids: number[]) {
    if (!uids.length) return [] as Array<{uid:number;flags:string[];messageId?:string;from:MailAddress[];to:MailAddress[];cc:MailAddress[];subject:string;date:string;size:number}>;
    const response = await this.command(`UID FETCH ${uids.join(',')} (UID FLAGS INTERNALDATE RFC822.SIZE BODY.PEEK[HEADER.FIELDS (MESSAGE-ID IN-REPLY-TO REFERENCES FROM TO CC SUBJECT DATE)])`);
    const raw = response.toString('utf8');
    const out: Array<{uid:number;flags:string[];messageId?:string;from:MailAddress[];to:MailAddress[];cc:MailAddress[];subject:string;date:string;size:number}> = [];
    for (const block of raw.split(/\*\s+\d+\s+FETCH\s+/i).slice(1)) {
      const uid = Number(block.match(/\bUID\s+(\d+)/i)?.[1]);
      if (!uid) continue;
      const flags = (block.match(/\bFLAGS\s+\(([^)]*)\)/i)?.[1] || '').split(/\s+/).filter(Boolean);
      const size = Number(block.match(/RFC822\.SIZE\s+(\d+)/i)?.[1] || 0);
      const headerStart = block.indexOf('\r\n', block.indexOf('HEADER.FIELDS'));
      const header = headerStart >= 0 ? block.slice(headerStart + 2) : '';
      const headers = parseHeaders(header);
      out.push({ uid, flags, size, messageId: headers['message-id'], from: parseAddresses(headers.from), to: parseAddresses(headers.to), cc: parseAddresses(headers.cc), subject: headers.subject || '(MÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â‚¬Å¾Ã‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¶vzusuz)', date: headers.date || '' });
    }
    return out;
  }

  async fetchRaw(uid: number) {
    const response = await this.command(`UID FETCH ${uid} (UID FLAGS BODY.PEEK[])`);
    const marker = Buffer.from('BODY[]');
    const start = response.indexOf(marker);
    if (start < 0) throw new Error('MAIL_IMAP_MESSAGE_NOT_FOUND');
    const literalStart = response.indexOf('\r\n', start);
    if (literalStart < 0) throw new Error('MAIL_IMAP_MESSAGE_INVALID');
    const lengthMatch = response.subarray(start, literalStart).toString('utf8').match(/\{(\d+)\}/);
    if (!lengthMatch) throw new Error('MAIL_IMAP_MESSAGE_INVALID');
    const length = Number(lengthMatch[1]);
    return response.subarray(literalStart + 2, literalStart + 2 + length);
  }

  async addFlags(uid:number, flags:string[]) { await this.command(`UID STORE ${uid} +FLAGS.SILENT (${flags.join(' ')})`); }
  async removeFlags(uid:number, flags:string[]) { await this.command(`UID STORE ${uid} -FLAGS.SILENT (${flags.join(' ')})`); }
  async copy(uid:number, folder:string) { await this.command(`UID COPY ${uid} ${quote(encodeModifiedUtf7(folder))}`); }
  async delete(uid:number) { await this.command(`UID STORE ${uid} +FLAGS.SILENT (\\Deleted)`); await this.command('EXPUNGE'); }
}

function unfold(value: string) { return value.replace(/\r?\n[ \t]+/g, ' ').trim(); }
function parseHeaders(input: string) {
  const result: Record<string,string> = {};
  for (const line of input.split(/\r?\n/)) {
    const idx = line.indexOf(':');
    if (idx <= 0) continue;
    const key = line.slice(0, idx).trim().toLowerCase();
    const value = unfold(line.slice(idx + 1));
    result[key] = result[key] ? `${result[key]}, ${value}` : value;
  }
  return result;
}

function decodeMimeWords(value: string) {
  return value.replace(/=\?([^?]+)\?([bBqQ])\?([^?]+)\?=/g, (_m, charset, encoding, data) => {
    try {
      const bytes = encoding.toLowerCase() === 'b' ? Buffer.from(data, 'base64') : Buffer.from(data.replace(/_/g, ' ').replace(/=([0-9A-Fa-f]{2})/g, (_x:string,h:string)=>String.fromCharCode(parseInt(h,16))), 'binary');
      return new TextDecoder(String(charset).toLowerCase() === 'iso-8859-1' ? 'latin1' : 'utf-8').decode(bytes);
    } catch { return data; }
  });
}

function parseAddresses(value?: string) {
  if (!value) return [];
  const cleaned = decodeMimeWords(value);
  const out: MailAddress[] = [];
  const re = /(?:"([^"]*)"\s*)?<([^>]+)>|([^,;\s]+@[^,;\s]+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(cleaned))) out.push({ name: m[1]?.trim() || undefined, address: (m[2] || m[3]).trim() });
  return out;
}

function decodeBodyBuffer(value: Buffer, transfer: string | undefined) {
  if ((transfer || '').toLowerCase() === 'base64') return Buffer.from(value.toString('ascii').replace(/\s/g,''), 'base64');
  if ((transfer || '').toLowerCase() === 'quoted-printable') return Buffer.from(value.toString('latin1').replace(/=\r?\n/g,'').replace(/=([0-9A-Fa-f]{2})/g, (_m,h)=>String.fromCharCode(parseInt(h,16))), 'latin1');
  return Buffer.from(value);
}

function decodeBody(value: Buffer, transfer: string | undefined, charset='utf-8') {
  const bytes = decodeBodyBuffer(value, transfer);
  try { return new TextDecoder(charset.toLowerCase() === 'iso-8859-1' ? 'latin1' : 'utf-8').decode(bytes); } catch { return bytes.toString('utf8'); }
}

function splitMime(raw: Buffer, boundary: string) {
  const delimiter = Buffer.from(`--${boundary}`);
  const parts: Buffer[] = [];
  let offset = 0;
  while (true) {
    const idx = raw.indexOf(delimiter, offset);
    if (idx < 0) break;
    const next = raw.indexOf(delimiter, idx + delimiter.length);
    if (next < 0) break;
    const start = idx + delimiter.length + 2;
    if (start < next) parts.push(raw.subarray(start, next - 2));
    offset = next;
    if (raw.subarray(next, next + delimiter.length + 2).toString('ascii').startsWith(`--${boundary}--`)) break;
  }
  return parts;
}

function parseMimePart(part: Buffer): { headers: Record<string,string>; body: Buffer } {
  const sep = part.indexOf('\r\n\r\n');
  if (sep < 0) return { headers: parseHeaders(part.toString('utf8')), body: Buffer.alloc(0) };
  return { headers: parseHeaders(part.subarray(0, sep).toString('utf8')), body: part.subarray(sep + 4) };
}

function parseContentType(value='') {
  const type = value.split(';')[0].trim().toLowerCase();
  const boundary = value.match(/boundary\s*=\s*(?:"([^"]+)"|([^;\s]+))/i)?.[1] || value.match(/boundary\s*=\s*(?:"([^"]+)"|([^;\s]+))/i)?.[2];
  const charset = value.match(/charset\s*=\s*(?:"([^"]+)"|([^;\s]+))/i)?.[1] || value.match(/charset\s*=\s*(?:"([^"]+)"|([^;\s]+))/i)?.[2] || 'utf-8';
  return { type, boundary, charset };
}

function walkMime(raw: Buffer, result: {text:string;html:string;attachments:ImapAttachment[]}) {
  const {headers, body} = parseMimePart(raw);
  const ct = parseContentType(headers['content-type']);
  if (ct.boundary) {
    for (const part of splitMime(body, ct.boundary)) walkMime(part, result);
    return;
  }
  const disposition = headers['content-disposition'] || '';
  const filenameRaw = disposition.match(/filename\s*=\s*(?:"([^"]+)"|([^;\s]+))/i)?.[1] || disposition.match(/filename\s*=\s*(?:"([^"]+)"|([^;\s]+))/i)?.[2] || ct.type === 'application/octet-stream' ? 'attachment' : '';
  const nameParam = headers['content-type']?.match(/name\s*=\s*(?:"([^"]+)"|([^;\s]+))/i)?.[1] || headers['content-type']?.match(/name\s*=\s*(?:"([^"]+)"|([^;\s]+))/i)?.[2];
  const filename = decodeMimeWords(filenameRaw || nameParam || '');
  if (filename || /attachment/i.test(disposition)) {
    result.attachments.push({ filename: filename || 'attachment', mimeType: ct.type || 'application/octet-stream', size: body.length, content: decodeBodyBuffer(body, headers['content-transfer-encoding']) });
    return;
  }
  const decoded = decodeBody(body, headers['content-transfer-encoding'], ct.charset);
  if (ct.type === 'text/html') result.html += decoded;
  else if (ct.type === 'text/plain') result.text += decoded.replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '').replace(/@font-face\s*\{[\s\S]*?\}\s*/gi, '').trim();
}

export function parseRawMessage(raw: Buffer): ImapMessage {
  const {headers} = parseMimePart(raw);
  const result = { text:'', html:'', attachments:[] as ImapAttachment[] };
  walkMime(raw, result);
  return {
    uid: 0,
    flags: [],
    messageId: headers['message-id'],
    inReplyTo: headers['in-reply-to'],
    references: headers.references,
    from: parseAddresses(headers.from),
    to: parseAddresses(headers.to),
    cc: parseAddresses(headers.cc),
    bcc: parseAddresses(headers.bcc),
    subject: decodeMimeWords(headers.subject || '(MÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â‚¬Å¾Ã‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¶vzusuz)'),
    date: headers.date || new Date().toISOString(),
    text: result.text,
    html: result.html,
    attachments: result.attachments,
  };
}

export async function withImap<T>(fn: (connection: ImapConnection) => Promise<T>) {
  const connection = new ImapConnection();
  try { await connection.connect(); return await fn(connection); }
  finally { await connection.logout(); }
}

export async function listMailboxes() { return withImap((c) => c.list()); }
export async function imapSearch(folder: string, criteria: string) { return withImap(async (c) => { await c.select(folder); return c.search(criteria); }); }

export const DEFAULT_FOLDERS = { inbox:'INBOX', sent:'Sent', drafts:'Drafts', trash:'Trash' };

export function mailboxFromKey(key: string) {
  const custom = { inbox:process.env.MAIL_IMAP_INBOX, sent:process.env.MAIL_IMAP_SENT, drafts:process.env.MAIL_IMAP_DRAFTS, trash:process.env.MAIL_IMAP_TRASH } as Record<string,string|undefined>;
  return custom[key] || DEFAULT_FOLDERS[key as keyof typeof DEFAULT_FOLDERS] || key;
}

export async function fetchMessages(folder: string, page=1, pageSize=20, query?: string) {
  return withImap(async (c) => {
    await c.select(folder);
    let uids: number[];
    if (query) uids = await c.search(`OR OR FROM ${quote(query)} TO ${quote(query)} SUBJECT ${quote(query)} BODY ${quote(query)}`);
    else uids = await c.search('ALL');
    uids = uids.sort((a,b)=>b-a);
    const total = uids.length;
    const pageUids = uids.slice((page-1)*pageSize, page*pageSize);
    const overview = await c.fetchOverview(pageUids);
    return { messages: overview.sort((a,b)=>b.uid-a.uid), total, page, pageSize, totalPages: Math.max(1,Math.ceil(total/pageSize)) };
  });
}

export async function getMessage(folder: string, uid: number, markRead=true) {
  return withImap(async (c) => { await c.select(folder); const raw = await c.fetchRaw(uid); const message = parseRawMessage(raw); message.uid = uid; if (markRead) await c.addFlags(uid,['\\Seen']); return message; });
}

export async function setMessageFlag(folder:string, uid:number, flag:'seen'|'flagged', enabled:boolean) {
  return withImap(async (c)=>{ await c.select(folder); const imapFlag = flag === 'seen' ? '\\Seen' : '\\Flagged'; if (enabled) await c.addFlags(uid,[imapFlag]); else await c.removeFlags(uid,[imapFlag]); });
}

export async function moveToTrash(folder:string, uid:number) {
  return withImap(async (c)=>{ await c.select(folder); const trash = mailboxFromKey('trash'); await c.copy(uid,trash); await c.delete(uid); });
}

export async function getUnreadCount(folder=mailboxFromKey('inbox')) { return withImap(async(c)=>{await c.select(folder); return (await c.search('UNSEEN')).length;}); }

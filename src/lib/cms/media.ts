const IMAGE_TYPES = new Set(['image/jpeg','image/png','image/webp','image/avif']);
const VIDEO_TYPES = new Set(['video/mp4','video/webm','video/quicktime']);
export const MAX_IMAGE_BYTES = 15 * 1024 * 1024;
export const MAX_VIDEO_BYTES = 100 * 1024 * 1024;

export function isAllowedMediaType(type: string) { return IMAGE_TYPES.has(type) || VIDEO_TYPES.has(type); }
export function maxBytesFor(type: string) { return VIDEO_TYPES.has(type) ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES; }

export function hasSafeSignature(buffer: Buffer, mime: string) {
  if (mime === 'image/png') return buffer.length >= 8 && buffer.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
  if (mime === 'image/jpeg') return buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  if (mime === 'image/webp') return buffer.length >= 12 && buffer.toString('ascii',0,4) === 'RIFF' && buffer.toString('ascii',8,12) === 'WEBP';
  if (mime === 'image/avif') return buffer.length >= 12 && buffer.toString('ascii',4,8) === 'ftyp' && ['avif','avis','mif1','msf1'].includes(buffer.toString('ascii',8,12));
  if (mime === 'video/mp4' || mime === 'video/quicktime') return buffer.length >= 12 && buffer.toString('ascii',4,8) === 'ftyp';
  if (mime === 'video/webm') return buffer.length >= 4 && buffer.subarray(0,4).equals(Buffer.from([0x1a,0x45,0xdf,0xa3]));
  return false;
}

export function safeFilename(name: string) {
  const cleaned = name.normalize('NFKC').replace(/[^a-zA-Z0-9._-]/g, '-').replace(/-+/g, '-').replace(/^[-.]+|[-.]+$/g, '');
  return cleaned.slice(0, 180) || 'upload';
}

export function dimensions(buffer: Buffer, mime: string): { width: number; height: number } | null {
  if (mime === 'image/png' && buffer.length > 24 && buffer.toString('ascii',0,8) === '\x89PNG\r\n\x1a\n') {
    return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
  }
  if (mime === 'image/gif' && buffer.length > 10 && buffer.toString('ascii',0,3) === 'GIF') {
    return { width: buffer.readUInt16LE(6), height: buffer.readUInt16LE(8) };
  }
  if (mime === 'image/jpeg' && buffer.length > 4 && buffer[0] === 0xff && buffer[1] === 0xd8) {
    let i = 2;
    while (i + 9 < buffer.length) {
      if (buffer[i] !== 0xff) { i++; continue; }
      const marker = buffer[i + 1]; i += 2;
      if (marker === 0xd8 || marker === 0xd9) continue;
      if (i + 2 > buffer.length) break;
      const len = buffer.readUInt16BE(i);
      if (marker >= 0xc0 && marker <= 0xc3 || marker >= 0xc5 && marker <= 0xc7 || marker >= 0xc9 && marker <= 0xcb || marker >= 0xcd && marker <= 0xcf) {
        if (i + 7 <= buffer.length) return { width: buffer.readUInt16BE(i + 5), height: buffer.readUInt16BE(i + 3) };
        break;
      }
      i += len;
    }
  }
  if (mime === 'image/webp' && buffer.length > 30 && buffer.toString('ascii',0,4) === 'RIFF' && buffer.toString('ascii',8,12) === 'WEBP') {
    const chunk = buffer.toString('ascii',12,16);
    if (chunk === 'VP8X') return { width: 1 + buffer.readUIntLE(24,3), height: 1 + buffer.readUIntLE(27,3) };
  }
  return null;
}

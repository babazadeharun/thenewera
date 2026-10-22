import { prisma } from '@/lib/prisma';
import { appendSentCopy } from './imap';

export const sentCopyWarning = 'Email göndərildi. “Göndərilənlər” nüsxəsi hələ saxlanılmayıb; məktubu təkrar göndərməyin. Mail qutusunda “Yenilə” ilə yenidən yoxlayın.';
export async function archiveSentCopy(messageId: string, raw: Buffer) {
  try {
    await prisma.mailSentCopy.upsert({ where: { messageId }, create: { messageId, raw }, update: {} });
    return await saveCopy(messageId);
  } catch {
    console.warn('MAIL_SENT_COPY_PENDING');
    return false;
  }
}
async function saveCopy(messageId: string) {
  const copy = await prisma.mailSentCopy.findUnique({ where: { messageId } });
  if (!copy) return false;
  if (copy.state === 'SAVED') return true;
  if (copy.state === 'SAVING') return false;
  const claimed = await prisma.mailSentCopy.updateMany({ where: { messageId, updatedAt: copy.updatedAt, state: { in: ['PENDING','RETRY'] } }, data: { state: 'SAVING', attempts: { increment: 1 } } });
  if (!claimed.count) return false;
  try {
    await appendSentCopy(Buffer.from(copy.raw), messageId);
    // Retain the receipt, discard the MIME bytes after a successful archive.
    await prisma.mailSentCopy.update({ where: { messageId }, data: { state: 'SAVED', raw: Buffer.alloc(0), lastError: null } });
    return true;
  } catch {
    await prisma.mailSentCopy.update({ where: { messageId }, data: { state: copy.attempts >= 4 ? 'FAILED' : 'RETRY', nextAttemptAt: new Date(Date.now() + 60000), lastError: 'IMAP_SENT_COPY_FAILED' } });
    return false;
  }
}
export async function retrySentCopies(deadline = Date.now() + 8000, retryFailed = false) {
  if (retryFailed) await prisma.mailSentCopy.updateMany({ where: { state: 'FAILED' }, data: { state: 'RETRY', attempts: 0, nextAttemptAt: new Date() } });
  await prisma.mailSentCopy.updateMany({ where: { state: 'SAVING', updatedAt: { lt: new Date(Date.now() - 10 * 60000) } }, data: { state: 'RETRY', nextAttemptAt: new Date() } });
  const copies = await prisma.mailSentCopy.findMany({ where: { state: { in: ['PENDING','RETRY'] }, nextAttemptAt: { lte: new Date() } }, orderBy: { createdAt: 'asc' }, take: 10, select: { messageId: true } });
  let saved = 0;
  for (const copy of copies) {
    if (Date.now() >= deadline) break;
    if (await saveCopy(copy.messageId)) saved++;
  }
  await prisma.mailSentCopy.deleteMany({ where: { state: 'SAVED', updatedAt: { lt: new Date(Date.now() - 30 * 86400000) } } });
  return { saved, pending: await prisma.mailSentCopy.count({ where: { state: { not: 'SAVED' } } }) };
}

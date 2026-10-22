import { createHash } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { financeError, financeGuard, dateValue, clean } from '../_shared';

class PaymentError extends Error {}
const digest = (s: string) => createHash('sha256').update(s).digest('hex');
export async function GET() {
  try {
    await financeGuard();
    const rows = await prisma.financePayment.findMany({ include: { invoice: { include: { client: true } }, client: true }, orderBy: { date: 'desc' }, take: 250 });
    return NextResponse.json({ payments: rows.map(p => ({ ...p, amount: Number(p.amount) })) });
  } catch (e) { return financeError(e); }
}
export async function POST(req: Request) {
  try {
    const user = await financeGuard();
    const origin = req.headers.get('origin');
    if (origin && origin !== new URL(req.url).origin) return NextResponse.json({ error: 'Sorğu mənbəyi uyğun deyil.' }, { status: 403 });
    const b = await req.json();
    const date = dateValue(b.date);
    if (!/^\d{1,12}(\.\d{1,2})?$/.test(String(b.amount ?? '')) || !b.invoiceId || !date) return NextResponse.json({ error: 'Faktura, düzgün məbləğ və tarix tələb olunur.' }, { status: 400 });
    const amount = new Prisma.Decimal(String(b.amount));
    if (amount.lessThanOrEqualTo(0)) return NextResponse.json({ error: 'Məbləğ 0-dan böyük olmalıdır.' }, { status: 400 });
    const method = ['BANK_TRANSFER','CASH','CARD','ONLINE_PAYMENT','OTHER'].includes(b.method) ? b.method : 'BANK_TRANSFER';
    const inputKey = req.headers.get('idempotency-key') || b.idempotencyKey;
    if (inputKey && (typeof inputKey !== 'string' || !/^[a-zA-Z0-9_-]{16,100}$/.test(inputKey))) return NextResponse.json({ error: 'Əməliyyat açarı düzgün deyil.' }, { status: 400 });
    const idempotencyKey = inputKey ? digest(user.id + ':' + inputKey) : null;
    const requestHash = digest(JSON.stringify([b.invoiceId, amount.toFixed(2), date.toISOString(), method, b.accountId || null, clean(b.reference,150), clean(b.notes,1000)]));
    const payment = await prisma.$transaction(async tx => {
      // Serialize every payment for this invoice before reading its balance.
      await tx.$queryRaw`SELECT "id" FROM "Invoice" WHERE "id"=${String(b.invoiceId)} FOR UPDATE`;
      if (idempotencyKey) {
        const previous = await tx.financePayment.findUnique({ where: { idempotencyKey } });
        if (previous) {
          if (previous.requestHash !== requestHash) throw new PaymentError('Bu əməliyyat açarı başqa ödəniş məlumatına bağlıdır.');
          return previous;
        }
      }
      const invoice = await tx.invoice.findUnique({ where: { id: String(b.invoiceId) } });
      if (!invoice) throw new PaymentError('Faktura tapılmadı.');
      if (invoice.status === 'CANCELLED') throw new PaymentError('Ləğv edilmiş fakturaya ödəniş yazıla bilməz.');
      if (amount.greaterThan(invoice.total.minus(invoice.paidAmount))) throw new PaymentError('Ödəniş fakturanın qalıq məbləğindən böyükdür.');
      const row = await tx.financePayment.create({ data: { invoiceId: invoice.id, amount, date, method, accountId: b.accountId || null, reference: clean(b.reference,150) || null, notes: clean(b.notes,1000) || null, clientId: invoice.clientId, createdById: user.id, idempotencyKey, requestHash } });
      const paidAmount = invoice.paidAmount.plus(amount);
      await tx.invoice.update({ where: { id: invoice.id }, data: { paidAmount, status: paidAmount.greaterThanOrEqualTo(invoice.total) ? 'PAID' : 'PARTIALLY_PAID' } });
      await tx.financeTransaction.create({ data: { date, amount, type: 'INCOME', category: 'Invoice payment', description: `Invoice ${invoice.number} ödənişi`, accountId: b.accountId || null, clientId: invoice.clientId, projectId: invoice.projectId, invoiceId: invoice.id, paymentMethod: method, reference: clean(b.reference,150) || null, notes: clean(b.notes,1000) || null, createdById: user.id } });
      return row;
    }, { timeout: 15000 });
    return NextResponse.json({ payment: { ...payment, amount: Number(payment.amount) } }, { status: 201 });
  } catch (e) {
    if (e instanceof PaymentError || (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002')) return NextResponse.json({ error: e instanceof PaymentError ? e.message : 'Bu əməliyyat artıq qeydə alınıb. Siyahını yeniləyin.' }, { status: 409 });
    return financeError(e);
  }
}

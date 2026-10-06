import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
const db: any = prisma;
import { financeError, financeGuard, numberValue, dateValue, clean } from './_shared';

export async function GET(request: Request) {
  try {
    await financeGuard();
    const url = new URL(request.url);
    const q = clean(url.searchParams.get('q'), 100).toLowerCase();
    const type = url.searchParams.get('type');
    const from = dateValue(url.searchParams.get('from'));
    const to = dateValue(url.searchParams.get('to'));
    const transactions = await db.financeTransaction.findMany({
      where: {
        status: { not: 'VOID' },
        ...(type && ['INCOME','EXPENSE','TRANSFER'].includes(type) ? { type: type as any } : {}),
        ...(from || to ? { date: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } : {}),
        ...(q ? { OR: [
          { description: { contains: q, mode: 'insensitive' } },
          { category: { contains: q, mode: 'insensitive' } },
          { reference: { contains: q, mode: 'insensitive' } },
          { client: { OR: [{ firstName: { contains: q, mode: 'insensitive' } }, { lastName: { contains: q, mode: 'insensitive' } }, { company: { contains: q, mode: 'insensitive' } }] } },
          { vendor: { OR: [{ name: { contains: q, mode: 'insensitive' } }, { company: { contains: q, mode: 'insensitive' } }] } },
        ] } : {}),
      },
      include: { account: true, toAccount: true, client: true, vendor: true, project: true, invoice: true },
      orderBy: { date: 'desc' }, take: 250,
    });
    const [accounts, vendors, invoices, payables, clients, services, projects] = await Promise.all([
      db.financeAccount.findMany({ orderBy: { createdAt: 'asc' } }),
      db.vendor.findMany({ orderBy: { name: 'asc' } }),
      db.invoice.findMany({ include: { client: true, project: true, payments: true }, orderBy: { issueDate: 'desc' }, take: 250 }),
      db.financePayable.findMany({ include: { vendor: true, project: true }, orderBy: { dueDate: 'asc' }, take: 250 }),
      db.client.findMany({ orderBy: { createdAt: 'desc' } }),
      db.service.findMany({ orderBy: { name: 'asc' } }),
      db.project.findMany({ include: { client: true, service: true }, orderBy: { createdAt: 'desc' }, take: 250 }),
    ]);
    const income = transactions.filter((t: any) => t.type === 'INCOME').reduce((s: any, t: any) => s + Number(t.amount), 0);
    const expense = transactions.filter((t: any) => t.type === 'EXPENSE').reduce((s: any, t: any) => s + Number(t.amount), 0);
    const receivables = invoices.reduce((s: any, i: any) => s + Math.max(0, Number(i.total) - Number(i.paidAmount)), 0);
    const payablesTotal = payables.reduce((s: any, p: any) => s + Math.max(0, Number(p.amount) - Number(p.paidAmount)), 0);
    return NextResponse.json({
      transactions: transactions.map((t: any) => ({ ...t, amount: Number(t.amount) })),
      accounts: accounts.map((a: any) => ({ ...a, openingBalance: Number(a.openingBalance) })),
      vendors, clients, services, projects,
      invoices: invoices.map((i: any) => ({ ...i, subtotal: Number(i.subtotal), tax: Number(i.tax), discount: Number(i.discount), total: Number(i.total), paidAmount: Number(i.paidAmount), payments: i.payments.map((p: any) => ({ ...p, amount: Number(p.amount) })) })),
      payables: payables.map((p: any) => ({ ...p, amount: Number(p.amount), paidAmount: Number(p.paidAmount) })),
      summary: { income, expense, profit: income - expense, receivables, payables: payablesTotal },
    });
  } catch (e) { return financeError(e); }
}

export async function POST(request: Request) {
  try {
    const user = await financeGuard();
    const body = await request.json();
    const amount = numberValue(body.amount);
    const date = dateValue(body.date);
    const type = clean(body.type, 20);
    if (!amount || amount <= 0) return NextResponse.json({ error: 'Məbləğ 0-dan böyük olmalıdır.' }, { status: 400 });
    if (!date) return NextResponse.json({ error: 'Düzgün tarix seçin.' }, { status: 400 });
    if (!['INCOME','EXPENSE','TRANSFER'].includes(type)) return NextResponse.json({ error: 'Əməliyyat növü düzgün deyil.' }, { status: 400 });
    if (type === 'TRANSFER' && (!body.accountId || !body.toAccountId || body.accountId === body.toAccountId)) return NextResponse.json({ error: 'Transfer üçün mənbə və təyinat hesabı fərqli olmalıdır.' }, { status: 400 });
    if (type !== 'TRANSFER' && !clean(body.description)) return NextResponse.json({ error: 'Açıqlama tələb olunur.' }, { status: 400 });
    const transaction = await db.financeTransaction.create({
      data: {
        date, amount, type: type as any, category: clean(body.category, 120) || (type === 'INCOME' ? 'Digər gəlir' : type === 'EXPENSE' ? 'Digər xərc' : 'Transfer'),
        description: clean(body.description, 1000) || 'Hesablararası transfer', accountId: body.accountId || null, toAccountId: body.toAccountId || null,
        clientId: body.clientId || null, vendorId: body.vendorId || null, projectId: body.projectId || null, invoiceId: body.invoiceId || null,
        paymentMethod: body.paymentMethod && ['BANK_TRANSFER','CASH','CARD','ONLINE_PAYMENT','OTHER'].includes(body.paymentMethod) ? body.paymentMethod : null,
        reference: clean(body.reference, 150) || null, notes: clean(body.notes, 2000) || null, createdById: user.id,
      }, include: { account: true, toAccount: true, client: true, vendor: true, project: true },
    });
    return NextResponse.json({ transaction: { ...transaction, amount: Number(transaction.amount) } }, { status: 201 });
  } catch (e) { return financeError(e); }
}

export async function PATCH(request: Request) {
  try {
    await financeGuard();
    const body = await request.json();
    const id = clean(body.id, 100);
    if (!id) return NextResponse.json({ error: 'Əməliyyat tapılmadı.' }, { status: 400 });
    const transaction = await db.financeTransaction.update({ where: { id }, data: { status: body.status === 'REVERSED' ? 'REVERSED' : 'VOID' } });
    return NextResponse.json({ transaction });
  } catch (e) { return financeError(e); }
}

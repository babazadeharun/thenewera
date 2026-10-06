import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin';

export async function financeGuard() {
  return requireAdmin();
}

export function financeError(error: unknown) {
  const message = error instanceof Error ? error.message : 'Maliyyə əməliyyatı uğursuz oldu.';
  const status = message === 'UNAUTHORIZED' ? 401 : message === 'FORBIDDEN' ? 403 : 400;
  return NextResponse.json({ error: message }, { status });
}

export function numberValue(value: unknown, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export function dateValue(value: unknown) {
  const date = new Date(String(value || ''));
  return Number.isNaN(date.getTime()) ? null : date;
}

export function clean(value: unknown, max = 500) {
  return String(value ?? '').trim().slice(0, max);
}

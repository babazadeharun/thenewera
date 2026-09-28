import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ ok: true, service: 'new-era-api', version: 'v22', persistence: 'postgresql', database: 'connected', timestamp: new Date().toISOString() });
  } catch {
    return NextResponse.json({ ok: false, service: 'new-era-api', version: 'v22', persistence: 'postgresql', database: 'disconnected', timestamp: new Date().toISOString() }, { status: 503 });
  }
}

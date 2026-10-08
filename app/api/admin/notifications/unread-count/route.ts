import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getUnreadNotificationCount } from '@/lib/notifications/service';
export async function GET() { const user = await getCurrentUser(); if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 }); if (!['ADMIN','SUPER_ADMIN'].includes(user.role)) return NextResponse.json({ error:'Forbidden' }, {status:403}); return NextResponse.json({ count: await getUnreadNotificationCount(user.id) }); }

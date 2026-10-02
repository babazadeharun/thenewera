import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireMarketingAdmin } from '@/lib/marketing/authorization';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireMarketingAdmin();

    const { id } = await params;

    const lead = await prisma.lead.findUnique({
      where: { id },
      include: {
        researchItems: {
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
      },
    });

    if (!lead) {
      return NextResponse.json(
        { error: 'Lead not found.' },
        { status: 404 }
      );
    }

    return NextResponse.json({ lead });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Unable to load lead.',
      },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireMarketingAdmin();

    const { id } = await params;
    const body = await request.json();

    const allowed = [
      'NEW',
      'VERIFIED',
      'CONTACTED',
      'QUALIFIED',
      'CONVERTED',
      'DISQUALIFIED',
      'ARCHIVED',
    ];

    if (body.status && !allowed.includes(body.status)) {
      return NextResponse.json(
        { error: 'Invalid status.' },
        { status: 400 }
      );
    }

    const lead = await prisma.lead.update({
      where: { id },
      data: {
        ...(body.status ? { status: body.status } : {}),
        ...(body.notes !== undefined
          ? { aiSummary: String(body.notes).slice(0, 4000) }
          : {}),
      },
    });

    return NextResponse.json({ lead });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Unable to update lead.',
      },
      { status: 500 }
    );
  }
}

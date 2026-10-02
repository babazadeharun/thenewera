import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireEventsAdmin } from '@/lib/events/authorization';
import { calculatePromoterPrice } from '@/lib/events/pricing';
import { sendEventEmail } from '@/lib/events/email';
import {
  promoterApprovalEmail,
  promoterRejectionEmail,
} from '@/lib/events/email-templates';

function fail(e: unknown) {
  const m = e instanceof Error ? e.message : 'Request failed';

  return NextResponse.json(
    { error: m },
    {
      status:
        m === 'UNAUTHORIZED'
          ? 401
          : m === 'FORBIDDEN'
            ? 403
            : 400,
    }
  );
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ applicationId: string }> }
) {
  try {
    const reviewer = await requireEventsAdmin();
    const { applicationId } = await params;
    const body = await req.json();

    const action = String(body.action || '');

    if (!['APPROVE', 'REJECT'].includes(action)) {
      throw new Error('INVALID_ACTION');
    }

    const result = await prisma.$transaction(async (tx) => {
      const application = await tx.promoterApplication.findUnique({
        where: {
          id: applicationId,
        },
        include: {
          event: true,
          promoter: true,
        },
      });

      if (!application) {
        throw new Error('APPLICATION_NOT_FOUND');
      }

      if (!['PENDING', 'UNDER_REVIEW'].includes(application.status)) {
        throw new Error('APPLICATION_ALREADY_REVIEWED');
      }

      const now = new Date();

      // REJECT APPLICATION
      if (action === 'REJECT') {
        return tx.promoterApplication.update({
          where: {
            id: applicationId,
          },
          data: {
            status: 'REJECTED',
            rejectReason:
              String(body.rejectReason || '').trim() || null,
            adminNotes:
              String(body.adminNotes || '').trim() || null,
            reviewedAt: now,
            reviewedByUserId: reviewer.id,
          },
          include: {
            event: true,
            promoter: true,
          },
        });
      }

      // APPROVE APPLICATION
      const price = calculatePromoterPrice(
        application.event.publicTicketPrice,
        application.event.promoterDiscountPercent
      );

      await tx.promoter.update({
        where: {
          id: application.promoterId,
        },
        data: {
          status: 'ACTIVE',
        },
      });

      await tx.promoterEvent.upsert({
        where: {
          promoterId_eventId: {
            promoterId: application.promoterId,
            eventId: application.eventId,
          },
        },
        create: {
          promoterId: application.promoterId,
          eventId: application.eventId,
          status: 'ACTIVE',
          allocation: 0,
          promoterDiscountPercent:
            application.event.promoterDiscountPercent,
          promoterPrice: price,
          soldQuantity: 0,
          remainingQuantity: 0,
        },
        update: {
          status: 'ACTIVE',
          promoterDiscountPercent:
            application.event.promoterDiscountPercent,
          promoterPrice: price,
        },
      });

      return tx.promoterApplication.update({
        where: {
          id: applicationId,
        },
        data: {
          status: 'APPROVED',
          rejectReason: null,
          adminNotes:
            String(body.adminNotes || '').trim() || null,
          reviewedAt: now,
          reviewedByUserId: reviewer.id,
        },
        include: {
          event: true,
          promoter: true,
        },
      });
    });

    // SEND EMAIL AFTER DATABASE TRANSACTION
    let emailSent = true;

    try {
      if (!result.promoter.email) {
        emailSent = false;
      } else if (result.status === 'APPROVED') {
        const email = promoterApprovalEmail({
          firstName: result.promoter.firstName,
          eventName: result.event.name,
          promoterPrice: Number(
            calculatePromoterPrice(
              result.event.publicTicketPrice,
              result.event.promoterDiscountPercent
            )
          ).toFixed(2),
        });

        await sendEventEmail({
          to: result.promoter.email,
          subject: email.subject,
          text: email.text,
          html: email.html,
        });
      } else {
        const email = promoterRejectionEmail({
          firstName: result.promoter.firstName,
          eventName: result.event.name,
          reason: result.rejectReason,
        });

        await sendEventEmail({
          to: result.promoter.email,
          subject: email.subject,
          text: email.text,
          html: email.html,
        });
      }
    } catch (emailError) {
      emailSent = false;

      console.error(
        'promoter application email error',
        emailError
      );
    }

    return NextResponse.json({
      application: result,
      emailSent,
    });
  } catch (e) {
    return fail(e);
  }
}
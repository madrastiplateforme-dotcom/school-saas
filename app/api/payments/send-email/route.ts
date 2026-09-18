// app/api/payments/send-email/route.ts
import { NextRequest, NextResponse } from 'next/server'
import {
  sendPaymentReceivedEmails,
  sendPaymentCancelledEmails,
} from '@/lib/send-payment-email'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    if (!body?.paymentId || !body?.eventType) {
      return NextResponse.json(
        { success: false, error: 'missing params' },
        { status: 400 },
      )
    }

    let result

    if (body.eventType === 'received') {
      result = await sendPaymentReceivedEmails(body.paymentId)
    } else if (body.eventType === 'cancelled') {
      if (!body.cancelledByUserId) {
        return NextResponse.json(
          { success: false, error: 'cancelledByUserId requis' },
          { status: 400 },
        )
      }
      result = await sendPaymentCancelledEmails({
        paymentId: body.paymentId,
        cancelledByUserId: body.cancelledByUserId,
        cancelReason: body.cancelReason || '',
      })
    } else {
      return NextResponse.json(
        { success: false, error: 'eventType invalide' },
        { status: 400 },
      )
    }

    return NextResponse.json(result)
  } catch (err: any) {
    console.error('[api/payments/send-email]', err?.message || err)
    return NextResponse.json(
      { success: false, error: err?.message || 'server error' },
      { status: 500 },
    )
  }
}
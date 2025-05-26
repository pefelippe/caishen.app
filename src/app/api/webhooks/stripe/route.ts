import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { updateUserSubscription } from '@/lib/firebase';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(request: Request) {
  const payload = await request.text();
  const signature = request.headers.get('stripe-signature')!;

  try {
    const event = stripe.webhooks.constructEvent(
      payload,
      signature,
      webhookSecret
    );

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const { userId, planId } = session.metadata!;

        // Update user's subscription in Firestore
        await updateUserSubscription(userId, planId as any, session.customer as string);
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = subscription.metadata.userId;
        const planId = subscription.metadata.planId;

        if (subscription.status === 'active') {
          await updateUserSubscription(userId, planId as any, subscription.customer as string);
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = subscription.metadata.userId;

        // Downgrade to free plan
        await updateUserSubscription(userId, 'free');
        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Error processing webhook:', error);
    return NextResponse.json(
      { error: 'Webhook error' },
      { status: 400 }
    );
  }
} 
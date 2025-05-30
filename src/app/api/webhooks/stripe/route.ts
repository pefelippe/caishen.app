import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { stripe } from '@/lib/stripe';
import { db } from '@/lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(req: Request) {
  const body = await req.text();
  const signature = (await headers()).get('stripe-signature')!;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (error) {
    const stripeError = error as Error;
    console.error('Webhook signature verification failed:', stripeError.message);
    return NextResponse.json(
      { error: 'Webhook signature verification failed' },
      { status: 400 }
    );
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.client_reference_id;
        const subscriptionId = session.subscription as string;

        if (!userId || !subscriptionId) {
          throw new Error('Missing userId or subscriptionId');
        }

        await updateDoc(doc(db, 'users', userId), {
          stripeSubscriptionId: subscriptionId,
          stripeCustomerId: session.customer,
          subscriptionStatus: 'active'
        });

        break;
      }
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = subscription.metadata.userId;

        if (!userId) {
          throw new Error('Missing userId in subscription metadata');
        }

        await updateDoc(doc(db, 'users', userId), {
          subscriptionStatus: subscription.status
        });

        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    const stripeError = error as Error;
    console.error('Error processing webhook:', stripeError.message);
    return NextResponse.json(
      { error: 'Error processing webhook' },
      { status: 500 }
    );
  }
} 
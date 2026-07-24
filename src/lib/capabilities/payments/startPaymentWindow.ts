import { EventBus } from '../../events/EventBus';
import { CommerceEvent } from '../../events/types';
import { TimerCapability } from '../timer/TimerCapability';
import { v4 as uuidv4 } from 'uuid';

/**
 * Payment Window — a subscriber of `OrderCreated`.
 * 
 * When an order is created, this module:
 *   1. Emits `PaymentRequested` (the business fact)
 *   2. Schedules a Timer for the payment deadline
 * 
 * If the timer fires (`PaymentDeadlinePassed`), a downstream consumer
 * handles the consequence (cancel order, notify seller, etc.).
 * 
 * This module never captures payments. It declares intent and sets deadlines.
 */

const PAYMENT_WINDOW_HOURS = 24;

interface OrderCreatedPayload {
  order_id: string;
  buyer_id: string;
  seller_id: string;
  origin_domain: string;
  origin_id: string;
  amount: number;
  currency_code: string;
}

export class PaymentWindowCapability {

  static initialize() {
    EventBus.subscribe('OrderCreated', async (event: CommerceEvent<OrderCreatedPayload>) => {
      console.log(`[PaymentWindowCapability] OrderCreated received for order ${event.payload.order_id}`);
      await PaymentWindowCapability.startWindow(event);
    });
  }

  private static async startWindow(event: CommerceEvent<OrderCreatedPayload>): Promise<void> {
    const { order_id, buyer_id, amount, currency_code } = event.payload;

    // 1. Calculate the deadline
    const deadline = new Date(Date.now() + PAYMENT_WINDOW_HOURS * 60 * 60 * 1000);

    // 2. Emit PaymentRequested
    await EventBus.publish({
      event_id: uuidv4(),
      type: 'PaymentRequested',
      schema_version: 1,
      occurred_at: new Date().toISOString(),
      producer: 'PaymentWindowCapability',
      correlation_id: event.correlation_id,
      causation_id: event.event_id,
      payload: {
        order_id,
        buyer_id,
        amount,
        currency_code,
        deadline: deadline.toISOString(),
      },
    });

    console.log(`[PaymentWindowCapability] PaymentRequested for order ${order_id}. Deadline: ${deadline.toISOString()}`);

    // 3. Schedule the deadline timer
    TimerCapability.scheduleAt(
      'PaymentDeadlinePassed',
      'order',
      order_id,
      deadline,
      { buyer_id, amount, currency_code },
      event.correlation_id
    );

    console.log(`[PaymentWindowCapability] Timer set for ${PAYMENT_WINDOW_HOURS}h from now.`);
  }
}

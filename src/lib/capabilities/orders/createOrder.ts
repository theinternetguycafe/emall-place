import { EventBus } from '../../events/EventBus';
import { CommerceEvent } from '../../events/types';
import { v4 as uuidv4 } from 'uuid';

/**
 * Order Creation — a subscriber of `WinnerSelected`.
 * 
 * This module never gets called directly by Settlement, Auctions, or any domain.
 * It simply listens for business facts and reacts.
 * 
 * The `origin_domain` + `origin_id` pattern makes Orders reusable across
 * every future domain (Products, Services, Rentals, Vehicles, Property).
 */

interface WinnerSelectedPayload {
  auction_id: string;
  seller_id: string;
  winner_id: string;
  winning_bid_id: string;
  winning_amount: number;
  currency_code: string;
  asset_domain: string;
  asset_id: string;
}

export class OrderCapability {

  static initialize() {
    EventBus.subscribe('WinnerSelected', async (event: CommerceEvent<WinnerSelectedPayload>) => {
      console.log(`[OrderCapability] WinnerSelected received. Creating order for auction ${event.payload.auction_id}`);
      await OrderCapability.createOrder(event);
    });
  }

  private static async createOrder(event: CommerceEvent<WinnerSelectedPayload>): Promise<void> {
    const { auction_id, seller_id, winner_id, winning_amount, currency_code, asset_domain, asset_id } = event.payload;

    const orderId = uuidv4();

    // In production: INSERT INTO orders (...)
    // const { data, error } = await supabase
    //   .from('orders')
    //   .insert({
    //     id: orderId,
    //     buyer_id: winner_id,
    //     seller_id: seller_id,
    //     origin_domain: 'auction',
    //     origin_id: auction_id,
    //     amount: winning_amount,
    //     currency_code: currency_code,
    //     status: 'pending',
    //     metadata: { asset_domain, asset_id, winning_bid_id: event.payload.winning_bid_id }
    //   });

    console.log(`[OrderCapability] Order ${orderId} created: ${currency_code} ${winning_amount} from auction ${auction_id}`);

    // Emit OrderCreated
    await EventBus.publish({
      event_id: uuidv4(),
      type: 'OrderCreated',
      schema_version: 1,
      occurred_at: new Date().toISOString(),
      producer: 'OrderCapability',
      correlation_id: event.correlation_id,
      causation_id: event.event_id,
      payload: {
        order_id: orderId,
        buyer_id: winner_id,
        seller_id,
        origin_domain: 'auction',
        origin_id: auction_id,
        amount: winning_amount,
        currency_code,
      },
    });
  }
}

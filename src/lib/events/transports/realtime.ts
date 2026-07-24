import { EventBus } from '../EventBus';
import { CommerceEvent } from '../types';

/**
 * The Realtime Transport Adapter.
 * This file is purely responsible for subscribing to the Event Bus
 * and forwarding allowed events to connected UI clients via WebSockets.
 * 
 * Notice that it knows NOTHING about how Bids are placed or validated.
 */
export function initializeRealtimeTransport(supabaseClient: any) {
  
  // 1. Subscribe to BidPlaced
  EventBus.subscribe('BidPlaced', async (event: CommerceEvent) => {
    // We only broadcast safe projection data to the client, not sensitive ledger details
    const payload = event.payload;
    
    // Using Supabase Realtime channel broadcasting as the transport
    const channel = supabaseClient.channel(`auction_${payload.auction_id}`);
    
    await channel.send({
      type: 'broadcast',
      event: 'BidPlaced',
      payload: {
        amount: payload.amount,
        currency: payload.currency,
        occurred_at: event.occurred_at
      }
    });
    
    console.log(`[RealtimeAdapter] Broadcasted BidPlaced over WebSocket for auction ${payload.auction_id}`);
  });

  // 2. We could subscribe to other events...
  EventBus.subscribe('AuctionStarted', async (event: CommerceEvent) => {
    // ... broadcast to marketplace channel ...
  });
}

import { validateBid, BidRequest, AuctionState, HighestBid } from './biddingRules';
import { EventBus } from '../../events/EventBus';
import { CommerceEvent } from '../../events/types';
import { v4 as uuidv4 } from 'uuid'; // Assuming we have uuid installed, or we can use crypto.randomUUID()

/**
 * Executes a bid placement workflow.
 * 1. Validates the bid.
 * 2. Appends to the ledger (mocked here).
 * 3. Commits transaction.
 * 4. Publishes BidPlaced event.
 */
export async function placeBid(
  request: BidRequest, 
  auction: AuctionState, 
  currentHighestBid: HighestBid | null,
  causationId: string
): Promise<void> {
  try {
    // 1. Validate
    const normalizedMoney = validateBid(request, auction, currentHighestBid);

    // 2. Append to Ledger & Commit (Simulated Database Transaction)
    const bidRecordId = uuidv4();
    // await db.from('bids').insert({ ... })
    // If this fails, an exception is thrown and we never reach step 3.

    // 3. Publish Event
    const event: CommerceEvent<{ bid_id: string; auction_id: string; amount: number; currency: string }> = {
      event_id: uuidv4(),
      type: 'BidPlaced',
      schema_version: 1,
      occurred_at: new Date().toISOString(),
      producer: 'BiddingCapability',
      correlation_id: request.bidder_id, // Or a dedicated checkout/session ID
      causation_id: causationId,
      payload: {
        bid_id: bidRecordId,
        auction_id: auction.id,
        amount: normalizedMoney.getAmount(),
        currency: normalizedMoney.getCurrencyCode(),
      }
    };

    await EventBus.publish(event);

    // If outbid, we publish a separate event
    if (currentHighestBid) {
      await EventBus.publish({
        ...event,
        event_id: uuidv4(),
        type: 'BidOutbid',
        causation_id: event.event_id, // The BidPlaced event caused the BidOutbid event
        payload: {
           // We would include the previous bidder's ID here
           bid_id: bidRecordId,
           auction_id: auction.id,
           amount: currentHighestBid.amount, 
           currency: currentHighestBid.currency_code
        }
      });
    }

  } catch (error: any) {
    // Audit log the rejection via Event Bus
    await EventBus.publish({
      event_id: uuidv4(),
      type: 'BidRejected',
      schema_version: 1,
      occurred_at: new Date().toISOString(),
      producer: 'BiddingCapability',
      correlation_id: request.bidder_id,
      causation_id: causationId,
      payload: {
        reason: error.message,
        auction_id: auction.id
      }
    });
    
    // Rethrow to inform the caller/UI
    throw error;
  }
}

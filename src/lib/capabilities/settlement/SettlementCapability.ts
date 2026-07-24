import { EventBus } from '../../events/EventBus';
import { CommerceEvent } from '../../events/types';
import { v4 as uuidv4 } from 'uuid';

/**
 * The Settlement Capability.
 * 
 * A pure coordinator. It subscribes to `AuctionEnded`, queries the immutable
 * Bid Ledger and auction state, and produces exactly ONE outcome:
 * 
 *   WinnerSelected   — reserve met, highest bidder identified
 *   ReserveNotMet    — highest bid was below the seller's reserve price
 * 
 * Then it always emits `SettlementCompleted` for observability.
 * 
 * It NEVER:
 *   - Writes to the auctions table
 *   - Writes to the bids table
 *   - Creates orders directly
 *   - Captures payments
 *   - Sends notifications
 *   - Opens negotiations
 * 
 * It only derives facts from the ledger and publishes them.
 */

interface AuctionEndedPayload {
  auction_id: string;
  seller_id: string;
  asset_domain: string;
  asset_id: string;
  reserve_price: number | null;
  currency_code: string;
}

interface LedgerBid {
  id: string;
  bidder_id: string;
  amount: number;
  currency_code: string;
  sequence_number: number;
}

export class SettlementCapability {

  /**
   * Initializes the Settlement Capability by subscribing to AuctionEnded.
   */
  static initialize() {
    EventBus.subscribe('AuctionEnded', async (event: CommerceEvent<AuctionEndedPayload>) => {
      console.log(`[SettlementCapability] Processing AuctionEnded for ${event.payload.auction_id}`);
      await SettlementCapability.settle(event);
    });
  }

  /**
   * The core settlement logic. Mathematical, deterministic, side-effect-free.
   */
  private static async settle(event: CommerceEvent<AuctionEndedPayload>): Promise<void> {
    const { auction_id, seller_id, asset_domain, asset_id, reserve_price, currency_code } = event.payload;

    // 1. Query the immutable Bid Ledger for the highest bid
    //    In production: SELECT * FROM bids WHERE target_domain = 'auction' AND target_id = $1 ORDER BY amount DESC, sequence_number ASC LIMIT 1
    const highestBid = await SettlementCapability.getHighestBid(auction_id);

    // 2. No bids at all
    if (!highestBid) {
      await SettlementCapability.emitReserveNotMet(event, null, 'No bids were placed.');
      await SettlementCapability.emitSettlementCompleted(event, 'no_bids');
      return;
    }

    // 3. Reserve price check
    if (reserve_price !== null && highestBid.amount < reserve_price) {
      await SettlementCapability.emitReserveNotMet(event, highestBid, `Highest bid ${highestBid.amount} is below reserve ${reserve_price}.`);
      await SettlementCapability.emitSettlementCompleted(event, 'reserve_not_met');
      return;
    }

    // 4. Winner found!
    await EventBus.publish({
      event_id: uuidv4(),
      type: 'WinnerSelected',
      schema_version: 1,
      occurred_at: new Date().toISOString(),
      producer: 'SettlementCapability',
      correlation_id: event.correlation_id,
      causation_id: event.event_id,
      payload: {
        auction_id,
        seller_id,
        winner_id: highestBid.bidder_id,
        winning_bid_id: highestBid.id,
        winning_amount: highestBid.amount,
        currency_code: highestBid.currency_code,
        asset_domain,
        asset_id,
      },
    });

    console.log(`[SettlementCapability] Winner: ${highestBid.bidder_id} at ${currency_code} ${highestBid.amount}`);
    await SettlementCapability.emitSettlementCompleted(event, 'winner_selected');
  }

  private static async emitReserveNotMet(
    sourceEvent: CommerceEvent<AuctionEndedPayload>,
    highestBid: LedgerBid | null,
    reason: string
  ): Promise<void> {
    await EventBus.publish({
      event_id: uuidv4(),
      type: 'ReserveNotMet',
      schema_version: 1,
      occurred_at: new Date().toISOString(),
      producer: 'SettlementCapability',
      correlation_id: sourceEvent.correlation_id,
      causation_id: sourceEvent.event_id,
      payload: {
        auction_id: sourceEvent.payload.auction_id,
        seller_id: sourceEvent.payload.seller_id,
        highest_bid_amount: highestBid?.amount ?? null,
        reserve_price: sourceEvent.payload.reserve_price,
        reason,
      },
    });

    console.log(`[SettlementCapability] Reserve not met: ${reason}`);
  }

  private static async emitSettlementCompleted(
    sourceEvent: CommerceEvent<AuctionEndedPayload>,
    outcome: 'winner_selected' | 'reserve_not_met' | 'no_bids'
  ): Promise<void> {
    await EventBus.publish({
      event_id: uuidv4(),
      type: 'SettlementCompleted',
      schema_version: 1,
      occurred_at: new Date().toISOString(),
      producer: 'SettlementCapability',
      correlation_id: sourceEvent.correlation_id,
      causation_id: sourceEvent.event_id,
      payload: {
        auction_id: sourceEvent.payload.auction_id,
        outcome,
      },
    });
  }

  /**
   * Queries the Bid Ledger for the highest bid on this auction.
   * Among tied amounts, the earlier sequence_number wins (deterministic).
   * 
   * In production, this would be a Supabase query.
   */
  private static async getHighestBid(auctionId: string): Promise<LedgerBid | null> {
    // Placeholder for:
    // const { data } = await supabase
    //   .from('bids')
    //   .select('*')
    //   .eq('target_domain', 'auction')
    //   .eq('target_id', auctionId)
    //   .order('amount', { ascending: false })
    //   .order('sequence_number', { ascending: true })
    //   .limit(1)
    //   .single();
    //
    // return data;

    console.log(`[SettlementCapability] Querying Bid Ledger for auction ${auctionId}...`);
    return null; // Placeholder — returns null (no bids) until wired to Supabase
  }
}

import { EventCategory, EventSeverity } from '../types';

/**
 * Event Schema: AuctionEnded (v1)
 * 
 * Emitted when an auction's timer expires or it is manually closed.
 * It does NOT mean the item was sold. It simply means the bidding phase is over.
 */
export const AuctionEndedSchemaV1 = {
  version: 1,
  type: 'AuctionEnded',
  category: EventCategory.BUSINESS,
  domain: 'auction',
  severity: EventSeverity.INFO,
  tags: ['auction', 'lifecycle'],

  // Payload structure definition (in a real system, this could be a Zod schema or JSON Schema)
  payloadSchema: {
    required: ['auction_id', 'seller_id', 'asset_domain', 'asset_id', 'currency_code'],
    optional: ['reserve_price']
  }
};

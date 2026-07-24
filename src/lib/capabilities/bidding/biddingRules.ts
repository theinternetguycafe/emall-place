import { Money } from '../money/currency'

export interface AuctionState {
  id: string
  seller_id: string
  status: string
  starts_at: string
  ends_at: string
  reserve_price: number | null
}

export interface BidRequest {
  bidder_id: string
  amount: string | number
  currency_code: string
}

export interface HighestBid {
  amount: number
  currency_code: string
}

export const BID_CEILING = 100_000_000.00;

/**
 * Validates a bid against the Auction Domain state and the existing Bid Ledger state.
 * Throws an Error if the bid is invalid, otherwise returns the normalized Money object.
 */
export function validateBid(
  request: BidRequest, 
  auction: AuctionState, 
  currentHighestBid: HighestBid | null,
  minimumIncrement: number = 1.00 // Configurable per platform or policy
): Money {
  
  // 1. Money / Precision Verification
  const bidMoney = Money.from(request.amount, request.currency_code);
  
  if (bidMoney.getAmount() <= 0) {
    throw new Error('Bid amount must be greater than zero.');
  }
  
  if (bidMoney.getAmount() > BID_CEILING) {
    throw new Error(`Bid exceeds platform ceiling of ${BID_CEILING}`);
  }

  // 2. Self-Bidding Prevention
  if (request.bidder_id === auction.seller_id) {
    throw new Error('You cannot bid on your own auction.');
  }

  // 3. Auction Existence & Visibility (Implicitly checked if `auction` is provided, but we enforce status)
  if (auction.status !== 'live') {
    throw new Error(`Bids are not accepted. Auction is currently ${auction.status}.`);
  }

  // 4. Time Window Enforcement (Never trust status alone)
  const now = new Date();
  const startsAt = new Date(auction.starts_at);
  const endsAt = new Date(auction.ends_at);

  if (now.getTime() < startsAt.getTime() || now.getTime() >= endsAt.getTime()) {
    throw new Error('The auction is not currently active.');
  }

  // 5. Bid Increment Validation
  if (currentHighestBid) {
    const highestMoney = Money.from(currentHighestBid.amount, currentHighestBid.currency_code);
    const incrementMoney = Money.from(minimumIncrement, currentHighestBid.currency_code);
    
    const requiredMinimum = highestMoney.add(incrementMoney);
    
    if (!bidMoney.greaterThanOrEqual(requiredMinimum)) {
      throw new Error(`Bid must be at least ${requiredMinimum.format()}`);
    }
  } else if (auction.reserve_price) {
    // Note: Some platforms allow bidding below reserve, but typically a starting price is used.
    // If the auction has no bids yet, we just require it to be > 0 (handled above), 
    // or >= the starting_price (which we assume is checked against currentHighestBid if seeded).
  }

  return bidMoney;
}

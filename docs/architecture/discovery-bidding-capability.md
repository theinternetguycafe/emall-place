# Architectural Discovery: Bidding Capability

**Status:** Draft / Discovery Phase

## Definition
Bidding is not a Domain; it is a **Capability**. Just as the `Payments` capability processes financial transactions, the `Bidding` capability processes and validates competitive numerical offers.

## 1. Agnosticism
The Bidding Capability does not know what an "Auction" is, nor what a "Product" is.
It only knows about a `target_type` and a `target_id`.
This ensures that if we later introduce "Negotiation Bidding" directly on a Product (bypassing the Auction domain entirely), the Bidding Capability can handle it natively.

## 2. Core Responsibilities
- **The Ledger**: Maintain an append-only, immutable ledger of all bids placed. `(id, bidder_id, target_id, amount, timestamp)`.
- **Validation**: Ensure incoming bids meet minimum increment thresholds and surpass the current highest ledger entry.
- **Concurrency Guarding**: Prevent race conditions where two users submit identical bids at the exact same millisecond. (Achieved via DB transaction locks or unique constraints on `target_id + amount`).

## 3. Emitting Events
The Capability itself acts as a broadcaster:
- `BidPlaced { target_id, amount, bidder_id }`
- `BidOutbid { target_id, outbid_user_id, new_highest_amount }`

Domains listening to the Event Bus (like the Auction Domain) can react to these capability-level events to update their own read-models or extend timers.

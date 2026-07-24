# Architectural Discovery: Auction Strategies

**Status:** Draft / Discovery Phase

## Definition
While the Auction is the Domain, the *type* of auction governs the specific business rules for how a winner is determined. By defining these as interchangeable "Strategies", the core Auction Domain does not need to be rewritten to support new auction models in the future.

## 1. Version 1 Strategy: Standard English Auction
This is the only strategy that will be implemented in the initial release.

**Rules:**
- **Visibility**: Bids are public (amounts and obscured bidder IDs).
- **Duration**: Fixed countdown timer.
- **Winning Condition**: Highest valid bid at the exact moment the timer expires.
- **Sniper Protection**: (Out of scope for V1, but architected to allow it later by extending the timer if a bid is placed in the final 60 seconds).
- **Reserve**: An optional, hidden minimum price. If the timer expires and the highest bid is below the reserve, the Auction ends without a winner.

## 2. Future Architected Strategies
These are explicitly out of scope for V1, but the architecture will be capable of supporting them seamlessly later.

### Dutch Auction
- The price starts high and automatically drops at set intervals.
- The first user to click "Accept Price" wins.
- *Capability requirement*: Requires the system to dispatch automated internal bids/price drops.

### Reverse Auction (Procurement)
- A buyer posts a request (e.g., "Build me a website").
- Sellers bid *downward*.
- The lowest bidder wins at the end of the timer.

### Sealed Bid (Blind Auction)
- Bids are placed secretly into the ledger.
- No participant knows the current highest bid.
- When the timer ends, the Auction Domain reveals the ledger and declares the highest bidder the winner.

## 3. The Strategy Pattern Implementation
The Auction table will feature a `strategy_type` enum field. When the timer expires, the Event Bus listener dynamically invokes the correct strategy evaluator to determine the winner before broadcasting `AuctionEnded`.

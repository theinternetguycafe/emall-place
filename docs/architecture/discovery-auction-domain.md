# Architectural Discovery: Auction Domain

**Status:** Draft / Discovery Phase

## Definition
The Auction is a first-class **Domain** in the Commerce OS. It governs the lifecycle of selling an asset through a structured period of offers, culminating in a single final transaction.

## 1. The Core Philosophy
The Auction Domain does not care *what* is being sold. It relies on the concept of an **Auctionable Asset**.
An Auction simply holds a reference (e.g., `asset_id`, `asset_type: 'product' | 'service' | 'property'`).
This future-proofs the domain. Whether you are auctioning a physical vase, an hour of consulting, or a used car, the Auction Domain remains mathematically identical.

## 2. Consumed Capabilities
To function, the Auction Domain consumes the following capabilities:
- **Bidding**: The mechanism for collecting and validating incremental offers.
- **Event Bus**: To announce state changes (`AuctionStarted`, `AuctionEnded`).
- **Messaging**: For Q&A between bidders and the auctioneer.
- **Notifications**: "You have been outbid!"

## 3. The Event-Driven Ending (Decoupling Payments)
The most critical architectural rule for the Auction Domain: **It must never touch Orders or Payments directly.**

1. The countdown timer hits 0.
2. The Auction evaluates the highest valid bid.
3. If Reserve is met, it changes state to `Ended` and broadcasts:
   `Event: AuctionEnded { auctionId, winnerId, finalPrice }`
4. The `Orders` capability listens, creates an Order record, and broadcasts:
   `Event: OrderCreated { orderId, buyerId, amount }`
5. The `Payments` capability listens and attempts to capture funds from the winner's pre-authorized card.

## 4. Source of Truth
**What is the current highest bid?**
The Bidding Capability maintains an immutable **Bid Ledger**. The Auction Domain's "current highest bid" is always derived dynamically from the top of this ledger. It may cache the value for read-heavy API responses, but the ledger is the absolute source of truth to prevent race conditions during last-second bidding.

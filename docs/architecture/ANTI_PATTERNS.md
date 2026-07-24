# Commerce OS — Anti-Patterns

**Status:** Living document. Updated alongside `COMMERCE_OS_V1.md`.

> This document exists to protect the architecture.  
> Every entry represents a mistake that has either been made, nearly been made, or is likely to be made as the platform grows.  
> Use this during code reviews, onboarding, and sprint planning.

---

## Domain Violations

### ❌ Domain importing another domain
A Product component must never import from the Auction domain, and vice versa. Domains communicate exclusively through the Event Bus.

```typescript
// WRONG
import { getAuctionStatus } from '../auctions/auctionService';

// RIGHT — subscribe to the event
EventBus.subscribe('AuctionEnded', handler);
```

### ❌ `isService` flags inside Product components
This was the original sin. A Product is a Product. A Service is a Service. If a component needs a flag to decide which domain it belongs to, it has been placed in the wrong domain.

### ❌ Shared UI components that merge domain behaviour
A `<ListingCard>` that renders both Products and Services by checking internal flags is an orchestrator pretending to be a component. The Marketplace Orchestrator composes domain-specific cards — it does not merge them.

### ❌ `stock >= 999` to identify Services
This was the historical hack. Services are identified by their domain, never by a magic number in a product field.

---

## Capability Violations

### ❌ Capabilities calling infrastructure directly
A Capability defines a Port (interface). An Adapter implements it. The Capability never imports `pg`, `redis`, `nodemailer`, or any SDK directly.

```typescript
// WRONG
import nodemailer from 'nodemailer';

// RIGHT
class EmailProvider implements CommunicationProvider {
  async send(message: Message): Promise<void> { /* ... */ }
}
```

### ❌ Duplicating capability logic inside a domain
If two domains need the same behaviour (e.g., pricing, reviews, notifications), it must become a Capability. Copy-pasting the logic into each domain guarantees divergence.

### ❌ Business logic inside adapters
An adapter's only job is to implement a port. It must never contain validation, rules, or workflow logic.

```typescript
// WRONG — EmailProvider deciding whether to send
if (auction.status === 'live') { sendEmail(); }

// RIGHT — Communication Capability already decided; provider just delivers
async send(message: Message) { /* deliver */ }
```

---

## Event Bus Violations

### ❌ Command-style event names
Events describe what already happened. They are never commands.

```
✅ BidPlaced
✅ AuctionEnded
✅ OrderCreated

❌ PlaceBid
❌ EndAuction
❌ CreateOrder
```

### ❌ CRUD-style event names
The Commerce OS speaks business language, not SQL.

```
❌ RowInserted
❌ DatabaseUpdated
❌ AuctionStatusChanged

✅ AuctionStarted
✅ WinnerSelected
✅ ReserveNotMet
```

### ❌ Publishing events before the transaction commits
Events are published only after the durable write succeeds. Otherwise consumers react to ghost data.

```typescript
// WRONG
EventBus.publish('BidPlaced');
await db.insert(bid); // if this fails, consumers already reacted

// RIGHT
await db.insert(bid);
EventBus.publish('BidPlaced');
```

### ❌ Mutable ledgers
Bids, events, and audit records are never updated or deleted. Corrections are represented by new events (e.g., `BidInvalidated`).

---

## State Violations

### ❌ Read models treated as sources of truth
A `highest_bid` column on the `auctions` table is a cache. The Bid Ledger is the source of truth. If the cache is lost, the ledger can reconstruct it.

### ❌ Polling clocks inside domains
Domains never check `Date.now()` to determine deadlines. The Timer Capability fires scheduled events. Domains simply listen.

```typescript
// WRONG
if (Date.now() > auction.endsAt) { endAuction(); }

// RIGHT
TimerCapability.scheduleAt('AuctionExpired', 'auction', id, endsAt);
```

### ❌ Storing derived state as authoritative
The number of bids, the highest bidder, and the winning amount are always computed from the immutable ledger — never stored as standalone columns that could drift.

---

## Architectural Violations

### ❌ Settlement making business decisions for the seller
Settlement derives facts (`WinnerSelected`, `ReserveNotMet`). It never automatically opens negotiations, relists auctions, or contacts buyers. Those are separate business processes that subscribe to Settlement events.

### ❌ Circular dependencies between layers
Dependencies point downward:

```
Applications → Orchestrators → Domains → Capabilities → Foundation
```

Never sideways between domains. Never upward from foundation to domain.

### ❌ Adding new domains by modifying existing ones
If adding a Vehicle domain requires editing Product or Service code, the architecture has been violated. New domains compose existing capabilities — they do not modify them.

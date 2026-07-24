# Event Bus Contract

Version 1.1

## Definition
To prevent Domains and Capabilities from becoming tightly coupled, they must communicate asynchronously through an Event Bus. Domains broadcast state changes without knowing who is listening, and downstream listeners act independently.

## 1. Naming Convention
Events must be named in the past tense, describing a state change that has already happened in business language, avoiding CRUD terminology.
`[Domain/Capability][Action in Past Tense]`

**Allowed Examples:**
- `BidPlaced`
- `AuctionEnded`
- `OrderCreated`
- `AuctionStarted`

**Forbidden Examples (Commands & CRUD):**
- `PlaceBid` (Command)
- `EndAuction` (Command)
- `RowInserted` (CRUD)
- `AuctionStatusChanged` (Too generic, use `AuctionStarted` instead)

## 2. The Dispatcher Abstraction
The Event Bus is an architectural concept, not a specific technology. Code must interact with an abstract **Dispatcher** interface.
```text
Event -> Dispatcher -> Subscribers
```
This allows the Commerce OS to easily swap from an `InMemoryDispatcher` (Local Dev) to a `SupabaseRealtimeDispatcher` (Production) to a `KafkaDispatcher` (Enterprise) without rewriting any domain logic.

## 3. Event Envelope (Traceability & Portability)
Every event broadcast to the bus must strictly adhere to the following metadata structure to guarantee perfect auditability and traceability across distributed systems:
```typescript
interface CommerceEvent<T> {
  event_id: string;         // Unique identity of the event itself
  type: string;             // e.g., 'AuctionEnded'
  schema_version: number;   // e.g., 1
  occurred_at: string;      // ISO 8601
  producer: string;         // The domain/capability that emitted this
  correlation_id: string;   // Trace an entire business flow (e.g. from Bid -> Order -> Payment)
  causation_id: string;     // The event_id that directly caused THIS event
  payload: T;               // The domain-specific state payload
}
```

## 4. Communication Rules & Boundaries
- **Producers never know about Consumers:** When an `AuctionEnded` event is fired, the Auction Domain does not invoke `Order.create()`.
- **Commit before Publish:** Events are published ONLY after the database transaction (e.g., the ledger insert) is durably committed. This prevents consumers from reacting to ghost data.
- **Transports are just Subscribers:** Realtime (WebSockets) is NOT the Event Bus. It is simply a Transport Adapter that subscribes to the Event Bus and forwards events to the frontend.
- **Event Replay (Future Capability):** Because state is immutable and the Event Bus is decoupled, the system is architected to support Event Replay (e.g., replaying all `BidPlaced` events to rebuild a corrupted read-model or feed analytics).

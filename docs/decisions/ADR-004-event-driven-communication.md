# ADR-004: Event-Driven Communication Between Domains

**Date:** 2026-07-24  
**Status:** Accepted

## Context
As domains and capabilities separated, there emerged a risk of tight, synchronous coupling. If the `Auction` domain called `Order.create()` which called `Payment.capture()`, any failure down the chain would break the Auction state, and adding a new analytics tracker would require editing the core Auction logic.

## Principles
1. **Fire and Forget**: Publishers emit events and return immediately. They do not wait for subscribers to process the event.
2. **Immutable Facts**: Events are named in the past tense (e.g., `BidPlaced`, `AuctionEnded`). They represent things that have already happened.
3. **No Direct Dependencies**: Domains must not import other domains to trigger side-effects.

## Subscription Scopes (Event Bus v2)
The Event Bus supports three distinct subscription tiers to ensure scalability and separation of concerns:

1. **Event Scope (`subscribe('EventName')`)**
   - Used by Business Domains and Capabilities to react to specific facts.
   - Example: Settlement subscribing to `AuctionEnded`.
2. **Domain Scope (`subscribeDomain('DomainName')`)**
   - Used for domain-wide projections and analytics.
   - Example: A dashboard subscribing to all `Auction` events.
3. **Global Scope (`subscribeAll()`)**
   - **CRITICAL RULE:** Global subscriptions are reserved *exclusively* for platform infrastructure capabilities (e.g., Event Archive, Platform Intelligence, Audit, Replay).
   - Business domains and business capabilities MUST NOT use global subscriptions. This prevents performance degradation and inappropriate coupling.

## Consequences
- **Positive:** Maximum decoupling. Teams can build new features (like notifications or analytics) without modifying core domain logic.
- **Positive:** High performance. The Global Scope restriction ensures the event firehose is only consumed by specialized, passive infrastructure.
- **Negative:** Debugging requires distributed tracing (using `correlation_id` and `causation_id`) since the flow of execution is no longer a single synchronous stack trace.
- **Negative:** Asynchronous communication introduces eventual consistency. The UI must be designed to handle pending states gracefully rather than expecting an immediate synchronous result.

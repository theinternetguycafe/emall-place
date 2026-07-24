# ADR-007: Read Models Are Disposable

**Date:** 2026-07-25  
**Status:** Accepted

## Context
As the Commerce OS adopts an event-driven architecture, the question arises: where is the authoritative source of state for read operations (e.g., "What is the current highest bid?")? We could maintain a `highest_bid` column on the `auctions` table and update it every time a new bid is accepted, or we can derive it from the immutable Bid Ledger.

## Decision
Read models and projections are caches, **not authoritative state**. They exist purely to optimize read performance. They are disposable.

The authoritative state lives in the immutable event stream and the domain ledgers (e.g., the `bids` table). If a read model is lost, corrupted, or invalidated for any reason, it can be fully reconstructed by replaying the event stream from the beginning.

Read models are **optimized for reading, never for writing**. No business logic should mutate a read model directly. All state transitions must flow through the domain first, emit an event, and let a downstream projection handler update the read model as a reaction.

## Consequences
- **Positive:** Perfect auditability. The system can always reconstruct the ground truth.
- **Positive:** Aligns with CQRS principles. Read models can be aggressively cached, denormalized, and optimized for specific UI queries without ever compromising domain integrity.
- **Positive:** Enables Event Replay. Analytics, audit systems, and new read models can be populated by replaying existing events.
- **Negative:** Slight eventual consistency window between a write (e.g., bid accepted) and the read model being updated.

# ADR-006: The Bid Ledger is the Source of Truth

**Date:** 2026-07-24  
**Status:** Accepted

## Context
When building an auction or bidding system, it's tempting to store the `current_highest_bid` as a column on the `auctions` table and constantly update it. However, this creates severe concurrency issues, race conditions, and an irreversible loss of history if an update is corrupted or if a bid is later deemed invalid.

## Decision
We define the **Bid Ledger** (`bids` table in the Bidding Capability) as the absolute source of truth.
Every accepted bid is an immutable fact that is appended to the ledger.
The Auction Domain (and any other domain) does not store the highest bid as authoritative state. 

## Consequences
- **Positive:** Concurrency is handled effortlessly. If two users bid at the same millisecond, the database's `sequence_number` (BIGINT GENERATED ALWAYS AS IDENTITY) guarantees an exact deterministic ordering.
- **Positive:** We have a perfect, immutable audit trail of every offer ever made.
- **Positive:** Derived auction state (highest bid, bidder count, leading bidder) is always computed from the ledger. **Note:** Derived state *may* be cached (e.g. in a materialized view or Redis) for performance, but the ledger remains the authoritative source and can always be used to reconstruct the correct state. Corrections are represented by new events rather than mutating historical bids.

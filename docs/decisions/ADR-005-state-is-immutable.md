# ADR-005: State is Immutable

**Date:** 2026-07-24  
**Status:** Accepted

## Context
As we introduce the Event Bus (ADR-004) and complex capabilities like Bidding, there is a risk of losing history if we overwrite database rows to correct mistakes. For instance, if an Auction's status changes from `draft` to `live` directly because a developer updated the database row, we lose the fact that it was ever `published` or `scheduled`. Similarly, if a bid is deemed invalid, deleting it removes the audit trail.

## Decision
We enforce an **Immutable State** philosophy across the Commerce OS.
Events (e.g., `BidPlaced`, `AuctionStarted`) are facts that have occurred in the past. They can never be changed or deleted. 
If a state needs to be corrected, a *new* event (e.g., `BidInvalidated`) must be appended to the ledger to reflect the correction.

## Consequences
- **Positive:** Perfect auditability. Analytics, reporting, and debugging can reliably replay the event stream to understand exactly how the system arrived at its current state.
- **Positive:** Dispute resolution (e.g. two users claiming to be the highest bidder) is trivialized because the immutable bid ledger proves the exact order of events.
- **Negative:** Storage requirements increase slightly as we append new records rather than overwriting old ones. Complex read models may require ledger aggregation.

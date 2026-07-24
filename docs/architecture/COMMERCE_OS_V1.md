# Commerce OS — Version 1.0

**Date Ratified:** 2026-07-25  
**Status:** ✅ FROZEN — Foundation Complete. Platform Ready.

> **This document is now frozen.**  
> Changes to the foundation, capability contracts, or ADRs require explicit architectural review.  
> Everything built beyond this line is a **product feature**, not a **foundation feature**.

---

## Platform Mission

Commerce OS exists to provide reusable commercial capabilities that allow independent business domains to be composed rather than rewritten.

Every new domain should consume existing capabilities before introducing new ones.

Architectural stability is valued above feature velocity.

---

## Architectural Principles

1. **Facts are immutable.** Events, bids, and ledger entries are never modified or deleted.
2. **Events are published in past tense.** They describe what happened, not what should happen.
3. **Capabilities are reusable.** If two domains need the same behaviour, it becomes a Capability.
4. **Domains own business state.** Every business entity has exactly one authoritative owner.
5. **Infrastructure implements ports.** Domains never know about databases, queues, or providers directly.
6. **Composition is preferred over modification.** New features are assembled from existing capabilities, not woven into them.
7. **Platform Intelligence is observational, never authoritative.** It may archive, aggregate, project, and analyze events, but it must never alter domain state or influence business decisions directly. Business truth always remains with the domains and capabilities that own it.

---

## Platform Status

| Layer | Status |
|---|---|
| **Foundation** | ✅ Stable — Frozen |
| **Capabilities** | ✅ Stable — Open for Extension, Closed for Modification |
| **Domain Contracts** | ✅ Stable — Frozen |
| **Ports & Adapters** | ✅ Stable — Frozen |
| **Event Bus** | ✅ Stable — Frozen |
| **Timer** | ✅ Stable — Frozen |
| **Money** | ✅ Stable — Frozen |
| **Communication** | ✅ Stable — Frozen |
| **Settlement** | ✅ Stable — Frozen |
| **Orders** | ✅ Stable — Frozen |
| **Payments Pipeline** | ✅ Stable — Frozen |
| **ADRs** | ✅ ADR-001 through ADR-008 — Frozen |

---

## The Ownership Rule

| Layer | Owns Business State? | Publishes Events? | Consumes Events? |
|---|---|---|---|
| **Foundation** | No | Sometimes | Yes |
| **Capability** | Only if responsible | Yes | Yes |
| **Domain** | Yes | Yes | Yes |
| **Orchestrator** | No | No | Yes |
| **Adapter** | No | No | Yes |
| **Application** | No | No | Yes |

---

## The Foundation

These modules are platform-level. No domain owns them. All domains consume them.

| Module | Responsibility |
|---|---|
| **Event Bus** | Asynchronous communication between domains via immutable business facts |
| **Money** | Canonical financial value object with precision, formatting, and currency logic |
| **Timer** | Generic scheduled event infrastructure — domains never check the clock |
| **Identity / Auth** | User authentication via Supabase Auth |
| **Images** | Managed asset storage and retrieval |
| **Security** | RLS policies and domain boundary enforcement |

---

## The Capabilities

Reusable building blocks. New domains consume these. They do not implement their own.

| Capability | Responsibility | Owns State? |
|---|---|---|
| **Bidding** | Immutable bid ledger, bid validation, bid rules engine | Yes (Bids) |
| **Communication** | Templates → Preferences → Queue → Worker → Provider | No |
| **Settlement** | Pure coordinator: derives `WinnerSelected` or `ReserveNotMet` from the ledger | No |
| **Orders** | Purchase lifecycle: `OrderCreated` → `OrderFulfilled` | Yes (Orders) |
| **Payments** | Payment intent, capture, deadline, refund | Yes (Payments) |
| **Pricing** | Price calculation, discounts, promotions | No |
| **Reviews** | Buyer and seller review lifecycle | Yes (Reviews) |
| **Cart** | Multi-item purchase assembly | Yes (Cart) |
| **Booking** | Service scheduling and availability | Yes (Bookings) |

---

## The Domains

Business domains model specific problem areas. They own their lifecycle and state. They communicate only via the Event Bus.

Every business entity has exactly one authoritative owner.

| Domain | Publishes |
|---|---|
| **Products** | `ProductListed`, `ProductUpdated`, `ProductSoldOut` |
| **Services** | `ServiceListed`, `QuoteRequested`, `BookingCreated` |
| **Auctions** | `AuctionStarted`, `AuctionEnded`, `AuctionCancelled` |

---

## The Orchestrators

Orchestrators read projections and compose domain data for the UI. They own no business logic.

| Orchestrator | Responsibility |
|---|---|
| **Marketplace** | Unified discovery feed across Products, Services, and Auctions |

---

## The Adapters

Adapters implement Ports using specific infrastructure. They are replaceable without changing domain code.

| Adapter | Implements |
|---|---|
| **InMemoryDispatcher** | `EventDispatcher` port |
| **InMemoryQueue** | `DeliveryQueue` port |
| **EmailProvider** | `CommunicationProvider` port |
| **Realtime Transport** | Supabase Realtime WebSocket forwarding |

---

## The Applications

Applications are the consumer-facing products built on top of Commerce OS. The platform does not exist to serve one application — it exists to power many.

| Application | Status |
|---|---|
| **eMallPlace** | ✅ Active — First application on Commerce OS |
| VehiclePlace | Planned |
| PropertyPlace | Planned |
| RentalPlace | Planned |
| JobsPlace | Planned |

---

## The Architectural Decision Records

| ADR | Principle |
|---|---|
| ADR-001 | The Marketplace is a Conductor, not a Container |
| ADR-002 | Domain Separation — Product and Service are different contracts |
| ADR-003 | Reusable Capabilities — never duplicate |
| ADR-004 | Event-Driven Communication |
| ADR-005 | State is Immutable |
| ADR-006 | The Bid Ledger is the Source of Truth |
| ADR-007 | Read Models Are Disposable |
| ADR-008 | Ports and Adapters |

---

## The Transaction Lifecycle (Proven)

```
AuctionExpired           ← Timer fires
        │
AuctionEnded             ← Auction Domain publishes
        │
Settlement               ← Derives facts from Bid Ledger
   ┌────┴────┐
WinnerSelected    ReserveNotMet
   │
SettlementCompleted      ← Observability
   │
OrderCreated             ← Order Capability
   │
PaymentRequested         ← Payment Window
   │
PaymentDeadlinePassed    ← Timer fires (24h)
```

This pipeline is domain-agnostic. Future domains plug into the same downstream flow.

---

## Version History

| Version | Milestone |
|---|---|
| **0.x** | Marketplace application — Products, Services, UI |
| **1.0** | Commerce OS — Foundation, Capabilities, Domains, Event Bus, Transaction Pipeline |
| **2.0** | Reserved |

---

## Phase 2 — Platform Intelligence & Infrastructure

| Priority | Capability | Why |
|---|---|---|
| 1 | **Platform Intelligence (Observability)** | Metrics, logs, traces, event replay, audit trail, and business KPIs. |
| 2 | **Projection Engine** | Formalize read models so the UI never queries ledgers directly. |
| 3 | **Rules Engine** | Configurable business rules without code changes (Condition → Action). |
| 4 | **Search Capability** | Unified discovery across all domains via projections. |
| 5 | **Workflow Engine** | Declarative multi-step business process coordination. |

## Phase 3 — New Domains

*   **Mobility**: Vehicles, Rentals, Logistics
*   **Property**: Sales, Rentals, Commercial
*   **Employment**: Jobs, Freelance, Contracts
*   **Digital**: Downloads, Subscriptions, Tickets / Events

## Phase 4 — AI & Advanced Intelligence

| Capability | Purpose |
|---|---|
| **AI Capability** | Advisory only. Consumes projections. Never owns truth. |
| **Recommendation Engine** | Personalization and cross-domain discovery. |
| **Fraud Detection** | Pattern recognition on event streams. |
| **Dynamic Pricing** | Yield management and demand forecasting. |

## Phase 5 — Federation & Ecosystem

*   **Multi-tenant Commerce OS**
*   **Plugin Marketplace**
*   **Public Capability SDK**
*   **External Event Bus / Webhooks**
*   **Marketplace Federation**

---

## The Guiding Principle

> *"What are you?"*
> 
> Every module in the Commerce OS must answer this question cleanly:  
> Am I a **Domain**, a **Capability**, a **Foundation**, an **Orchestrator**, or an **Adapter**?  
> 
> Domains own business rules.  
> Capabilities encapsulate reusable behaviour.  
> Foundations provide infrastructure primitives.  
> Orchestrators compose for display.  
> Adapters implement ports.  
> 
> **Nothing else exists.**

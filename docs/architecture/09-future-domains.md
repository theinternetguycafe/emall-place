# Future Domain Contracts

Version 1.0

## Definition
This document outlines the theoretical contracts for future verticals that will be added to the Commerce OS. By defining them strictly as Domains that consume Capabilities, we ensure they plug into the architecture without forcing rewrites of the core platform.

---

## 1. Rental Domain (Vehicles, Equipment)

**Consumes Capabilities:**
- **Availability**: To track booking calendars.
- **Payments**: To handle recurring charges or deposits.
- **Messaging**: For renter/owner communication.
- **Reviews**: Trust ratings.
- **Pricing**: Dynamic calculation based on duration.

**Unique Domain Behavior:**
- **Rental Period**: Must specify start/end dates.
- **Deposits**: Holds on credit cards that are released upon return.
- **Returns**: A specific lifecycle state marking the asset as returned to the owner.

---

## 2. Property Domain (Real Estate, Lodging)

**Consumes Capabilities:**
- **Messaging**: High-friction negotiation.
- **Payments**: Escrow or holding systems.
- **Reviews**: Verified stay ratings.
- **Scheduling**: Booking viewings.

**Unique Domain Behavior:**
- **Viewing Booking**: The primary action (not "Add to Cart").
- **Offers / Bids**: Price negotiation mechanics.
- **Lease / Ownership**: Final legal transfer states.
- **Amenities**: Property-specific structured data (Beds, Baths, SqFt).

---

## 3. Vehicle Sales Domain (Cars, Boats, Trucks)

**Consumes Capabilities:**
- **Messaging**: For lead generation and negotiation.
- **Reviews**: Dealer ratings.
- **Payments**: Deposit handling.

**Unique Domain Behavior:**
- **VIN Decoding**: Strict schema requirements.
- **Mileage / Year / Make / Model**: Rigid classification system.
- **Registration**: Document handling lifecycle state.
- **Finance**: Integration with external credit engines (a highly specialized capability).

---

## 4. Auction Domain (Live Bidding)

**Consumes Capabilities:**
- **Payments**: Pre-authorizations for bidding rights.
- **Messaging**: Real-time notifications of outbids.
- **Reviews**: Buyer/Seller ratings.

**Unique Domain Behavior:**
- **Live Timer**: Strict countdowns utilizing WebSockets.
- **Reserve Price**: Hidden minimum thresholds.
- **Bid Ledger**: Append-only log of competitive pricing.

---

## The Core Concept
Notice that none of these domains require a rewrite of `Payments`, `Reviews`, or `Messaging`. They simply construct their own unique schema, define their unique lifecycle, and wire together the existing Capabilities. The Marketplace Orchestrator discovers them and interleaves them using `UnifiedFeedItem`.

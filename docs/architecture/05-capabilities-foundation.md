# Capabilities & Shared Foundation

Version 1.0

## Definition
The Commerce OS provides generic, stateless modules called **Capabilities** and **Shared Foundation** elements. These are the building blocks that Domains consume to implement their specific business logic. They do not know about the Domains that consume them.

## 1. Core Foundation
The absolute base layer of the application.
- **Authentication**: JWT, OAuth, Sessions. (Supabase Auth)
- **Authorization**: Row Level Security (RLS), RBAC policies.
- **KYC / Verification**: Proof of identity, store vetting.
- **File Storage**: Object storage buckets for media.
- **Geolocation**: Translating coordinates to physical addresses and computing distances.

## 2. Commerce Capabilities
The transaction and logistics engine.
- **Cart**: Ephemeral state mapping a user to a collection of domain items (currently mostly Products).
- **Checkout**: The process of finalizing an intent to purchase.
- **Shipping**: Algorithms and integrations for physical delivery.
- **Booking**: Reserving a specific slice of time or an asset.
- **Quotes**: Requesting and finalizing dynamic pricing.
- **Inventory**: Tracking absolute integer limits on tangible goods.
- **Availability**: Tracking calendar slots for time-bound assets.
- **Pricing**: Generic calculator for base rates, taxes, and fees.
- **Promotions**: Coupon and discount engine.
- **Orders**: The immutable ledger of a finalized transaction.

## 3. Platform Capabilities
The engagement, safety, and insight engines.
- **Payments**: The gateway integration (e.g. Stripe, Paystack) that turns intents into capital.
- **Messaging**: The real-time chat bridge for negotiation and support.
- **Notifications**: Push, Email, and SMS alerts.
- **Reviews**: Aggregated user feedback and rating calculations.
- **Search**: The text-indexing and filtering engine (consumed by the Orchestrator).
- **Images**: On-the-fly transformations, cropping, and CDN delivery.
- **Analytics**: Telemetry, view counts, and conversion tracking.
- **Moderation**: Content flagging and admin tools.
- **Fraud Detection**: Identifying suspicious activities.
- **Reporting**: Dashboards and data exports.
- **Recommendations & AI**: Smart suggestions based on embeddings or collaborative filtering.
- **Audit Logs**: Immutable history of state changes.
- **Feature Flags**: Toggles for rolling out new capabilities gracefully.

## Rules of Consumption
1. A Domain may consume as many Capabilities as it needs.
2. A Capability must expose a clean, domain-agnostic interface (e.g., the Payments capability accepts an `amount` and a `currency`, it does not accept a `Product`).
3. If a Capability requires domain-specific knowledge to function, it is not a Capability—it is leaking domain logic and must be refactored.

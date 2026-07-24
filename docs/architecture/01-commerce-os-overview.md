# Commerce Operating System Overview

eMallPlace is not an e-commerce website. It is a **Commerce Operating System**.

A traditional e-commerce website hardcodes products, carts, and checkouts into a monolithic flow. The Commerce OS decouples the platform into four strict layers:

## 1. The Shared Foundation
The lowest level of the OS. This provides generic infrastructure that all users of the platform rely on, completely stripped of any business context.
- **Authentication**: Logging in, signing up, session management.
- **Authorization / RBAC**: Role-based access control.
- **KYC / Verification**: Verifying the identity of platform users.
- **File Storage**: Object storage for media.

## 2. Capabilities (The Reusable Building Blocks)
Capabilities are modular blocks that perform one specific commerce or platform function perfectly. They do not know *who* or *what* is using them.
- **Commerce Capabilities**: Cart, Checkout, Shipping, Booking, Quotes, Inventory, Availability, Pricing, Promotions, Orders.
- **Platform Capabilities**: Payments, Messaging, Notifications, Reviews, Search, Images, Geolocation, Analytics, Moderation, Fraud Detection, Reporting, Recommendations, AI, Audit Logs, Feature Flags.

## 3. The Domains
Domains represent bounded contexts of business logic. They represent the actual "things" being traded on the OS.
A Domain dictates **what** it is, defines its own lifecycle, and **consumes** capabilities to execute its business rules.
- **Product Domain**: Consumes Inventory, Cart, Shipping, Payments.
- **Service Domain**: Consumes Scheduling, Booking, Travel, Payments.
- *(Future)* **Rental Domain**: Consumes Availability, Booking, Deposits, Payments.
- *(Future)* **Auction Domain**: Consumes Bidding, Live Timers, Payments.

Domains are fiercely independent. They never share identity, and they never borrow behavior from another domain.

## 4. The Marketplace Orchestrator
The top layer of the OS. The Orchestrator interacts with the user. It discovers, searches, ranks, and interleaves domains into a Unified Feed.
It acts strictly as a **Conductor**. It does not own any domain logic.

---

### Why this Architecture?
By structuring eMallPlace this way, we can introduce entirely new verticals (Vehicles, Real Estate, Auctions) without rewriting the core infrastructure. Adding a new vertical simply means defining a new **Domain Contract** and assembling existing **Capabilities**.

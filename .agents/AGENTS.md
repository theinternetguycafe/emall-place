# eMallPlace Domain Architecture Rules

**Core Principle:** The Marketplace is a Conductor, not a Container. Products and Services may share infrastructure, but they never share identity.

## 1. Domain Independence Rule
Every domain owns its own business logic.
A domain may inherit shared infrastructure (e.g., Auth, Images, Notifications, Reviews).
A domain may NEVER inherit another domain's business logic.

- `AddToCart` ❌ Product only.
- `TravelRadius` ❌ Service only.
- `BookingCalendar` ❌ Service only.
- `Inventory` ❌ Product only.
- `MarketplaceImage` ✅ Shared.
- `SellerProfile` ✅ Shared.

## 2. Commerce Platform Hierarchy
The platform is composed of distinct layers that must not be bypassed:
1. **Product Domain**: Strictly handles physical/digital goods logic (stock, shipping, variants).
2. **Service Domain**: Strictly handles human-delivered work (availability, travel, quotes).
3. **Marketplace Orchestrator**: The conductor. Composes domains for discovery (search, feed, categories) without merging their intrinsic logic.
4. **Shared Commerce Foundation**: Universal logic containing *only* what is genuinely common (Seller, Customer, Reviews, Notifications, Authentication, Messaging, Payments, Favorites, Images, Location, Analytics).

## 3. Domain Validation (No Silent Failures)
Meaning must be enforced through validation, not just table placement.
- A Product must pass product-specific validation (e.g., price, stock) before insertion.
- A Service must pass service-specific validation (e.g., base rate, radius) before insertion.
- The UI, API, and Database must all enforce these boundaries to prevent "Toyota Rumion" from leaking into the Services domain.

## 4. Seller Dashboards are Domain-Specific
Do not use monolithic forms with `isService` boolean toggles.
The Seller Dashboard should orchestrate domain-specific spaces:
- **Product Studio**: Inventory, Products, Orders, Shipping.
- **Service Desk**: Bookings, Availability, Quotes, Travel, Calendar.
Hybrid sellers use both tools, rather than one overloaded, conditionally-rendered form.

## 5. Future-Proofing
Design all shared infrastructure with the assumption that future domains (Rentals, Vehicles, Property, Digital Goods, Jobs, Experiences, Auctions, Subscriptions) will eventually plug into the Marketplace Orchestrator.

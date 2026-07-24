# Service Domain Contract

Version 1.0

## Definition
The Service Domain governs the trading of professional time, labor, and expertise. It models consultation, manual labor, and professional services.

## 1. Required Fields (The Schema)
Every service MUST define:
- `title` (string)
- `description` (text)
- `base_rate` (decimal, minimum engagement fee)
- `category_id` (must map to a category with `domain_type: 'service'`)
- `seller_id` (must map to a seller with `seller_type: 'service' | 'both'`)
- `travel_radius_km` (integer, how far the professional is willing to travel)

## 2. Capabilities Consumed
The Service Domain explicitly consumes the following capabilities:
- **Scheduling**: To allow clients to pick a date and time.
- **Quotes**: To allow the service provider to adjust the final price based on the job scope.
- **Booking**: To reserve the slot and finalize the agreement.
- **Messaging**: Critical for scoping the work before final acceptance.
- **Payments**: Processing deposits and final payouts.
- **Reviews**: Collecting post-completion ratings.

## 3. Event Lifecycle
1. **Created**: Professional drafts the service.
2. **Published**: Visible on the marketplace.
3. **Booking Requested**: Client requests a date/time and outlines the job. Consumes `Messaging` and `Scheduling`.
4. **Scoping**: Professional evaluates the request.
5. **Quoted**: Professional issues a final quote.
6. **Accepted**: Client accepts quote and pays deposit (Consumes `Payments`).
7. **Scheduled**: Job is locked in the calendar.
8. **Completed**: Job is done; final payment captured.
9. **Reviewed**: Client rates the service.

## 4. Unique Constraints
- Services **must not** have stock. Time is governed by availability, not integers.
- Services **must not** use the Cart. Services require a 1:1 negotiation/booking flow.
- Services **must** define a geographic operating area (Travel Radius).

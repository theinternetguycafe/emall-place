# Product Domain Contract

Version 1.0

## Definition
The Product Domain governs the trading of physical, tangible goods that are shipped or picked up. It models traditional e-commerce mechanics.

## 1. Required Fields (The Schema)
Every product MUST define:
- `title` (string)
- `description` (text)
- `price` (decimal)
- `stock` (integer, must be tracked)
- `category_id` (must map to a category with `domain_type: 'product'`)
- `seller_id` (must map to a seller with `seller_type: 'product' | 'both'`)
- `shipping_class` (enum: light, medium, heavy, local_pickup)

## 2. Capabilities Consumed
The Product Domain explicitly consumes the following capabilities:
- **Inventory**: To lock stock during checkout and decrement upon successful order.
- **Cart**: To allow users to bundle multiple products for a single transaction.
- **Shipping**: To calculate physical delivery logistics.
- **Payments**: To process standard retail checkout.
- **Reviews**: To collect post-purchase product ratings.
- **Promotions**: To handle standard percentage or fixed-amount sales.

## 3. Event Lifecycle
1. **Created**: Seller drafts the product.
2. **Pending Review**: Submitted for platform moderation.
3. **Approved/Published**: Visible on the marketplace.
4. **Cart Addition**: Consumes `Cart` capability; checks `Inventory`.
5. **Purchased**: Stock decremented.
6. **Processing**: Seller prepares the order.
7. **Shipped**: Handed over to logistics.
8. **Delivered**: Customer receives the item.
9. **Archived / Sold Out**: If stock hits 0, it becomes unavailable until replenished.

## 4. Unique Constraints
- Products **must** have stock. An infinite stock hack (e.g. `999`) indicates a misclassified domain.
- Products **must** integrate with the Cart. They cannot bypass the cart for direct booking.

# Data Models

Version 1.0

## Definition
The schemas that power the Commerce OS. This document outlines the physical table separation between domains and capabilities.

## 1. Domain Tables
Domains store their primary state in isolated tables. They never share a generic `items` table.

### `products`
```sql
id UUID PRIMARY KEY
seller_id UUID REFERENCES seller_profiles(id)
category_id UUID REFERENCES categories(id) -- Must be domain_type='product'
title TEXT
description TEXT
price DECIMAL
stock INTEGER -- Physical constraint
shipping_class TEXT
status TEXT (draft | pending | approved)
```

### `services`
```sql
id UUID PRIMARY KEY
seller_id UUID REFERENCES seller_profiles(id)
category_id UUID REFERENCES categories(id) -- Must be domain_type='service'
title TEXT
description TEXT
base_rate DECIMAL -- Financial constraint
travel_radius_km INTEGER
is_active BOOLEAN
status TEXT (draft | pending | approved)
```

## 2. Capability Tables
Capabilities use relational joins to attach themselves to domains, often using a polymorphic-like design (though strict foreign keys are preferred when possible, or joining via a standardized Orchestrator ID).

### `reviews` (Shared Capability)
```sql
id UUID PRIMARY KEY
reviewer_id UUID REFERENCES users(id)
target_type TEXT ('product' | 'service' | 'rental')
target_id UUID -- Polymorphic reference to the domain item
rating INTEGER
comment TEXT
```

### `orders` (Commerce Capability)
```sql
id UUID PRIMARY KEY
buyer_id UUID REFERENCES users(id)
total_amount DECIMAL
status TEXT
-- Note: Line items connect to specific domains.
```

## 3. Shared Foundation Tables
The absolute core of the OS.

### `seller_profiles`
```sql
id UUID PRIMARY KEY
user_id UUID REFERENCES users(id)
store_name TEXT
seller_type TEXT ('product' | 'service' | 'both') -- The Ultimate Guard
kyc_status TEXT
```

### `categories`
```sql
id UUID PRIMARY KEY
name TEXT
domain_type TEXT ('product' | 'service' | 'rental' | 'property') -- Strict partitioning
parent_id UUID
```

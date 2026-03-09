# Dynamic Category Thumbnails Implementation Summary

## Root Cause Analysis: Why Migration #12 Images Don't Show

**Problem**: Migration `12_add_category_images.sql` added static SVG image URLs to categories table:
```sql
update public.categories set image_url = '/category-images/electronics.svg' where name = 'Electronics';
```

**Issues**:
1. **Base Path Problem**: On GitHub Pages production (base path `/store/`), relative paths like `/category-images/electronics.svg` don't resolve correctly. Should use `import.meta.env.BASE_URL` prefix.
2. **Better Approach**: Use dynamic product images as category thumbnails instead of static placeholders.

---

## Changes Made

### 1. Created `src/lib/categories.ts` - New Utility

**Purpose**: Fetch category thumbnails derived from product images.

```typescript
// Fetches approved products ordered by created_at DESC
// Groups them by category_id
// Picks thumbnail: prefers 3rd image (index 2), else 2nd (index 1), else 1st (index 0)
// Returns: Record<category_id, image_url>

export async function fetchCategoryThumbnails(): Promise<Record<string, string>>

// Returns base64 SVG placeholder for categories with no product images
export function getPlaceholderImage(): string
```

**Key Features**:
- Fetches max 200 products (reasonable limit to avoid huge queries)
- Sorts products by `created_at DESC` for deterministic selection
- Filters for `status = 'approved'` only
- Handles missing images gracefully with fallback SVG

---

### 2. Updated `src/pages/Shop.tsx` - Four Changes

#### Change 1: Import New Categories Utility

**Before**:
```tsx
import { supabase } from '../lib/supabase'
import { Product, Category } from '../types'
```

**After**:
```tsx
import { supabase } from '../lib/supabase'
import { fetchCategoryThumbnails, getPlaceholderImage } from '../lib/categories'
import { Product, Category } from '../types'
```

---

#### Change 2: Add State for Thumbnails

**Before**:
```tsx
const [products, setProducts] = useState<Product[]>([])
const [categories, setCategories] = useState<Category[]>([])
const [loading, setLoading] = useState(true)
```

**After**:
```tsx
const [products, setProducts] = useState<Product[]>([])
const [categories, setCategories] = useState<Category[]>([])
const [categoryThumbnails, setCategoryThumbnails] = useState<Record<string, string>>({})
const [loading, setLoading] = useState(true)
```

---

#### Change 3: Update fetchCategories to Fetch Thumbnails

**Before**:
```tsx
const fetchCategories = async () => {
  const { data, error } = await supabase.from('categories').select('*').order('name')
  if (error) {
    console.error('Error fetching categories:', error)
  } else {
    setCategories(data || [])
  }
}
```

**After**:
```tsx
const fetchCategories = async () => {
  const { data, error } = await supabase.from('categories').select('*').order('name')
  if (error) {
    console.error('Error fetching categories:', error)
  } else {
    setCategories(data || [])
    // Fetch thumbnail images for each category
    const thumbs = await fetchCategoryThumbnails()
    setCategoryThumbnails(thumbs)
  }
}
```

---

#### Change 4: Replace Category UI (Large Vertical Grid → Horizontal Scrollable)

**Before**:
```tsx
{/* Category Dropdown with Images */}
<div className="w-full mb-8">
  <div className="flex items-center gap-2 mb-4">
    <Filter className="h-5 w-5 text-slate-900" />
    <h3 className="font-black uppercase tracking-tight text-slate-900">Filter by Category</h3>
  </div>
  
  {/* Category Grid - Horizontal */}
  <div className="flex flex-wrap gap-3">
    <button className={`flex flex-col items-center gap-2 p-3 rounded-xl ...`}>
      <div className="w-16 h-16 bg-gradient-to-br from-slate-900 to-slate-700 rounded-lg ...">
        <LayoutGrid size={24} />
      </div>
      <span className="text-xs font-bold whitespace-nowrap">All</span>
    </button>
    
    {categories.map(cat => (
      <button className={`flex flex-col items-center gap-2 p-3 rounded-xl ...`}>
        <img
          src={cat.image_url || 'https://via.placeholder.com/64'}
          alt={cat.name}
          className="w-16 h-16 rounded-lg object-cover"
        />
        <span className="text-xs font-bold text-center line-clamp-2 max-w-[70px]">{cat.name}</span>
      </button>
    ))}
  </div>
</div>

{/* Product Grid Area - Full Width */}
<div className="w-full">
  {loading ? ...}
</div>
```

**After**:
```tsx
{/* Category Scrollable Bar */}
<div className="mb-12">
  <div className="flex items-center gap-2 mb-4">
    <Filter className="h-5 w-5 text-slate-900" />
    <h3 className="font-black uppercase tracking-tight text-slate-900">Filter by Category</h3>
  </div>
  
  {/* Horizontal Scrollable Categories */}
  <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
    <button className={`flex-shrink-0 flex flex-col items-center gap-1 p-2 rounded-lg ...`}>
      <div className="w-10 h-10 bg-gradient-to-br from-slate-900 to-slate-700 rounded-md flex items-center justify-center text-white text-lg flex-shrink-0">
        <LayoutGrid size={18} />
      </div>
      <span className="text-[10px] font-bold whitespace-nowrap">All</span>
    </button>
    
    {categories.map(cat => {
      const thumbUrl = categoryThumbnails[cat.id] || getPlaceholderImage()
      return (
        <button className={`flex-shrink-0 flex flex-col items-center gap-1 p-2 rounded-lg ...`} title={cat.name}>
          <img
            src={thumbUrl}
            alt={cat.name}
            className="w-10 h-10 rounded-md object-cover flex-shrink-0"
            onError={(e) => {
              (e.target as HTMLImageElement).src = getPlaceholderImage()
            }}
          />
          <span className="text-[10px] font-bold whitespace-nowrap line-clamp-1 max-w-[50px]">{cat.name}</span>
        </button>
      )
    })}
  </div>
</div>

{/* Product Grid Area */}
{loading ? ...}
```

**Key UI Changes**:
- Changed from `flex flex-wrap gap-3` to `flex gap-2 overflow-x-auto pb-2 scrollbar-hide` — **enables horizontal scroll**
- Reduced padding: `p-3` → `p-2` — **makes buttons smaller**  
- Reduced image size: `w-16 h-16` → `w-10 h-10` — **fits more categories in viewport**
- Reduced gaps: `gap-2` (vs `gap-3`) — **tighter spacing**
- Reduced text size: `text-xs` → `text-[10px]` — **fits more text**
- Added `flex-shrink-0` to buttons — **prevents compression when scrolling**
- Uses dynamic `thumbUrl` from `categoryThumbnails[cat.id]` — **product images instead of static SVGs**
- Added `onError` handler — **fallback when image fails to load**
- Products grid now visible immediately without scrolling down category list

---

### 3. Updated `src/index.css` - Add Scrollbar Hide Utility

**Added**:
```css
/* Hide scrollbar while maintaining scrollability */
.scrollbar-hide {
  -ms-overflow-style: none;  /* IE and Edge */
  scrollbar-width: none;  /* Firefox */
}

.scrollbar-hide::-webkit-scrollbar {
  display: none;  /* Chrome, Safari */
}
```

**Purpose**: Hide scrollbar on category list while maintaining horizontal scroll capability.

---

## Functional Behavior

### Category Thumbnail Selection Logic
For each category:
1. Fetch all approved products (max 200, ordered by `created_at DESC`)
2. Group by `category_id`
3. For each category's products, pick best image:
   - **Prefer**: 3rd product's image (index 2) — usually most representative after variations
   - **Else**: 2nd product's image (index 1)
   - **Else**: 1st product's image (index 0)
   - **Fallback**: Placeholder SVG if no product images exist

### Image Fallback Chain
1. **Dynamic product image** (from `categoryThumbnails` map)
2. **onError → placeholder SVG** (base64 encoded, inline)
3. No broken images ever shown

### UI Behavior
- **Scrollable**: User can scroll left/right with mouse/trackpad
- **Scrollbar hidden**: No scroll indicators clutter the UI
- **Products visible immediately**: Category bar is compact, doesn't push products below fold
- **Mobile friendly**: Touch scroll works naturally
- **Filter works same**: Clicking category still filters products to that category
- **"All" button**: Clears category filter

---

## Performance Considerations

✅ **Single query** for thumbnail data (not per category)  
✅ **Client-side grouping** — avoids N+1 queries  
✅ **Limits to 200 products** — reasonable cap for most stores  
✅ **Caches in state** — thumbnails don't refetch on re-render  
✅ **Only runs once** — when categories first load  

---

## Testing Checklist

- [ ] Category chips show product images (not broken/placeholder)
- [ ] Categories with no products show placeholder image
- [ ] Category bar scrolls horizontally smoothly
- [ ] Scrollbar is hidden but scroll still works
- [ ] Clicking a category filters products correctly
- [ ] "All" button clears category filter
- [ ] Products grid is visible without scrolling down
- [ ] Works on mobile (touch scroll)
- [ ] Works after `npm run build`
- [ ] Works on GitHub Pages production

---

## Migration: No DB Changes Needed

The original `12_add_category_images.sql` migration already added the `image_url` column to categories. We don't need to modify it. We're simply **not using** those static SVG URLs and instead deriving thumbnails from product images at runtime.

If you want to clean up the unused `image_url` column in the future, you could run:
```sql
alter table public.categories drop column image_url;
```

But it's safe to leave it (won't hurt anything).

import { supabase } from './supabase'

/**
 * Fetch thumbnail images per category derived from product images.
 * Prefers 3rd product image (index 2), falls back to 2nd (index 1), then 1st (index 0).
 * Products ordered by created_at DESC for deterministic selection.
 */
export async function fetchCategoryThumbnails(): Promise<Record<string, string>> {
  const thumbByCategory: Record<string, string> = {}

  try {
    // Fetch approved products with images, ordered newest first
    const { data, error } = await supabase
      .from('products')
      .select('id, category_id, product_images(url, sort_order)')
      .eq('status', 'approved')
      .order('created_at', { ascending: false })
      .limit(200) // Reasonable limit to avoid huge queries

    if (error) {
      console.warn('[categories] Error fetching products:', error)
      return thumbByCategory
    }

    if (!data) return thumbByCategory

    // Group by category and pick best image
    const categoryProducts: Record<string, any[]> = {}
    for (const product of data) {
      if (!product.category_id) continue
      if (!categoryProducts[product.category_id]) {
        categoryProducts[product.category_id] = []
      }
      categoryProducts[product.category_id].push(product)
    }

    // For each category, pick thumbnail: prefer 3rd image, else 2nd, else 1st
    for (const [categoryId, products] of Object.entries(categoryProducts)) {
      for (const product of products) {
        if (!product.product_images || product.product_images.length === 0) {
          continue
        }

        // Sort images by sort_order if available
        const images = product.product_images.sort(
          (a: any, b: any) => (a.sort_order ?? 0) - (b.sort_order ?? 0)
        )

        // Pick preferred image index
        const preferredIndex = images.length >= 3 ? 2 : images.length >= 2 ? 1 : 0
        const imageUrl = images[preferredIndex]?.url

        if (imageUrl) {
          thumbByCategory[categoryId] = imageUrl
          break // Found thumbnail for this category, move to next
        }
      }
    }
  } catch (err) {
    console.error('[categories] Unexpected error:', err)
  }

  return thumbByCategory
}

/**
 * Placeholder image (SVG fallback) to use when no product images exist
 */
export function getPlaceholderImage(): string {
  return 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64"%3E%3Crect width="64" height="64" fill="%23e2e8f0"/%3E%3Ctext x="32" y="32" text-anchor="middle" dy=".3em" font-size="10" fill="%2394a3b8"%3ENo Image%3C/text%3E%3C/svg%3E'
}

/**
 * Shared utilities for store branding and visual fallback logic.
 */

/**
 * Returns a store logo URL. If no logoUrl is provided, it generates a fallback
 * using ui-avatars.com based on the storeName.
 * 
 * @param storeName The name of the store.
 * @param logoUrl The actual logo URL if available.
 * @returns A valid image URL (real logo or dynamic fallback).
 */
export function getStoreLogo(storeName: string | null | undefined, logoUrl: string | null | undefined): string {
  if (logoUrl && logoUrl.trim().length > 0) {
    return logoUrl;
  }
  
  const name = encodeURIComponent(storeName || 'U');
  // Using a clean, professional aesthetic for the fallback avatars
  return `https://ui-avatars.com/api/?name=${name}&background=f1f5f9&color=0f172a&size=256&bold=true&format=svg`;
}

/**
 * Returns a store name fallback if none is provided.
 */
export function getStoreName(storeName: string | null | undefined): string {
  return storeName || 'Unnamed Store';
}

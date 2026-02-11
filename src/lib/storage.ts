import { supabase } from './supabase'

export async function uploadProductImage(file: File): Promise<string | null> {
  const fileExt = file.name.split('.').pop()
  const fileName = `${Math.random()}.${fileExt}`
  const filePath = `products/${fileName}`

  const { error } = await supabase.storage
    .from('marketplace')
    .upload(filePath, file)

  if (error) {
    console.error('Error uploading image:', error)
    return null
  }

  const { data } = supabase.storage
    .from('marketplace')
    .getPublicUrl(filePath)

  return data.publicUrl
}

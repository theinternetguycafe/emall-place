$file = "C:\Users\User\Desktop\store\src\pages\SellerDashboard.tsx"
$content = Get-Content $file -Raw

# 1. Add services state and update tab types
$content = $content -replace "const \[products, setProducts\] = useState<Product\[\]>\(\[\]\)",
"const [products, setProducts] = useState<Product[]>([])`r`n  const [services, setServices] = useState<any[]>([])"

$content = $content -replace "const \[tab, setTab\] = useState<'analytics' \| 'products' \| 'orders' \| 'likes' \| 'leads'>\('analytics'\)",
"const [tab, setTab] = useState<'analytics' | 'products' | 'services' | 'orders' | 'likes' | 'leads'>('analytics')"

# 2. Update fetch logic
$fetchPattern = "const { data: pData } = await supabase\.from\('products'\)\.select\('\*, product_images\(\*\)'\)\.eq\('seller_id', storeData\.id\)"
$fetchReplace = "const { data: pData } = await supabase.from('products').select('*, product_images(*)').eq('seller_id', storeData.id)`r`n      const { data: sData } = await supabase.from('services').select('*').eq('seller_id', storeData.id)`r`n      if (sData) setServices(sData)"
$content = $content -replace [regex]::Escape($fetchPattern), $fetchReplace

# 3. Update tabs rendering
$tabsPattern = "\[`r`n                \['analytics', 'Dashboard'\], `r`n                \['products', store\.seller_type === 'service' \? 'Services' : store\.seller_type === 'both' \? 'Inventory' : 'Inventory'\], `r`n                \['orders', store\.seller_type === 'service' \? 'Bookings' : 'Orders'\],`r`n                \['likes', 'Insights/Likes'\],`r`n                \['leads', 'WhatsApp Leads'\]`r`n              \]"

$tabsReplace = "[
                ['analytics', 'Dashboard'],
                ...(store.seller_type === 'both' || store.seller_type === 'product' ? [['products', 'Product Studio']] : []),
                ...(store.seller_type === 'both' || store.seller_type === 'service' ? [['services', 'Service Desk']] : []),
                ['orders', store.seller_type === 'service' ? 'Bookings' : 'Orders'],
                ['likes', 'Insights/Likes'],
                ['leads', 'WhatsApp Leads']
              ]"
$content = $content -replace [regex]::Escape($tabsPattern), $tabsReplace

Set-Content -Path $file -Value $content

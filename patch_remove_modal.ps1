$file = "C:\Users\User\Desktop\store\src\pages\SellerDashboard.tsx"
$content = Get-Content $file -Raw

# Remove setEditingProduct state
$content = $content -replace "const \[editingProduct, setEditingProduct\] = useState<any>\(null\)`r`n", ""

# Remove setEditingProduct passing to SellerProductsTable
$content = $content -replace "setEditingProduct=\{setEditingProduct\}`r`n\s+", ""

# Remove the SellerProductEditModal function
$modalPattern = "(?s)function SellerProductEditModal\(\{.*?\}\) \{.*?\n\}\n"
$content = $content -replace $modalPattern, ""

# Remove the modal invocation
$modalInvokePattern = "(?s)\{editingProduct && <SellerProductEditModal.*?/>\}"
$content = $content -replace $modalInvokePattern, ""

Set-Content -Path $file -Value $content

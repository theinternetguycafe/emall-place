$file = "C:\Users\User\Desktop\store\src\components\seller\SellerProductsTable.tsx"
$content = Get-Content $file -Raw

# Clean up header
$headerPattern = "{(sellerType === 'service' `r`n            \? \['Service Details', 'Base Rate', 'Status', 'Actions'\] `r`n            : sellerType === 'both' `r`n              \? \['Item Details', 'Type', 'Price', 'Stock', 'Status', 'Sale', 'Actions'\] `r`n              : \['Product Details', 'Price', 'Stock', 'Status', 'Sale', 'Actions'\]`r`n          ).map\(h => \("
$headerReplace = "{['Product Details', 'Price', 'Stock', 'Status', 'Sale', 'Actions'].map(h => ("
$content = $content -replace [regex]::Escape($headerPattern), $headerReplace

# Remove itemIsService variable definition
$itemIsServicePattern = "          const itemIsService = sellerType === 'both' \? \(product\.stock \?\? 0\) >= 999 : sellerType === 'service'`r`n          return \("
$itemIsServiceReplace = "          return ("
$content = $content -replace [regex]::Escape($itemIsServicePattern), $itemIsServiceReplace

# Remove sellerType === 'both' column rendering
$sellerTypeBothPattern = "(?s)\{sellerType === 'both' && \(`r`n                  <td className=`"px-8 py-6`">.*?</td>`r`n                \)\}"
$content = $content -replace $sellerTypeBothPattern, ""

# Remove {!itemIsService && ( around stock
$stockPattern = "(?s)\{!itemIsService && \(`r`n                  (<td className=`"px-8 py-6`">.*?</td>)`r`n                \)\}"
$content = $content -replace $stockPattern, '$1'

# Remove {itemIsService && sellerType === 'both' && ( empty cols
$emptyColPattern = "(?s)\{itemIsService && sellerType === 'both' && \(`r`n                  <td className=`"px-8 py-6`">.*?</td>`r`n                \)\}"
$content = $content -replace $emptyColPattern, ""

# Remove {!itemIsService && ( around sale badge
$salePattern = "(?s)\{!itemIsService && \(`r`n                  (<td className=`"px-8 py-6`">.*?</td>)`r`n                \)\}"
$content = $content -replace $salePattern, '$1'

Set-Content -Path $file -Value $content

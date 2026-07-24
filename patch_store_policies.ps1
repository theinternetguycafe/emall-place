$file = "C:\Users\User\Desktop\store\src\components\seller\StoreSettingsForm.tsx"
$content = Get-Content $file -Raw

$shippingLabelPattern = "<label className=`"block text-sm font-bold text-slate-700 mb-2`">`r`n\s*Shipping Policy`r`n\s*</label>"
$shippingLabelReplace = "<label className=`"block text-sm font-bold text-slate-700 mb-2`">
              {store?.seller_type === 'service' ? 'Travel & Service Area Policy' : 'Shipping Policy'}
            </label>"

$shippingPlaceholderPattern = "placeholder=`"Describe your shipping policy\.\.\.`""
$shippingPlaceholderReplace = "placeholder={store?.seller_type === 'service' ? 'Describe your travel radii, call-out fees...' : 'Describe your shipping policy...'}"

$content = $content -replace $shippingLabelPattern, $shippingLabelReplace
$content = $content -replace $shippingPlaceholderPattern, $shippingPlaceholderReplace

Set-Content -Path $file -Value $content

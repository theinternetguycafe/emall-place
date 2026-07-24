$file = "C:\Users\User\Desktop\store\src\pages\SellerDashboard.tsx"
$content = Get-Content $file -Raw

# Add import for SellerServicesTable
$importPattern = "import \{ SellerProductsTable \} from '\.\./components/seller/SellerProductsTable'"
$importReplace = "import { SellerProductsTable } from '../components/seller/SellerProductsTable'`r`nimport { SellerServicesTable } from '../components/seller/SellerServicesTable'"
$content = $content -replace [regex]::Escape($importPattern), $importReplace

# Add services tab rendering right after products tab
$productsTabPattern = "(?s)(\{tab === 'products' && \(`r`n.*?\}\))"

$servicesTabAdd = "{tab === 'services' && (
              <div className=`"space-y-6 animate-in fade-in slide-in-from-bottom-2`">
                <div className=`"flex items-center justify-between`">
                  <div>
                    <h2 className=`"text-xl font-black text-slate-900`">Service Desk</h2>
                    <p className=`"text-sm text-stone-500 mt-1`">Manage your service offerings.</p>
                  </div>
                  <Link to=`"/seller/services/new`">
                    <Button className=`"rounded-full px-6`"><Plus className=`"h-4 w-4 mr-2`" />New Service</Button>
                  </Link>
                </div>
                <Card className=`"p-0 overflow-hidden border-stone-100 shadow-sm`">
                  <SellerServicesTable 
                    services={services}
                    searchQuery={searchQuery}
                    deleteService={async (id) => {
                      if (!confirm('Delete this service?')) return;
                      await supabase.from('services').delete().eq('id', id);
                      setServices(prev => prev.filter(s => s.id !== id));
                    }}
                    toggleServiceVisibility={async (s) => {
                      const { data } = await supabase.from('services').update({ is_active: !s.is_active }).eq('id', s.id).select().single();
                      if (data) setServices(prev => prev.map(old => old.id === s.id ? data : old));
                    }}
                  />
                </Card>
              </div>
            )}"

$content = $content -replace $productsTabPattern, "`$1`r`n`r`n            $servicesTabAdd"

Set-Content -Path $file -Value $content

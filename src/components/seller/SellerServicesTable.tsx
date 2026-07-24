import { Link } from 'react-router-dom'
import { Edit2, Trash2, Eye, EyeOff, Wrench } from 'lucide-react'
import { Button } from '../ui/Button'
import { Badge } from '../ui/Badge'
import { Service } from '../../types'

interface SellerServicesTableProps {
  services: Service[]
  searchQuery: string
  deleteService: (id: string) => Promise<void>
  toggleServiceVisibility: (s: Service) => Promise<void>
}

export function SellerServicesTable({
  services,
  searchQuery,
  deleteService,
  toggleServiceVisibility,
}: SellerServicesTableProps) {
  const filtered = services.filter(s => s.title.toLowerCase().includes(searchQuery.toLowerCase()))

  return (
    <table className="w-full min-w-[800px] text-left">
      <thead className="bg-stone-50 border-b border-stone-100">
        <tr>
          {['Service Details', 'Base Rate', 'Status', 'Actions'].map(h => (
            <th key={h} className="px-8 py-4 text-left text-[10px] font-black uppercase tracking-widest text-stone-400">
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-stone-50 bg-white">
        {filtered.map((service) => (
            <tr key={service.id} className="group hover:bg-stone-50/30 transition-colors">
              <td className="px-8 py-6">
                <div className="flex items-center gap-4">
                  <div className="h-16 w-16 flex-shrink-0 bg-stone-100 rounded-2xl overflow-hidden border border-stone-200 flex items-center justify-center">
                    <Wrench className="h-6 w-6 text-stone-300" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 line-clamp-1">{service.title}</h3>
                    <p className="text-sm text-stone-500 line-clamp-1 mt-0.5">{service.description || 'No description provided'}</p>
                  </div>
                </div>
              </td>
              <td className="px-8 py-6">
                <div className="font-medium text-slate-900">R {service.base_rate?.toFixed(2)}</div>
              </td>
              <td className="px-8 py-6">
                <div className="flex flex-col items-start gap-2">
                  <Badge variant={service.status === 'approved' ? 'success' : service.status === 'rejected' ? 'danger' : 'warning'}>
                    {service.status}
                  </Badge>
                  <button 
                    onClick={() => toggleServiceVisibility(service)}
                    className={`text-[10px] font-black uppercase tracking-widest flex items-center gap-1 ${service.is_active ? 'text-emerald-600 hover:text-emerald-700' : 'text-stone-400 hover:text-stone-600'}`}
                  >
                    {service.is_active ? <><Eye className="h-3 w-3" /> Visible</> : <><EyeOff className="h-3 w-3" /> Hidden</>}
                  </button>
                </div>
              </td>
              <td className="px-8 py-6">
                <div className="flex items-center gap-2">
                  <Link to={`/seller/services/${service.id}/edit`}>
                    <Button variant="outline" size="sm" className="h-8 px-3 rounded-full hover:bg-slate-900 hover:text-white hover:border-slate-900 transition-colors">
                      <Edit2 className="h-3 w-3 mr-1.5" /> Edit
                    </Button>
                  </Link>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => deleteService(service.id)}
                    className="h-8 w-8 p-0 rounded-full text-stone-400 hover:text-red-500 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </td>
            </tr>
          ))}
      </tbody>
    </table>
  )
}

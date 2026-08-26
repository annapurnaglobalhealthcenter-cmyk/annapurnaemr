'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { updateOrderStatus, submitInvestigationResult, verifyInvestigationResults } from '@/lib/services/investigation.service'
import { toast } from 'sonner'
import { Loader2, FlaskConical, CheckCircle2, AlertTriangle, Printer, Beaker, FileSignature } from 'lucide-react'
import { format } from 'date-fns'

export function LabClient({ initialOrders }: { initialOrders: any[] }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  
  const [tab, setTab] = useState<'Ordered' | 'Sample Collected' | 'In Progress' | 'Resulting' | 'Completed'>('Ordered')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  // In the real DB, 'Resulting' isn't an order status, it's just 'In Progress' with an option to enter results.
  // Actually, 'Completed' means verified.
  
  const filteredOrders = initialOrders.filter(o => {
    if (tab === 'Ordered') return o.status === 'Ordered'
    if (tab === 'Sample Collected') return o.status === 'Sample Collected'
    if (tab === 'In Progress') return o.status === 'In Progress' && o.investigation_results?.length === 0
    if (tab === 'Resulting') return o.status === 'In Progress' && o.investigation_results?.some((r:any) => r.status === 'Draft')
    if (tab === 'Completed') return o.status === 'Completed'
    return false
  })

  const updateStatus = (id: string, status: string) => {
    startTransition(async () => {
      try {
        await updateOrderStatus(id, status)
        toast.success(`Marked as ${status}`)
        router.refresh()
      } catch (err: any) { toast.error(err.message) }
    })
  }

  const handleVerify = (orderId: string, results: any[]) => {
    const draftIds = results.filter(r => r.status === 'Draft').map(r => r.id)
    if (draftIds.length === 0) return toast.error('No draft results to verify')
    
    startTransition(async () => {
      try {
        await verifyInvestigationResults(orderId, draftIds)
        toast.success('Results Verified')
        setExpandedId(null)
        router.refresh()
      } catch(err:any) { toast.error(err.message) }
    })
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center">
            <Beaker className="w-6 h-6 mr-2 text-indigo-700" /> Laboratory Pipeline
          </h1>
          <p className="text-sm text-gray-500 mt-1">Manage tests from collection to Pathologist verification.</p>
        </div>
      </div>

      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {['Ordered', 'Sample Collected', 'In Progress', 'Resulting', 'Completed'].map(t => (
            <button
              key={t}
              onClick={() => setTab(t as any)}
              className={`py-3 px-1 border-b-2 text-sm font-medium transition-colors ${
                tab === t ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {t} 
              <span className="ml-2 bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-xs">
                {initialOrders.filter(o => {
                  if (t === 'Ordered') return o.status === 'Ordered'
                  if (t === 'Sample Collected') return o.status === 'Sample Collected'
                  if (t === 'In Progress') return o.status === 'In Progress' && o.investigation_results?.length === 0
                  if (t === 'Resulting') return o.status === 'In Progress' && o.investigation_results?.some((r:any)=>r.status==='Draft')
                  if (t === 'Completed') return o.status === 'Completed'
                  return false
                }).length}
              </span>
            </button>
          ))}
        </nav>
      </div>

      <div className="bg-white shadow-sm border rounded-lg overflow-hidden">
        <ul className="divide-y divide-gray-100">
          {filteredOrders.length === 0 ? (
            <div className="p-8 text-center text-gray-500">No tests in this stage.</div>
          ) : (
            filteredOrders.map(order => {
              const patient = Array.isArray(order.patients) ? order.patients[0] : order.patients
              const uhid = patient?.identity_records?.find((ir:any)=>ir.identity_type==='UHID')?.identity_value
              const isExpanded = expandedId === order.id

              return (
                <li key={order.id} className="p-4 hover:bg-gray-50">
                  <div className="flex justify-between items-center cursor-pointer" onClick={() => setExpandedId(isExpanded ? null : order.id)}>
                    <div>
                      <div className="flex items-center space-x-3">
                        <span className="font-bold text-gray-900 text-lg">{order.test_name}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full uppercase font-bold tracking-wider ${
                          order.priority === 'STAT' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-600'
                        }`}>{order.priority}</span>
                      </div>
                      <div className="text-sm text-gray-600 mt-1">
                        Patient: <span className="font-medium text-gray-900">{patient?.first_name} {patient?.last_name}</span> ({uhid})
                      </div>
                      <div className="text-xs text-gray-400 mt-1">
                        Ordered: {format(new Date(order.created_at), 'dd MMM HH:mm')} by {Array.isArray(order.user_profiles)?order.user_profiles[0]?.full_name:order.user_profiles?.full_name}
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      {tab === 'Ordered' && <Button size="sm" className="bg-indigo-600" onClick={(e) => { e.stopPropagation(); updateStatus(order.id, 'Sample Collected')}}>Collect Sample</Button>}
                      {tab === 'Sample Collected' && <Button size="sm" className="bg-indigo-600" onClick={(e) => { e.stopPropagation(); updateStatus(order.id, 'In Progress')}}>Begin Processing</Button>}
                      {tab === 'In Progress' && <Button size="sm" variant="outline" className="border-indigo-600 text-indigo-600">Enter Results ↓</Button>}
                      {tab === 'Resulting' && <Button size="sm" className="bg-green-600" onClick={(e) => { e.stopPropagation(); handleVerify(order.id, order.investigation_results)}}>Verify & Finalize</Button>}
                      {tab === 'Completed' && (
                        <Button size="sm" variant="outline" className="border-blue-200 text-blue-700" onClick={(e) => { e.stopPropagation(); window.open(`/lab/report/${order.id}`, '_blank')}}>
                          <Printer className="w-4 h-4 mr-2" /> Print PDF
                        </Button>
                      )}
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="mt-4 pl-4 border-l-2 border-indigo-200 space-y-4">
                      {order.notes && (
                        <div className="bg-yellow-50 p-3 rounded text-sm text-yellow-800 flex items-start">
                          <AlertTriangle className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
                          <span><strong>Doctor Note:</strong> {order.notes}</span>
                        </div>
                      )}

                      {/* We could fetch test_parameters here, but for simplicity of the client we will rely on a separate component or just basic result entry */}
                      {['In Progress', 'Resulting'].includes(tab) && (
                        <ResultEntryForm order={order} router={router} />
                      )}

                      {order.investigation_results?.length > 0 && (
                        <div className="mt-4">
                          <h4 className="font-semibold text-sm mb-2 text-gray-700 border-b pb-1">Current Results:</h4>
                          <table className="w-full text-sm">
                            <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                              <tr>
                                <th className="px-2 py-1 text-left">Parameter</th>
                                <th className="px-2 py-1 text-left">Value</th>
                                <th className="px-2 py-1 text-left">Unit</th>
                                <th className="px-2 py-1 text-left">Reference Range</th>
                                <th className="px-2 py-1 text-center">Flag</th>
                                <th className="px-2 py-1 text-center">Status</th>
                              </tr>
                            </thead>
                            <tbody>
                              {order.investigation_results.map((r:any) => (
                                <tr key={r.id} className="border-b last:border-b-0 hover:bg-gray-50">
                                  <td className="px-2 py-2 font-medium">{r.parameter_name}</td>
                                  <td className={`px-2 py-2 font-bold ${r.is_abnormal ? 'text-red-600' : 'text-gray-900'}`}>{r.result_value}</td>
                                  <td className="px-2 py-2 text-gray-500">{r.unit}</td>
                                  <td className="px-2 py-2 text-gray-500 text-xs">{r.reference_range}</td>
                                  <td className="px-2 py-2 text-center">
                                    {r.critical_flag ? (
                                      <span className="bg-red-600 text-white px-1.5 py-0.5 rounded text-[10px] font-bold">CRIT</span>
                                    ) : r.is_abnormal ? (
                                      <span className="bg-red-100 text-red-800 px-1.5 py-0.5 rounded text-[10px] font-bold">ABN</span>
                                    ) : (
                                      <span className="text-gray-300">-</span>
                                    )}
                                  </td>
                                  <td className="px-2 py-2 text-center">
                                    <span className={`text-[10px] px-1.5 py-0.5 rounded uppercase font-bold ${r.status==='Verified'?'bg-green-100 text-green-800':'bg-amber-100 text-amber-800'}`}>
                                      {r.status}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}
                </li>
              )
            })
          )}
        </ul>
      </div>
    </div>
  )
}

function ResultEntryForm({ order, router }: any) {
  const [isPending, startTransition] = useTransition()
  const [formData, setFormData] = useState({
    parameter: '', value: '', unit: '', range: '', isAbnormal: false, isCritical: false
  })

  const handleSubmit = (e: any) => {
    e.preventDefault()
    if(!formData.parameter || !formData.value) return toast.error('Required fields missing')

    startTransition(async () => {
      try {
        await submitInvestigationResult(
          order.id, formData.parameter, formData.value, formData.unit, formData.range, formData.isAbnormal, '', formData.isCritical
        )
        toast.success('Result saved (Draft)')
        setFormData({ parameter: '', value: '', unit: '', range: '', isAbnormal: false, isCritical: false })
        router.refresh()
      } catch(err:any) { toast.error(err.message) }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="bg-gray-50 p-4 border rounded-md">
      <h4 className="font-medium text-sm mb-3">Add Result Parameter</h4>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="col-span-2">
          <label className="text-xs text-gray-500">Parameter</label>
          <Input className="h-8 bg-white" placeholder="e.g. Hemoglobin" value={formData.parameter} onChange={e=>setFormData({...formData, parameter:e.target.value})}/>
        </div>
        <div>
          <label className="text-xs text-gray-500">Value</label>
          <Input className="h-8 bg-white" placeholder="e.g. 14.5" value={formData.value} onChange={e=>setFormData({...formData, value:e.target.value})}/>
        </div>
        <div>
          <label className="text-xs text-gray-500">Unit</label>
          <Input className="h-8 bg-white" placeholder="e.g. g/dL" value={formData.unit} onChange={e=>setFormData({...formData, unit:e.target.value})}/>
        </div>
        <div>
          <label className="text-xs text-gray-500">Ref Range</label>
          <Input className="h-8 bg-white" placeholder="e.g. 12.0 - 15.5" value={formData.range} onChange={e=>setFormData({...formData, range:e.target.value})}/>
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between">
        <div className="flex gap-4">
          <label className="flex items-center space-x-2 text-sm text-red-700">
            <input type="checkbox" checked={formData.isAbnormal} onChange={e=>setFormData({...formData, isAbnormal:e.target.checked})} />
            <span>Mark Abnormal</span>
          </label>
          <label className="flex items-center space-x-2 text-sm text-red-900 font-bold">
            <input type="checkbox" checked={formData.isCritical} onChange={e=>setFormData({...formData, isCritical:e.target.checked})} />
            <span>Mark Critical</span>
          </label>
        </div>
        <Button size="sm" type="submit" disabled={isPending} className="bg-blue-600">Save Parameter</Button>
      </div>
    </form>
  )
}

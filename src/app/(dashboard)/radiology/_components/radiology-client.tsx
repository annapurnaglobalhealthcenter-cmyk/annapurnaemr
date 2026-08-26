'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { scheduleRadiologyOrder, markImagingComplete, saveDraftRadiologyReport, verifyRadiologyReport } from '@/lib/services/radiology.service'
import { toast } from 'sonner'
import { Loader2, Activity, Calendar, Image as ImageIcon, FileSignature, CheckCircle2 } from 'lucide-react'
import { format } from 'date-fns'

export function RadiologyClient({ initialOrders }: { initialOrders: any[] }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  
  const [tab, setTab] = useState<'Ordered' | 'Scheduled' | 'Imaging' | 'Drafting' | 'Completed'>('Ordered')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const filteredOrders = initialOrders.filter(o => {
    if (tab === 'Ordered') return o.status === 'Ordered'
    if (tab === 'Scheduled') return o.status === 'Scheduled'
    if (tab === 'Imaging') return o.status === 'Scheduled' || o.status === 'Imaging Complete' // Actually, let's keep Imaging to 'Scheduled' where tech marks it
    if (tab === 'Drafting') return o.status === 'Imaging Complete'
    if (tab === 'Completed') return o.status === 'Completed'
    return false
  })

  // Actually, let's refine the filter:
  // Ordered -> Needs scheduling
  // Scheduled -> Tech needs to do imaging
  // Imaging Complete -> Doctor needs to draft
  // Completed -> Verified.

  const refineFilter = (t: string) => initialOrders.filter(o => {
    if (t === 'Ordered') return o.status === 'Ordered'
    if (t === 'Scheduled') return o.status === 'Scheduled'
    if (t === 'Drafting') return o.status === 'Imaging Complete' && o.radiology_reports?.[0]?.status !== 'Verified'
    if (t === 'Completed') return o.status === 'Completed'
    return false
  })

  const currentList = refineFilter(tab)

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center">
            <Activity className="w-6 h-6 mr-2 text-purple-700" /> Radiology PACS/RIS
          </h1>
          <p className="text-sm text-gray-500 mt-1">Manage imaging pipeline and structured reports.</p>
        </div>
      </div>

      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {['Ordered', 'Scheduled', 'Drafting', 'Completed'].map(t => (
            <button
              key={t}
              onClick={() => { setTab(t as any); setExpandedId(null); }}
              className={`py-3 px-1 border-b-2 text-sm font-medium transition-colors ${
                tab === t ? 'border-purple-600 text-purple-600' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {t} 
              <span className="ml-2 bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-xs">
                {refineFilter(t).length}
              </span>
            </button>
          ))}
        </nav>
      </div>

      <div className="bg-white shadow-sm border rounded-lg overflow-hidden">
        <ul className="divide-y divide-gray-100">
          {currentList.length === 0 ? (
            <div className="p-8 text-center text-gray-500">No orders in this stage.</div>
          ) : (
            currentList.map(order => {
              const patient = Array.isArray(order.patients) ? order.patients[0] : order.patients
              const isExpanded = expandedId === order.id
              const modality = order.radiology_procedure_master?.modality || 'IMG'

              return (
                <li key={order.id} className="p-4 hover:bg-gray-50 flex flex-col">
                  <div className="flex justify-between items-center cursor-pointer" onClick={() => setExpandedId(isExpanded ? null : order.id)}>
                    <div>
                      <div className="flex items-center space-x-3">
                        <span className="font-bold text-gray-900 text-lg">{order.test_name}</span>
                        <span className="bg-purple-100 text-purple-800 text-[10px] px-2 py-0.5 rounded-full font-bold">{modality}</span>
                      </div>
                      <div className="text-sm text-gray-600 mt-1">
                        Patient: <span className="font-medium text-gray-900">{patient?.first_name} {patient?.last_name}</span>
                      </div>
                      {order.scheduled_time && (
                        <div className="text-xs text-blue-600 mt-1 font-semibold flex items-center">
                          <Calendar className="w-3 h-3 mr-1" /> Scheduled: {format(new Date(order.scheduled_time), 'dd MMM HH:mm')}
                        </div>
                      )}
                    </div>
                    <div>
                      {tab === 'Ordered' && <Button size="sm" variant="outline" className="border-purple-600 text-purple-700">Schedule Time ↓</Button>}
                      {tab === 'Scheduled' && <Button size="sm" className="bg-purple-600 hover:bg-purple-700">Perform Imaging ↓</Button>}
                      {tab === 'Drafting' && <Button size="sm" className="bg-blue-600 hover:bg-blue-700">Open Report Editor ↓</Button>}
                      {tab === 'Completed' && <span className="flex items-center text-green-600 text-sm font-bold"><CheckCircle2 className="w-4 h-4 mr-1"/> Verified</span>}
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="mt-4 pt-4 border-t">
                      {tab === 'Ordered' && <ScheduleForm order={order} router={router} onClose={() => setExpandedId(null)} />}
                      {tab === 'Scheduled' && <ImagingForm order={order} router={router} onClose={() => setExpandedId(null)} />}
                      {tab === 'Drafting' && <ReportEditor order={order} router={router} />}
                      {tab === 'Completed' && <CompletedView order={order} />}
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

function ScheduleForm({ order, router, onClose }: any) {
  const [isPending, startTransition] = useTransition()
  const [date, setDate] = useState('')

  const handleSave = () => {
    if (!date) return
    startTransition(async () => {
      try {
        await scheduleRadiologyOrder(order.id, new Date(date).toISOString())
        toast.success('Scheduled successfully')
        router.refresh()
        onClose()
      } catch(e:any) { toast.error(e.message) }
    })
  }

  return (
    <div className="flex items-end gap-4 bg-purple-50 p-4 rounded-md">
      <div>
        <label className="text-xs font-semibold text-purple-900 block mb-1">Select Time Slot</label>
        <Input type="datetime-local" className="bg-white" value={date} onChange={e=>setDate(e.target.value)} />
      </div>
      <Button onClick={handleSave} disabled={isPending || !date} className="bg-purple-600">Confirm Schedule</Button>
    </div>
  )
}

function ImagingForm({ order, router, onClose }: any) {
  const [isPending, startTransition] = useTransition()
  const [dicom, setDicom] = useState('')

  const handleSave = () => {
    startTransition(async () => {
      try {
        await markImagingComplete(order.id, dicom)
        toast.success('Imaging marked complete. Draft report initialized.')
        router.refresh()
        onClose()
      } catch(e:any) { toast.error(e.message) }
    })
  }

  return (
    <div className="bg-gray-50 p-4 rounded-md border border-gray-200 space-y-3">
      <h3 className="font-semibold text-sm">Technician Completion</h3>
      <div>
        <label className="text-xs font-medium text-gray-500 block mb-1">DICOM Study UID (Optional mock hook for PACS)</label>
        <Input placeholder="1.2.840.113619.2.55.3.28311..." value={dicom} onChange={e=>setDicom(e.target.value)} className="bg-white max-w-md" />
      </div>
      <Button onClick={handleSave} disabled={isPending} className="bg-purple-600">Complete Imaging</Button>
    </div>
  )
}

function ReportEditor({ order, router }: any) {
  const [isPending, startTransition] = useTransition()
  const report = order.radiology_reports?.[0] || {}
  const [findings, setFindings] = useState(report.findings || '')
  const [impression, setImpression] = useState(report.impression || '')

  const handleSave = (verify: boolean) => {
    startTransition(async () => {
      try {
        if (verify) {
          await verifyRadiologyReport(order.id, report.id, findings, impression)
          toast.success('Report Verified and Finalized')
        } else {
          await saveDraftRadiologyReport(report.id, findings, impression)
          toast.success('Draft saved')
        }
        router.refresh()
      } catch(e:any) { toast.error(e.message) }
    })
  }

  return (
    <div className="flex flex-col md:flex-row gap-6 bg-white p-4 border rounded-md shadow-inner">
      {/* Viewer Placeholder */}
      <div className="w-full md:w-1/3 bg-black rounded-md flex flex-col items-center justify-center p-8 min-h-[300px]">
        <ImageIcon className="w-12 h-12 text-gray-700 mb-2" />
        <span className="text-gray-500 text-sm font-semibold">DICOM Viewer Placeholder</span>
        {report.radiology_attachments?.[0]?.dicom_study_uid && (
          <span className="text-[10px] text-gray-600 mt-2 break-all">{report.radiology_attachments[0].dicom_study_uid}</span>
        )}
      </div>

      {/* Editor */}
      <div className="w-full md:w-2/3 space-y-4">
        <div>
          <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block mb-1">Findings</label>
          <textarea 
            className="w-full min-h-[150px] p-3 border rounded-md text-sm focus:ring-2 focus:ring-purple-500" 
            placeholder="Detailed anatomical findings..."
            value={findings}
            onChange={e=>setFindings(e.target.value)}
          />
        </div>
        <div>
          <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block mb-1">Impression</label>
          <textarea 
            className="w-full min-h-[100px] p-3 border rounded-md text-sm font-semibold focus:ring-2 focus:ring-purple-500" 
            placeholder="Final diagnostic impression..."
            value={impression}
            onChange={e=>setImpression(e.target.value)}
          />
        </div>
        <div className="flex justify-end gap-2 pt-2 border-t">
          <Button variant="outline" onClick={() => handleSave(false)} disabled={isPending}>Save Draft</Button>
          <Button className="bg-blue-600 hover:bg-blue-700" onClick={() => handleSave(true)} disabled={isPending}>
            <FileSignature className="w-4 h-4 mr-2" /> Verify & Finalize
          </Button>
        </div>
      </div>
    </div>
  )
}

function CompletedView({ order }: any) {
  const report = order.radiology_reports?.[0]
  if (!report) return null
  return (
    <div className="bg-gray-50 p-4 rounded-md border">
      <div className="mb-4 pb-4 border-b">
        <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Findings</h4>
        <div className="text-sm text-gray-800 whitespace-pre-wrap">{report.findings}</div>
      </div>
      <div>
        <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Impression</h4>
        <div className="text-sm font-semibold text-gray-900 whitespace-pre-wrap">{report.impression}</div>
      </div>
    </div>
  )
}

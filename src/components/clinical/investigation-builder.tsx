'use client'

import { useState, useTransition, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { createClient } from '@/lib/supabase/client'
import { searchLabTests } from '@/lib/services/investigation.service'
import { searchRadiologyProcedures } from '@/lib/services/radiology.service'
import { toast } from 'sonner'
import { Loader2, Plus, FlaskConical, Trash2, Search } from 'lucide-react'
import { format } from 'date-fns'

export function InvestigationBuilder({
  recordId,
  encounterId,
  patientId,
  isDraft,
  existingOrders = []
}: {
  recordId: string
  encounterId: string
  patientId: string
  isDraft: boolean
  existingOrders?: any[]
}) {
  const router = useRouter()
  const supabase = createClient()
  const [isPending, startTransition] = useTransition()
  
  const [isAdding, setIsAdding] = useState(false)
  const [formData, setFormData] = useState({
    department: 'Laboratory',
    test_name: '',
    test_master_id: '',
    priority: 'Routine',
    notes: ''
  })

  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [isSearching, setIsSearching] = useState(false)

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (searchQuery.length < 2) {
        setSearchResults([])
        return
      }
      setIsSearching(true)
      try {
        if (formData.department === 'Laboratory') {
          const res = await searchLabTests(searchQuery)
          setSearchResults(res)
        } else if (formData.department === 'Radiology') {
          const res = await searchRadiologyProcedures(searchQuery)
          setSearchResults(res)
        }
      } catch (err) {
        console.error(err)
      } finally {
        setIsSearching(false)
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery, formData.department])

  const selectTest = (test: any) => {
    setFormData({
      ...formData,
      test_name: formData.department === 'Radiology' ? test.procedure_name : test.test_name,
      test_master_id: test.id
    })
    setSearchQuery('')
    setSearchResults([])
  }

  const handleAdd = () => {
    if (!formData.test_name.trim()) return toast.error('Test name is required')

    startTransition(async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        const { error } = await supabase.from('investigation_orders').insert({
          clinical_record_id: recordId,
          encounter_id: encounterId,
          patient_id: patientId,
          ordered_by: user?.id,
          department: formData.department,
          test_name: formData.test_name,
          test_master_id: formData.test_master_id || null,
          priority: formData.priority,
          notes: formData.notes
        })
        if (error) throw new Error(error.message)
        
        toast.success('Investigation ordered')
        setFormData({ department: 'Laboratory', test_name: '', test_master_id: '', priority: 'Routine', notes: '' })
        setSearchQuery('')
        setIsAdding(false)
        router.refresh()
      } catch (err: any) {
        toast.error(err.message)
      }
    })
  }

  const handleDelete = (id: string) => {
    startTransition(async () => {
      try {
        const { error } = await supabase.from('investigation_orders').delete().eq('id', id)
        if (error) throw new Error(error.message)
        toast.success('Order removed')
        router.refresh()
      } catch (err: any) {
        toast.error(err.message)
      }
    })
  }

  return (
    <div className="bg-white border rounded-md shadow-sm p-4">
      <div className="flex justify-between items-center mb-4 border-b pb-2">
        <h3 className="font-semibold text-gray-800 flex items-center">
          <FlaskConical className="w-4 h-4 mr-2 text-purple-500" />
          Investigations
        </h3>
        {isDraft && !isAdding && (
          <Button variant="ghost" size="sm" onClick={() => setIsAdding(true)} className="text-purple-600">
            <Plus className="w-4 h-4 mr-1" /> Order Test
          </Button>
        )}
      </div>

      {isAdding && (
        <div className="bg-gray-50 p-3 rounded-md border mb-4 space-y-3 text-sm">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs font-medium text-gray-500">Department</label>
              <select 
                className="w-full h-8 border rounded-md px-2 bg-white"
                value={formData.department}
                onChange={e => setFormData({...formData, department: e.target.value, test_name: '', test_master_id: ''})}
              >
                <option value="Laboratory">Laboratory</option>
                <option value="Radiology">Radiology</option>
                <option value="Cardiology">Cardiology</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500">Priority</label>
              <select 
                className="w-full h-8 border rounded-md px-2 bg-white"
                value={formData.priority}
                onChange={e => setFormData({...formData, priority: e.target.value})}
              >
                <option value="Routine">Routine</option>
                <option value="Urgent">Urgent</option>
                <option value="STAT">STAT (Immediate)</option>
              </select>
            </div>
              <div className="col-span-2 relative">
                <label className="text-xs font-medium text-gray-700">Test / Procedure Name</label>
                <div className="relative mt-1">
                  <Search className="absolute left-2 top-2.5 w-4 h-4 text-gray-400" />
                  <Input 
                    className="pl-8 bg-white"
                    placeholder={`Search ${formData.department} Master...`}
                    value={searchQuery || formData.test_name}
                    onChange={e => {
                      setSearchQuery(e.target.value)
                      setFormData({...formData, test_name: e.target.value, test_master_id: ''})
                    }}
                  />
                  {searchResults.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg max-h-48 overflow-y-auto">
                      {searchResults.map(test => (
                        <div 
                          key={test.id} 
                          className="p-2 hover:bg-indigo-50 cursor-pointer border-b last:border-b-0 text-sm"
                          onClick={() => selectTest(test)}
                        >
                          <div className="font-medium">
                            {formData.department === 'Radiology' ? test.procedure_name : test.test_name}
                          </div>
                          <div className="text-xs text-gray-500">
                            {formData.department === 'Radiology' ? test.modality : `${test.category} · ${test.sample_type}`}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            <div className="col-span-2">
              <label className="text-xs font-medium text-gray-500">Clinical Notes for Lab</label>
              <Input 
                className="h-8" 
                placeholder="e.g. Suspected anemia"
                value={formData.notes}
                onChange={e => setFormData({...formData, notes: e.target.value})}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="ghost" size="sm" onClick={() => setIsAdding(false)}>Cancel</Button>
            <Button size="sm" onClick={handleAdd} disabled={isPending} className="bg-purple-600 hover:bg-purple-700">
              {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Order
            </Button>
          </div>
        </div>
      )}

      {existingOrders.length > 0 ? (
        <ul className="space-y-3">
          {existingOrders.map((o: any) => (
            <li key={o.id} className="flex justify-between items-start border-b border-gray-50 pb-2 last:border-0 last:pb-0">
              <div>
                <div className="font-bold text-gray-900">{o.test_name}</div>
                <div className="text-xs text-gray-600 mt-0.5">
                  {o.department} · 
                  <span className={o.priority === 'STAT' ? 'text-red-600 font-bold ml-1' : 'ml-1'}>{o.priority}</span>
                </div>
                {o.status !== 'Ordered' && (
                  <div className="text-[10px] font-bold uppercase tracking-wider text-blue-600 mt-1 bg-blue-50 inline-block px-1.5 py-0.5 rounded">
                    Status: {o.status}
                  </div>
                )}
              </div>
              {isDraft && o.status === 'Ordered' && (
                <button onClick={() => handleDelete(o.id)} disabled={isPending} className="text-gray-300 hover:text-red-500 p-1">
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </li>
          ))}
        </ul>
      ) : (
        !isAdding && <p className="text-sm text-gray-400 italic text-center py-4">No investigations ordered.</p>
      )}
    </div>
  )
}

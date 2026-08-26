'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { updateBedStatus } from '@/lib/services/ipd.service'
import { toast } from 'sonner'
import { LayoutGrid, BedDouble, AlertCircle, Wrench, ShieldAlert } from 'lucide-react'
import Link from 'next/link'

export function BedBoardClient({ initialFloors }: { initialFloors: any[] }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  
  const handleStatusUpdate = (bedId: string, status: string) => {
    startTransition(async () => {
      try {
        await updateBedStatus(bedId, status)
        toast.success(`Bed marked as ${status}`)
        router.refresh()
      } catch (err: any) {
        toast.error(err.message)
      }
    })
  }

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'Available': return 'bg-green-100 border-green-300 text-green-900'
      case 'Occupied': return 'bg-blue-100 border-blue-300 text-blue-900'
      case 'Reserved': return 'bg-amber-100 border-amber-300 text-amber-900'
      case 'Cleaning': return 'bg-yellow-100 border-yellow-300 text-yellow-900'
      case 'Maintenance': return 'bg-orange-100 border-orange-300 text-orange-900'
      case 'Blocked': return 'bg-red-100 border-red-300 text-red-900'
      default: return 'bg-gray-100 border-gray-300 text-gray-900'
    }
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center">
            <LayoutGrid className="w-6 h-6 mr-2 text-indigo-600" /> Hospital Bed Board
          </h1>
          <p className="text-sm text-gray-500 mt-1">Real-time spatial visualization of hospital capacity.</p>
        </div>
        <Link href="/ipd">
          <Button variant="outline">Back to IPD</Button>
        </Link>
      </div>

      <div className="space-y-8">
        {initialFloors?.map(floor => (
          <div key={floor.id} className="bg-white border shadow-sm rounded-lg overflow-hidden">
            <div className="bg-gray-800 text-white px-4 py-2 font-bold text-lg flex items-center justify-between">
              <span>{floor.name} (Level {floor.level})</span>
            </div>
            
            <div className="p-4 space-y-6">
              {floor.wards?.map((ward: any) => (
                <div key={ward.id}>
                  <h3 className="font-semibold text-gray-700 border-b pb-2 mb-4">{ward.name} · {ward.type}</h3>
                  
                  {/* Beds directly in Ward (e.g. ICU) */}
                  {ward.beds?.length > 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 mb-6">
                      {ward.beds.map((bed: any) => (
                        <BedCard key={bed.id} bed={bed} onStatusUpdate={handleStatusUpdate} isPending={isPending} getStatusColor={getStatusColor} />
                      ))}
                    </div>
                  )}

                  {/* Rooms inside Ward */}
                  <div className="space-y-4">
                    {ward.rooms?.map((room: any) => (
                      <div key={room.id} className="bg-gray-50 border rounded-md p-3">
                        <div className="text-sm font-bold text-gray-600 mb-3 flex items-center">
                          <BedDouble className="w-4 h-4 mr-2" /> Room {room.room_number} <span className="ml-2 font-normal text-xs text-gray-500">({room.room_type})</span>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                          {room.beds?.map((bed: any) => (
                            <BedCard key={bed.id} bed={bed} onStatusUpdate={handleStatusUpdate} isPending={isPending} getStatusColor={getStatusColor} />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>

                </div>
              ))}
            </div>
          </div>
        ))}
        {(!initialFloors || initialFloors.length === 0) && (
          <div className="text-center p-12 bg-white border border-dashed rounded-lg text-gray-500">
            No spatial hierarchy found. Please seed the database with floors/rooms.
          </div>
        )}
      </div>
    </div>
  )
}

function BedCard({ bed, onStatusUpdate, isPending, getStatusColor }: any) {
  const activeAlloc = bed.bed_allocations?.find((a: any) => a.status === 'Active')
  const patient = activeAlloc?.admissions?.patients
  let patientName = patient ? `${patient.first_name} ${patient.last_name}` : ''
  if (Array.isArray(patient)) {
    patientName = patient.length > 0 ? `${patient[0].first_name} ${patient[0].last_name}` : ''
  }
  const uhid = Array.isArray(patient) ? patient[0]?.identity_records?.find((ir:any)=>ir.identity_type==='UHID')?.identity_value : patient?.identity_records?.find((ir:any)=>ir.identity_type==='UHID')?.identity_value

  return (
    <div className={`border rounded-md p-3 relative flex flex-col justify-between ${getStatusColor(bed.status)}`}>
      <div>
        <div className="flex justify-between items-start mb-1">
          <span className="font-bold text-lg">{bed.bed_number}</span>
          {bed.status === 'Maintenance' && <Wrench className="w-4 h-4 opacity-70" />}
          {bed.status === 'Blocked' && <ShieldAlert className="w-4 h-4 opacity-70" />}
          {bed.status === 'Cleaning' && <AlertCircle className="w-4 h-4 opacity-70" />}
        </div>
        <div className="text-xs font-semibold uppercase tracking-wider mb-2 opacity-80">{bed.status}</div>
        
        {bed.status === 'Occupied' && patientName && (
          <div className="mt-2 text-sm font-medium leading-tight">
            <div>{patientName}</div>
            <div className="text-xs opacity-75">{uhid}</div>
          </div>
        )}
      </div>
      
      {bed.status !== 'Occupied' && (
        <div className="mt-3 flex gap-1">
          {bed.status !== 'Available' && (
            <button disabled={isPending} onClick={() => onStatusUpdate(bed.id, 'Available')} className="text-[10px] bg-white bg-opacity-50 hover:bg-opacity-100 px-1.5 py-1 rounded w-full border font-medium transition">
              Mark Avail
            </button>
          )}
          {bed.status !== 'Cleaning' && bed.status !== 'Blocked' && (
            <button disabled={isPending} onClick={() => onStatusUpdate(bed.id, 'Cleaning')} className="text-[10px] bg-white bg-opacity-50 hover:bg-opacity-100 px-1.5 py-1 rounded w-full border font-medium transition">
              Clean
            </button>
          )}
        </div>
      )}
    </div>
  )
}

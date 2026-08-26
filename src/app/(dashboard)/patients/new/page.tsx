'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { createPatient } from '@/lib/services/patient.service'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

export default function NewPatientPage() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsSubmitting(true)

    const formData = new FormData(e.currentTarget)
    
    try {
      const patientId = await createPatient({
        first_name: formData.get('first_name') as string,
        last_name: formData.get('last_name') as string,
        date_of_birth: formData.get('date_of_birth') as string,
        gender: formData.get('gender') as string,
        blood_group: formData.get('blood_group') as string,
        phone_number: formData.get('phone_number') as string,
        email: formData.get('email') as string,
        address: formData.get('address') as string,
        city: formData.get('city') as string,
        state: formData.get('state') as string,
        pin: formData.get('pin') as string,
        abha_number: formData.get('abha_number') as string,
        emergency_contact: {
          name: formData.get('emergency_name'),
          phone: formData.get('emergency_phone'),
          relation: formData.get('emergency_relation')
        }
      })

      toast.success('Patient registered successfully')
      router.push(`/patients/${patientId}`)
    } catch (err: any) {
      toast.error(err.message || 'Registration failed')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="border-b pb-4">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Register New Patient</h1>
        <p className="text-sm text-gray-500 mt-1">Create a comprehensive Patient Master Record.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8 bg-white p-6 rounded-lg border shadow-sm">
        
        {/* Demographics */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-800">Demographics</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="first_name">First Name *</Label>
              <Input id="first_name" name="first_name" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="last_name">Last Name *</Label>
              <Input id="last_name" name="last_name" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="date_of_birth">Date of Birth *</Label>
              <Input type="date" id="date_of_birth" name="date_of_birth" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="gender">Gender *</Label>
              <Select name="gender" required>
                <SelectTrigger>
                  <SelectValue placeholder="Select gender" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Male">Male</SelectItem>
                  <SelectItem value="Female">Female</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="blood_group">Blood Group</Label>
              <Select name="blood_group">
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="A+">A+</SelectItem>
                  <SelectItem value="O+">O+</SelectItem>
                  <SelectItem value="B+">B+</SelectItem>
                  <SelectItem value="AB+">AB+</SelectItem>
                  <SelectItem value="A-">A-</SelectItem>
                  <SelectItem value="O-">O-</SelectItem>
                  <SelectItem value="B-">B-</SelectItem>
                  <SelectItem value="AB-">AB-</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Contact & Address */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-800">Contact & Address</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phone_number">Mobile Number *</Label>
              <Input id="phone_number" name="phone_number" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input type="email" id="email" name="email" />
            </div>
            <div className="col-span-2 space-y-2">
              <Label htmlFor="address">Street Address</Label>
              <Input id="address" name="address" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Input id="city" name="city" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <Label htmlFor="state">State</Label>
                <Input id="state" name="state" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pin">PIN Code</Label>
                <Input id="pin" name="pin" />
              </div>
            </div>
          </div>
        </div>

        {/* Emergency Contact */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-800">Emergency Contact</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="emergency_name">Name</Label>
              <Input id="emergency_name" name="emergency_name" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="emergency_relation">Relation</Label>
              <Input id="emergency_relation" name="emergency_relation" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="emergency_phone">Phone</Label>
              <Input id="emergency_phone" name="emergency_phone" />
            </div>
          </div>
        </div>

        {/* External IDs */}
        <div className="space-y-4 pb-4 border-b">
          <h2 className="text-lg font-semibold text-gray-800">External Identities</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="abha_number">ABHA Number</Label>
              <Input id="abha_number" name="abha_number" placeholder="00-0000-0000-0000" />
            </div>
          </div>
        </div>

        <div className="flex justify-end space-x-4">
          <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Register Patient
          </Button>
        </div>
      </form>
    </div>
  )
}

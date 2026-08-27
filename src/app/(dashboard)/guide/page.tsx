import React from 'react'
import { BookOpen, Users, Activity, ShieldCheck, Pill, Microscope, Stethoscope, CreditCard, Syringe, Bed, FileText } from 'lucide-react'

export default function GuidePage() {
  return (
    <div className="max-w-4xl mx-auto space-y-12 pb-16">
      <div className="border-b pb-6">
        <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 flex items-center gap-3">
          <BookOpen className="w-8 h-8 text-blue-600" />
          Annapurna EMR User Guide
        </h1>
        <p className="text-gray-500 mt-2 text-lg">
          Comprehensive documentation on user roles, modules, and clinical workflows.
        </p>
      </div>

      <section>
        <h2 className="text-2xl font-bold text-gray-800 border-b pb-2 mb-6">1. User Roles & Permissions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <RoleCard 
            title="SuperAdmin / Hospital Admin" 
            icon={ShieldCheck} 
            color="text-red-600 bg-red-100"
            description="Full system access. Can view analytics, edit hospital configurations, and manage user roles."
          />
          <RoleCard 
            title="Receptionist / Front Desk" 
            icon={Users} 
            color="text-blue-600 bg-blue-100"
            description="Registers new patients, issues UHIDs, and schedules doctor appointments."
          />
          <RoleCard 
            title="Doctor (OPD/IPD)" 
            icon={Stethoscope} 
            color="text-emerald-600 bg-emerald-100"
            description="Consults patients, records clinical notes, vitals, prescribes medication, and orders lab/radiology tests."
          />
          <RoleCard 
            title="Nurse" 
            icon={Syringe} 
            color="text-pink-600 bg-pink-100"
            description="Records patient vitals, manages bed allocations in IPD, and administers prescribed medications (MAR)."
          />
          <RoleCard 
            title="Pharmacist" 
            icon={Pill} 
            color="text-purple-600 bg-purple-100"
            description="Reviews finalized prescriptions and dispenses medication to patients from active batches."
          />
          <RoleCard 
            title="Lab/Radiology Technician" 
            icon={Microscope} 
            color="text-indigo-600 bg-indigo-100"
            description="Fulfills test orders from doctors, records results, and marks reports as verified."
          />
          <RoleCard 
            title="Billing & Insurance" 
            icon={CreditCard} 
            color="text-amber-600 bg-amber-100"
            description="Generates invoices, processes payments, and manages PM-JAY/TPA scheme claims."
          />
        </div>
      </section>

      <section className="space-y-6">
        <h2 className="text-2xl font-bold text-gray-800 border-b pb-2 mb-6">2. Outpatient (OPD) Workflow</h2>
        
        <div className="bg-white rounded-lg border shadow-sm p-6 space-y-6">
          <WorkflowStep 
            number="1"
            title="Patient Registration & Appointment (Front Desk)"
            description="A patient arrives. The Receptionist registers them in the system, generating a unique UHID. They then book an appointment for the desired department (e.g., General Medicine). The patient enters the 'Live Queue'."
          />
          <WorkflowStep 
            number="2"
            title="Clinical Consultation (Doctor)"
            description="The Doctor opens the OPD workspace, sees the patient in the queue, and begins the consultation. The doctor records Chief Complaints, Diagnoses, and orders Medications or Lab Tests. Finally, they click 'Finalize'."
          />
          <WorkflowStep 
            number="3"
            title="Pharmacy Dispensing (Pharmacist)"
            description="Once the doctor's record is finalized, the prescribed medicines automatically appear in the Pharmacy queue. The Pharmacist reviews the active inventory and clicks 'Fulfill'."
          />
          <WorkflowStep 
            number="4"
            title="Billing & Checkout (Billing)"
            description="The Billing module automatically pulls all OPD consultation fees, lab orders, and pharmacy items into a single unified invoice. The patient pays, and the visit is complete."
          />
        </div>
      </section>

      <section className="space-y-6">
        <h2 className="text-2xl font-bold text-gray-800 border-b pb-2 mb-6">3. Inpatient (IPD) Workflow</h2>
        
        <div className="bg-white rounded-lg border shadow-sm p-6 space-y-6">
          <WorkflowStep 
            number="1"
            title="Admission Order (Doctor / Front Desk)"
            description="A Doctor marks a patient for Admission. The Front Desk selects an available bed from the IPD Bed Board and formally admits the patient."
          />
          <WorkflowStep 
            number="2"
            title="Nursing Care & Vitals (Nursing)"
            description="Nurses use the Nursing Dashboard to periodically record Vitals directly to the patient's Encounter. They also administer inpatient medications as per the doctor's orders."
          />
          <WorkflowStep 
            number="3"
            title="Surgical Intervention (Operation Theatre)"
            description="If surgery is required, the patient is scheduled on the OT calendar. Surgeons and Anesthetists are assigned, and OT notes are securely documented."
          />
          <WorkflowStep 
            number="4"
            title="Discharge & Final Settlement (Doctor & Billing)"
            description="The Doctor writes the final Discharge Summary. The Billing department generates a comprehensive IPD Invoice covering bed charges, OT fees, daily doctor visits, and medications."
          />
        </div>
      </section>
      
      <section className="bg-blue-50 border border-blue-100 rounded-lg p-6">
        <h3 className="text-lg font-bold text-blue-900 flex items-center gap-2">
          <Activity className="w-5 h-5" />
          AI & Analytics (SuperAdmin)
        </h3>
        <p className="text-blue-800 mt-2 text-sm leading-relaxed">
          Annapurna EMR includes an embedded AI assistant for SuperAdmins. From the main dashboard, administrators can ask natural-language questions (e.g., "How many patients are admitted right now?" or "What is our revenue today?"). The AI securely queries real-time database metrics without accessing raw Protected Health Information (PHI).
        </p>
      </section>
    </div>
  )
}

function RoleCard({ title, icon: Icon, color, description }: { title: string, icon: any, color: string, description: string }) {
  return (
    <div className="border rounded-lg p-4 bg-white shadow-sm flex gap-4 items-start">
      <div className={`p-3 rounded-xl ${color}`}>
        <Icon className="w-6 h-6" />
      </div>
      <div>
        <h3 className="font-bold text-gray-900">{title}</h3>
        <p className="text-sm text-gray-500 mt-1 leading-relaxed">{description}</p>
      </div>
    </div>
  )
}

function WorkflowStep({ number, title, description }: { number: string, title: string, description: string }) {
  return (
    <div className="flex gap-4">
      <div className="flex-shrink-0 w-8 h-8 bg-gray-900 text-white rounded-full flex items-center justify-center font-bold">
        {number}
      </div>
      <div className="pb-6 border-b border-gray-100 last:border-0 last:pb-0">
        <h4 className="font-bold text-gray-900 text-lg">{title}</h4>
        <p className="text-gray-600 mt-1 leading-relaxed">{description}</p>
      </div>
    </div>
  )
}

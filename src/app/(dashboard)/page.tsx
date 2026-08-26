import { enforcePermission } from '@/lib/auth/server'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { format } from 'date-fns'
import {
  Users,
  Bed,
  Receipt,
  AlertCircle,
  Shield,
} from 'lucide-react'
import { AdminAiAssistant } from './_components/admin-ai-assistant'

// --- Stat Card ----------------------------------------------------------------

function StatCard({
  title,
  value,
  sub,
  icon: Icon,
  colour,
}: {
  title: string
  value: string | number
  sub?: string
  icon: React.ElementType
  colour: string
}) {
  return (
    <div className="bg-white rounded-xl border shadow-sm p-5 flex items-start gap-4">
      <div className={`p-3 rounded-lg ${colour}`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">{title}</p>
        <p className="text-2xl font-bold text-gray-900 mt-0.5">{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
      </div>
    </div>
  )
}

// --- Page ---------------------------------------------------------------------

export default async function DashboardPage() {
  // patient.view is the broadest read permission - effectively "logged-in user"
  await enforcePermission('patient.view')

  const supabase = await createClient()
  const today = new Date().toISOString().slice(0, 10) // YYYY-MM-DD
  const { data: { user } } = await supabase.auth.getUser()
  const { data: userProfile } = await supabase.from('user_profiles').select('role').eq('id', user?.id).single()

  const [
    { count: patientCount },
    { count: activeAdmissions },
    { data: todayInvoices },
    { data: unpaidInvoices },
    { count: activePmjay },
    { data: recentPatients },
    { data: recentInvoices },
  ] = await Promise.all([
    supabase.from('patients').select('*', { count: 'exact', head: true }),
    supabase
      .from('admissions')
      .select('*', { count: 'exact', head: true })
      .is('actual_discharge_date', null),
    supabase
      .from('invoices')
      .select('id, net_amount')
      .gte('created_at', `${today}T00:00:00`)
      .lte('created_at', `${today}T23:59:59`),
    supabase
      .from('invoices')
      .select('id, net_amount')
      .eq('status', 'Unpaid'),
    supabase
      .from('pmjay_cases')
      .select('*', { count: 'exact', head: true })
      .eq('claim_status', 'Pending'),
    supabase
      .from('patients')
      .select('id, first_name, last_name, created_at, identity_records(identity_type, identity_value)')
      .order('created_at', { ascending: false })
      .limit(10),
    supabase
      .from('invoices')
      .select('id, invoice_number, status, net_amount, created_at, patients(first_name, last_name)')
      .order('created_at', { ascending: false })
      .limit(5),
  ])

  const todayRevenue = todayInvoices?.reduce((s, i) => s + (i.net_amount ?? 0), 0) ?? 0
  const unpaidTotal = unpaidInvoices?.reduce((s, i) => s + (i.net_amount ?? 0), 0) ?? 0

  function fmtInr(n: number) {
    return '?' + n.toLocaleString('en-IN', { minimumFractionDigits: 0 })
  }

  return (
    <div className="space-y-8">
      {/* Page title */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Admin Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">
          Overview as of {format(new Date(), 'dd MMM yyyy, hh:mm a')}
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        <StatCard
          title="Total Patients"
          value={patientCount ?? 0}
          icon={Users}
          colour="bg-blue-600"
        />
        <StatCard
          title="Active IPD"
          value={activeAdmissions ?? 0}
          sub="Current admissions"
          icon={Bed}
          colour="bg-violet-600"
        />
        <StatCard
          title="Today's Revenue"
          value={fmtInr(todayRevenue)}
          sub={`${todayInvoices?.length ?? 0} invoice(s)`}
          icon={Receipt}
          colour="bg-emerald-600"
        />
        <StatCard
          title="Unpaid Invoices"
          value={fmtInr(unpaidTotal)}
          sub={`${unpaidInvoices?.length ?? 0} pending`}
          icon={AlertCircle}
          colour="bg-rose-600"
        />
        <StatCard
          title="Active PM-JAY"
          value={activePmjay ?? 0}
          sub="Pending claims"
          icon={Shield}
          colour="bg-amber-600"
        />
      </div>

      {/* Recent Patients */}
      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h2 className="font-semibold text-gray-800">Recent Patients</h2>
          <Link href="/patients">
            <Button variant="ghost" size="sm">View All</Button>
          </Link>
        </div>
        {!recentPatients || recentPatients.length === 0 ? (
          <div className="p-8 text-center text-gray-400 text-sm">No patients yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100">
              <thead className="bg-gray-50">
                <tr>
                  {['UHID', 'Name', 'Registered'].map((h) => (
                    <th
                      key={h}
                      className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {recentPatients.map(
                  (p: {
                    id: string
                    first_name: string
                    last_name: string
                    created_at: string
                    identity_records: { identity_type: string; identity_value: string }[]
                  }) => {
                    const uhid =
                      p.identity_records?.find((r) => r.identity_type === 'UHID')
                        ?.identity_value ?? '-'
                    return (
                      <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-5 py-3 text-sm font-mono text-blue-600">
                          <Link href={`/patients/${p.id}`}>{uhid}</Link>
                        </td>
                        <td className="px-5 py-3 text-sm text-gray-800">
                          {p.first_name} {p.last_name}
                        </td>
                        <td className="px-5 py-3 text-sm text-gray-400">
                          {format(new Date(p.created_at), 'dd MMM yyyy')}
                        </td>
                      </tr>
                    )
                  }
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Recent Invoices */}
      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h2 className="font-semibold text-gray-800">Recent Invoices</h2>
          <Link href="/billing">
            <Button variant="ghost" size="sm">View All</Button>
          </Link>
        </div>
        {!recentInvoices || recentInvoices.length === 0 ? (
          <div className="p-8 text-center text-gray-400 text-sm">No invoices yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100">
              <thead className="bg-gray-50">
                <tr>
                  {['Invoice #', 'Patient', 'Amount', 'Status', 'Date'].map((h) => (
                    <th
                      key={h}
                      className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {recentInvoices.map(
                  (inv: any) => {
                    const statusColour =
                      inv.status === 'Paid'
                        ? 'bg-green-100 text-green-800'
                        : inv.status === 'Unpaid'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-amber-100 text-amber-800'
                    return (
                      <tr key={inv.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-5 py-3 text-sm font-mono text-blue-600">
                          <Link href={`/billing/${inv.id}`}>{inv.invoice_number}</Link>
                        </td>
                        <td className="px-5 py-3 text-sm text-gray-800">
                          {inv.patients
                            ? `${inv.patients.first_name} ${inv.patients.last_name}`
                            : '-'}
                        </td>
                        <td className="px-5 py-3 text-sm font-medium text-gray-900">
                          {'?' +
                            (inv.net_amount ?? 0).toLocaleString('en-IN', {
                              minimumFractionDigits: 2,
                            })}
                        </td>
                        <td className="px-5 py-3">
                          <span
                            className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${statusColour}`}
                          >
                            {inv.status}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-sm text-gray-400">
                          {format(new Date(inv.created_at), 'dd MMM yyyy')}
                        </td>
                      </tr>
                    )
                  }
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Admin AI Assistant */}
      {(userProfile?.role === 'Admin' || userProfile?.role === 'SuperAdmin') && (
        <div className="mt-6">
          <AdminAiAssistant />
        </div>
      )}
    </div>
  )
}

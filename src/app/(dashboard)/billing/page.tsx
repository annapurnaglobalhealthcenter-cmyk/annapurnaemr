import { getAllInvoices } from '@/lib/services/billing.service'
import { enforcePermission } from '@/lib/auth/server'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { format } from 'date-fns'

const STATUS_STYLES: Record<string, string> = {
  Draft: 'bg-gray-100 text-gray-700',
  Unpaid: 'bg-red-100 text-red-700',
  'Partially Paid': 'bg-amber-100 text-amber-700',
  Paid: 'bg-green-100 text-green-700',
  Cancelled: 'bg-gray-100 text-gray-400 line-through'
}

export default async function BillingPage() {
  await enforcePermission('billing.view')
  const invoices = await getAllInvoices()

  const stats = {
    total: invoices.length,
    unpaid: invoices.filter(i => i.status === 'Unpaid').length,
    partial: invoices.filter(i => i.status === 'Partially Paid').length,
    paid: invoices.filter(i => i.status === 'Paid').length,
    totalRevenue: invoices.filter(i => i.status === 'Paid').reduce((s, i) => s + (i.net_amount ?? 0), 0)
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Billing</h1>
          <p className="text-gray-500">Manage invoices, payments, and revenue.</p>
        </div>
        <Link href="/billing/new">
          <Button className="bg-blue-600 hover:bg-blue-700">+ New Invoice</Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Invoices', value: stats.total, color: 'text-gray-700' },
          { label: 'Unpaid', value: stats.unpaid, color: 'text-red-600' },
          { label: 'Partially Paid', value: stats.partial, color: 'text-amber-600' },
          { label: 'Revenue Collected', value: `₹${stats.totalRevenue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, color: 'text-green-600' }
        ].map(stat => (
          <div key={stat.label} className="bg-white border rounded-lg shadow-sm p-5">
            <div className="text-xs text-gray-500 font-medium mb-1">{stat.label}</div>
            <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
          </div>
        ))}
      </div>

      {/* Invoices Table */}
      <div className="bg-white border rounded-lg shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b flex justify-between items-center">
          <h2 className="font-semibold text-gray-800">All Invoices</h2>
          <Link href="/billing/inventory">
            <Button variant="outline" size="sm">Pharmacy Inventory</Button>
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase">
              <tr>
                <th className="px-6 py-3">Invoice #</th>
                <th className="px-6 py-3">Patient</th>
                <th className="px-6 py-3">UHID</th>
                <th className="px-6 py-3">Amount</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Date</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {invoices.map((inv: any) => {
                const uhid = inv.patients?.identity_records?.find((ir: any) => ir.identity_type === 'UHID')?.identity_value
                return (
                  <tr key={inv.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono font-medium text-blue-600">
                      <Link href={`/billing/${inv.id}`}>{inv.invoice_number}</Link>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">
                      {inv.patients?.first_name} {inv.patients?.last_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{uhid}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-800">
                      ₹{(inv.net_amount ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`text-xs font-medium px-2 py-1 rounded ${STATUS_STYLES[inv.status] ?? 'bg-gray-100 text-gray-600'}`}>
                        {inv.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {format(new Date(inv.created_at), 'dd MMM yyyy')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <Link href={`/billing/${inv.id}`}>
                        <Button variant="ghost" size="sm">View</Button>
                      </Link>
                    </td>
                  </tr>
                )
              })}
              {invoices.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-gray-500 italic">No invoices yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

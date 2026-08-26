'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { recordPayment, finalizeInvoice, issueRefund } from '@/lib/services/billing.service'
import { toast } from 'sonner'
import { FileText, CheckCircle, Receipt, ArrowLeft, Lock, ArrowUpRight, AlertTriangle } from 'lucide-react'
import { format } from 'date-fns'
import Link from 'next/link'

export function BillingDetailClient({ initialInvoice, paymentMethods }: { initialInvoice: any, paymentMethods: any[] }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false)
  const [isRefundModalOpen, setIsRefundModalOpen] = useState(false)
  
  const [payAmount, setPayAmount] = useState('')
  const [payMethod, setPayMethod] = useState(paymentMethods[0]?.method_name || 'Cash')

  const [refundAmount, setRefundAmount] = useState('')
  const [refundReason, setRefundReason] = useState('')
  const [refundPaymentId, setRefundPaymentId] = useState('')

  const isLocked = ['Finalized', 'Paid'].includes(initialInvoice.status)

  const handleFinalize = () => {
    if (!confirm('Are you sure? Finalizing will lock the invoice line items permanently.')) return
    startTransition(async () => {
      try {
        await finalizeInvoice(initialInvoice.id)
        toast.success('Invoice finalized and locked')
        router.refresh()
      } catch(e:any) { toast.error(e.message) }
    })
  }

  const handlePay = () => {
    startTransition(async () => {
      try {
        await recordPayment(initialInvoice.id, parseFloat(payAmount), payMethod)
        toast.success('Payment recorded')
        setIsPaymentModalOpen(false)
        router.refresh()
      } catch(e:any) { toast.error(e.message) }
    })
  }

  const handleRefund = () => {
    startTransition(async () => {
      try {
        await issueRefund(refundPaymentId, initialInvoice.id, parseFloat(refundAmount), 'Original Method', refundReason)
        toast.success('Refund processed')
        setIsRefundModalOpen(false)
        router.refresh()
      } catch(e:any) { toast.error(e.message) }
    })
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      <div className="flex items-center space-x-4">
        <Link href="/billing">
          <Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold flex items-center">
            Invoice {initialInvoice.invoice_number}
            {isLocked && <Lock className="w-5 h-5 ml-3 text-red-600" />}
          </h1>
          <p className="text-gray-500">
            {initialInvoice.patients?.first_name} {initialInvoice.patients?.last_name} | {format(new Date(initialInvoice.created_at), 'dd MMM yyyy')}
          </p>
        </div>
        <div className="ml-auto">
          <span className={`px-3 py-1 rounded-full text-sm font-bold uppercase tracking-wider ${
            initialInvoice.status === 'Paid' ? 'bg-green-100 text-green-800' :
            initialInvoice.status === 'Finalized' ? 'bg-blue-100 text-blue-800' :
            'bg-amber-100 text-amber-800'
          }`}>
            {initialInvoice.status}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-6">
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h3 className="font-semibold mb-4 text-gray-800">Line Items</h3>
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b">
                <tr>
                  <th className="py-2">Description</th>
                  <th className="py-2">Category</th>
                  <th className="py-2 text-right">Qty</th>
                  <th className="py-2 text-right">Unit Price</th>
                  <th className="py-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {initialInvoice.invoice_line_items?.map((item: any) => (
                  <tr key={item.id}>
                    <td className="py-3 font-medium">{item.item_description}</td>
                    <td className="py-3 text-gray-500">{item.category}</td>
                    <td className="py-3 text-right">{item.quantity}</td>
                    <td className="py-3 text-right font-mono">₹{item.unit_price}</td>
                    <td className="py-3 text-right font-mono font-bold">₹{item.total_price}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {!isLocked && (
              <div className="mt-4 p-4 bg-amber-50 rounded text-amber-800 text-sm flex items-start">
                <AlertTriangle className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
                <div>
                  This invoice is currently a Draft. You must finalize it before processing payments.
                  <div className="mt-2">
                    <Button size="sm" onClick={handleFinalize} disabled={isPending} className="bg-amber-600 hover:bg-amber-700 text-white">
                      <Lock className="w-4 h-4 mr-2" /> Finalize Invoice
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold text-gray-800">Payment & Refund History</h3>
              {isLocked && initialInvoice.status !== 'Paid' && (
                <Button size="sm" onClick={() => setIsPaymentModalOpen(true)} className="bg-green-600 hover:bg-green-700">Record Payment</Button>
              )}
            </div>
            
            <ul className="space-y-3 text-sm">
              {initialInvoice.payments?.map((p: any) => (
                <li key={p.id} className="flex justify-between items-center p-3 border rounded bg-gray-50">
                  <div>
                    <div className="font-semibold text-gray-800 flex items-center">
                      <Receipt className="w-4 h-4 mr-2 text-green-600" />
                      Payment: {p.receipt_number}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">{format(new Date(p.payment_date), 'dd MMM yy HH:mm')} | {p.payment_method}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-green-700 font-mono">+₹{p.amount_paid}</div>
                    <Button size="sm" variant="ghost" className="text-red-600 h-6 mt-1 text-xs px-2" onClick={() => {
                      setRefundPaymentId(p.id)
                      setIsRefundModalOpen(true)
                    }}>Issue Refund</Button>
                  </div>
                </li>
              ))}
              {initialInvoice.billing_refunds?.map((r: any) => (
                <li key={r.id} className="flex justify-between items-center p-3 border rounded bg-red-50">
                  <div>
                    <div className="font-semibold text-red-800 flex items-center">
                      <ArrowUpRight className="w-4 h-4 mr-2 text-red-600" />
                      Refund Processed
                    </div>
                    <div className="text-xs text-red-600 mt-1">{format(new Date(r.processed_at), 'dd MMM yy HH:mm')} | Reason: {r.reason}</div>
                  </div>
                  <div className="font-bold text-red-700 font-mono">-₹{r.refund_amount}</div>
                </li>
              ))}
              {(!initialInvoice.payments?.length && !initialInvoice.billing_refunds?.length) && (
                <div className="text-gray-500 italic text-center p-4">No transactions recorded.</div>
              )}
            </ul>
          </div>
        </div>

        <div className="col-span-1">
          <div className="bg-gray-800 text-white p-6 rounded-lg shadow-sm sticky top-6">
            <h3 className="font-semibold mb-6 text-gray-300">Financial Summary</h3>
            <div className="space-y-4 text-sm">
              <div className="flex justify-between"><span className="text-gray-400">Total Amount:</span> <span className="font-mono">₹{initialInvoice.net_amount}</span></div>
              <div className="flex justify-between text-green-400"><span className="text-gray-400">Total Paid:</span> <span className="font-mono">₹{initialInvoice.payments?.reduce((s:number,p:any)=>s+Number(p.amount_paid),0)}</span></div>
              <div className="flex justify-between text-red-400"><span className="text-gray-400">Total Refunded:</span> <span className="font-mono">₹{initialInvoice.billing_refunds?.reduce((s:number,r:any)=>s+Number(r.refund_amount),0)}</span></div>
              <div className="border-t border-gray-700 pt-4 mt-4 flex justify-between items-center">
                <span className="text-gray-400">Outstanding:</span> 
                <span className={`text-2xl font-black font-mono tracking-tight ${initialInvoice.outstanding_amount > 0 ? 'text-amber-400' : 'text-green-400'}`}>
                  ₹{initialInvoice.outstanding_amount}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {isPaymentModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-bold mb-4">Record Payment</h3>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-gray-500">Amount (₹)</label>
                <Input type="number" max={initialInvoice.outstanding_amount} value={payAmount} onChange={e=>setPayAmount(e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500">Method</label>
                <select className="w-full p-2 border rounded" value={payMethod} onChange={e=>setPayMethod(e.target.value)}>
                  {paymentMethods.map(m => <option key={m.id} value={m.method_name}>{m.method_name}</option>)}
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setIsPaymentModalOpen(false)}>Cancel</Button>
                <Button className="bg-green-600 hover:bg-green-700" onClick={handlePay} disabled={isPending || !payAmount}>Confirm Payment</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isRefundModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 border-t-4 border-red-600">
            <h3 className="text-lg font-bold mb-4 text-red-700">Issue Refund</h3>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-gray-500">Refund Amount (₹)</label>
                <Input type="number" value={refundAmount} onChange={e=>setRefundAmount(e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500">Reason</label>
                <Input placeholder="e.g., Overcharged, Service not rendered" value={refundReason} onChange={e=>setRefundReason(e.target.value)} />
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setIsRefundModalOpen(false)}>Cancel</Button>
                <Button className="bg-red-600 hover:bg-red-700" onClick={handleRefund} disabled={isPending || !refundAmount}>Confirm Refund</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

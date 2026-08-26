import { getInvoiceWithDetails } from '@/lib/services/billing.service'
import { getPaymentMethods } from '@/lib/services/billing-master.service'
import { enforcePermission } from '@/lib/auth/server'
import { notFound } from 'next/navigation'
import { BillingDetailClient } from './_components/billing-detail-client'

export default async function BillingDetailPage({
  params
}: {
  params: Promise<{ id: string }>
}) {
  await enforcePermission('billing.manage')
  
  const { id } = await params
  try {
    const invoice = await getInvoiceWithDetails(id)
    const paymentMethods = await getPaymentMethods()
    return <BillingDetailClient initialInvoice={invoice} paymentMethods={paymentMethods} />
  } catch (err) {
    notFound()
  }
}

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
  let invoice;
  let paymentMethods;
  try {
    invoice = await getInvoiceWithDetails(id)
    paymentMethods = await getPaymentMethods()
  } catch (err) {
    notFound()
  }
  
  return <BillingDetailClient initialInvoice={invoice} paymentMethods={paymentMethods} />
}

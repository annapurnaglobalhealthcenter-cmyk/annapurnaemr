'use server'

import { createClient } from '../supabase/server'

// Generate unique invoice number: INV-YYMM-<seq>
let invoiceSeqCache = 10001

export async function createInvoice(patientId: string, encounterId: string | null, lineItems: {
  item_description: string
  category: string
  quantity: number
  unit_price: number
  reference_id?: string
}[]) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const datePrefix = new Date().toISOString().slice(2, 7).replace('-', '')
  const invoiceNumber = `INV-${datePrefix}-${Date.now().toString().slice(-5)}`

  const totalAmount = lineItems.reduce((sum, item) => sum + item.quantity * item.unit_price, 0)

  const { data: invoice, error: invoiceError } = await supabase
    .from('invoices')
    .insert({
      patient_id: patientId,
      encounter_id: encounterId,
      invoice_number: invoiceNumber,
      total_amount: totalAmount,
      discount_amount: 0,
      tax_amount: 0,
      net_amount: totalAmount,
      status: 'Unpaid'
    })
    .select()
    .single()

  if (invoiceError) throw new Error(invoiceError.message)

  // Insert line items
  const itemsToInsert = lineItems.map(item => ({
    invoice_id: invoice.id,
    item_description: item.item_description,
    category: item.category,
    quantity: item.quantity,
    unit_price: item.unit_price,
    total_price: item.quantity * item.unit_price,
    reference_id: item.reference_id ?? null
  }))

  const { error: itemsError } = await supabase
    .from('invoice_line_items')
    .insert(itemsToInsert)

  if (itemsError) throw new Error(itemsError.message)

  return invoice
}

export async function recordPayment(invoiceId: string, amount: number, method: string, notes?: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const receiptNumber = `RCP-${Date.now()}`

  const { error: paymentError } = await supabase
    .from('payments')
    .insert({
      invoice_id: invoiceId,
      receipt_number: receiptNumber,
      amount_paid: amount,
      payment_method: method,
      collected_by: user.id,
      notes
    })

  if (paymentError) throw new Error(paymentError.message)

  return { receiptNumber }
}

export async function issueRefund(paymentId: string, invoiceId: string, refundAmount: number, method: string, reason: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { error } = await supabase
    .from('billing_refunds')
    .insert({
      payment_id: paymentId,
      invoice_id: invoiceId,
      refund_amount: refundAmount,
      refund_method: method,
      reason,
      processed_by: user.id
    })

  if (error) throw new Error(error.message)
}

export async function finalizeInvoice(invoiceId: string) {
  const supabase = await createClient()
  
  const { error } = await supabase
    .from('invoices')
    .update({ status: 'Finalized', updated_at: new Date().toISOString() })
    .eq('id', invoiceId)

  if (error) throw new Error(error.message)
}

export async function getInvoiceWithDetails(invoiceId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('invoices')
    .select(`
      *,
      patients (id, first_name, last_name, identity_records(identity_type, identity_value)),
      invoice_line_items (*),
      payments (*),
      billing_refunds (*)
    `)
    .eq('id', invoiceId)
    .single()

  if (error) throw new Error(error.message)
  return data
}

export async function getAllInvoices() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('invoices')
    .select(`
      id, invoice_number, status, net_amount, created_at,
      patients (first_name, last_name, identity_records(identity_type, identity_value))
    `)
    .order('created_at', { ascending: false })
    .limit(100)

  if (error) throw new Error(error.message)
  return data
}

export async function getInventoryItems() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('inventory_items')
    .select('*')
    .order('item_name')

  if (error) throw new Error(error.message)
  return data
}

export async function updateInventoryStock(itemId: string, quantityDelta: number) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { data: item, error: fetchError } = await supabase
    .from('inventory_items')
    .select('quantity_in_stock')
    .eq('id', itemId)
    .single()

  if (fetchError || !item) throw new Error('Item not found')
  
  const newQty = item.quantity_in_stock + quantityDelta
  if (newQty < 0) throw new Error('Insufficient stock')

  const { error } = await supabase
    .from('inventory_items')
    .update({ quantity_in_stock: newQty, updated_at: new Date().toISOString() })
    .eq('id', itemId)

  if (error) throw new Error(error.message)
}

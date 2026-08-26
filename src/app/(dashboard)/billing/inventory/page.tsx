import { getInventoryItems } from '@/lib/services/billing.service'
import { enforcePermission } from '@/lib/auth/server'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export default async function InventoryPage() {
  await enforcePermission('pharmacy.view')
  const items = await getInventoryItems()

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Pharmacy Inventory</h1>
          <p className="text-gray-500">Track stock levels and reorder points.</p>
        </div>
        <div className="flex space-x-2">
          <Link href="/billing"><Button variant="outline">← Back to Billing</Button></Link>
        </div>
      </div>

      <div className="bg-white border rounded-lg shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase">
            <tr>
              <th className="px-6 py-3">Item Name</th>
              <th className="px-6 py-3">SKU</th>
              <th className="px-6 py-3">Category</th>
              <th className="px-6 py-3 text-center">Stock</th>
              <th className="px-6 py-3 text-right">Unit Price</th>
              <th className="px-6 py-3 text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {items.map((item: any) => (
              <tr key={item.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 font-medium text-gray-800">{item.item_name}</td>
                <td className="px-6 py-4 text-gray-500 font-mono text-xs">{item.sku ?? '—'}</td>
                <td className="px-6 py-4 text-gray-500">{item.category}</td>
                <td className="px-6 py-4 text-center">
                  <span className={`font-bold ${item.quantity_in_stock <= 10 ? 'text-red-600' : 'text-gray-800'}`}>
                    {item.quantity_in_stock}
                  </span>
                </td>
                <td className="px-6 py-4 text-right font-medium text-gray-800">
                  ₹{(item.unit_price ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </td>
                <td className="px-6 py-4 text-center">
                  <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                    item.quantity_in_stock === 0 ? 'bg-red-100 text-red-700' :
                    item.quantity_in_stock <= 10 ? 'bg-amber-100 text-amber-700' :
                    'bg-green-100 text-green-700'
                  }`}>
                    {item.quantity_in_stock === 0 ? 'Out of Stock' : item.quantity_in_stock <= 10 ? 'Low Stock' : 'In Stock'}
                  </span>
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-gray-500 italic">No inventory items yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

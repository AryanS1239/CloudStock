import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, Boxes, IndianRupee, Package } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { formatCurrency, formatDateTime, formatNumber, friendlyError, stockStatus } from '../lib/format'
import { ErrorBanner, PageHeader, Spinner, StatusBadge } from '../components/ui'

function Stat({ icon: Icon, label, value, tone = 'text-tide bg-tide-soft' }) {
  return (
    <div className="rounded-xl border border-line bg-white p-4">
      <div className={`mb-3 inline-flex rounded-lg p-2 ${tone}`}><Icon className="h-5 w-5" aria-hidden /></div>
      <p className="text-sm text-ink/60">{label}</p>
      <p className="tabular mt-0.5 text-2xl font-bold">{value}</p>
    </div>
  )
}

export default function Dashboard() {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setError('')
    const [summary, products, txs] = await Promise.all([
      supabase.rpc('get_dashboard_summary'),
      supabase.from('products').select('id,sku,name,quantity,low_stock_threshold').order('quantity', { ascending: true }).limit(500),
      supabase.from('stock_transactions')
        .select('id,type,quantity,created_at,products(name,sku),profiles(full_name,email)')
        .order('created_at', { ascending: false }).limit(8),
    ])
    const err = summary.error || products.error || txs.error
    if (err) { setError(friendlyError(err)); return }
    setData({
      summary: summary.data,
      lowStock: products.data.filter((p) => p.quantity <= p.low_stock_threshold),
      txs: txs.data,
    })
  }, [])

  useEffect(() => { load() }, [load])

  if (error) return <ErrorBanner message={error} onRetry={load} />
  if (!data) return <Spinner label="Loading dashboard" />

  const { summary, lowStock, txs } = data
  const maxUnits = Math.max(1, ...summary.category_distribution.map((c) => c.units))

  return (
    <>
      <PageHeader title="Dashboard" subtitle="A live view of your inventory." />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat icon={Package} label="Products" value={formatNumber(summary.total_products)} />
        <Stat icon={Boxes} label="Units in stock" value={formatNumber(summary.total_units)} />
        <Stat icon={IndianRupee} label="Inventory value" value={formatCurrency(summary.inventory_value)} />
        <Stat icon={AlertTriangle} label="Low-stock products" value={formatNumber(summary.low_stock_count)}
          tone={summary.low_stock_count > 0 ? 'text-[#8a5a0a] bg-amber-soft' : 'text-ok bg-ok-soft'} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-5">
        <section className="rounded-xl border border-line bg-white p-5 lg:col-span-3">
          <h2 className="mb-1 font-semibold">Needs restocking</h2>
          <p className="mb-4 text-sm text-ink/60">Products at or below their low-stock threshold.</p>
          {lowStock.length === 0 ? (
            <p className="rounded-lg bg-ok-soft p-4 text-sm text-ok">Everything is above its threshold.</p>
          ) : (
            <ul className="divide-y divide-line">
              {lowStock.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{p.name}</p>
                    <p className="text-xs text-ink/60">{p.sku} · threshold {p.low_stock_threshold}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="tabular text-sm font-semibold">{p.quantity}</span>
                    <StatusBadge status={stockStatus(p.quantity, p.low_stock_threshold)} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-xl border border-line bg-white p-5 lg:col-span-2">
          <h2 className="mb-4 font-semibold">Units by category</h2>
          <ul className="space-y-3">
            {summary.category_distribution.map((c) => (
              <li key={c.category}>
                <div className="mb-1 flex justify-between text-sm">
                  <span>{c.category}</span>
                  <span className="tabular text-ink/70">{formatNumber(c.units)} units · {c.products} products</span>
                </div>
                <div className="h-2 rounded-full bg-tide-soft" role="presentation">
                  <div className="h-2 rounded-full bg-tide" style={{ width: `${(c.units / maxUnits) * 100}%` }} />
                </div>
              </li>
            ))}
            {summary.category_distribution.length === 0 && <p className="text-sm text-ink/60">No products yet.</p>}
          </ul>
        </section>
      </div>

      <section className="mt-6 rounded-xl border border-line bg-white p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-semibold">Recent transactions</h2>
          <Link to="/stock" className="text-sm font-semibold text-tide underline">Record stock movement</Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs text-ink/60"><tr>
              <th className="pb-2 font-medium">When</th><th className="pb-2 font-medium">Product</th>
              <th className="pb-2 font-medium">Movement</th><th className="pb-2 font-medium">By</th>
            </tr></thead>
            <tbody className="divide-y divide-line">
              {txs.map((t) => (
                <tr key={t.id}>
                  <td className="whitespace-nowrap py-2.5 pr-4 text-ink/70">{formatDateTime(t.created_at)}</td>
                  <td className="py-2.5 pr-4">{t.products?.name ?? 'Deleted product'}</td>
                  <td className={`tabular whitespace-nowrap py-2.5 pr-4 font-semibold ${t.type === 'in' ? 'text-ok' : 'text-alert'}`}>
                    {t.type === 'in' ? '+' : '−'}{t.quantity}
                  </td>
                  <td className="py-2.5 text-ink/70">{t.profiles?.full_name || t.profiles?.email || 'System'}</td>
                </tr>
              ))}
              {txs.length === 0 && <tr><td colSpan="4" className="py-6 text-center text-ink/60">No transactions yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </>
  )
}

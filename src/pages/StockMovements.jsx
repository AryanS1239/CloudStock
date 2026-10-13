import { useCallback, useEffect, useState } from 'react'
import { ArrowDownToLine, ArrowUpFromLine } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { formatDateTime, friendlyError } from '../lib/format'
import { validateMovement } from '../lib/validation'
import { Button, ConfirmDialog, ErrorBanner, Field, PageHeader, Spinner, inputClass, useToast } from '../components/ui'

export default function StockMovements() {
  const toast = useToast()
  const [products, setProducts] = useState(null)
  const [history, setHistory] = useState([])
  const [error, setError] = useState('')
  const [form, setForm] = useState({ productId: '', type: 'in', quantity: '', note: '' })
  const [errors, setErrors] = useState({})
  const [confirm, setConfirm] = useState(false)
  const [busy, setBusy] = useState(false)
  const [typeFilter, setTypeFilter] = useState('')
  const [productFilter, setProductFilter] = useState('')

  const load = useCallback(async () => {
    setError('')
    let q = supabase.from('stock_transactions')
      .select('id,type,quantity,quantity_before,quantity_after,note,created_at,products(name,sku),profiles(full_name,email)')
      .order('created_at', { ascending: false }).limit(100)
    if (typeFilter) q = q.eq('type', typeFilter)
    if (productFilter) q = q.eq('product_id', productFilter)
    const [p, h] = await Promise.all([
      supabase.from('products').select('id,sku,name,quantity').order('name').limit(1000), q,
    ])
    if (p.error || h.error) { setError(friendlyError(p.error || h.error)); return }
    setProducts(p.data); setHistory(h.data)
  }, [typeFilter, productFilter])
  useEffect(() => { load() }, [load])

  const selected = products?.find((p) => p.id === form.productId) ?? null

  function review(e) {
    e.preventDefault()
    const v = validateMovement({ product: selected, type: form.type, quantity: form.quantity })
    setErrors(v)
    if (Object.keys(v).length === 0) setConfirm(true)
  }

  async function submit() {
    setBusy(true)
    const { data, error: rpcError } = await supabase.rpc('record_stock_movement', {
      p_product_id: form.productId, p_type: form.type, p_quantity: Number(form.quantity), p_note: form.note,
    })
    setBusy(false)
    setConfirm(false)
    if (rpcError) { toast(friendlyError(rpcError), 'error'); load(); return }
    toast(`${selected.name}: ${data.quantity_before} → ${data.quantity_after} units.`)
    setForm({ ...form, quantity: '', note: '' })
    load()
  }

  return (
    <>
      <PageHeader title="Stock movements" subtitle="Record stock coming in or going out. Every change is logged." />
      <ErrorBanner message={error} onRetry={load} />
      {!products && !error && <Spinner label="Loading" />}
      {products && (
        <div className="grid gap-6 lg:grid-cols-3">
          <form onSubmit={review} noValidate className="space-y-4 rounded-xl border border-line bg-white p-5 lg:col-span-1 lg:self-start">
            <Field label="Product" htmlFor="product" error={errors.product}>
              <select id="product" className={inputClass} value={form.productId} onChange={(e) => setForm({ ...form, productId: e.target.value })}>
                <option value="">Choose a product…</option>
                {products.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.quantity} in stock)</option>)}
              </select>
            </Field>
            <fieldset>
              <legend className="mb-1 text-sm font-medium">Movement</legend>
              <div className="grid grid-cols-2 gap-2">
                {[['in', 'Stock in', ArrowDownToLine], ['out', 'Stock out', ArrowUpFromLine]].map(([t, label, Icon]) => (
                  <label key={t} className={`flex cursor-pointer items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium ${form.type === t ? 'border-tide bg-tide-soft text-tide' : 'border-line'}`}>
                    <input type="radio" name="type" value={t} checked={form.type === t} onChange={() => setForm({ ...form, type: t })} className="sr-only" />
                    <Icon className="h-4 w-4" aria-hidden /> {label}
                  </label>
                ))}
              </div>
            </fieldset>
            <Field label="Quantity" htmlFor="qty" error={errors.quantity}>
              <input id="qty" type="number" min="1" step="1" className={inputClass} value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
            </Field>
            <Field label="Note (optional)" htmlFor="note">
              <input id="note" maxLength="500" className={inputClass} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="Supplier, order number…" />
            </Field>
            <Button type="submit" className="w-full">Review movement</Button>
          </form>

          <section className="rounded-xl border border-line bg-white p-5 lg:col-span-2">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-semibold">History</h2>
              <div className="flex gap-2">
                <select aria-label="Filter by product" className={`${inputClass} !w-auto`} value={productFilter} onChange={(e) => setProductFilter(e.target.value)}>
                  <option value="">All products</option>
                  {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                <select aria-label="Filter by type" className={`${inputClass} !w-auto`} value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
                  <option value="">In and out</option><option value="in">Stock in</option><option value="out">Stock out</option>
                </select>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-left text-sm">
                <thead className="text-xs text-ink/60"><tr>
                  <th className="pb-2 font-medium">When</th><th className="pb-2 font-medium">Product</th><th className="pb-2 font-medium">Change</th>
                  <th className="pb-2 font-medium">Balance</th><th className="pb-2 font-medium">By</th>
                </tr></thead>
                <tbody className="divide-y divide-line">
                  {history.map((t) => (
                    <tr key={t.id}>
                      <td className="whitespace-nowrap py-2.5 pr-3 text-ink/70">{formatDateTime(t.created_at)}</td>
                      <td className="py-2.5 pr-3"><div>{t.products?.name ?? 'Deleted product'}</div>{t.note && <div className="text-xs text-ink/60">{t.note}</div>}</td>
                      <td className={`tabular whitespace-nowrap py-2.5 pr-3 font-semibold ${t.type === 'in' ? 'text-ok' : 'text-alert'}`}>{t.type === 'in' ? '+' : '−'}{t.quantity}</td>
                      <td className="tabular whitespace-nowrap py-2.5 pr-3 text-ink/70">{t.quantity_before} → {t.quantity_after}</td>
                      <td className="py-2.5 text-ink/70">{t.profiles?.full_name || t.profiles?.email || 'System'}</td>
                    </tr>
                  ))}
                  {history.length === 0 && <tr><td colSpan="5" className="py-8 text-center text-ink/60">No movements match.</td></tr>}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}

      {confirm && selected && (
        <ConfirmDialog title="Confirm stock movement" confirmLabel="Record movement" busy={busy} danger={form.type === 'out'}
          onCancel={() => setConfirm(false)} onConfirm={submit}
          message={`${form.type === 'in' ? 'Add' : 'Remove'} ${form.quantity} unit(s) ${form.type === 'in' ? 'to' : 'from'} ${selected.name}? Stock will go from ${selected.quantity} to ${form.type === 'in' ? selected.quantity + Number(form.quantity) : selected.quantity - Number(form.quantity)}.`} />
      )}
    </>
  )
}

import { useCallback, useEffect, useMemo, useState } from 'react'
import { ArrowDown, ArrowUp, Pencil, Plus, Search, Trash2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { formatCurrency, friendlyError, stockStatus } from '../lib/format'
import { validateProduct } from '../lib/validation'
import { Button, ConfirmDialog, ErrorBanner, Field, Modal, PageHeader, Spinner, StatusBadge, inputClass, useToast } from '../components/ui'

const EMPTY = { sku: '', name: '', description: '', category_id: '', unit_price: '', low_stock_threshold: '10', opening_stock: '' }

function ProductForm({ product, categories, onClose, onSaved }) {
  const toast = useToast()
  const editing = Boolean(product)
  const [form, setForm] = useState(product ? {
    sku: product.sku, name: product.name, description: product.description ?? '', category_id: product.category_id ?? '',
    unit_price: String(product.unit_price), low_stock_threshold: String(product.low_stock_threshold), opening_stock: '',
  } : EMPTY)
  const [newCategory, setNewCategory] = useState('')
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  async function submit(e) {
    e.preventDefault()
    setError('')
    const v = validateProduct(form)
    const opening = form.opening_stock === '' ? 0 : Number(form.opening_stock)
    if (!editing && (!Number.isInteger(opening) || opening < 0)) v.opening_stock = 'Enter a whole number of 0 or more.'
    if (form.category_id === '__new' && !newCategory.trim()) v.category_id = 'Enter a category name.'
    setErrors(v)
    if (Object.keys(v).length) return
    setBusy(true)
    try {
      let categoryId = form.category_id || null
      if (form.category_id === '__new') {
        const { data, error: ce } = await supabase.from('categories').insert({ name: newCategory.trim() }).select('id').single()
        if (ce) throw ce
        categoryId = data.id
      }
      const payload = {
        sku: form.sku.trim(), name: form.name.trim(), description: form.description.trim() || null,
        category_id: categoryId, unit_price: Number(form.unit_price), low_stock_threshold: Number(form.low_stock_threshold),
      }
      if (editing) {
        const { error: ue } = await supabase.from('products').update(payload).eq('id', product.id)
        if (ue) throw ue
        toast('Product updated.')
      } else {
        const { data, error: ie } = await supabase.from('products').insert(payload).select('id').single()
        if (ie) throw ie
        if (opening > 0) {
          const { error: se } = await supabase.rpc('record_stock_movement', { p_product_id: data.id, p_type: 'in', p_quantity: opening, p_note: 'Opening stock' })
          if (se) throw se
        }
        toast('Product created.')
      }
      onSaved()
    } catch (ex) {
      setError(friendlyError(ex))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal title={editing ? 'Edit product' : 'Add product'} onClose={onClose} wide>
      <form onSubmit={submit} className="space-y-4" noValidate>
        <ErrorBanner message={error} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="SKU" htmlFor="sku" error={errors.sku}><input id="sku" className={inputClass} value={form.sku} onChange={set('sku')} /></Field>
          <Field label="Name" htmlFor="name" error={errors.name}><input id="name" className={inputClass} value={form.name} onChange={set('name')} /></Field>
        </div>
        <Field label="Category" htmlFor="category" error={errors.category_id}>
          <select id="category" className={inputClass} value={form.category_id} onChange={set('category_id')}>
            <option value="">Uncategorized</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            <option value="__new">+ New category…</option>
          </select>
        </Field>
        {form.category_id === '__new' && (
          <Field label="New category name" htmlFor="newcat"><input id="newcat" className={inputClass} value={newCategory} onChange={(e) => setNewCategory(e.target.value)} /></Field>
        )}
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Unit price (₹)" htmlFor="price" error={errors.unit_price}>
            <input id="price" type="number" min="0" step="0.01" className={inputClass} value={form.unit_price} onChange={set('unit_price')} />
          </Field>
          <Field label="Low-stock threshold" htmlFor="thr" error={errors.low_stock_threshold} hint="Alert at or below this quantity.">
            <input id="thr" type="number" min="0" step="1" className={inputClass} value={form.low_stock_threshold} onChange={set('low_stock_threshold')} />
          </Field>
          {!editing && (
            <Field label="Opening stock" htmlFor="open" error={errors.opening_stock} hint="Recorded as a stock-in.">
              <input id="open" type="number" min="0" step="1" className={inputClass} value={form.opening_stock} onChange={set('opening_stock')} />
            </Field>
          )}
        </div>
        <Field label="Description" htmlFor="desc" error={errors.description}>
          <textarea id="desc" rows="2" className={inputClass} value={form.description} onChange={set('description')} />
        </Field>
        {editing && <p className="text-xs text-ink/60">Quantity changes only through stock movements, so every change is recorded.</p>}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" busy={busy}>{editing ? 'Save changes' : 'Add product'}</Button>
        </div>
      </form>
    </Modal>
  )
}

export default function Products() {
  const { isAdmin } = useAuth()
  const toast = useToast()
  const [products, setProducts] = useState(null)
  const [categories, setCategories] = useState([])
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [sort, setSort] = useState({ key: 'name', dir: 'asc' })
  const [editing, setEditing] = useState(null) // null | 'new' | product
  const [deleting, setDeleting] = useState(null)
  const [deleteBusy, setDeleteBusy] = useState(false)

  const load = useCallback(async () => {
    setError('')
    const [p, c] = await Promise.all([
      supabase.from('products').select('id,sku,name,description,category_id,unit_price,quantity,low_stock_threshold,categories(name)').order('name').limit(1000),
      supabase.from('categories').select('id,name').order('name'),
    ])
    if (p.error || c.error) { setError(friendlyError(p.error || c.error)); return }
    setProducts(p.data); setCategories(c.data)
  }, [])
  useEffect(() => { load() }, [load])

  const rows = useMemo(() => {
    if (!products) return []
    const q = search.trim().toLowerCase()
    const list = products.filter((p) =>
      (!q || p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q)) &&
      (!categoryFilter || (categoryFilter === 'none' ? !p.category_id : p.category_id === categoryFilter)) &&
      (!statusFilter || stockStatus(p.quantity, p.low_stock_threshold) === statusFilter))
    const val = (p) => sort.key === 'category' ? (p.categories?.name ?? '') : p[sort.key]
    list.sort((a, b) => {
      const x = val(a), y = val(b)
      const c = typeof x === 'number' ? x - y : String(x).localeCompare(String(y))
      return sort.dir === 'asc' ? c : -c
    })
    return list
  }, [products, search, categoryFilter, statusFilter, sort])

  const toggleSort = (key) => setSort((s) => (s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' }))
  const Th = ({ k, children, right }) => (
    <th className={`pb-2 font-medium ${right ? 'text-right' : ''}`} aria-sort={sort.key === k ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}>
      <button onClick={() => toggleSort(k)} className="inline-flex items-center gap-1 hover:text-ink">
        {children}{sort.key === k && (sort.dir === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
      </button>
    </th>
  )

  async function confirmDelete() {
    setDeleteBusy(true)
    const { error: de } = await supabase.from('products').delete().eq('id', deleting.id)
    setDeleteBusy(false)
    if (de) { toast(friendlyError(de), 'error'); return }
    toast(`Deleted ${deleting.name}.`)
    setDeleting(null); load()
  }

  return (
    <>
      <PageHeader title="Products" subtitle={isAdmin ? 'Add, edit and remove products.' : 'Browse products and their stock levels.'}
        actions={isAdmin && <Button onClick={() => setEditing('new')}><Plus className="h-4 w-4" aria-hidden /> Add product</Button>} />
      <div className="mb-4 grid gap-3 sm:grid-cols-4">
        <div className="relative sm:col-span-2">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-ink/40" aria-hidden />
          <input aria-label="Search products" placeholder="Search by name or SKU" className={`${inputClass} pl-9`} value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select aria-label="Filter by category" className={inputClass} value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
          <option value="">All categories</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          <option value="none">Uncategorized</option>
        </select>
        <select aria-label="Filter by stock status" className={inputClass} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">Any stock level</option>
          <option value="ok">In stock</option>
          <option value="low">Low stock</option>
          <option value="out">Out of stock</option>
        </select>
      </div>

      <ErrorBanner message={error} onRetry={load} />
      {!products && !error && <Spinner label="Loading products" />}
      {products && (
        <div className="overflow-x-auto rounded-xl border border-line bg-white p-4">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="text-xs text-ink/60"><tr>
              <Th k="sku">SKU</Th><Th k="name">Name</Th><Th k="category">Category</Th>
              <Th k="unit_price" right>Price</Th><Th k="quantity" right>Quantity</Th>
              <th className="pb-2 pl-4 font-medium">Status</th>{isAdmin && <th className="pb-2" />}
            </tr></thead>
            <tbody className="divide-y divide-line">
              {rows.map((p) => (
                <tr key={p.id}>
                  <td className="py-2.5 pr-4 text-ink/70">{p.sku}</td>
                  <td className="py-2.5 pr-4 font-medium">{p.name}</td>
                  <td className="py-2.5 pr-4 text-ink/70">{p.categories?.name ?? 'Uncategorized'}</td>
                  <td className="tabular py-2.5 text-right">{formatCurrency(p.unit_price)}</td>
                  <td className="tabular py-2.5 text-right font-semibold">{p.quantity}</td>
                  <td className="py-2.5 pl-4"><StatusBadge status={stockStatus(p.quantity, p.low_stock_threshold)} /></td>
                  {isAdmin && (
                    <td className="whitespace-nowrap py-2.5 text-right">
                      <button aria-label={`Edit ${p.name}`} className="rounded p-1.5 hover:bg-mist" onClick={() => setEditing(p)}><Pencil className="h-4 w-4" /></button>
                      <button aria-label={`Delete ${p.name}`} className="rounded p-1.5 text-alert hover:bg-alert-soft" onClick={() => setDeleting(p)}><Trash2 className="h-4 w-4" /></button>
                    </td>
                  )}
                </tr>
              ))}
              {rows.length === 0 && <tr><td colSpan="7" className="py-10 text-center text-ink/60">
                {products.length === 0 ? 'No products yet. Add your first product to get started.' : 'No products match these filters.'}
              </td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <ProductForm product={editing === 'new' ? null : editing} categories={categories}
          onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load() }} />
      )}
      {deleting && (
        <ConfirmDialog danger title="Delete product" confirmLabel="Delete" busy={deleteBusy} onCancel={() => setDeleting(null)} onConfirm={confirmDelete}
          message={`Delete ${deleting.name} (${deleting.sku})? Its stock history will be deleted too. This cannot be undone.`} />
      )}
    </>
  )
}

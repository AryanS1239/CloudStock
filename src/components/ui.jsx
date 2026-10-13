import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { AlertTriangle, CheckCircle2, Loader2, X, XCircle } from 'lucide-react'

export function Spinner({ label = 'Loading' }) {
  return (
    <div className="flex items-center justify-center gap-2 py-16 text-tide" role="status" aria-live="polite">
      <Loader2 className="h-5 w-5 animate-spin" aria-hidden /> <span className="text-sm">{label}…</span>
    </div>
  )
}

export function ErrorBanner({ message, onRetry }) {
  if (!message) return null
  return (
    <div className="flex items-start gap-3 rounded-lg border border-alert/30 bg-alert-soft p-3 text-sm text-alert" role="alert">
      <XCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <div className="flex-1">{message}</div>
      {onRetry && <button onClick={onRetry} className="font-semibold underline">Retry</button>}
    </div>
  )
}

export function Button({ variant = 'primary', busy, className = '', children, ...rest }) {
  const styles = {
    primary: 'bg-tide text-white hover:bg-tide-dark',
    secondary: 'bg-white text-ink border border-line hover:bg-mist',
    danger: 'bg-alert text-white hover:opacity-90',
    ghost: 'text-tide hover:bg-tide-soft',
  }[variant]
  return (
    <button
      {...rest}
      disabled={busy || rest.disabled}
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-3.5 py-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${styles} ${className}`}
    >
      {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
      {children}
    </button>
  )
}

export function Field({ label, error, hint, children, htmlFor }) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1 block text-sm font-medium">{label}</label>
      {children}
      {hint && !error && <p className="mt-1 text-xs text-ink/60">{hint}</p>}
      {error && <p className="mt-1 text-xs font-medium text-alert" role="alert">{error}</p>}
    </div>
  )
}

export const inputClass =
  'w-full rounded-lg border border-line bg-white px-3 py-2 text-sm placeholder:text-ink/40 focus:border-tide'

export function StatusBadge({ status }) {
  const map = {
    ok: ['In stock', 'bg-ok-soft text-ok'],
    low: ['Low stock', 'bg-amber-soft text-[#8a5a0a]'],
    out: ['Out of stock', 'bg-alert-soft text-alert'],
  }
  const [text, cls] = map[status]
  return <span className={`inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ${cls}`}>{text}</span>
}

export function Modal({ title, onClose, children, wide }) {
  const ref = useRef(null)
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    ref.current?.querySelector('input,select,textarea,button')?.focus()
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])
  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-ink/40 p-0 sm:items-center sm:p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div ref={ref} role="dialog" aria-modal="true" aria-label={title}
        className={`max-h-[92vh] w-full overflow-y-auto rounded-t-2xl bg-white p-5 shadow-xl sm:rounded-2xl ${wide ? 'sm:max-w-xl' : 'sm:max-w-md'}`}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button onClick={onClose} aria-label="Close" className="rounded p-1 hover:bg-mist"><X className="h-5 w-5" /></button>
        </div>
        {children}
      </div>
    </div>
  )
}

export function ConfirmDialog({ title, message, confirmLabel = 'Confirm', danger, busy, onConfirm, onCancel }) {
  return (
    <Modal title={title} onClose={onCancel}>
      <div className="flex gap-3">
        <AlertTriangle className={`mt-0.5 h-5 w-5 shrink-0 ${danger ? 'text-alert' : 'text-amber'}`} aria-hidden />
        <p className="text-sm">{message}</p>
      </div>
      <div className="mt-5 flex justify-end gap-2">
        <Button variant="secondary" onClick={onCancel}>Cancel</Button>
        <Button variant={danger ? 'danger' : 'primary'} busy={busy} onClick={onConfirm}>{confirmLabel}</Button>
      </div>
    </Modal>
  )
}

const ToastContext = createContext(() => {})
export const useToast = () => useContext(ToastContext)

export function ToastProvider({ children }) {
  const [items, setItems] = useState([])
  const push = useCallback((message, kind = 'success') => {
    const id = crypto.randomUUID()
    setItems((x) => [...x, { id, message, kind }])
    setTimeout(() => setItems((x) => x.filter((i) => i.id !== id)), 4500)
  }, [])
  return (
    <ToastContext.Provider value={push}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex max-w-sm flex-col gap-2" aria-live="polite">
        {items.map((t) => (
          <div key={t.id} className={`flex items-start gap-2 rounded-lg px-3.5 py-2.5 text-sm text-white shadow-lg ${t.kind === 'error' ? 'bg-alert' : 'bg-tide-dark'}`}>
            {t.kind === 'error' ? <XCircle className="mt-0.5 h-4 w-4 shrink-0" /> : <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />}
            <span>{t.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function PageHeader({ title, subtitle, actions }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-ink/60">{subtitle}</p>}
      </div>
      {actions}
    </div>
  )
}

import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { validateCredentials } from '../lib/validation'
import { friendlyError } from '../lib/format'
import { Button, ErrorBanner, Field, inputClass } from '../components/ui'

export default function Login() {
  const { session, signIn, signUp } = useAuth()
  const [mode, setMode] = useState('login')
  const [form, setForm] = useState({ email: '', password: '', fullName: '' })
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  if (session) return <Navigate to="/" replace />

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  async function submit(e) {
    e.preventDefault()
    setError(''); setNotice('')
    const v = validateCredentials(form, mode)
    setErrors(v)
    if (Object.keys(v).length) return
    setBusy(true)
    try {
      if (mode === 'login') {
        const { error: err } = await signIn(form.email.trim(), form.password)
        if (err) setError(/Invalid login/i.test(err.message) ? 'Email or password is incorrect.' : /not confirmed/i.test(err.message) ? 'Confirm your email first, then sign in.' : friendlyError(err))
      } else {
        const { data, error: err } = await signUp(form.email.trim(), form.password, form.fullName.trim())
        if (err) setError(friendlyError(err))
        else if (!data.session) setNotice('Account created. Check your email and confirm your address, then sign in.')
      }
    } catch (ex) {
      setError(friendlyError(ex))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="grid min-h-full lg:grid-cols-2">
      <section className="flex flex-col justify-between bg-tide-dark p-8 text-white lg:p-12">
        <div className="flex items-center gap-2.5">
          <img src="/favicon.svg" alt="" className="h-9 w-9" />
          <span className="text-xl font-bold tracking-tight">CloudStock</span>
        </div>
        <div className="my-12 max-w-md">
          <h1 className="text-3xl font-bold leading-tight tracking-tight lg:text-4xl">Know exactly what is on your shelves.</h1>
          <p className="mt-4 text-white/75">Track products, record every stock movement, and get warned before an item runs out.</p>
        </div>
        <p className="text-sm text-white/55">The first account created becomes the administrator. Everyone after that joins as an employee.</p>
      </section>
      <section className="flex items-center justify-center p-6">
        <form onSubmit={submit} className="w-full max-w-sm space-y-4" noValidate>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">{mode === 'login' ? 'Sign in' : 'Create your account'}</h2>
            <p className="mt-1 text-sm text-ink/60">
              {mode === 'login' ? 'New here?' : 'Already have an account?'}{' '}
              <button type="button" className="font-semibold text-tide underline"
                onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setErrors({}); setError(''); setNotice('') }}>
                {mode === 'login' ? 'Create an account' : 'Sign in'}
              </button>
            </p>
          </div>
          <ErrorBanner message={error} />
          {notice && <div className="rounded-lg border border-ok/30 bg-ok-soft p-3 text-sm text-ok" role="status">{notice}</div>}
          {mode === 'register' && (
            <Field label="Full name" htmlFor="fullName" error={errors.fullName}>
              <input id="fullName" className={inputClass} value={form.fullName} onChange={set('fullName')} autoComplete="name" />
            </Field>
          )}
          <Field label="Email" htmlFor="email" error={errors.email}>
            <input id="email" type="email" className={inputClass} value={form.email} onChange={set('email')} autoComplete="email" />
          </Field>
          <Field label="Password" htmlFor="password" error={errors.password} hint={mode === 'register' ? 'At least 8 characters.' : undefined}>
            <input id="password" type="password" className={inputClass} value={form.password} onChange={set('password')}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'} />
          </Field>
          <Button type="submit" busy={busy} className="w-full">{mode === 'login' ? 'Sign in' : 'Create account'}</Button>
        </form>
      </section>
    </div>
  )
}

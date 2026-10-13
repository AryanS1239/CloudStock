import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { friendlyError } from '../lib/format'
import { ConfirmDialog, ErrorBanner, PageHeader, Spinner, inputClass, useToast } from '../components/ui'

export default function Users() {
  const { profile, refreshProfile } = useAuth()
  const toast = useToast()
  const [users, setUsers] = useState(null)
  const [error, setError] = useState('')
  const [pending, setPending] = useState(null) // { user, role }
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    setError('')
    const { data, error: e } = await supabase.from('profiles').select('id,email,full_name,role,created_at').order('created_at')
    if (e) setError(friendlyError(e)); else setUsers(data)
  }, [])
  useEffect(() => { load() }, [load])

  async function apply() {
    setBusy(true)
    const { error: e } = await supabase.rpc('set_user_role', { p_user_id: pending.user.id, p_role: pending.role })
    setBusy(false)
    if (e) toast(friendlyError(e), 'error')
    else { toast(`${pending.user.email} is now ${pending.role === 'admin' ? 'an administrator' : 'an employee'}.`); if (pending.user.id === profile.id) refreshProfile() }
    setPending(null); load()
  }

  return (
    <>
      <PageHeader title="Users" subtitle="Administrators can manage products and roles. Employees can view products and record stock movements." />
      <ErrorBanner message={error} onRetry={load} />
      {!users && !error && <Spinner label="Loading users" />}
      {users && (
        <div className="overflow-x-auto rounded-xl border border-line bg-white p-4">
          <table className="w-full min-w-[480px] text-left text-sm">
            <thead className="text-xs text-ink/60"><tr><th className="pb-2 font-medium">Name</th><th className="pb-2 font-medium">Email</th><th className="pb-2 font-medium">Role</th></tr></thead>
            <tbody className="divide-y divide-line">
              {users.map((u) => (
                <tr key={u.id}>
                  <td className="py-2.5 pr-4 font-medium">{u.full_name || '—'}{u.id === profile.id && <span className="ml-2 text-xs text-ink/60">(you)</span>}</td>
                  <td className="py-2.5 pr-4 text-ink/70">{u.email}</td>
                  <td className="py-2.5">
                    <select aria-label={`Role for ${u.email}`} className={`${inputClass} !w-auto`} value={u.role} onChange={(e) => setPending({ user: u, role: e.target.value })}>
                      <option value="admin">Administrator</option><option value="employee">Employee</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {pending && (
        <ConfirmDialog title="Change role" confirmLabel="Change role" busy={busy} onCancel={() => setPending(null)} onConfirm={apply}
          message={`Make ${pending.user.email} ${pending.role === 'admin' ? 'an administrator' : 'an employee'}?`} />
      )}
    </>
  )
}

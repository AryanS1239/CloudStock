import { NavLink, Outlet } from 'react-router-dom'
import { ArrowLeftRight, LayoutDashboard, LogOut, Package, Users } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

const link = ({ isActive }) =>
  `flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
    isActive ? 'bg-white/15 text-white' : 'text-white/75 hover:bg-white/10 hover:text-white'
  }`

export default function Layout() {
  const { profile, isAdmin, signOut } = useAuth()
  const items = [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
    { to: '/products', label: 'Products', icon: Package },
    { to: '/stock', label: 'Stock movements', icon: ArrowLeftRight },
    ...(isAdmin ? [{ to: '/users', label: 'Users', icon: Users }] : []),
  ]
  return (
    <div className="flex min-h-full flex-col md:flex-row">
      <aside className="bg-tide-dark text-white md:fixed md:inset-y-0 md:w-60 md:flex md:flex-col">
        <div className="flex items-center justify-between px-4 py-4 md:block">
          <div className="flex items-center gap-2.5">
            <img src="/favicon.svg" alt="" className="h-8 w-8" />
            <span className="text-lg font-bold tracking-tight">CloudStock</span>
          </div>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-3 md:flex-1 md:flex-col md:overflow-visible" aria-label="Main">
          {items.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} className={link}>
              <Icon className="h-4 w-4 shrink-0" aria-hidden /> <span className="whitespace-nowrap">{label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="hidden border-t border-white/10 p-4 md:block">
          <p className="truncate text-sm font-semibold">{profile?.full_name || profile?.email}</p>
          <p className="mb-3 text-xs text-white/60">{isAdmin ? 'Administrator' : 'Employee'}</p>
          <button onClick={signOut} className="flex items-center gap-2 text-sm text-white/80 hover:text-white">
            <LogOut className="h-4 w-4" aria-hidden /> Sign out
          </button>
        </div>
        <button onClick={signOut} className="absolute right-3 top-3.5 flex items-center gap-1.5 text-sm text-white/80 md:hidden" aria-label="Sign out">
          <LogOut className="h-4 w-4" aria-hidden /> Sign out
        </button>
      </aside>
      <main className="flex-1 p-4 sm:p-6 md:ml-60 lg:p-8">
        <div className="mx-auto max-w-6xl"><Outlet /></div>
      </main>
    </div>
  )
}

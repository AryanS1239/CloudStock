import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { ToastProvider } from './components/ui'
import Layout from './components/Layout'
import { RequireAdmin, RequireAuth } from './components/Guards'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Products from './pages/Products'
import StockMovements from './pages/StockMovements'
import Users from './pages/Users'
import { isConfigured } from './lib/supabase'

export default function App() {
  if (!isConfigured) {
    return (
      <div className="mx-auto mt-24 max-w-md rounded-xl border border-alert/30 bg-alert-soft p-6 text-sm text-alert">
        <h1 className="mb-1 text-lg font-semibold">Configuration missing</h1>
        Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY (see .env.example), then rebuild.
      </div>
    )
  }
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route element={<RequireAuth />}>
              <Route element={<Layout />}>
                <Route index element={<Dashboard />} />
                <Route path="products" element={<Products />} />
                <Route path="stock" element={<StockMovements />} />
                <Route element={<RequireAdmin />}>
                  <Route path="users" element={<Users />} />
                </Route>
              </Route>
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  )
}

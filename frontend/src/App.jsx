import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { useApp } from './context/useApp.js'
import Home from './pages/Home.jsx'
import Login from './pages/Login.jsx'
import Reserve from './pages/Reserve.jsx'
import Session from './pages/Session.jsx'
import AdminLogin from './pages/admin/AdminLogin.jsx'
import AdminDashboard from './pages/admin/AdminDashboard.jsx'
import AdminSessions from './pages/admin/AdminSessions.jsx'
import NotFound from './pages/NotFound.jsx'

function RequireStudent({ children }) {
  const { student } = useApp()
  const location = useLocation()

  if (!student) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: `${location.pathname}${location.search}` }}
      />
    )
  }

  return children
}

function RequireAdmin({ children }) {
  const { adminAuthed } = useApp()
  const location = useLocation()

  if (!adminAuthed) {
    return <Navigate to="/admin/login" replace state={{ from: location.pathname }} />
  }

  return children
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route
        path="/reserve"
        element={
          <RequireStudent>
            <Reserve />
          </RequireStudent>
        }
      />
      <Route
        path="/session"
        element={
          <RequireStudent>
            <Session />
          </RequireStudent>
        }
      />
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route
        path="/admin/dashboard"
        element={
          <RequireAdmin>
            <AdminDashboard />
          </RequireAdmin>
        }
      />
      <Route
        path="/admin/sessions"
        element={
          <RequireAdmin>
            <AdminSessions />
          </RequireAdmin>
        }
      />
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}

export default App

import { Routes, Route } from 'react-router-dom'
import { Suspense, lazy } from 'react'
import Layout from './components/Layout'
import LoadingSpinner from './components/LoadingSpinner'
import { AuthProvider } from './contexts/AuthContext'

// Lazy load components for better performance
const Home = lazy(() => import('./pages/Home'))
const Login = lazy(() => import('./pages/Login'))
const Register = lazy(() => import('./pages/Register'))
const Dashboard = lazy(() => import('./pages/Dashboard'))
const ReportIncident = lazy(() => import('./pages/ReportIncident'))
const IncidentMap = lazy(() => import('./pages/IncidentMap'))
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'))
const SuperAdminDashboard = lazy(() => import('./pages/SuperAdminDashboard'))
const EmailVerification = lazy(() => import('./pages/EmailVerification'))

function App() {
  return (
    <AuthProvider>
      <Layout>
        <Suspense fallback={<LoadingSpinner />}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/report" element={<ReportIncident />} />
            <Route path="/map" element={<IncidentMap />} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/super-admin" element={<SuperAdminDashboard />} />
            <Route path="/verify-email" element={<EmailVerification />} />
          </Routes>
        </Suspense>
      </Layout>
    </AuthProvider>
  )
}

export default App

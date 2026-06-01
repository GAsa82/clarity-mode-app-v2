import { Routes, Route, NavLink } from 'react-router-dom'
import UploadPage from './pages/UploadPage'
import DashboardPage from './pages/DashboardPage'
import ChatPage from './pages/ChatPage'
import { useEffect, useState } from 'react'
import { healthCheck, type HealthStatus } from './api'

function NavBar() {
  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
      isActive
        ? 'bg-indigo-600 text-white'
        : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
    }`

  return (
    <nav className="flex items-center gap-2 border-b border-gray-800 px-6 py-3">
      <div className="flex items-center gap-2 mr-8">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm">
          C
        </div>
        <span className="font-semibold text-gray-100">Clarity AI</span>
      </div>
      <NavLink to="/" end className={linkClass}>
        Upload
      </NavLink>
      <NavLink to="/dashboard" className={linkClass}>
        Dashboard
      </NavLink>
      <NavLink to="/chat" className={linkClass}>
        Chat
      </NavLink>
    </nav>
  )
}

export default function App() {
  const [backendStatus, setBackendStatus] = useState<HealthStatus | null>(null)
  const [statusError, setStatusError] = useState(false)

  useEffect(() => {
    healthCheck()
      .then((h) => {
        setBackendStatus(h)
        setStatusError(false)
      })
      .catch(() => {
        setStatusError(true)
        setBackendStatus(null)
      })
  }, [])

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      <NavBar />

      {/* Backend status bar */}
      <div className="px-6 py-2 text-xs border-b border-gray-800 flex items-center gap-2">
        <span className="text-gray-500">API:</span>
        {statusError ? (
          <span className="text-red-400">Offline</span>
        ) : backendStatus ? (
          <span className="text-green-400">Online ({backendStatus.version})</span>
        ) : (
          <span className="text-yellow-400">Checking...</span>
        )}
      </div>

      <main className="flex-1 p-6">
        <Routes>
          <Route path="/" element={<UploadPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/chat" element={<ChatPage />} />
        </Routes>
      </main>
    </div>
  )
}
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { ProtectedRoute } from './components/layout/ProtectedRoute'
import LandingPage from './pages/LandingPage'
import DashboardPage from './pages/DashboardPage'
import ListPropertyPage from './pages/ListPropertyPage'
import MyPropertiesPage from './pages/MyPropertiesPage'
import PropertyDetailPage from './pages/PropertyDetailPage'
import PropertiesPage from './pages/PropertiesPage'
import MarketplacePage from './pages/MarketplacePage'
import PortfolioPage from './pages/PortfolioPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/properties" element={<PropertiesPage />} />
        <Route path="/marketplace" element={<MarketplacePage />} />
        <Route path="/property/:id" element={<PropertyDetailPage />} />

        {/* Protected Routes */}
        <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
        <Route path="/list-property" element={<ProtectedRoute><ListPropertyPage /></ProtectedRoute>} />
        <Route path="/my-properties" element={<ProtectedRoute><MyPropertiesPage /></ProtectedRoute>} />
        <Route path="/portfolio" element={<ProtectedRoute><PortfolioPage /></ProtectedRoute>} />
      </Routes>
    </BrowserRouter>
  )
}

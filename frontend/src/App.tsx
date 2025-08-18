import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import Layout from './components/Layout';
import RegisterEwura from './components/RegisterEwura';
import Transactions from './components/Transactions';
import Users from './components/Users';
import Tanks from './components/Tanks';
import TankMonitor from './components/TankMonitor';
import Alerts from './components/Alerts';
import Maintenance from './components/Maintenance';
import Reports from './components/Reports';
import Settings from './components/Settings';
import Stations from './components/Stations';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Locations from './components/Locations';
import TaxpayerComponent from './components/Taxpayer';
import EditTaxpayer from './components/EditTaxpayer';
import Products from './components/Products';
import TankAssignments from './components/TankAssignments';

function AppContent() {
  const { isAuthenticated } = useAuth();

  return (
    <Router>
      <Routes>
        <Route 
          path="/login" 
          element={isAuthenticated ? <Navigate to="/dashboard" /> : <Login />} 
        />
        <Route 
          path="/dashboard" 
          element={isAuthenticated ? <Layout><Dashboard /></Layout> : <Navigate to="/login" />} 
        />
        <Route 
          path="/register-ewura" 
          element={isAuthenticated ? <Layout><RegisterEwura /></Layout> : <Navigate to="/login" />} 
        />
        <Route 
          path="/locations" 
          element={isAuthenticated ? <Layout><Locations /></Layout> : <Navigate to="/login" />} 
        />
        <Route 
          path="/transactions" 
          element={isAuthenticated ? <Layout><Transactions /></Layout> : <Navigate to="/login" />} 
        />
        <Route 
          path="/tanks" 
          element={isAuthenticated ? <Layout><Tanks /></Layout> : <Navigate to="/login" />} 
        />
        <Route 
          path="/tank-monitor" 
          element={isAuthenticated ? <Layout><TankMonitor /></Layout> : <Navigate to="/login" />} 
        />
        <Route 
          path="/alerts" 
          element={isAuthenticated ? <Layout><Alerts /></Layout> : <Navigate to="/login" />} 
        />
        <Route 
          path="/maintenance" 
          element={isAuthenticated ? <Layout><Maintenance /></Layout> : <Navigate to="/login" />} 
        />
        <Route 
          path="/reports" 
          element={isAuthenticated ? <Layout><Reports /></Layout> : <Navigate to="/login" />} 
        />
        <Route 
          path="/settings" 
          element={isAuthenticated ? <Layout><Settings /></Layout> : <Navigate to="/login" />} 
        />
        <Route 
          path="/stations" 
          element={isAuthenticated ? <Layout><Stations /></Layout> : <Navigate to="/login" />} 
        />
        <Route 
          path="/users" 
          element={isAuthenticated ? <Layout><Users /></Layout> : <Navigate to="/login" />} 
        />
         <Route 
          path="/taxpayers" 
          element={isAuthenticated ? <Layout><TaxpayerComponent /></Layout> : <Navigate to="/login" />} 
        />
        <Route 
          path="/taxpayers/:id/edit" 
          element={isAuthenticated ? <Layout><EditTaxpayer /></Layout> : <Navigate to="/login" />} 
        />
        <Route 
          path="/products" 
          element={isAuthenticated ? <Layout><Products /></Layout> : <Navigate to="/login" />} 
        />
        <Route 
          path="/tank-assignments" 
          element={isAuthenticated ? <Layout><TankAssignments /></Layout> : <Navigate to="/login" />} 
        />
        <Route path="/" element={<Navigate to={isAuthenticated ? "/dashboard" : "/login"} />} />
        <Route path="*" element={<Navigate to={isAuthenticated ? "/dashboard" : "/login"} />} />
      </Routes>
    </Router>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
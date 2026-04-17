import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import ErrorBoundary from './components/ErrorBoundary';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import WizardView from './pages/WizardView';
import ItineraryView from './pages/ItineraryView';
import ExpenseTrackerView from './pages/ExpenseTrackerView';
import Contact from './pages/Contact';
import ProfileView from './pages/ProfileView';
import { ToastProvider } from './components/Toast';
import NetworkStatusIndicator from './components/NetworkStatusIndicator';

function App() {
  return (
    <ErrorBoundary>
      <NetworkStatusIndicator />
      <ToastProvider>
        <Router>
        <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/contact" element={<Contact />} />
        
        {/* Public Landing Dashboard */}
        <Route path="/" element={<Dashboard />} />
        
        {/* Protected Routes */}
        
        <Route 
          path="/create" 
          element={
            <ProtectedRoute>
              <WizardView />
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/trip/:id" 
          element={
            <ProtectedRoute>
              <ItineraryView />
            </ProtectedRoute>
          } 
        />

        <Route 
          path="/trip/:id/expenses" 
          element={
            <ProtectedRoute>
              <ExpenseTrackerView />
            </ProtectedRoute>
          } 
        />

        <Route 
          path="/profile" 
          element={
            <ProtectedRoute>
              <ProfileView />
            </ProtectedRoute>
          } 
        />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
      </ToastProvider>
    </ErrorBoundary>
  );
}

export default App;

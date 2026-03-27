import { useState, useEffect, useCallback } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthProvider } from './contexts/AuthContext';
import { isAuthenticated } from './lib/api';
import Dashboard from './pages/Dashboard';
import FoodLog from './pages/FoodLog';
import History from './pages/History';
import Presets from './pages/Presets';
import Settings from './pages/Settings';
import MyFoods from './pages/MyFoods';
import Trips from './pages/Trips';
import Layout from './components/Layout';
import LoginScreen from './pages/LoginScreen';

export default function App() {
  const [authenticated, setAuthenticated] = useState(false);
  const [checking, setChecking] = useState(true);

  const checkAuth = useCallback(() => {
    setAuthenticated(isAuthenticated());
    setChecking(false);
  }, []);

  useEffect(() => {
    checkAuth();
    
    // Listen for storage changes (for cross-tab sync)
    const handleStorageChange = () => {
      checkAuth();
    };
    
    window.addEventListener('storage', handleStorageChange);
    
    // Custom event for logout
    const handleLogout = () => {
      checkAuth();
    };
    window.addEventListener('auth-change', handleLogout);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('auth-change', handleLogout);
    };
  }, [checkAuth]);

  const handleAuthenticated = () => {
    setAuthenticated(true);
  };

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-pulse text-gray-500">Loading...</div>
      </div>
    );
  }

  if (!authenticated) {
    return <LoginScreen onAuthenticated={handleAuthenticated} />;
  }

  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Layout />}>
              <Route index element={<Dashboard />} />
              <Route path="add" element={<FoodLog />} />
              <Route path="my-foods" element={<MyFoods />} />
              <Route path="presets" element={<Presets />} />
              <Route path="trips" element={<Trips />} />
              <Route path="history" element={<History />} />
              <Route path="settings" element={<Settings />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}

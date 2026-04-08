import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Dashboard from './pages/Dashboard';
import FoodLog from './pages/FoodLog';
import History from './pages/History';
import Presets from './pages/Presets';
import Settings from './pages/Settings';
import MyFoods from './pages/MyFoods';
import FoodEntries from './pages/FoodEntries';
import Trips from './pages/Trips';
import Help from './pages/Help';
import Layout from './components/Layout';
import LoginScreen from './pages/LoginScreen';

function AppRoutes() {
  const { userId, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-pulse text-gray-500">Loading...</div>
      </div>
    );
  }

  if (!userId) {
    return <LoginScreen />;
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="add" element={<FoodLog />} />
          <Route path="my-foods" element={<MyFoods />} />
          <Route path="food-entries" element={<FoodEntries />} />
          <Route path="presets" element={<Presets />} />
          <Route path="trips" element={<Trips />} />
          <Route path="history" element={<History />} />
          <Route path="settings" element={<Settings />} />
          <Route path="help" element={<Help />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </ThemeProvider>
  );
}

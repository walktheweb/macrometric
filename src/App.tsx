import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthProvider } from './contexts/AuthContext';
import Dashboard from './pages/Dashboard';
import FoodLog from './pages/FoodLog';
import History from './pages/History';
import Presets from './pages/Presets';
import Settings from './pages/Settings';
import MyFoods from './pages/MyFoods';
import Trips from './pages/Trips';
import Layout from './components/Layout';

export default function App() {
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

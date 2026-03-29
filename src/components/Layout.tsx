import { useEffect, useRef, useState } from 'react';
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom';
import MaterialIcon from './MaterialIcon';
import { logout } from '../lib/api';

const navItems = [
  { to: '/', label: 'Today', icon: 'monitoring' },
  { to: '/trips', label: 'Cycling', icon: 'directions_bike' },
  { to: '/add', label: 'Add Food', icon: 'add_circle' },
  { to: '/history', label: 'History', icon: 'history' },
  { to: '/settings', label: 'Settings', icon: 'settings' },
];

export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const isMaintenancePage = location.pathname === '/my-foods' || location.pathname === '/food-entries';
  const mainRef = useRef<HTMLElement | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  const focusFirstInput = () => {
    if (!mainRef.current) return;
    const selector = '[data-autofocus-first], input:not([type="hidden"]):not([disabled]), textarea:not([disabled]), select:not([disabled])';
    const candidates = Array.from(mainRef.current.querySelectorAll<HTMLElement>(selector));
    const target = candidates.find((el) => el.offsetParent !== null);
    if (target) {
      target.focus();
    }
  };

  useEffect(() => {
    const id = window.setTimeout(focusFirstInput, 0);
    return () => window.clearTimeout(id);
  }, [location.pathname]);

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const handleFocusRequest = () => {
      window.setTimeout(focusFirstInput, 0);
    };
    window.addEventListener('macrometric:focus-first-input', handleFocusRequest);
    return () => {
      window.removeEventListener('macrometric:focus-first-input', handleFocusRequest);
    };
  }, []);

  const goHome = () => {
    if (location.pathname === '/') {
      window.dispatchEvent(new Event('macrometric:today-nav'));
      return;
    }
    navigate('/');
  };

  const handleLogout = async () => {
    await logout();
    setMenuOpen(false);
    window.dispatchEvent(new Event('auth-change'));
  };
  
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <button
            onClick={goHome}
            className="flex items-center gap-2 rounded-lg px-1 py-1 hover:bg-gray-100 transition-colors"
            title="Go to homepage"
          >
            <div className="w-8 h-8 rounded-full bg-primary-500 flex items-center justify-center">
              <span className="text-white font-bold text-sm">M</span>
            </div>
            <span className="font-semibold text-gray-800">MacroMetric</span>
          </button>
          <div
            className="relative"
            onMouseEnter={() => setMenuOpen(true)}
            onMouseLeave={() => setMenuOpen(false)}
          >
            <button
              className="p-2 rounded-lg text-gray-600 hover:text-gray-800 hover:bg-gray-100 transition-colors"
              aria-label="Open menu"
              title="Menu"
            >
              <MaterialIcon name={menuOpen ? 'close' : 'menu'} className="text-[24px]" />
            </button>
            {menuOpen && (
              <div className="absolute right-full top-0 z-20 w-52 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
                {navItems.map(({ to, label, icon }) => (
                  <NavLink
                    key={to}
                    to={to}
                    onClick={() => {
                      if (to === '/' && location.pathname === '/') {
                        window.dispatchEvent(new Event('macrometric:today-nav'));
                      }
                      setMenuOpen(false);
                    }}
                    className={({ isActive }) =>
                      `flex items-center gap-2 px-3 py-2 text-sm transition-colors ${
                        isActive
                          ? 'text-primary-600 bg-primary-50'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`
                    }
                  >
                    <MaterialIcon name={icon} className="text-[20px]" />
                    <span>{label}</span>
                  </NavLink>
                ))}
                <button
                  onClick={handleLogout}
                  className="w-full border-t border-gray-200 flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                >
                  <MaterialIcon name="logout" className="text-[20px]" />
                  <span>Logout</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>
      
      <main
        ref={mainRef}
        className={`${isMaintenancePage ? 'max-w-[1400px]' : 'max-w-lg'} mx-auto px-4 py-4`}
      >
        <Outlet />
      </main>
    </div>
  );
}


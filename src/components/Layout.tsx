import { useEffect, useRef, useState } from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import MaterialIcon from './MaterialIcon';

const navItems = [
  { to: '/', label: 'Today', icon: 'monitoring' },
  { to: '/trips', label: 'Cycling', icon: 'directions_bike' },
  { to: '/add', label: 'Add Food', icon: 'add_circle' },
  { to: '/history', label: 'History', icon: 'history' },
  { to: '/settings', label: 'Settings', icon: 'settings' },
];

export default function Layout() {
  const location = useLocation();
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
  
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-primary-500 flex items-center justify-center">
              <span className="text-white font-bold text-sm">M</span>
            </div>
            <span className="font-semibold text-gray-800">MacroMetric</span>
          </div>
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


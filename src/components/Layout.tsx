import { Outlet, NavLink, useLocation } from 'react-router-dom';

const navItems = [
  { to: '/', label: 'Today', icon: '📊' },
  { to: '/trips', label: 'Cycling', icon: '🚴' },
  { to: '/add', label: 'Add Food', icon: '➕' },
  { to: '/history', label: 'History', icon: '📅' },
  { to: '/settings', label: 'Settings', icon: '⚙️' },
];

export default function Layout() {
  const location = useLocation();
  const isAddPage = location.pathname === '/add';
  
  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-primary-500 flex items-center justify-center">
              <span className="text-white font-bold text-sm">M</span>
            </div>
            <span className="font-semibold text-gray-800">MacroMetric</span>
          </div>
        </div>
      </header>
      
      <main className="max-w-lg mx-auto px-4 py-4">
        <Outlet />
      </main>
      
      <nav className={`fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 ${isAddPage ? '' : ''}`}>
        <div className="max-w-lg mx-auto flex justify-around py-2">
          {navItems.map(({ to, label, icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex flex-col items-center py-1 px-3 rounded-lg transition-colors ${
                  isActive
                    ? 'text-primary-600 bg-primary-50'
                    : 'text-gray-500 hover:text-gray-700'
                }`
              }
            >
              <span className="text-xl">{icon}</span>
              <span className="text-xs mt-1">{label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}

import { useEffect, useRef, useState } from 'react';
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom';
import MaterialIcon from './MaterialIcon';
import { getTodayCheckin, logout } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';

declare const __APP_VERSION__: string;
declare const __BUILD_VERSION__: string;

const navItems = [
  { to: '/add', label: 'Food', icon: 'add_circle' },
  { to: '/history', label: 'History', icon: 'history' },
];

type HeaderActionButton = {
  id: string;
  label: string;
  tone?: 'danger' | 'primary';
};

type HeaderContextState = {
  showBack?: boolean;
  buttons?: HeaderActionButton[];
} | null;

export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { userId } = useAuth();
  const isMaintenancePage = location.pathname === '/my-foods' || location.pathname === '/food-entries';
  const mainRef = useRef<HTMLElement | null>(null);
  const [moreOpen, setMoreOpen] = useState(false);
  const [headerContext, setHeaderContext] = useState<HeaderContextState>(null);
  const [hasTodayCheckin, setHasTodayCheckin] = useState(false);
  const isCheckinEditorOpen = !!headerContext?.buttons?.some((button) => button.id.includes('checkin'));
  const isDialogMode = !!headerContext?.showBack || !!headerContext?.buttons?.length;

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
    setMoreOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    setHeaderContext(null);
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

  useEffect(() => {
    const handleHeaderContext = (event: Event) => {
      const customEvent = event as CustomEvent<HeaderContextState>;
      setHeaderContext(customEvent.detail || null);
    };

    window.addEventListener('macrometric:header-context', handleHeaderContext as EventListener);
    return () => {
      window.removeEventListener('macrometric:header-context', handleHeaderContext as EventListener);
    };
  }, []);

  useEffect(() => {
    const refreshTodayCheckinStatus = async () => {
      if (!userId) {
        setHasTodayCheckin(false);
        return;
      }
      const todayCheckin = await getTodayCheckin(userId);
      setHasTodayCheckin(!!todayCheckin);
    };

    refreshTodayCheckinStatus();
  }, [userId, location.pathname]);

  useEffect(() => {
    const onCheckinUpdated = (event: Event) => {
      const customEvent = event as CustomEvent<{ hasTodayCheckin?: boolean }>;
      if (typeof customEvent.detail?.hasTodayCheckin === 'boolean') {
        setHasTodayCheckin(customEvent.detail.hasTodayCheckin);
      }
    };
    window.addEventListener('macrometric:checkin-updated', onCheckinUpdated as EventListener);
    return () => {
      window.removeEventListener('macrometric:checkin-updated', onCheckinUpdated as EventListener);
    };
  }, []);

  const goHome = () => {
    if (location.pathname === '/') {
      window.dispatchEvent(new Event('macrometric:today-nav'));
      return;
    }
    navigate('/');
  };

  const openCheckin = () => {
    if (location.pathname === '/') {
      window.dispatchEvent(new Event('macrometric:open-checkin'));
      return;
    }
    navigate('/?openCheckin=1');
  };

  const triggerHeaderBack = () => {
    window.dispatchEvent(new Event('macrometric:header-back'));
  };

  const triggerHeaderAction = (id: string) => {
    window.dispatchEvent(new CustomEvent('macrometric:header-action', { detail: { id } }));
  };

  const onBrandClick = () => {
    if (headerContext?.showBack) {
      triggerHeaderBack();
      return;
    }
    goHome();
  };

  const handleLogout = async () => {
    await logout();
    setMoreOpen(false);
    window.dispatchEvent(new Event('auth-change'));
  };
  
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onBrandClick}
              className="rounded-full p-0.5 hover:bg-gray-100 transition-colors"
              title={headerContext?.showBack ? 'Back' : 'Go to homepage'}
              aria-label={headerContext?.showBack ? 'Back' : 'Go to homepage'}
            >
              <div className="w-8 h-8 rounded-full bg-primary-500 flex items-center justify-center">
                <span className="text-white font-bold text-sm">M</span>
              </div>
            </button>
            {!isDialogMode && navItems.map(({ to, label, icon }) => (
              <NavLink
                key={to}
                to={to}
                title={label}
                className={({ isActive }) =>
                  `flex items-center justify-center p-2 rounded-lg transition-colors ${
                    isActive
                      ? 'text-primary-600 bg-primary-50'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`
                }
              >
                <MaterialIcon name={icon} className="text-[28px]" />
              </NavLink>
            ))}
            {headerContext?.buttons?.length ? (
              <div className="flex items-center gap-2 ml-1">
                {headerContext.buttons.map((button) => (
                  <button
                    key={button.id}
                    type="button"
                    onClick={() => triggerHeaderAction(button.id)}
                    className={`min-w-[88px] px-4 py-2 rounded-xl text-sm font-semibold text-white transition-colors ${
                      button.tone === 'danger'
                        ? 'bg-red-500 hover:bg-red-600'
                        : 'bg-primary-500 hover:bg-primary-600'
                    }`}
                  >
                    {button.label}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
          <div className="flex items-center gap-2">
            <div
              className="hidden sm:block text-[11px] leading-none px-2 py-1 rounded-full bg-gray-100 text-gray-500"
              title={`Version ${__APP_VERSION__} | Built ${__BUILD_VERSION__}`}
            >
              v{__APP_VERSION__} {__BUILD_VERSION__}
            </div>
            {!isDialogMode && !isCheckinEditorOpen && (
              <button
                type="button"
                onClick={openCheckin}
                title={hasTodayCheckin ? 'Check-in done today (tap to edit)' : 'Do first check-in today'}
                aria-label={hasTodayCheckin ? 'Edit today check-in' : 'Do today check-in'}
                className={`flex items-center justify-center p-2 rounded-lg transition-colors ${
                  hasTodayCheckin
                    ? 'bg-white text-gray-700 hover:bg-gray-50'
                    : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                }`}
              >
                <MaterialIcon name="check_circle" className="text-[28px]" />
              </button>
            )}
            <div
              className="relative"
              onMouseEnter={() => setMoreOpen(true)}
              onMouseLeave={() => setMoreOpen(false)}
            >
              <button
                type="button"
                onClick={() => setMoreOpen((prev) => !prev)}
                title="Options"
                aria-label="Open options"
                className="flex items-center justify-center p-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
              >
                <MaterialIcon name="menu" className="text-[28px]" />
              </button>
              <div
                className={`absolute right-0 top-0 z-20 w-40 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden transition-all duration-200 ${
                  moreOpen ? 'opacity-100 translate-x-0 pointer-events-auto' : 'opacity-0 translate-x-2 pointer-events-none'
                }`}
              >
                <NavLink
                  to="/food-entries"
                  onClick={() => setMoreOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-2 px-3 py-2 text-sm transition-colors ${
                      isActive
                        ? 'text-primary-900 bg-primary-200 font-medium dark:text-blue-100 dark:bg-blue-900/70'
                        : 'text-gray-800 hover:bg-gray-200 dark:text-gray-100 dark:hover:bg-gray-700'
                    }`
                  }
                >
                  <MaterialIcon name="edit_note" className="text-[18px]" />
                  <span>Entry Manager</span>
                </NavLink>
                <NavLink
                  to="/my-foods"
                  onClick={() => setMoreOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-2 px-3 py-2 text-sm transition-colors ${
                      isActive
                        ? 'text-primary-900 bg-primary-200 font-medium dark:text-blue-100 dark:bg-blue-900/70'
                        : 'text-gray-800 hover:bg-gray-200 dark:text-gray-100 dark:hover:bg-gray-700'
                    }`
                  }
                >
                  <MaterialIcon name="restaurant_menu" className="text-[18px]" />
                  <span>Food Manager</span>
                </NavLink>
                <NavLink
                  to="/trips"
                  onClick={() => setMoreOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-2 px-3 py-2 text-sm transition-colors ${
                      isActive
                        ? 'text-primary-900 bg-primary-200 font-medium dark:text-blue-100 dark:bg-blue-900/70'
                        : 'text-gray-800 hover:bg-gray-200 dark:text-gray-100 dark:hover:bg-gray-700'
                    }`
                  }
                >
                  <MaterialIcon name="directions_bike" className="text-[18px]" />
                  <span>Journey</span>
                </NavLink>
                <NavLink
                  to="/settings"
                  onClick={() => setMoreOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-2 px-3 py-2 text-sm transition-colors ${
                      isActive
                        ? 'text-primary-900 bg-primary-200 font-medium dark:text-blue-100 dark:bg-blue-900/70'
                        : 'text-gray-800 hover:bg-gray-200 dark:text-gray-100 dark:hover:bg-gray-700'
                    }`
                  }
                >
                  <MaterialIcon name="settings" className="text-[18px]" />
                  <span>Settings</span>
                </NavLink>
                <NavLink
                  to="/help"
                  onClick={() => setMoreOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-2 px-3 py-2 text-sm transition-colors ${
                      isActive
                        ? 'text-primary-900 bg-primary-200 font-medium dark:text-blue-100 dark:bg-blue-900/70'
                        : 'text-gray-800 hover:bg-gray-200 dark:text-gray-100 dark:hover:bg-gray-700'
                    }`
                  }
                >
                  <MaterialIcon name="help" className="text-[18px]" />
                  <span>Help</span>
                </NavLink>
                <button
                  onClick={handleLogout}
                  className="w-full border-t border-gray-200 flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                >
                  <MaterialIcon name="logout" className="text-[18px]" />
                  <span>Logout</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>
      <div className="sm:hidden max-w-lg mx-auto px-4 pt-2">
        <div className="text-[11px] text-gray-500 text-right">v{__APP_VERSION__} {__BUILD_VERSION__}</div>
      </div>
      
      <main
        ref={mainRef}
        className={`${isMaintenancePage ? 'max-w-[1400px]' : 'max-w-lg'} mx-auto px-4 py-4`}
      >
        <Outlet />
      </main>
    </div>
  );
}


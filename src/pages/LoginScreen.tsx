import { useState } from 'react';
import { signIn, signUp } from '../lib/api';
import MaterialIcon from '../components/MaterialIcon';

declare const __APP_VERSION__: string;
declare const __BUILD_VERSION__: string;

const isTestBuild = import.meta.env.VITE_SHOW_TEST_BADGE === 'true';

const getVersionString = () => {
  return `${__APP_VERSION__} ${__BUILD_VERSION__}`;
};

export default function LoginScreen() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  const validate = () => {
    if (!email.trim() || !password.trim()) {
      setError('Please enter email and password');
      return false;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return false;
    }
    if (mode === 'signup' && password !== confirmPassword) {
      setError('Passwords do not match');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    if (!validate()) return;

    setLoading(true);

    try {
      if (mode === 'signin') {
        await signIn(email.trim(), password, rememberMe);
      } else {
        await signUp(email.trim(), password, rememberMe);
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Connection error. Please try again.');
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-600 to-blue-800 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="bg-white rounded-3xl shadow-2xl p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <MaterialIcon name="person" className="text-[34px] text-blue-600" />
            </div>
            {isTestBuild ? (
              <div className="inline-flex items-center px-3 py-1 rounded-full bg-yellow-200 text-black text-xs font-bold tracking-[0.25em] mb-3">
                TEST v{getVersionString()}
              </div>
            ) : null}
            <h1 className="text-2xl font-bold text-gray-900">MacroMetric</h1>
            <p className="text-gray-500 mt-2">
              {isTestBuild ? 'Test environment' : mode === 'signin' ? 'Login to your account' : 'Create your account'}
            </p>
            <p className="text-gray-400 text-sm mt-1">
              {mode === 'signin' ? 'Login to your account' : 'Create your account'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email address"
              autoFocus
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none transition-colors"
            />

            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <MaterialIcon name={showPassword ? 'visibility_off' : 'visibility'} className="text-[22px]" />
              </button>
            </div>

            {mode === 'signup' && (
              <input
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm password"
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none transition-colors"
              />
            )}

            <label className="flex items-center gap-2 text-sm text-gray-600">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              Remember me
            </label>

            {error && (
              <div className="text-red-500 text-sm text-center bg-red-50 py-2 rounded-lg">
                {error}
              </div>
            )}

            {message && (
              <div className="text-green-600 text-sm text-center bg-green-50 py-2 rounded-lg">
                {message}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className={`w-full py-3 text-lg font-semibold rounded-xl transition-colors ${
                loading
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {loading ? 'Please wait...' : mode === 'signin' ? 'Login' : 'Create account'}
            </button>
          </form>

          <button
            onClick={() => {
              setMode(mode === 'signin' ? 'signup' : 'signin');
              setError('');
              setMessage('');
            }}
            className="w-full mt-3 text-sm text-blue-600 hover:text-blue-700"
          >
            {mode === 'signin' ? 'No account yet? Create one' : 'Already have an account? Login'}
          </button>

          <p className="text-xs text-gray-300 text-center mt-4">
            v{getVersionString()}
          </p>
        </div>
      </div>
    </div>
  );
}

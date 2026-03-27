import { useState } from 'react';
import { supabase } from '../lib/supabase';

const getVersionString = () => {
  return '2.0.001';
};

export default function LoginScreen({ onAuthenticated }: { onAuthenticated: () => void }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      setError('Please enter password');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { data, error: fetchError } = await supabase
        .from('app_settings')
        .select('app_password')
        .eq('id', 'main')
        .single();

      if (fetchError) {
        setError('Unable to verify password. Please try again.');
        setLoading(false);
        return;
      }

      if (data && data.app_password === password) {
        localStorage.setItem('macrometric_authenticated', 'true');
        onAuthenticated();
      } else {
        setError('Incorrect password. Please try again.');
        setPassword('');
      }
    } catch (err) {
      setError('Connection error. Please check your internet.');
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-600 to-blue-800 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="bg-white rounded-3xl shadow-2xl p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">🔐</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">MacroMetric</h1>
            <p className="text-gray-500 mt-2">Enter password to continue</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                autoFocus
                className="w-full px-4 py-4 text-lg border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none transition-colors text-center tracking-widest"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>

            {error && (
              <div className="text-red-500 text-sm text-center bg-red-50 py-2 rounded-lg">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className={`w-full py-4 text-lg font-semibold rounded-xl transition-colors ${
                loading
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {loading ? 'Verifying...' : 'Unlock'}
            </button>
          </form>

          <p className="text-xs text-gray-400 text-center mt-6">
            Protected by password authentication
          </p>
          <p className="text-xs text-gray-300 text-center mt-2">
            v{getVersionString()}
          </p>
        </div>
      </div>
    </div>
  );
}

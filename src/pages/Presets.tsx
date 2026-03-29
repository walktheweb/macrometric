import { useState, useEffect } from 'react';
import { getPresets, addLog, deletePreset, Preset } from '../lib/api';
import { useNavigate } from 'react-router-dom';
import { useAuth as useAuthContext } from '../contexts/AuthContext';
import MaterialIcon from '../components/MaterialIcon';

export default function Presets() {
  const navigate = useNavigate();
  const { userId, loading: authLoading } = useAuthContext();
  const [presets, setPresets] = useState<Preset[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userId) {
      loadPresets();
    }
  }, [userId]);

  const loadPresets = async () => {
    if (!userId) return;
    setLoading(true);
    const data = await getPresets(userId);
    setPresets(data);
    setLoading(false);
  };

  const handleQuickAdd = async (preset: Preset) => {
    if (!userId) return;
    await addLog(userId, preset);
    navigate('/');
  };

  const handleDelete = async (id: string) => {
    if (!userId) return;
    await deletePreset(userId, id);
    await loadPresets();
  };

  if (authLoading || loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-pulse text-gray-500 dark:text-gray-400">Loading presets...</div>
      </div>
    );
  }

  if (!userId) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-pulse text-gray-500 dark:text-gray-400">Connecting...</div>
      </div>
    );
  }

  if (presets.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="mb-4 flex justify-center"><MaterialIcon name="star" className="text-[48px] text-amber-400" /></div>
        <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-2">No Presets Yet</h2>
        <p className="text-gray-500 dark:text-gray-400 mb-6">
          Save your favorite foods as presets for quick logging.
        </p>
        <button
          onClick={() => navigate('/add')}
          className="px-6 py-3 bg-primary-500 text-white font-semibold rounded-xl hover:bg-primary-600 transition-colors"
        >
          Search Foods to Add
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Your Quick-Add Presets</h2>
      <p className="text-sm text-gray-500 dark:text-gray-400">Tap to instantly log to today's snack.</p>
      
      <div className="grid gap-3">
        {presets.map(preset => (
          <div
            key={preset.id}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden"
          >
            <button
              onClick={() => handleQuickAdd(preset)}
              className="w-full p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <div className="flex justify-between items-start">
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-900 dark:text-gray-100">{preset.name}</div>
                  {preset.brand && (
                    <div className="text-sm text-gray-500 dark:text-gray-400">{preset.brand}</div>
                  )}
                  <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">{preset.serving}</div>
                </div>
                <div className="text-right ml-4">
                  <div className="text-lg font-bold text-primary-600 dark:text-blue-400">
                    {Math.round(preset.calories)}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">kcal</div>
                </div>
              </div>
              <div className="flex gap-4 mt-2 text-sm">
                <span className="text-blue-500 dark:text-blue-400">F: {Math.round(preset.fat)}g</span>
                <span className="text-red-500 dark:text-red-400">P: {Math.round(preset.protein)}g</span>
                <span className="text-amber-500 dark:text-amber-400">C: {Math.round(preset.netCarbs && preset.netCarbs > 0 ? preset.netCarbs : preset.carbs)}g</span>
              </div>
            </button>
            <div className="px-4 pb-3 flex justify-end">
              <button
                onClick={() => handleDelete(preset.id)}
                className="text-xs text-gray-400 hover:text-red-500 transition-colors"
              >
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}


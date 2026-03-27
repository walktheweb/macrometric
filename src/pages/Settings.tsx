import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { getGoals, updateGoals, getRaceGoal, saveRaceGoal, getDaysUntilRace } from '../lib/api';

export default function Settings() {
  const { userId, loading: authLoading } = useAuth();
  const { theme, setTheme } = useTheme();
  const [calories, setCalories] = useState(1500);
  const [fatPct, setFatPct] = useState(75);
  const [proteinPct, setProteinPct] = useState(20);
  const [carbsPct, setCarbsPct] = useState(5);
  const [mode, setMode] = useState<'percent' | 'absolute'>('percent');
  const [fat, setFat] = useState(117);
  const [protein, setProtein] = useState(20);
  const [carbs, setCarbs] = useState(5);
  const [weight, setWeight] = useState(83);
  const [height, setHeight] = useState(169);
  const [targetBmi, setTargetBmi] = useState(24);
  const [bmiInput, setBmiInput] = useState('24');
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  
  const [raceDate, setRaceDate] = useState('2026-05-23');
  const [raceTargetWeight, setRaceTargetWeight] = useState(80);
  const [raceWeeklyTarget, setRaceWeeklyTarget] = useState(0.5);
  const [raceSaved, setRaceSaved] = useState(false);
  const [daysUntilRace, setDaysUntilRace] = useState(57);

  useEffect(() => {
    if (userId) {
      loadData();
    }
  }, [userId]);

  const loadData = async () => {
    if (!userId) return;
    setLoading(true);
    
    const [stored, raceGoalData] = await Promise.all([
      getGoals(userId),
      getRaceGoal(userId),
    ]);
    
    setCalories(stored.calories);
    setProtein(stored.protein);
    setCarbs(stored.carbs);
    setFat(stored.fat);
    setWeight(stored.weight || 83);
    setHeight(stored.height || 169);
    const bmi = stored.targetBmi || 24;
    setTargetBmi(bmi);
    setBmiInput(bmi.toString());
    
    const totalCals = (stored.protein * 4) + (stored.carbs * 4) + (stored.fat * 9);
    if (totalCals > 0) {
      setFatPct(Math.round((stored.fat * 9 / totalCals) * 100));
      setProteinPct(Math.round((stored.protein * 4 / totalCals) * 100));
      setCarbsPct(Math.round((stored.carbs * 4 / totalCals) * 100));
    }
    
    setRaceDate(raceGoalData.raceDate);
    setRaceTargetWeight(raceGoalData.targetWeight);
    setRaceWeeklyTarget(raceGoalData.weeklyTarget);
    setDaysUntilRace(await getDaysUntilRace(userId));
    setLoading(false);
  };

  useEffect(() => {
    if (mode === 'percent') {
      const f = Math.round((calories * (fatPct / 100)) / 9);
      const p = Math.round((calories * (proteinPct / 100)) / 4);
      const c = Math.round((calories * (carbsPct / 100)) / 4);
      setFat(f);
      setProtein(p);
      setCarbs(c);
    }
  }, [calories, fatPct, proteinPct, carbsPct, mode]);

  const calculateTargetWeight = () => {
    if (!height) return null;
    return Math.round(targetBmi * Math.pow(height / 100, 2) * 10) / 10;
  };

  const handleSave = async () => {
    if (!userId) return;
    await updateGoals(userId, { calories, protein, carbs, fat, weight, height, targetBmi });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleSaveRaceGoal = async () => {
    if (!userId) return;
    await saveRaceGoal(userId, {
      raceDate,
      targetWeight: raceTargetWeight,
      weeklyTarget: raceWeeklyTarget,
    });
    setRaceSaved(true);
    setTimeout(() => setRaceSaved(false), 2000);
  };

  const adjustPct = (type: 'fat' | 'protein' | 'carbs', delta: number) => {
    let currentVal: number;
    
    if (type === 'fat') {
      currentVal = fatPct;
    } else if (type === 'protein') {
      currentVal = proteinPct;
    } else {
      currentVal = carbsPct;
    }

    const newVal = Math.max(0, Math.min(100, currentVal + delta));
    
    if (type === 'fat') {
      const otherTotal = proteinPct + carbsPct;
      if (otherTotal + newVal > 100) {
        const excess = (otherTotal + newVal) - 100;
        setProteinPct(Math.max(0, Math.round(proteinPct - excess / 2)));
        setCarbsPct(Math.max(0, Math.round(carbsPct - excess / 2)));
      }
      setFatPct(newVal);
    } else if (type === 'protein') {
      const otherTotal = fatPct + carbsPct;
      if (otherTotal + newVal > 100) {
        const excess = (otherTotal + newVal) - 100;
        setFatPct(Math.max(0, Math.round(fatPct - excess / 2)));
        setCarbsPct(Math.max(0, Math.round(carbsPct - excess / 2)));
      }
      setProteinPct(newVal);
    } else {
      const otherTotal = fatPct + proteinPct;
      if (otherTotal + newVal > 100) {
        const excess = (otherTotal + newVal) - 100;
        setFatPct(Math.max(0, Math.round(fatPct - excess / 2)));
        setProteinPct(Math.max(0, Math.round(proteinPct - excess / 2)));
      }
      setCarbsPct(newVal);
    }
  };

  const targetWeight = calculateTargetWeight();

  if (authLoading || loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-pulse text-gray-500 dark:text-gray-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Theme Toggle */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-5">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">Appearance</h2>
        <div className="flex gap-2">
          {(['system', 'light', 'dark'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTheme(t)}
              className={`flex-1 py-2 rounded-lg font-medium transition-colors ${
                theme === t
                  ? 'bg-primary-500 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
              }`}
            >
              {t === 'system' ? '💻' : t === 'light' ? '☀️' : '🌙'} {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Race Goal */}
      <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl p-5 text-white">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-2xl">🚴</span>
          <div>
            <h2 className="font-semibold text-lg">Race Goal</h2>
            <p className="text-sm opacity-80">{daysUntilRace} days to go</p>
          </div>
        </div>
        
        <div className="bg-white/10 rounded-xl p-4 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm opacity-80 mb-1">Race Date</label>
              <input
                type="date"
                value={raceDate}
                onChange={(e) => setRaceDate(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-white/20 border border-white/30 text-white placeholder-white/50 focus:ring-2 focus:ring-white outline-none"
              />
            </div>
            <div>
              <label className="block text-sm opacity-80 mb-1">Target Weight</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step="0.1"
                  value={raceTargetWeight}
                  onChange={(e) => setRaceTargetWeight(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg bg-white/20 border border-white/30 text-white placeholder-white/50 focus:ring-2 focus:ring-white outline-none"
                />
                <span>kg</span>
              </div>
            </div>
          </div>
          
          <div>
            <label className="block text-sm opacity-80 mb-1">Weekly Weight Target</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                step="0.1"
                min="0.1"
                max="2"
                value={raceWeeklyTarget}
                onChange={(e) => setRaceWeeklyTarget(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg bg-white/20 border border-white/30 text-white placeholder-white/50 focus:ring-2 focus:ring-white outline-none"
              />
              <span>kg/week</span>
            </div>
            <p className="text-xs opacity-70 mt-1">Adjust as your progress changes</p>
          </div>
          
          <button
            onClick={handleSaveRaceGoal}
            className={`w-full py-2 rounded-lg font-semibold transition-colors ${
              raceSaved
                ? 'bg-green-400 text-white'
                : 'bg-white text-blue-600 hover:bg-white/90'
            }`}
          >
            {raceSaved ? '✓ Saved!' : 'Save Race Goal'}
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-5">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">Your Stats</h2>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Current Weight (kg)</label>
            <input
              type="number"
              value={weight}
              onChange={(e) => setWeight(Number(e.target.value))}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Height (cm)</label>
            <input
              type="number"
              value={height}
              onChange={(e) => setHeight(Number(e.target.value))}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none"
            />
          </div>
        </div>
        
        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Target BMI</label>
              <input
                type="text"
                inputMode="decimal"
                value={bmiInput}
                onChange={(e) => setBmiInput(e.target.value)}
                onBlur={(e) => {
                  const num = parseFloat(e.target.value);
                  if (!isNaN(num) && num >= 15 && num <= 40) {
                    const rounded = Math.round(num * 10) / 10;
                    setTargetBmi(rounded);
                    setBmiInput(rounded.toString());
                  } else {
                    setBmiInput(targetBmi.toString());
                  }
                }}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Target Weight</label>
              <div className="px-4 py-3 bg-white dark:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-600">
                <span className={`text-xl font-bold ${targetBmi < 18.5 ? 'text-blue-600' : targetBmi < 25 ? 'text-green-600' : targetBmi < 30 ? 'text-amber-500' : 'text-red-600'}`}>
                  {targetWeight || '—'}
                </span>
                <span className="text-sm text-gray-500 ml-1">kg</span>
              </div>
            </div>
          </div>
          {weight && targetWeight && (
            <div className="mt-3 text-center">
              <span className="text-sm text-gray-600 dark:text-gray-300">
                {weight > targetWeight ? 'To lose: ' : weight < targetWeight ? 'To gain: ' : 'At target!'}
                <span className={`font-semibold ${weight > targetWeight ? 'text-green-600' : weight < targetWeight ? 'text-red-600' : 'text-green-600'}`}>
                  {Math.abs(Math.round((weight - targetWeight) * 10) / 10)} kg
                </span>
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Daily Goals */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-5">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Daily Goals</h2>
          <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
            <button
              onClick={() => setMode('percent')}
              className={`px-3 py-1 text-sm rounded-md transition-colors ${mode === 'percent' ? 'bg-white dark:bg-gray-600 shadow text-primary-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-300'}`}
            >
              %
            </button>
            <button
              onClick={() => setMode('absolute')}
              className={`px-3 py-1 text-sm rounded-md transition-colors ${mode === 'absolute' ? 'bg-white dark:bg-gray-600 shadow text-primary-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-300'}`}
            >
              Grams
            </button>
          </div>
        </div>
        
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
            Daily Calories
          </label>
          <input
            type="number"
            value={calories}
            onChange={(e) => setCalories(Number(e.target.value))}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none text-lg"
          />
        </div>
        
        {mode === 'percent' ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium text-blue-600 dark:text-blue-400">Fat</span>
                  <span className="text-gray-500 dark:text-gray-400">{fat}g ({fatPct}%)</span>
                </div>
                <div className="h-4 bg-blue-100 dark:bg-blue-900/30 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 transition-all rounded-full" style={{ width: `${fatPct}%` }} />
                </div>
              </div>
              <div className="flex gap-1">
                <button onClick={() => adjustPct('fat', -1)} className="w-8 h-8 bg-gray-100 dark:bg-gray-700 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600">-</button>
                <button onClick={() => adjustPct('fat', 1)} className="w-8 h-8 bg-gray-100 dark:bg-gray-700 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600">+</button>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium text-red-600 dark:text-red-400">Protein</span>
                  <span className="text-gray-500 dark:text-gray-400">{protein}g ({proteinPct}%)</span>
                </div>
                <div className="h-4 bg-red-100 dark:bg-red-900/30 rounded-full overflow-hidden">
                  <div className="h-full bg-red-500 transition-all rounded-full" style={{ width: `${proteinPct}%` }} />
                </div>
              </div>
              <div className="flex gap-1">
                <button onClick={() => adjustPct('protein', -1)} className="w-8 h-8 bg-gray-100 dark:bg-gray-700 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600">-</button>
                <button onClick={() => adjustPct('protein', 1)} className="w-8 h-8 bg-gray-100 dark:bg-gray-700 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600">+</button>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium text-amber-600 dark:text-amber-400">Carbs</span>
                  <span className="text-gray-500 dark:text-gray-400">{carbs}g ({carbsPct}%)</span>
                </div>
                <div className="h-4 bg-amber-100 dark:bg-amber-900/30 rounded-full overflow-hidden">
                  <div className="h-full bg-amber-500 transition-all rounded-full" style={{ width: `${carbsPct}%` }} />
                </div>
              </div>
              <div className="flex gap-1">
                <button onClick={() => adjustPct('carbs', -1)} className="w-8 h-8 bg-gray-100 dark:bg-gray-700 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600">-</button>
                <button onClick={() => adjustPct('carbs', 1)} className="w-8 h-8 bg-gray-100 dark:bg-gray-700 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600">+</button>
              </div>
            </div>
            
            <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">Calculated from {calories} kcal:</div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="text-sm">
                  <div className="font-semibold text-blue-600 dark:text-blue-400">{fat}g fat</div>
                </div>
                <div className="text-sm">
                  <div className="font-semibold text-red-600 dark:text-red-400">{protein}g protein</div>
                </div>
                <div className="text-sm">
                  <div className="font-semibold text-amber-600 dark:text-amber-400">{carbs}g carbs</div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-blue-600 dark:text-blue-400 mb-1">Fat (g)</label>
              <input
                type="number"
                value={fat}
                onChange={(e) => setFat(Number(e.target.value))}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-red-600 dark:text-red-400 mb-1">Protein (g)</label>
              <input
                type="number"
                value={protein}
                onChange={(e) => setProtein(Number(e.target.value))}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-amber-600 dark:text-amber-400 mb-1">Carbs (g)</label>
              <input
                type="number"
                value={carbs}
                onChange={(e) => setCarbs(Number(e.target.value))}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500 outline-none"
              />
            </div>
          </div>
        )}
        
        <button
          onClick={handleSave}
          className={`w-full mt-6 py-3 font-semibold rounded-xl transition-colors ${
            saved
              ? 'bg-green-500 text-white'
              : 'bg-primary-500 text-white hover:bg-primary-600'
          }`}
        >
          {saved ? '✓ Saved!' : 'Save Goals'}
        </button>
      </div>

      <div className="text-center text-sm text-gray-400 dark:text-gray-500 pt-4">
        <p>MacroMetric v2.0.0</p>
        <p className="mt-1">Data synced to cloud</p>
      </div>
    </div>
  );
}

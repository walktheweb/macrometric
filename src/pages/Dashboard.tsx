import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getLogs, getGoals, deleteLog, updateLog, DayLog, Goal, FoodLog, getTodayCheckin, saveCheckin, getCheckins, getTrips, getRaceGoal, getDaysUntilRace, RaceGoal, getStepGoal, Checkin } from '../lib/api';
import RaceProgress from '../components/RaceProgress';
import TripWidget from '../components/TripWidget';

function MacroBar({ label, current, goal, color }: { label: string; current: number; goal: number; color: string }) {
  const percentage = Math.min((current / goal) * 100, 100);
  
  return (
    <div className="mb-3">
      <div className="flex justify-between text-sm mb-1">
        <span className="font-medium text-gray-700 dark:text-gray-200">{label}</span>
        <span className="text-gray-500 dark:text-gray-400">{Math.round(current)} / {goal}g</span>
      </div>
      <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div
          className={`h-full ${color} transition-all duration-500 rounded-full`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

function getBmiCategory(bmi: number) {
  if (bmi < 18.5) return { text: '<18.5', color: 'text-blue-500' };
  if (bmi < 25) return { text: '18.5-25', color: 'text-green-600' };
  if (bmi < 30) return { text: '25-30', color: 'text-amber-500' };
  return { text: '30-35', color: 'text-red-500' };
}

function getBmiPosition(bmi: number) {
  const minBmi = 15;
  const maxBmi = 35;
  return Math.max(0, Math.min(100, ((bmi - minBmi) / (maxBmi - minBmi)) * 100));
}

function getStepsPosition(steps: number, goal: number) {
  return Math.min(100, (steps / goal) * 100);
}

export default function Dashboard() {
  const { userId, loading: authLoading } = useAuth();
  const [logs, setLogs] = useState<DayLog | null>(null);
  const [goals, setGoals] = useState<Goal | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingLog, setEditingLog] = useState<FoodLog | null>(null);
  const [editQuantity, setEditQuantity] = useState(1);
  const [editQuantityInput, setEditQuantityInput] = useState('1');
  const [editQuantityType, setEditQuantityType] = useState<'number' | 'grams'>('number');
  const [showCheckin, setShowCheckin] = useState(false);
  const [editingCheckin, setEditingCheckin] = useState<Checkin | null>(null);
  const [todayCheckins, setTodayCheckins] = useState<Checkin[]>([]);
  const [checkins, setCheckins] = useState<Checkin[]>([]);
  const [trips, setTrips] = useState<any[]>([]);
  const [raceGoal, setRaceGoal] = useState<RaceGoal>({ eventName: '', raceDate: '2026-05-23', targetWeight: 80, weeklyTarget: 0.5 });
  const [daysUntil, setDaysUntil] = useState(57);
  const [weeksUntil, setWeeksUntil] = useState(8);
  const [stepGoal, setStepGoal] = useState(10000);
  const [lastWeightCheckin, setLastWeightCheckin] = useState<Checkin | null>(null);
  
  const now = new Date();
  const today = now.toISOString().split('T')[0];
  const timeString = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  
  const [checkinData, setCheckinData] = useState({
    id: '',
    date: today,
    checkinTime: timeString,
    weight: '',
    steps: '',
    ketones: '',
    glucose: '',
    heartRate: '',
    bpHigh: '',
    bpLow: '',
    saturation: '',
    cholesterol: '',
    ferritin: '',
    notes: '',
  });

  useEffect(() => {
    if (userId) {
      loadData();
    }
  }, [userId]);

  useEffect(() => {
    const handleTodayNav = () => {
      setEditingLog(null);
      setShowCheckin(false);
      setEditingCheckin(null);
    };

    window.addEventListener('macrometric:today-nav', handleTodayNav);
    return () => {
      window.removeEventListener('macrometric:today-nav', handleTodayNav);
    };
  }, []);

  useEffect(() => {
    if (editingLog || showCheckin) {
      window.dispatchEvent(new Event('macrometric:focus-first-input'));
    }
  }, [editingLog, showCheckin]);

  const loadData = async () => {
    if (!userId) return;
    
    setLoading(true);
    const [logsData, goalsData, checkinsData, tripsData, todayData, raceGoalData, stepGoalData] = await Promise.all([
      getLogs(userId),
      getGoals(userId),
      getCheckins(userId),
      getTrips(userId),
      getTodayCheckin(userId),
      getRaceGoal(userId),
      getStepGoal(userId),
    ]);
    
    setLogs(logsData);
    setGoals(goalsData);
    setCheckins(checkinsData);
    setTrips(tripsData);
    setTodayCheckins(todayData ? [todayData] : []);
    setRaceGoal(raceGoalData);
    setStepGoal(stepGoalData);
    setDaysUntil(await getDaysUntilRace(userId));
    setWeeksUntil(await getDaysUntilRace(userId) / 7);
    
    // Get last known weight for BMI
    const weightCheckin = checkinsData?.find(c => c.weight);
    setLastWeightCheckin(weightCheckin || null);
    
    if (todayData) {
      setCheckinData({
        id: todayData.id || '',
        date: todayData.date,
        checkinTime: todayData.checkinTime || timeString,
        weight: todayData.weight?.toString() || '',
        steps: todayData.steps?.toString() || '',
        ketones: todayData.ketones?.toString() || '',
        glucose: todayData.glucose?.toString() || '',
        heartRate: todayData.heartRate?.toString() || '',
        bpHigh: todayData.bpHigh?.toString() || '',
        bpLow: todayData.bpLow?.toString() || '',
        saturation: todayData.saturation?.toString() || '',
        cholesterol: todayData.cholesterol?.toString() || '',
        ferritin: todayData.ferritin?.toString() || '',
        notes: todayData.notes || '',
      });
    } else {
      // Reset to default
      setCheckinData({
        id: '',
        date: today,
        checkinTime: timeString,
        weight: '',
        steps: '',
        ketones: '',
        glucose: '',
        heartRate: '',
        bpHigh: '',
        bpLow: '',
        saturation: '',
        cholesterol: '',
        ferritin: '',
        notes: '',
      });
    }
    
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    if (!userId) return;
    await deleteLog(userId, id);
    loadData();
  };

  const openEdit = (log: FoodLog) => {
    setEditingLog(log);
    setEditQuantity(log.quantity || 1);
    setEditQuantityInput((log.quantity || 1).toString());
    setEditQuantityType('grams');
  };

  const saveEdit = async () => {
    if (!editingLog || !userId) return;

    const parsed = Number(editQuantityInput);
    const safeQuantity = Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
    const quantityToSave = editQuantityType === 'grams' ? safeQuantity : Math.max(1, Math.floor(safeQuantity));
    
    const baseMacros = editingLog.baseMacros || {
      calories: editingLog.calories / (editingLog.quantity || 1),
      protein: editingLog.protein / (editingLog.quantity || 1),
      carbs: editingLog.carbs / (editingLog.quantity || 1),
      fat: editingLog.fat / (editingLog.quantity || 1),
    };
    
    let multiplier = quantityToSave;
    if (editQuantityType === 'grams') {
      multiplier = quantityToSave / 100;
    }
    
    const updatedLog = {
      ...editingLog,
      quantity: quantityToSave,
      baseMacros,
      calories: Math.round(baseMacros.calories * multiplier * 10) / 10,
      protein: Math.round(baseMacros.protein * multiplier * 10) / 10,
      carbs: Math.round(baseMacros.carbs * multiplier * 10) / 10,
      fat: Math.round(baseMacros.fat * multiplier * 10) / 10,
      serving: editQuantityType === 'grams' ? `${quantityToSave}g` : `${quantityToSave}`,
    };
    
    setEditQuantity(quantityToSave);
    setEditQuantityInput(quantityToSave.toString());
    await updateLog(userId, editingLog.id, updatedLog);
    setEditingLog(null);
    loadData();
  };

  const handleSaveCheckin = async () => {
    if (!userId) return;
    
    // Check if at least one field is filled
    const hasData = checkinData.weight || checkinData.steps || checkinData.ketones || 
                    checkinData.glucose || checkinData.heartRate || checkinData.bpHigh || 
                    checkinData.bpLow || checkinData.notes;
    
    if (!hasData) {
      alert('Please enter at least one value');
      return;
    }
    
    await saveCheckin(userId, {
      id: checkinData.id || undefined,
      date: checkinData.date,
      checkinTime: checkinData.checkinTime || undefined,
      weight: checkinData.weight ? Number(checkinData.weight) : undefined,
      steps: checkinData.steps ? Math.round(Number(checkinData.steps)) : undefined,
      ketones: checkinData.ketones ? Number(checkinData.ketones) : undefined,
      glucose: checkinData.glucose ? Number(checkinData.glucose) : undefined,
      heartRate: checkinData.heartRate ? Number(checkinData.heartRate) : undefined,
      bpHigh: checkinData.bpHigh ? Number(checkinData.bpHigh) : undefined,
      bpLow: checkinData.bpLow ? Number(checkinData.bpLow) : undefined,
      saturation: checkinData.saturation ? Number(checkinData.saturation) : undefined,
      cholesterol: checkinData.cholesterol ? Number(checkinData.cholesterol) : undefined,
      ferritin: checkinData.ferritin ? Number(checkinData.ferritin) : undefined,
      notes: checkinData.notes || undefined,
    });
    setShowCheckin(false);
    setEditingCheckin(null);
    loadData();
  };

  if (authLoading || loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-pulse text-gray-500 dark:text-gray-400">Loading...</div>
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

  const goalsData = goals || { calories: 1500, protein: 20, carbs: 5, fat: 75, weight: 83, height: 169 };
  const totals = logs?.totals || { calories: 0, protein: 0, carbs: 0, fat: 0 };

  const dateObj = new Date();
  const dateStr = `${String(dateObj.getDate()).padStart(2, '0')}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${dateObj.getFullYear()}`;

  // Calculate BMI from last known weight
  const bmiFromLastWeight = lastWeightCheckin?.weight && goalsData.height 
    ? Math.round((lastWeightCheckin.weight / Math.pow(goalsData.height / 100, 2)) * 10) / 10
    : null;

  // Get today's steps (aggregate from all check-ins today)
  const todaySteps = todayCheckins.reduce((sum, c) => sum + (c.steps || 0), 0);

  if (editingLog) {
    const baseMacros = editingLog.baseMacros || {
      calories: editingLog.calories / (editingLog.quantity || 1),
      protein: editingLog.protein / (editingLog.quantity || 1),
      carbs: editingLog.carbs / (editingLog.quantity || 1),
      fat: editingLog.fat / (editingLog.quantity || 1),
    };
    const parsedPreview = Number(editQuantityInput);
    const previewQuantity = Number.isFinite(parsedPreview) && parsedPreview > 0
      ? (editQuantityType === 'grams' ? parsedPreview : Math.max(1, Math.floor(parsedPreview)))
      : editQuantity;
    const multiplier = editQuantityType === 'grams' ? previewQuantity / 100 : previewQuantity;
    const calcCals = Math.round(baseMacros.calories * multiplier);
    const calcProtein = Math.round(baseMacros.protein * multiplier);
    const calcCarbs = Math.round(baseMacros.carbs * multiplier);
    const calcFat = Math.round(baseMacros.fat * multiplier);

    return (
      <div className="space-y-4">
        <button
          onClick={() => setEditingLog(null)}
          className="text-primary-600 dark:text-blue-400 font-medium flex items-center gap-1"
        >
          Back
        </button>
        
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-5">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-1">{editingLog.name}</h2>
          <p className="text-gray-500 dark:text-gray-400 mb-4">Tap to adjust amount</p>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">Amount</label>
            <div className="flex gap-2 mb-3">
              <button
                onClick={() => setEditQuantityType('number')}
                className={`flex-1 py-2 rounded-lg font-medium transition-colors ${
                  editQuantityType === 'number'
                    ? 'bg-primary-500 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                }`}
              >
                Number
              </button>
              <button
                onClick={() => setEditQuantityType('grams')}
                className={`flex-1 py-2 rounded-lg font-medium transition-colors ${
                  editQuantityType === 'grams'
                    ? 'bg-primary-500 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                }`}
              >
                Grams
              </button>
            </div>
            
            <div className="flex items-center gap-2">
              <input
                type="number"
                autoFocus
                value={editQuantityInput}
                onChange={(e) => setEditQuantityInput(e.target.value)}
                onBlur={() => {
                  const parsed = Number(editQuantityInput);
                  const safe = Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
                  const normalized = editQuantityType === 'grams' ? safe : Math.max(1, Math.floor(safe));
                  setEditQuantity(normalized);
                  setEditQuantityInput(normalized.toString());
                }}
                min={1}
                step={editQuantityType === 'grams' ? 10 : 1}
                className="flex-1 px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none text-lg text-center"
              />
              <span className="text-gray-500 dark:text-gray-400 w-16">
                {editQuantityType === 'grams' ? 'g' : 'x'}
              </span>
            </div>
          </div>
          
          <div className="grid grid-cols-4 gap-3 mb-6">
            <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-xl">
              <div className="text-lg font-bold text-gray-900 dark:text-white">{calcCals}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">kcal</div>
            </div>
            <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/30 rounded-xl">
              <div className="text-lg font-bold text-blue-600 dark:text-blue-400">{calcFat}g</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Fat</div>
            </div>
            <div className="text-center p-3 bg-red-50 dark:bg-red-900/30 rounded-xl">
              <div className="text-lg font-bold text-red-600 dark:text-red-400">{calcProtein}g</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Protein</div>
            </div>
            <div className="text-center p-3 bg-amber-50 dark:bg-amber-900/30 rounded-xl">
              <div className="text-lg font-bold text-amber-600 dark:text-amber-400">{calcCarbs}g</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Carbs</div>
            </div>
          </div>
          
          <div className="flex gap-3">
            <button
              onClick={() => {
                handleDelete(editingLog.id);
                setEditingLog(null);
              }}
              className="flex-1 py-3 bg-red-500 text-white font-semibold rounded-xl hover:bg-red-600 transition-colors"
            >
              Delete
            </button>
            <button
              onClick={saveEdit}
              className="flex-1 py-3 bg-primary-500 text-white font-semibold rounded-xl hover:bg-primary-600 transition-colors"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (showCheckin) {
    return (
      <div className="space-y-4">
        <button
          onClick={() => { setShowCheckin(false); setEditingCheckin(null); }}
          className="text-primary-600 dark:text-blue-400 font-medium flex items-center gap-1"
        >
          Back
        </button>
        
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-5">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-1">
            {editingCheckin ? 'Edit Check-in' : 'Daily Check-in'}
          </h2>
          <p className="text-gray-500 dark:text-gray-400 mb-4">{dateStr}</p>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Date</label>
                <input
                  type="date"
                  value={checkinData.date}
                  onChange={(e) => setCheckinData({...checkinData, date: e.target.value})}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Time</label>
                <input
                  type="time"
                  value={checkinData.checkinTime}
                  onChange={(e) => setCheckinData({...checkinData, checkinTime: e.target.value})}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Steps</label>
              <input
                type="number"
                autoFocus
                value={checkinData.steps}
                onChange={(e) => setCheckinData({...checkinData, steps: e.target.value})}
                placeholder="5000"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Weight (kg)</label>
              <input
                type="number"
                value={checkinData.weight}
                onChange={(e) => setCheckinData({...checkinData, weight: e.target.value})}
                placeholder="83.5"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Ketones (mmol/L)</label>
                <input
                  type="number"
                  value={checkinData.ketones}
                  onChange={(e) => setCheckinData({...checkinData, ketones: e.target.value})}
                  placeholder="1.5"
                  step="0.1"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Glucose (mg/dL)</label>
                <input
                  type="number"
                  value={checkinData.glucose}
                  onChange={(e) => setCheckinData({...checkinData, glucose: e.target.value})}
                  placeholder="95"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Heart Rate (bpm)</label>
              <input
                type="number"
                value={checkinData.heartRate}
                onChange={(e) => setCheckinData({...checkinData, heartRate: e.target.value})}
                placeholder="72"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">BP Low (mmHg)</label>
                <input
                  type="number"
                  value={checkinData.bpLow}
                  onChange={(e) => setCheckinData({...checkinData, bpLow: e.target.value})}
                  placeholder="80"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">BP High (mmHg)</label>
                <input
                  type="number"
                  value={checkinData.bpHigh}
                  onChange={(e) => setCheckinData({...checkinData, bpHigh: e.target.value})}
                  placeholder="120"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none"
                />
              </div>
            </div>

            <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-2">
              <h3 className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-3">Bloodwork</h3>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Saturation (%)</label>
                  <input
                    type="number"
                    value={checkinData.saturation}
                    onChange={(e) => setCheckinData({...checkinData, saturation: e.target.value})}
                    placeholder="95"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Cholesterol</label>
                  <input
                    type="number"
                    value={checkinData.cholesterol}
                    onChange={(e) => setCheckinData({...checkinData, cholesterol: e.target.value})}
                    placeholder="180"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Ferritin</label>
                  <input
                    type="number"
                    value={checkinData.ferritin}
                    onChange={(e) => setCheckinData({...checkinData, ferritin: e.target.value})}
                    placeholder="100"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Notes</label>
              <textarea
                value={checkinData.notes}
                onChange={(e) => setCheckinData({...checkinData, notes: e.target.value})}
                placeholder="Add notes..."
                rows={2}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none"
              />
            </div>
          </div>
          
          <button
            onClick={handleSaveCheckin}
            className="w-full mt-6 py-3 bg-primary-500 text-white font-semibold rounded-xl hover:bg-primary-600 transition-colors"
          >
            Save Check-in
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* BMI Card - from last known weight */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-5">
        <div className="flex justify-between items-center mb-2">
          <span className="text-lg font-semibold text-gray-800 dark:text-gray-100">BMI</span>
          {lastWeightCheckin && lastWeightCheckin.date && (
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {lastWeightCheckin.weight}kg ({new Date(lastWeightCheckin.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })})
            </span>
          )}
        </div>
        {bmiFromLastWeight ? (
          <div className="mb-2">
            <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
              <span>15</span>
              <span>18.5</span>
              <span>25</span>
              <span>30</span>
              <span>35</span>
            </div>
            <div className="relative h-4 rounded-full overflow-hidden" style={{ background: 'linear-gradient(to right, #93c5fd 0%, #93c5fd 17.5%, #86efac 17.5%, #86efac 50%, #fbbf24 50%, #fbbf24 75%, #ef4444 75%, #ef4444 100%)' }}>
              <div 
                className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white border-2 border-gray-500 rounded-full shadow transition-all"
                style={{ left: `${getBmiPosition(bmiFromLastWeight)}%`, transform: 'translate(-50%, -50%)' }}
              />
              <div className="text-xs text-center font-bold text-gray-800 dark:text-white absolute" style={{ left: `${getBmiPosition(bmiFromLastWeight)}%`, transform: 'translateX(-50%)', top: '18px' }}>
                {bmiFromLastWeight}
              </div>
            </div>
          </div>
        ) : (
          <div className="mb-2">
            <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
              <span>15</span>
              <span>18.5</span>
              <span>25</span>
              <span>30</span>
              <span>35</span>
            </div>
            <div className="relative h-4 rounded-full overflow-hidden" style={{ background: 'linear-gradient(to right, #93c5fd 0%, #93c5fd 17.5%, #86efac 17.5%, #86efac 50%, #fbbf24 50%, #fbbf24 75%, #ef4444 75%, #ef4444 100%)' }}>
              <div 
                className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white border-2 border-gray-500 rounded-full shadow"
                style={{ left: '100%', transform: 'translate(-50%, -50%)' }}
              />
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 text-center">Check-in first</p>
          </div>
        )}
        {bmiFromLastWeight && (
          <div className="text-center">
            <span className={`text-sm font-medium ${getBmiCategory(bmiFromLastWeight).color}`}>
              {getBmiCategory(bmiFromLastWeight).text}
            </span>
          </div>
        )}
      </div>

      {/* Steps Card */}
      <div className="bg-green-50 dark:bg-green-900/20 rounded-2xl shadow-sm p-5 border border-green-100 dark:border-green-800">
        <div className="flex justify-between items-center mb-2">
          <span className="text-lg font-semibold text-green-800 dark:text-green-200">Steps</span>
          <span className="text-lg font-bold text-green-600 dark:text-green-400">
            {todaySteps > 0 ? todaySteps.toLocaleString() : '--'}
            <span className="text-sm font-normal text-gray-500 dark:text-gray-400"> / {stepGoal.toLocaleString()}</span>
          </span>
        </div>
        <div className="h-4 bg-green-200 dark:bg-green-800/50 rounded-full overflow-hidden">
          <div
            className="h-full bg-green-500 transition-all duration-500 rounded-full"
            style={{ width: `${getStepsPosition(todaySteps, stepGoal)}%` }}
          />
        </div>
        <div className="flex justify-between items-center mt-2">
          <span className="text-sm text-green-700 dark:text-green-300">
            {todaySteps > 0 ? Math.round((todaySteps / stepGoal) * 100) : 0}%
          </span>
          <button 
            onClick={() => setShowCheckin(true)}
            className="text-sm text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-200"
          >
            {todaySteps > 0 ? 'Edit' : 'Add steps'}
          </button>
        </div>
      </div>

      <RaceProgress checkins={checkins} raceGoal={raceGoal} daysUntil={daysUntil} weeksUntil={weeksUntil} />
      <TripWidget trips={trips} userId={userId} onRefresh={loadData} />

      {/* Daily Progress Card */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-5">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Daily Progress</h2>
          <span className="text-2xl font-bold text-primary-600 dark:text-blue-400">
            {Math.round(totals.calories)}
            <span className="text-sm font-normal text-gray-400 dark:text-gray-500"> / {goalsData.calories}</span>
          </span>
        </div>
        
        <MacroBar label="Fat" current={totals.fat} goal={goalsData.fat} color="bg-blue-500" />
        <MacroBar label="Protein" current={totals.protein} goal={goalsData.protein} color="bg-red-500" />
        <MacroBar label="Carbs" current={totals.carbs} goal={goalsData.carbs} color="bg-amber-500" />
      </div>

      {todayCheckins.length > 0 && (
        <div className="bg-purple-50 dark:bg-purple-900/20 rounded-2xl shadow-sm p-4 border border-purple-100 dark:border-purple-800">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-purple-700 dark:text-purple-300">Today's Check-in</span>
            <button 
              onClick={() => setShowCheckin(true)}
              className="text-xs text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-200"
            >
              Edit
            </button>
          </div>
          <div className="grid grid-cols-4 gap-2 text-xs">
            {todayCheckins[0]?.weight && <div className="text-center"><span className="font-semibold">{todayCheckins[0].weight}</span> kg</div>}
            {todayCheckins[0]?.ketones && <div className="text-center"><span className="font-semibold">{todayCheckins[0].ketones}</span> ketones</div>}
            {todayCheckins[0]?.glucose && <div className="text-center"><span className="font-semibold">{todayCheckins[0].glucose}</span> glucose</div>}
            {todayCheckins[0]?.heartRate && <div className="text-center"><span className="font-semibold">{todayCheckins[0].heartRate}</span> HR</div>}
            {todayCheckins[0]?.bpHigh && todayCheckins[0]?.bpLow && (
              <div className="text-center"><span className="font-semibold">{todayCheckins[0].bpHigh}/{todayCheckins[0].bpLow}</span> BP</div>
            )}
            {todayCheckins[0]?.saturation && <div className="text-center"><span className="font-semibold">{todayCheckins[0].saturation}</span> sat%</div>}
            {todayCheckins[0]?.cholesterol && <div className="text-center"><span className="font-semibold">{todayCheckins[0].cholesterol}</span> chol</div>}
            {todayCheckins[0]?.ferritin && <div className="text-center"><span className="font-semibold">{todayCheckins[0].ferritin}</span> ferr</div>}
          </div>
        </div>
      )}

      <div className="flex gap-3">
        <Link
          to="/add"
          className="flex-1 py-3 bg-primary-500 text-white font-semibold rounded-xl text-center shadow-sm hover:bg-primary-600 transition-colors"
        >
          + Add Food
        </Link>
        <button
          onClick={() => setShowCheckin(true)}
          className="flex-1 py-3 bg-purple-500 text-white font-semibold rounded-xl shadow-sm hover:bg-purple-600 transition-colors"
        >
          Check-in
        </button>
        <Link
          to="/presets"
          className="flex-1 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 font-semibold rounded-xl text-center hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
        >
          Quick Add
        </Link>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
        <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700 border-b border-gray-100 dark:border-gray-600">
          <span className="font-medium text-gray-700 dark:text-gray-200">Today's Foods</span>
          <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">
            ({logs?.logs.length || 0} items)
          </span>
        </div>
        
        {(!logs || logs.logs.length === 0) ? (
          <div className="px-4 py-8 text-center text-gray-400 dark:text-gray-500">
            No foods logged yet. Tap "+ Add Food" to start tracking!
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {logs.logs.map(log => (
              <button
                key={log.id}
                onClick={() => openEdit(log)}
                className="w-full px-4 py-3 flex items-center hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <div className="flex-1 min-w-0 text-left">
                  <div className="font-medium text-gray-900 dark:text-gray-100 truncate">{log.name}</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    {log.brand && <span className="mr-2">{log.brand}</span>}
                    {log.serving}
                  </div>
                </div>
                <div className="text-right ml-4">
                  <div className="font-medium text-gray-900 dark:text-gray-100">{Math.round(log.calories)}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">kcal</div>
                </div>
                <div className="flex gap-2 ml-4 text-xs">
                  <span className="text-blue-500 dark:text-blue-400">F:{Math.round(log.fat)}</span>
                  <span className="text-red-500 dark:text-red-400">P:{Math.round(log.protein)}</span>
                  <span className="text-amber-500 dark:text-amber-400">C:{Math.round(log.netCarbs && log.netCarbs > 0 ? log.netCarbs : log.carbs)}</span>
                </div>
                <div className="ml-3 p-2 text-primary-500 dark:text-blue-400">
                  ✏️
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

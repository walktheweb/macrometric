import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getLogs, getGoals, deleteLog, updateLog, DayLog, Goal, FoodLog, getTodayCheckin, saveCheckin, getCheckins, getTrips, getRaceGoal, getDaysUntilRace, RaceGoal, getStepGoal, Checkin, getToday, deleteCheckin, getCheckinsForDate } from '../lib/api';
import { formatDateDDMMYYYY } from '../lib/date';
import RaceProgress from '../components/RaceProgress';
import TripWidget from '../components/TripWidget';
import MaterialIcon from '../components/MaterialIcon';

function MacroBar({
  label,
  current,
  goal,
  color,
  splitPercent,
}: {
  label: string;
  current: number;
  goal: number;
  color: string;
  splitPercent?: number;
}) {
  const rawPercentage = goal > 0 ? (current / goal) * 100 : 0;
  const percentage = Math.min(rawPercentage, 100);
  const displayPct = Math.min(Math.round(rawPercentage), 100);
  const percentText = typeof splitPercent === 'number' ? splitPercent : displayPct;
  
  return (
    <div className="mb-3">
      <div className="flex justify-between text-sm mb-1">
        <span className="font-medium text-gray-700 dark:text-gray-200">{label}</span>
        <span className="text-gray-500 dark:text-gray-400">
          {Math.round(current)} / {goal}g ({percentText}%)
        </span>
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

function getToneClass(tone: 'green' | 'amber' | 'orange' | 'red' | 'critical') {
  if (tone === 'green') return 'text-green-600 dark:text-green-400';
  if (tone === 'amber') return 'text-amber-600 dark:text-amber-400';
  if (tone === 'orange') return 'text-orange-600 dark:text-orange-400';
  if (tone === 'critical') return 'text-red-700 dark:text-red-300';
  return 'text-red-600 dark:text-red-400';
}

function getWeightTone(weight: number) {
  if (weight <= 78) return getToneClass('green');
  if (weight <= 81) return getToneClass('amber');
  return getToneClass('red');
}

function getBpTone(sys: number, dia: number) {
  if (sys > 180 || dia > 120) return getToneClass('critical');
  if (sys >= 140 || dia >= 90) return getToneClass('red');
  if ((sys >= 130 && sys <= 139) || (dia >= 80 && dia <= 89)) return getToneClass('orange');
  if (sys >= 120 && sys <= 129 && dia < 80) return getToneClass('amber');
  if (sys < 120 && dia < 80) return getToneClass('green');
  return getToneClass('amber');
}

function getGlucoseMmolTone(glucose: number) {
  // mmol/L thresholds converted from 70, 80, 130, 180, 250 mg/dL.
  if (glucose < 3.9) return getToneClass('red');
  if (glucose < 4.4) return getToneClass('amber');
  if (glucose <= 7.2) return getToneClass('green');
  if (glucose <= 10) return getToneClass('amber');
  if (glucose <= 13.9) return getToneClass('red');
  return getToneClass('critical');
}

function getKetonesTone(ketones: number) {
  if (ketones < 0.5) return getToneClass('red');
  if (ketones < 1) return getToneClass('amber');
  if (ketones <= 5) return getToneClass('green');
  return getToneClass('critical');
}

function getHeartRateTone(heartRate: number) {
  if (heartRate < 43) return getToneClass('red');
  if (heartRate <= 140) return getToneClass('green');
  return getToneClass('red');
}

function getFerritinTone(ferritin: number) {
  if (ferritin < 250) return getToneClass('green');
  if (ferritin <= 400) return getToneClass('orange');
  return getToneClass('red');
}

function getStepsTone(steps: number) {
  if (steps < 5000) return getToneClass('red');
  if (steps < 7000) return getToneClass('orange');
  if (steps < 9000) return getToneClass('amber');
  return getToneClass('green');
}

function getElapsedFromDate(date: string) {
  const then = new Date(`${date}T00:00:00`);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diffMs = today.getTime() - then.getTime();
  const daysAgo = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
  const weeksAgo = Math.floor(daysAgo / 7);
  const monthsAgo = Math.floor(daysAgo / 30);
  return { daysAgo, weeksAgo, monthsAgo };
}

function splitServingDisplay(serving?: string | null) {
  const raw = (serving || '').trim();
  if (!raw) return { value: '-', unit: '' };
  const match = raw.match(/^([0-9]+(?:[.,][0-9]+)?)(.*)$/);
  if (!match) return { value: raw, unit: '' };
  const value = match[1];
  const unit = (match[2] || '').trim() || 'x';
  return { value, unit };
}

function formatCheckinTime(time?: string | null) {
  if (!time) return '';
  const parts = time.split(':');
  if (parts.length < 2) return time;
  return `${parts[0]}:${parts[1]}`;
}

function isSameClockTime(time?: string | null, target?: string | null) {
  return formatCheckinTime(time) === formatCheckinTime(target);
}

const DEFAULT_FAST_START_TIME = '20:00';
const DEFAULT_FIRST_MEAL_TIME = '12:00';

function getFastingHours(fastStartTime?: string | null, firstMealTime?: string | null) {
  if (!fastStartTime || !firstMealTime) return null;
  const [startHour, startMinute] = fastStartTime.split(':').map(Number);
  const [mealHour, mealMinute] = firstMealTime.split(':').map(Number);
  if ([startHour, startMinute, mealHour, mealMinute].some((value) => !Number.isFinite(value))) return null;
  let startTotal = startHour * 60 + startMinute;
  let mealTotal = mealHour * 60 + mealMinute;
  if (mealTotal <= startTotal) {
    mealTotal += 24 * 60;
  }
  return Math.round(((mealTotal - startTotal) / 60) * 10) / 10;
}

function getElapsedFastingHours(fastStartTime?: string | null, now = new Date()) {
  if (!fastStartTime) return 0;
  const [startHour, startMinute] = fastStartTime.split(':').map(Number);
  if ([startHour, startMinute].some((value) => !Number.isFinite(value))) return 0;
  const startTotal = startHour * 60 + startMinute;
  let currentTotal = now.getHours() * 60 + now.getMinutes();
  if (currentTotal < startTotal) {
    currentTotal += 24 * 60;
  }
  return Math.max(0, Math.round(((currentTotal - startTotal) / 60) * 10) / 10);
}

function getFastingProgressPercent(targetHours: number, fastStartTime?: string | null, firstMealTime?: string | null) {
  const actualHours = getFastingHours(fastStartTime, firstMealTime);
  const elapsedHours = actualHours ?? getElapsedFastingHours(fastStartTime);
  return Math.max(0, Math.min(100, Math.round((elapsedHours / targetHours) * 100)));
}

function ExplodedPieIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5" aria-hidden="true">
      <path
        d="M12 12 L6.4 15.8 A8.6 8.6 0 1 0 12 3.4 Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M11.9 7.9 L11.9 2.6 L8.0 4.2 Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M9.8 11.2 L4.7 14.4 L3.1 10.3 L7.3 7.1 Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
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
  const [fastingTargetHours, setFastingTargetHours] = useState(16);
  const [isFastingCollapsed, setIsFastingCollapsed] = useState(true);
  
  const getCurrentTimeString = () => {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  };
  const [currentDay, setCurrentDay] = useState(getToday());
  
  const [checkinData, setCheckinData] = useState({
    id: '',
    date: getToday(),
    checkinTime: getCurrentTimeString(),
    weight: '',
    fastStartTime: DEFAULT_FAST_START_TIME,
    firstMealTime: DEFAULT_FIRST_MEAL_TIME,
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
  const editCheckinId = searchParams.get('editCheckin');
  const openCheckinParam = searchParams.get('openCheckin');
  const fromHistory = searchParams.get('from') === 'history';

  const toCheckinFormData = (item: Checkin) => ({
    id: item.id || '',
    date: item.date,
    checkinTime: item.checkinTime || getCurrentTimeString(),
    weight: item.weight?.toString() || '',
    fastStartTime: item.fastStartTime || DEFAULT_FAST_START_TIME,
    firstMealTime: item.firstMealTime || DEFAULT_FIRST_MEAL_TIME,
    steps: item.steps?.toString() || '',
    ketones: item.ketones?.toString() || '',
    glucose: item.glucose?.toString() || '',
    heartRate: item.heartRate?.toString() || '',
    bpHigh: item.bpHigh?.toString() || '',
    bpLow: item.bpLow?.toString() || '',
    saturation: item.saturation?.toString() || '',
    cholesterol: item.cholesterol?.toString() || '',
    ferritin: item.ferritin?.toString() || '',
    notes: item.notes || '',
  });

  const clearEditCheckinParam = () => {
    if (!searchParams.get('editCheckin')) return;
    const next = new URLSearchParams(searchParams);
    next.delete('editCheckin');
    setSearchParams(next, { replace: true });
  };

  const clearOpenCheckinParam = () => {
    if (!searchParams.get('openCheckin')) return;
    const next = new URLSearchParams(searchParams);
    next.delete('openCheckin');
    setSearchParams(next, { replace: true });
  };

  const handleCloseCheckinEditor = () => {
    const shouldReturnToHistory = fromHistory && !!editingCheckin;
    setShowCheckin(false);
    setEditingCheckin(null);
    clearEditCheckinParam();
    if (shouldReturnToHistory) {
      navigate('/history?tab=checkin');
    }
  };

  useEffect(() => {
    if (userId) {
      loadData();
    }
  }, [userId]);

  useEffect(() => {
    const storedTarget = localStorage.getItem('macrometric_fasting_target_hours');
    if (!storedTarget) return;
    const parsed = Number(storedTarget);
    if (Number.isFinite(parsed) && parsed > 0) {
      setFastingTargetHours(parsed);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('macrometric_fasting_target_hours', String(fastingTargetHours));
  }, [fastingTargetHours]);


  useEffect(() => {
    const timer = window.setInterval(() => {
      const nextDay = getToday();
      if (nextDay !== currentDay) {
        setCurrentDay(nextDay);
      }
    }, 30000);

    return () => window.clearInterval(timer);
  }, [currentDay]);

  useEffect(() => {
    if (!userId) return;
    loadData();
  }, [currentDay]);

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
    const handleOpenCheckin = () => {
      setEditingLog(null);
      setEditingCheckin(null);
      setShowCheckin(true);
      clearEditCheckinParam();
    };
    window.addEventListener('macrometric:open-checkin', handleOpenCheckin);
    return () => {
      window.removeEventListener('macrometric:open-checkin', handleOpenCheckin);
    };
  }, [searchParams]);

  useEffect(() => {
    if (editingLog || showCheckin) {
      window.dispatchEvent(new Event('macrometric:focus-first-input'));
    }
  }, [editingLog, showCheckin]);

  useEffect(() => {
    if (!editingLog && !showCheckin) return;

    const checkinHasExistingId = !!(checkinData.id || editingCheckin?.id);
    const headerContext = editingLog
      ? {
          showBack: true,
          buttons: [
            { id: 'delete', label: 'Delete', tone: 'danger' },
            { id: 'save', label: 'Save', tone: 'primary' },
          ],
        }
      : {
          showBack: true,
          buttons: checkinHasExistingId
            ? [
                { id: 'delete-checkin', label: 'Delete', tone: 'danger' },
                { id: 'save-checkin', label: 'Save', tone: 'primary' },
              ]
            : [{ id: 'save-checkin', label: 'Save', tone: 'primary' }],
        };

    window.dispatchEvent(new CustomEvent('macrometric:header-context', { detail: headerContext }));

    const handleHeaderBack = () => {
      if (editingLog) {
        setEditingLog(null);
        return;
      }
      if (showCheckin) {
        handleCloseCheckinEditor();
      }
    };

    const handleHeaderAction = async (event: Event) => {
      const actionId = (event as CustomEvent<{ id?: string }>).detail?.id;
      if (!actionId) return;
      if (actionId === 'delete' && editingLog) {
        handleDelete(editingLog.id);
        setEditingLog(null);
        return;
      }
      if (actionId === 'save' && editingLog) {
        await saveEdit();
        return;
      }
      if (actionId === 'delete-checkin' && showCheckin) {
        await handleDeleteCurrentCheckin();
        return;
      }
      if (actionId === 'save-checkin' && showCheckin) {
        await handleSaveCheckin();
      }
    };

    window.addEventListener('macrometric:header-back', handleHeaderBack);
    window.addEventListener('macrometric:header-action', handleHeaderAction as EventListener);

    return () => {
      window.removeEventListener('macrometric:header-back', handleHeaderBack);
      window.removeEventListener('macrometric:header-action', handleHeaderAction as EventListener);
      window.dispatchEvent(new CustomEvent('macrometric:header-context', { detail: null }));
    };
  }, [editingLog, showCheckin, checkinData, editQuantityInput, editQuantityType]);

  useEffect(() => {
    if (!editCheckinId || checkins.length === 0) return;
    const target = checkins.find((c) => c.id === editCheckinId);
    if (!target) return;
    setEditingCheckin(target);
    setCheckinData(toCheckinFormData(target));
    setShowCheckin(true);
  }, [editCheckinId, checkins]);

  useEffect(() => {
    if (openCheckinParam !== '1') return;
    setEditingLog(null);
    setEditingCheckin(null);
    setShowCheckin(true);
    clearOpenCheckinParam();
  }, [openCheckinParam]);

  useEffect(() => {
    const latestTodayCheckin = todayCheckins[todayCheckins.length - 1] || null;
    const isResetState =
      isSameClockTime(latestTodayCheckin?.fastStartTime, DEFAULT_FAST_START_TIME) &&
      isSameClockTime(latestTodayCheckin?.firstMealTime, DEFAULT_FIRST_MEAL_TIME);
    const hasActiveFastNow = !!latestTodayCheckin?.fastStartTime && !latestTodayCheckin?.firstMealTime && !isResetState;
    if (hasActiveFastNow) {
      setIsFastingCollapsed(false);
    }
  }, [todayCheckins]);

  const loadData = async () => {
    if (!userId) return;
    
    setLoading(true);
    const [logsData, goalsData, checkinsData, tripsData, todayData, raceGoalData, stepGoalData] = await Promise.all([
      getLogs(userId),
      getGoals(userId),
      getCheckins(userId),
      getTrips(userId),
      getCheckinsForDate(userId, getToday()),
      getRaceGoal(userId),
      getStepGoal(userId),
    ]);
    
    setLogs(logsData);
    setGoals(goalsData);
    setCheckins(checkinsData);
    setTrips(tripsData);
    setTodayCheckins(todayData);
    window.dispatchEvent(new CustomEvent('macrometric:checkin-updated', { detail: { hasTodayCheckin: todayData.length > 0 } }));
    setRaceGoal(raceGoalData);
    setStepGoal(stepGoalData);
    setDaysUntil(await getDaysUntilRace(userId));
    setWeeksUntil(await getDaysUntilRace(userId) / 7);
    
    // Get last known weight for BMI
    const weightCheckin = checkinsData?.find(c => c.weight);
    setLastWeightCheckin(weightCheckin || null);

    const targetEditCheckin = editCheckinId
      ? checkinsData.find((c) => c.id === editCheckinId)
      : null;
    if (targetEditCheckin) {
      setEditingCheckin(targetEditCheckin);
      setCheckinData(toCheckinFormData(targetEditCheckin));
      setShowCheckin(true);
      setLoading(false);
      return;
    }
    
    if (todayData.length > 0) {
      setCheckinData(toCheckinFormData(todayData[todayData.length - 1]));
    } else {
      // Reset to default
      setCheckinData({
        id: '',
        date: getToday(),
        checkinTime: getCurrentTimeString(),
        weight: '',
        fastStartTime: DEFAULT_FAST_START_TIME,
        firstMealTime: DEFAULT_FIRST_MEAL_TIME,
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
    const servingSize = Number(log.servingSize) || 100;
    const currentRatio = log.quantity || 1;
    const currentGrams = Math.round(currentRatio * servingSize * 100) / 100;
    setEditingLog(log);
    setEditQuantity(currentGrams);
    setEditQuantityInput(String(currentGrams));
    setEditQuantityType('grams');
  };

  const openFoodEditorFromToday = (log: FoodLog) => {
    const params = new URLSearchParams();
    params.set('logDate', currentDay);
    const currentLogGrams = Math.round(((Number(log.quantity) || 1) * (Number(log.servingSize) || 100)) * 10) / 10;
    params.set('logWeight', String(currentLogGrams));
    params.set('logId', log.id);

    if (log.foodId) {
      params.set('editFoodId', log.foodId);
    } else {
      params.set('newFoodName', log.name || '');
      params.set('newFoodBrand', log.brand || '');
      params.set('newCalories', String(Number(log.calories) || 0));
      params.set('newProtein', String(Number(log.protein) || 0));
      params.set('newCarbs', String(Number(log.carbs) || 0));
      params.set('newFat', String(Number(log.fat) || 0));
      params.set('newServing', log.serving || '100g');
      params.set('newServingSize', String(Number(log.servingSize) || 100));
      params.set('newNetCarbs', String(Number(log.netCarbs) || Number(log.carbs) || 0));
      params.set('newPackageWeight', String(Number(log.packageWeight) || 0));
      params.set('newPackageCount', String(Number(log.packageCount) || 0));
    }

    setEditingLog(null);
    window.location.assign(`/my-foods?${params.toString()}`);
  };

  const saveEdit = async () => {
    if (!editingLog || !userId) return;

    const servingSize = Number(editingLog.servingSize) || 100;
    const parsed = Number(editQuantityInput.replace(',', '.'));
    const safeQuantity = Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
    const quantityInput = editQuantityType === 'grams' ? safeQuantity : Math.max(1, Math.floor(safeQuantity));
    const quantityToSave = editQuantityType === 'grams' ? quantityInput / servingSize : quantityInput;
    
    const baseMacros = {
      calories: (Number(editingLog.calories) || 0) / (Number(editingLog.quantity) || 1),
      protein: (Number(editingLog.protein) || 0) / (Number(editingLog.quantity) || 1),
      carbs: (Number(editingLog.carbs) || 0) / (Number(editingLog.quantity) || 1),
      fat: (Number(editingLog.fat) || 0) / (Number(editingLog.quantity) || 1),
    };
    
    const multiplier = quantityToSave;
    
    const updatedLog = {
      ...editingLog,
      quantity: quantityToSave,
      baseMacros,
      calories: Math.round(baseMacros.calories * multiplier * 10) / 10,
      protein: Math.round(baseMacros.protein * multiplier * 10) / 10,
      carbs: Math.round(baseMacros.carbs * multiplier * 10) / 10,
      fat: Math.round(baseMacros.fat * multiplier * 10) / 10,
      serving: editQuantityType === 'grams' ? `${quantityInput}g` : `${quantityInput}`,
    };
    
    setEditQuantity(quantityInput);
    setEditQuantityInput(quantityInput.toString());
    await updateLog(userId, editingLog.id, updatedLog);
    setEditingLog(null);
    loadData();
  };

  const handleSaveCheckin = async () => {
    if (!userId) return;
    
    // Check if at least one field is filled
    const hasData = checkinData.weight || checkinData.steps || checkinData.ketones || 
                    checkinData.glucose || checkinData.heartRate || checkinData.bpHigh || 
                    checkinData.fastStartTime || checkinData.firstMealTime ||
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
      fastStartTime: checkinData.fastStartTime || undefined,
      firstMealTime: checkinData.firstMealTime || undefined,
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
    clearEditCheckinParam();
    loadData();
    window.dispatchEvent(new CustomEvent('macrometric:checkin-updated', { detail: { hasTodayCheckin: true } }));
  };

  const handleDeleteCurrentCheckin = async () => {
    if (!userId) return;
    const targetId = checkinData.id || editingCheckin?.id;
    if (!targetId) return;
    if (!confirm('Delete this check-in?')) return;
    await deleteCheckin(userId, targetId);
    setShowCheckin(false);
    setEditingCheckin(null);
    clearEditCheckinParam();
    loadData();
    window.dispatchEvent(new CustomEvent('macrometric:checkin-updated', { detail: { hasTodayCheckin: false } }));
  };

  const handleFastingStamp = async (field: 'fastStartTime' | 'firstMealTime') => {
    if (!userId) return;
    setIsFastingCollapsed(false);
    const stampedTime = getCurrentTimeString();
    const source = todayCheckin;
    const startsNewFast = field === 'fastStartTime' && !!source?.fastStartTime && !!source?.firstMealTime;
    const savedCheckin = await saveCheckin(userId, {
      id: source?.id,
      date: getToday(),
      checkinTime: source?.checkinTime || stampedTime,
      weight: source?.weight,
      fastStartTime: field === 'fastStartTime' ? stampedTime : source?.fastStartTime,
      firstMealTime: field === 'firstMealTime' ? stampedTime : startsNewFast ? null : source?.firstMealTime,
      steps: source?.steps,
      ketones: source?.ketones,
      glucose: source?.glucose,
      heartRate: source?.heartRate,
      bpHigh: source?.bpHigh,
      bpLow: source?.bpLow,
      saturation: source?.saturation,
      cholesterol: source?.cholesterol,
      ferritin: source?.ferritin,
      notes: source?.notes,
    });

    setTodayCheckins((current) => {
      const next = current.filter((item) => item.id !== savedCheckin.id);
      next.push(savedCheckin);
      return next.sort((a, b) => {
        const timeA = a.checkinTime || '';
        const timeB = b.checkinTime || '';
        if (timeA !== timeB) return timeA.localeCompare(timeB);
        return a.createdAt - b.createdAt;
      });
    });
    setCheckins((current) => {
      const next = current.filter((item) => item.id !== savedCheckin.id);
      next.unshift(savedCheckin);
      return next.sort((a, b) => {
        const dateCompare = b.date.localeCompare(a.date);
        if (dateCompare !== 0) return dateCompare;
        const timeCompare = (b.checkinTime || '').localeCompare(a.checkinTime || '');
        if (timeCompare !== 0) return timeCompare;
        return b.createdAt - a.createdAt;
      });
    });

    await loadData();
    window.dispatchEvent(new CustomEvent('macrometric:checkin-updated', { detail: { hasTodayCheckin: true } }));
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
  const caloriesPct = goalsData.calories > 0 ? Math.round((totals.calories / goalsData.calories) * 100) : 0;
  const caloriesPctClass =
    caloriesPct > 100
      ? 'text-red-600 dark:text-red-400 font-bold'
      : caloriesPct > 80
        ? 'text-amber-600 dark:text-amber-400'
        : 'text-green-600 dark:text-green-400';
  const totalMacroCalories = (totals.fat * 9) + (totals.protein * 4) + (totals.carbs * 4);
  const splitFatPct = totalMacroCalories > 0 ? Math.round((totals.fat * 9 / totalMacroCalories) * 100) : 0;
  const splitProteinPct = totalMacroCalories > 0 ? Math.round((totals.protein * 4 / totalMacroCalories) * 100) : 0;
  const splitCarbsPct = totalMacroCalories > 0 ? Math.max(0, 100 - splitFatPct - splitProteinPct) : 0;
  const weightTarget = raceGoal?.targetWeight || 80;
  const latestWeight = lastWeightCheckin?.weight ?? null;
  const weightDelta = latestWeight !== null ? Math.round((latestWeight - weightTarget) * 10) / 10 : null;
  const weightMilestoneReached = weightDelta !== null ? weightDelta <= 0 : false;
  const raceMilestoneReached = daysUntil <= 0;
  const weightedAsc = checkins
    .filter((item) => typeof item.weight === 'number' && Number.isFinite(item.weight))
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date));
  const firstWeight = weightedAsc[0]?.weight ?? null;
  const weightAutoGoals: Array<{ threshold: number; done: boolean }> = [];
  if (firstWeight !== null && latestWeight !== null) {
    const maxWeight = weightedAsc.reduce((max, item) => {
      const value = item.weight as number;
      return value > max ? value : max;
    }, Number.NEGATIVE_INFINITY);
    const minWeight = weightedAsc.reduce((min, item) => {
      const value = item.weight as number;
      return value < min ? value : min;
    }, Number.POSITIVE_INFINITY);
    const fromThreshold = Math.max(Math.floor(firstWeight), Math.ceil(maxWeight), Math.floor(weightTarget));
    const targetThreshold = Math.min(Math.floor(weightTarget), Math.floor(minWeight));
    if (fromThreshold >= targetThreshold) {
      for (let threshold = fromThreshold; threshold >= targetThreshold; threshold -= 1) {
        const firstHit = weightedAsc.find((entry) => (entry.weight || Number.POSITIVE_INFINITY) < threshold);
        weightAutoGoals.push({
          threshold,
          done: !!firstHit,
        });
      }
    }
  }
  const achievedWeightMilestones = weightAutoGoals
    .filter((goal) => goal.done)
    .map((goal) => {
      const firstHit = weightedAsc.find((entry) => (entry.weight || Number.POSITIVE_INFINITY) < goal.threshold);
      return { threshold: goal.threshold, date: firstHit?.date || '' };
    })
    .filter((item) => !!item.date)
    .sort((a, b) => b.date.localeCompare(a.date));
  const lastReachedWeightMilestone = achievedWeightMilestones[0] || null;
  const lastReachedWeightMilestoneElapsed = lastReachedWeightMilestone
    ? getElapsedFromDate(lastReachedWeightMilestone.date)
    : null;

  const dateObj = new Date();
  const dateStr = `${String(dateObj.getDate()).padStart(2, '0')}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${dateObj.getFullYear()}`;

  // Calculate BMI from last known weight
  const bmiFromLastWeight = lastWeightCheckin?.weight && goalsData.height 
    ? Math.round((lastWeightCheckin.weight / Math.pow(goalsData.height / 100, 2)) * 10) / 10
    : null;

  // Get today's steps (aggregate from all check-ins today)
  const todaySteps = todayCheckins.reduce((sum, c) => sum + (c.steps || 0), 0);
  const todayCheckin = todayCheckins[todayCheckins.length - 1] || null;
  const isResetFastingState =
    isSameClockTime(todayCheckin?.fastStartTime, DEFAULT_FAST_START_TIME) &&
    isSameClockTime(todayCheckin?.firstMealTime, DEFAULT_FIRST_MEAL_TIME);
  const todayFastingHours = getFastingHours(todayCheckin?.fastStartTime, todayCheckin?.firstMealTime);
  const displayedFastStartTime = todayCheckin?.fastStartTime || DEFAULT_FAST_START_TIME;
  const displayedFirstMealTime = todayCheckin?.firstMealTime || DEFAULT_FIRST_MEAL_TIME;
  const fastingProgressPercent = isResetFastingState
    ? 0
    : getFastingProgressPercent(fastingTargetHours, todayCheckin?.fastStartTime, todayCheckin?.firstMealTime);
  const fastingProgressHours = isResetFastingState
    ? 0
    : (todayFastingHours ?? getElapsedFastingHours(todayCheckin?.fastStartTime));
  const fastingSuccess = !isResetFastingState && todayFastingHours !== null && todayFastingHours >= fastingTargetHours;
  const fastingCompleted = !isResetFastingState && todayFastingHours !== null;
  const fastingTooShort = fastingCompleted && !fastingSuccess;
  const showStopEatingButton = fastingCompleted || isResetFastingState || !todayCheckin?.fastStartTime;
  const showStartEatingButton = fastingCompleted || isResetFastingState || !todayCheckin?.firstMealTime;
  const canEditFastingTarget = showStopEatingButton && showStartEatingButton;
  const hasActiveFast = !!todayCheckin?.fastStartTime && !todayCheckin?.firstMealTime && !isResetFastingState;
  const isFastingExpanded = hasActiveFast || !isFastingCollapsed;
  const fastingNotStarted = !hasActiveFast && !fastingCompleted;
  const fastingHelpText = showStopEatingButton
    ? 'Press button to start fasting'
    : showStartEatingButton
      ? 'Press button to end fasting'
      : '';
  const previousWeightCheckin = checkins.find((item) => item.id !== todayCheckin?.id && typeof item.weight === 'number' && Number.isFinite(item.weight));
  const todayWeight = typeof todayCheckin?.weight === 'number' && Number.isFinite(todayCheckin.weight) ? todayCheckin.weight : null;
  const previousWeight = previousWeightCheckin?.weight ?? null;
  const weightChangeFromLastCheckin = todayWeight !== null && previousWeight !== null
    ? Math.round((todayWeight - previousWeight) * 10) / 10
    : null;
  const hasWeightTrend = weightChangeFromLastCheckin !== null && weightChangeFromLastCheckin !== 0;
  const weightTrendIcon = !hasWeightTrend
    ? null
    : weightChangeFromLastCheckin > 0
      ? 'arrow_upward'
      : 'arrow_downward';
  const weightTrendClass = !hasWeightTrend
    ? ''
    : weightChangeFromLastCheckin > 0
      ? 'text-red-600 dark:text-red-400'
      : 'text-green-600 dark:text-green-400';

  if (editingLog) {
    const servingSize = Number(editingLog.servingSize) || 100;
    const baseMacros = {
      calories: (Number(editingLog.calories) || 0) / (Number(editingLog.quantity) || 1),
      protein: (Number(editingLog.protein) || 0) / (Number(editingLog.quantity) || 1),
      carbs: (Number(editingLog.carbs) || 0) / (Number(editingLog.quantity) || 1),
      fat: (Number(editingLog.fat) || 0) / (Number(editingLog.quantity) || 1),
    };
    const parsedPreview = Number(editQuantityInput.replace(',', '.'));
    const previewQuantity = Number.isFinite(parsedPreview) && parsedPreview > 0
      ? (editQuantityType === 'grams' ? parsedPreview : Math.max(1, Math.floor(parsedPreview)))
      : editQuantity;
    const multiplier = editQuantityType === 'grams' ? previewQuantity / servingSize : previewQuantity;
    const calcCals = Math.round(baseMacros.calories * multiplier);
    const calcProtein = Math.round(baseMacros.protein * multiplier);
    const calcCarbs = Math.round(baseMacros.carbs * multiplier);
    const calcFat = Math.round(baseMacros.fat * multiplier);

    return (
      <div className="space-y-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-5">
          <div className="mb-1 flex items-start justify-between gap-3">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{editingLog.name}</h2>
            <button
              type="button"
              onClick={() => openFoodEditorFromToday(editingLog)}
              className="inline-flex items-center justify-center rounded-md p-1 text-blue-500 hover:bg-blue-50 hover:text-blue-700 dark:text-blue-400 dark:hover:bg-blue-900/30 dark:hover:text-blue-300"
              aria-label={`Edit food item ${editingLog.name}`}
              title="Edit food item"
            >
              <MaterialIcon name="edit" className="text-[20px]" />
            </button>
          </div>
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
                type="text"
                inputMode="decimal"
                autoFocus
                value={editQuantityInput}
                onChange={(e) => setEditQuantityInput(e.target.value.replace(',', '.'))}
                onBlur={() => {
                  const parsed = Number(editQuantityInput.replace(',', '.'));
                  const safe = Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
                  const normalized = editQuantityType === 'grams' ? safe : Math.max(1, Math.floor(safe));
                  setEditQuantity(normalized);
                  setEditQuantityInput(String(normalized));
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
        </div>
      </div>
    );
  }

  if (showCheckin) {
    return (
      <div className="space-y-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              {editingCheckin ? 'Edit Check-in' : 'Daily Check-in'}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">{formatDateDDMMYYYY(checkinData.date)}</p>
          </div>
          
          <div className="space-y-3">
            <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-3">
              <div className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2">Check-in Basics</div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-200 mb-1">Steps</label>
                  <input
                    type="number"
                    autoFocus
                    value={checkinData.steps}
                    onChange={(e) => setCheckinData({...checkinData, steps: e.target.value})}
                    placeholder="5000"
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-200 mb-1">Weight (kg)</label>
                  <input
                    type="number"
                    value={checkinData.weight}
                    onChange={(e) => setCheckinData({...checkinData, weight: e.target.value})}
                    placeholder="83.5"
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-200 mb-1">Fast Start</label>
                  <input
                    type="time"
                    value={checkinData.fastStartTime}
                    onChange={(e) => setCheckinData({...checkinData, fastStartTime: e.target.value})}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-200 mb-1">First Meal</label>
                  <input
                    type="time"
                    value={checkinData.firstMealTime}
                    onChange={(e) => setCheckinData({...checkinData, firstMealTime: e.target.value})}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-200 mb-1">Date</label>
                  <input
                    type="date"
                    value={checkinData.date}
                    onChange={(e) => setCheckinData({...checkinData, date: e.target.value})}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-200 mb-1">Time</label>
                  <input
                    type="time"
                    value={checkinData.checkinTime}
                    onChange={(e) => setCheckinData({...checkinData, checkinTime: e.target.value})}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none"
                  />
                </div>
              </div>
              {getFastingHours(checkinData.fastStartTime, checkinData.firstMealTime) !== null && (
                <div className="mt-2 text-xs text-indigo-600 dark:text-indigo-400">
                  Fasting duration: {getFastingHours(checkinData.fastStartTime, checkinData.firstMealTime)} h
                </div>
              )}
            </div>

            <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-3">
              <div className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2">Vitals</div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-200 mb-1">BP High</label>
                  <input
                    type="number"
                    value={checkinData.bpHigh}
                    onChange={(e) => setCheckinData({...checkinData, bpHigh: e.target.value})}
                    placeholder="120"
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-200 mb-1">BP Low</label>
                  <input
                    type="number"
                    value={checkinData.bpLow}
                    onChange={(e) => setCheckinData({...checkinData, bpLow: e.target.value})}
                    placeholder="80"
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-200 mb-1">Heart Rate</label>
                  <input
                    type="number"
                    value={checkinData.heartRate}
                    onChange={(e) => setCheckinData({...checkinData, heartRate: e.target.value})}
                    placeholder="72"
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-3">
              <div className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2">Bloodwork</div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-200 mb-1">Ketones</label>
                  <input
                    type="number"
                    value={checkinData.ketones}
                    onChange={(e) => setCheckinData({...checkinData, ketones: e.target.value})}
                    placeholder="1.5"
                    step="0.1"
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-200 mb-1">Glucose</label>
                  <input
                    type="number"
                    value={checkinData.glucose}
                    onChange={(e) => setCheckinData({...checkinData, glucose: e.target.value})}
                    placeholder="95"
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-200 mb-1">Saturation (%)</label>
                  <input
                    type="number"
                    value={checkinData.saturation}
                    onChange={(e) => setCheckinData({...checkinData, saturation: e.target.value})}
                    placeholder="95"
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-200 mb-1">Cholesterol</label>
                  <input
                    type="number"
                    value={checkinData.cholesterol}
                    onChange={(e) => setCheckinData({...checkinData, cholesterol: e.target.value})}
                    placeholder="180"
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-200 mb-1">Ferritin</label>
                  <input
                    type="number"
                    value={checkinData.ferritin}
                    onChange={(e) => setCheckinData({...checkinData, ferritin: e.target.value})}
                    placeholder="100"
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none"
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
          
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={() => navigate('/history?tab=milestones')}
        className="w-full text-left bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl shadow-sm p-4 border border-indigo-100 dark:border-indigo-800 hover:bg-indigo-100/70 dark:hover:bg-indigo-900/30 transition-colors"
      >
        <div className="flex items-center justify-between mb-3">
          <span className="text-lg font-semibold text-gray-800 dark:text-gray-100 inline-flex items-center gap-2">
            <MaterialIcon name="emoji_events" className="text-[20px] text-indigo-600 dark:text-indigo-400" />
            Milestones
          </span>
        </div>
        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-gray-700 dark:text-gray-200">Under {weightTarget} kg</span>
            {latestWeight === null ? (
              <span className="text-gray-500 dark:text-gray-400">No weight yet</span>
            ) : (
              <span className={weightMilestoneReached ? 'text-green-600 dark:text-green-400 font-semibold' : 'text-amber-600 dark:text-amber-400'}>
                {weightMilestoneReached ? `Reached (${latestWeight} kg)` : `${weightDelta} kg to go`}
              </span>
            )}
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-700 dark:text-gray-200">Race finish: {raceGoal?.eventName || 'Race'}</span>
            <span className={raceMilestoneReached ? 'text-green-600 dark:text-green-400 font-semibold' : 'text-blue-600 dark:text-blue-400'}>
              {raceMilestoneReached ? 'Race day reached' : `${daysUntil} days left`}
            </span>
          </div>
          {lastReachedWeightMilestone && lastReachedWeightMilestoneElapsed && (
            <div className="py-1">
              <div className="flex items-center justify-between">
                <span className="text-amber-600 dark:text-amber-400 font-semibold">
                  Under {lastReachedWeightMilestone.threshold} kg
                </span>
                <span className="text-xs text-amber-600/90 dark:text-amber-400/90">
                  {formatDateDDMMYYYY(lastReachedWeightMilestone.date)}
                </span>
              </div>
              <div className="text-xs text-amber-600/90 dark:text-amber-400/90">
                {lastReachedWeightMilestoneElapsed.daysAgo} days | {lastReachedWeightMilestoneElapsed.weeksAgo} weeks | {lastReachedWeightMilestoneElapsed.monthsAgo} months
              </div>
            </div>
          )}
        </div>
      </button>

      {todayCheckins.length > 0 && (
        <button
          type="button"
          onClick={() => setShowCheckin(true)}
          className="w-full text-left bg-purple-50 dark:bg-purple-900/20 rounded-2xl shadow-sm p-4 border border-purple-100 dark:border-purple-800 hover:bg-purple-100/70 dark:hover:bg-purple-900/30 transition-colors"
        >
        <div className="flex items-center justify-between gap-3 mb-2">
          <span className="text-lg font-semibold text-gray-800 dark:text-gray-100 whitespace-nowrap">Today's Check-in</span>
          {typeof todayCheckin?.weight === 'number' && (
              <span className={`inline-flex items-center gap-1 text-lg font-semibold whitespace-nowrap ${getWeightTone(todayCheckin.weight)}`}>
                <span>{todayCheckin.weight} kg</span>
                {weightTrendIcon && hasWeightTrend && (
                  <span className={`inline-flex items-center gap-0.5 text-sm ${weightTrendClass}`}>
                    <MaterialIcon name={weightTrendIcon} className="text-[14px]" />
                    <span>{Math.abs(weightChangeFromLastCheckin)}</span>
                  </span>
                )}
              </span>
            )}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            {typeof todayCheckin?.steps === 'number' && (
              <div className="text-center"><span className={`font-semibold ${getStepsTone(todayCheckin.steps)}`}>{todayCheckin.steps}</span> steps</div>
            )}
            {typeof todayCheckin?.ketones === 'number' && <div className="text-center"><span className={`font-semibold ${getKetonesTone(todayCheckin.ketones)}`}>{todayCheckin.ketones}</span> ketones</div>}
            {typeof todayCheckin?.glucose === 'number' && <div className="text-center"><span className={`font-semibold ${getGlucoseMmolTone(todayCheckin.glucose)}`}>{todayCheckin.glucose}</span> glucose</div>}
            {typeof todayCheckin?.heartRate === 'number' && <div className="text-center"><span className={`font-semibold ${getHeartRateTone(todayCheckin.heartRate)}`}>{todayCheckin.heartRate}</span> HR</div>}
            {todayCheckin?.bpHigh && todayCheckin?.bpLow && (
              <div className="text-center"><span className={`font-semibold ${getBpTone(todayCheckin.bpHigh, todayCheckin.bpLow)}`}>{todayCheckin.bpHigh}/{todayCheckin.bpLow}</span> BP</div>
            )}
            {todayCheckin?.saturation && <div className="text-center"><span className="font-semibold">{todayCheckin.saturation}</span> sat%</div>}
            {todayCheckin?.cholesterol && <div className="text-center"><span className="font-semibold">{todayCheckin.cholesterol}</span> chol</div>}
            {todayCheckin?.ferritin && (
              <div className="text-center">
                <span className={`font-semibold ${getFerritinTone(todayCheckin.ferritin)}`}>{todayCheckin.ferritin}</span> ferr
              </div>
            )}
          </div>
          {(todayCheckin?.checkinTime || todayCheckin?.notes) && (
            <div className="mt-3 flex items-center justify-between gap-3 text-xs text-purple-700 dark:text-purple-300">
              <span className="whitespace-nowrap">{formatCheckinTime(todayCheckin?.checkinTime) || 'No time'}</span>
              {todayCheckin?.notes && <span className="truncate text-right">{todayCheckin.notes}</span>}
            </div>
          )}
        </button>
      )}

      {/* Steps Card */}
      <button
        type="button"
        onClick={() => setShowCheckin(true)}
        className="w-full text-left bg-green-50 dark:bg-green-900/20 rounded-2xl shadow-sm p-5 border border-green-100 dark:border-green-800 hover:bg-green-100/70 dark:hover:bg-green-900/30 transition-colors"
      >
        <div className="flex items-center justify-between gap-3 mb-2">
          <span className="text-lg font-semibold text-gray-800 dark:text-gray-100 inline-flex items-center gap-2 whitespace-nowrap">
            <MaterialIcon name="directions_walk" className="text-[20px] text-green-600 dark:text-green-400" />
            Steps
            <span className={`text-base font-semibold ${getStepsTone(todaySteps)}`}>
              {todaySteps > 0 ? Math.round((todaySteps / stepGoal) * 100) : 0}%
            </span>
          </span>
          <span className={`text-sm font-semibold whitespace-nowrap ${getStepsTone(todaySteps)}`}>
            {todaySteps} / {stepGoal}
          </span>
        </div>
        <div className="h-4 bg-green-200 dark:bg-green-800/50 rounded-full overflow-hidden mb-3">
          <div
            className="h-full bg-green-500 transition-all duration-500 rounded-full"
            style={{ width: `${getStepsPosition(todaySteps, stepGoal)}%` }}
          />
        </div>
        <div className="text-sm text-gray-700 dark:text-gray-200">
          <span className="font-medium text-gray-600 dark:text-gray-400">To do:</span>{' '}
          <span className="text-gray-600 dark:text-gray-400">Steps:</span>{' '}
          <span className="font-semibold text-green-600 dark:text-green-400">{Math.max(0, stepGoal - todaySteps)}</span>{' '}
          <span className="text-gray-600 dark:text-gray-400">=</span>{' '}
          <span className="font-semibold text-green-600 dark:text-green-400">{(Math.max(0, stepGoal - todaySteps) / 1300).toFixed(1)} km</span>{' '}
          <span className="text-gray-600 dark:text-gray-400">or Treadmill:</span>{' '}
          <span className="font-semibold text-green-600 dark:text-green-400">{Math.ceil(Math.max(0, stepGoal - todaySteps) / (1300 / 6))} min</span>{' '}
          <span className="text-gray-600 dark:text-gray-400">@ 6 km/h</span>
        </div>
      </button>

      {/* Fasting Card */}
      <div
        className="relative w-full text-left bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl shadow-sm p-5 border border-indigo-100 dark:border-indigo-800 overflow-hidden"
      >
        <button
          type="button"
          onClick={() => {
            if (hasActiveFast) return;
            setIsFastingCollapsed((current) => !current);
          }}
          className={`flex w-full items-center justify-between gap-3 text-left ${hasActiveFast ? 'cursor-default' : 'cursor-pointer'}`}
        >
          <span className="text-lg font-semibold text-gray-800 dark:text-gray-100 inline-flex items-center gap-2 whitespace-nowrap">
            <MaterialIcon name="schedule" className="text-[20px] text-indigo-600 dark:text-indigo-400" />
            Fasting
            {!fastingSuccess && !fastingTooShort && fastingHelpText && (
              <span className="text-sm font-normal text-gray-500 dark:text-gray-400">
                {fastingHelpText}
              </span>
            )}
          </span>
          <span className="inline-flex items-center gap-2">
            {fastingNotStarted ? (
              <span className="text-sm font-semibold text-red-600 dark:text-red-400 whitespace-nowrap">Not started</span>
            ) : todayFastingHours !== null ? (
              <span className="text-base font-semibold text-indigo-600 dark:text-indigo-400 whitespace-nowrap">
                {todayFastingHours} h
              </span>
            ) : (
              <span className="text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">In Progress</span>
            )}
            <MaterialIcon
              name={isFastingExpanded ? 'expand_less' : 'expand_more'}
              className="text-[20px] text-indigo-600 dark:text-indigo-400"
            />
          </span>
        </button>
        {isFastingExpanded && (
          <>
        <div className="mb-3 mt-3">
          <div className="flex items-center justify-between gap-3 text-xs text-gray-600 dark:text-gray-400 mb-1">
            <span>Progress</span>
            <span>{Math.min(fastingProgressHours, fastingTargetHours).toFixed(1)} / {fastingTargetHours} h</span>
          </div>
          <div className="h-3 bg-indigo-200 dark:bg-indigo-950/70 rounded-full overflow-hidden">
            <div
              className="h-full bg-indigo-500 transition-all duration-500 rounded-full"
              style={{ width: `${fastingProgressPercent}%` }}
            />
          </div>
        </div>
        {canEditFastingTarget && (
          <div className="mb-3 flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
            <span className="text-gray-600 dark:text-gray-400 whitespace-nowrap">Target hours</span>
            <input
              type="number"
              min="1"
              max="48"
              step="0.5"
              value={fastingTargetHours}
              onClick={(event) => event.stopPropagation()}
              onChange={(event) => {
                const nextValue = Number(event.target.value);
                if (Number.isFinite(nextValue) && nextValue > 0) {
                  setFastingTargetHours(nextValue);
                }
              }}
              className="w-20 rounded-lg border border-indigo-200 dark:border-indigo-700 bg-white dark:bg-gray-800 px-3 py-1.5 text-sm font-semibold text-indigo-700 dark:text-indigo-300"
            />
            <span className="text-gray-600 dark:text-gray-400">h</span>
          </div>
        )}
        <div className="grid grid-cols-2 gap-3">
          {showStopEatingButton ? (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                handleFastingStamp('fastStartTime');
              }}
              className="rounded-xl px-3 py-2 text-sm font-semibold transition-colors bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              Stop eating {formatCheckinTime(displayedFastStartTime)}
            </button>
          ) : (
            <div className="rounded-xl px-3 py-2 text-sm font-semibold bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 text-center">
              Fast started {formatCheckinTime(todayCheckin?.fastStartTime)}
            </div>
          )}
          {showStartEatingButton ? (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                handleFastingStamp('firstMealTime');
              }}
              className="rounded-xl px-3 py-2 text-sm font-semibold transition-colors bg-white dark:bg-gray-800 border border-indigo-200 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100/70 dark:hover:bg-indigo-900/40"
            >
              Start eating {formatCheckinTime(displayedFirstMealTime)}
            </button>
          ) : (
            <div className="rounded-xl px-3 py-2 text-sm font-semibold bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 text-center">
              First meal {formatCheckinTime(todayCheckin?.firstMealTime)}
            </div>
          )}
        </div>
        {(fastingSuccess || fastingTooShort) && (
          <div className="mt-3 text-xs text-gray-500 dark:text-gray-400">
            {fastingSuccess ? (
              <span className="font-semibold text-green-600 dark:text-green-400">
                Fast completed
              </span>
            ) : (
              <span className="font-bold text-red-600 dark:text-red-400">
                Fast to short
              </span>
            )}
          </div>
        )}
          </>
        )}
      </div>

      {/* BMI Card - from last known weight */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-5">
        <div className="flex justify-between items-center mb-2">
          <span className="text-lg font-semibold text-gray-800 dark:text-gray-100 inline-flex items-center gap-2">
            <MaterialIcon name="monitor_weight" className="text-[20px]" />
            BMI
          </span>
          {lastWeightCheckin && lastWeightCheckin.date && (
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {lastWeightCheckin.weight}kg ({formatDateDDMMYYYY(lastWeightCheckin.date)})
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
      </div>

      <RaceProgress checkins={checkins} raceGoal={raceGoal} daysUntil={daysUntil} weeksUntil={weeksUntil} />
      <TripWidget trips={trips} userId={userId} onRefresh={loadData} />

      {/* Daily Progress Card */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-5">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 inline-flex items-center gap-2">
            <ExplodedPieIcon />
            Daily Progress
          </h2>
          <span className="text-2xl font-bold text-primary-600 dark:text-blue-400">
            {Math.round(totals.calories)}
            <span className="text-sm font-normal text-gray-400 dark:text-gray-500"> / {goalsData.calories} </span>
            <span className={`text-sm ${caloriesPctClass}`}>({caloriesPct}%)</span>
          </span>
        </div>
        
        <MacroBar label="Fat" current={totals.fat} goal={goalsData.fat} color="bg-blue-500" splitPercent={splitFatPct} />
        <MacroBar label="Protein" current={totals.protein} goal={goalsData.protein} color="bg-red-500" splitPercent={splitProteinPct} />
        <MacroBar label="Carbs" current={totals.carbs} goal={goalsData.carbs} color="bg-amber-500" splitPercent={splitCarbsPct} />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Link
          to="/add"
          className="py-3 bg-primary-500 text-white rounded-xl text-center shadow-sm hover:bg-primary-600 transition-colors"
          title="Add Food"
          aria-label="Add Food"
        >
          <span className="inline-flex items-center justify-center">
            <MaterialIcon name="add_circle" className="text-[24px]" />
          </span>
        </Link>
        <button
          onClick={() => setShowCheckin(true)}
          className="py-3 bg-purple-500 text-white rounded-xl shadow-sm hover:bg-purple-600 transition-colors"
          title="Check-in"
          aria-label="Check-in"
        >
          <span className="inline-flex items-center justify-center">
            <MaterialIcon name="monitor_heart" className="text-[24px]" />
          </span>
        </button>
        <Link
          to="/presets"
          className="py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-xl text-center hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          title="Quick Add"
          aria-label="Quick Add"
        >
          <span className="inline-flex items-center justify-center">
            <MaterialIcon name="bolt" className="text-[24px]" />
          </span>
        </Link>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
        <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700 border-b border-gray-100 dark:border-gray-600">
          <div>
            <span className="text-lg font-semibold text-gray-800 dark:text-gray-100">Today's Foods</span>
            <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">
              ({logs?.logs.length || 0} items)
            </span>
          </div>
        </div>
        
        {(!logs || logs.logs.length === 0) ? (
          <div className="px-4 py-8 text-center text-gray-400 dark:text-gray-500">
            No foods logged yet. Tap the add icon to start tracking.
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {logs.logs.map(log => (
              (() => {
                const servingDisplay = splitServingDisplay(log.serving);
                return (
                  <button
                    key={log.id}
                    onClick={() => openEdit(log)}
                    className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    <div className="flex-1 min-w-0 text-left">
                      <div className="font-medium text-gray-900 dark:text-gray-100 truncate">{log.name}</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400 truncate">
                        {log.brand || '-'}
                      </div>
                    </div>
                    <div className="w-14 shrink-0 text-right">
                      <div className="font-semibold tabular-nums text-gray-900 dark:text-gray-100 truncate">{servingDisplay.value}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">{servingDisplay.unit}</div>
                    </div>
                    <div className="w-14 shrink-0 text-right">
                      <div className="font-semibold tabular-nums text-gray-900 dark:text-gray-100">{Math.round(log.calories)}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">kcal</div>
                    </div>
                    <div className="w-7 shrink-0 text-right">
                      <div className="text-[11px] font-medium tabular-nums leading-tight text-right">
                        <div className="text-white">{Math.round(log.fat)}</div>
                        <div className="text-white">{Math.round(log.protein)}</div>
                        <div className="text-white">{Math.round(log.netCarbs && log.netCarbs > 0 ? log.netCarbs : log.carbs)}</div>
                      </div>
                    </div>
                    <div className="w-3 shrink-0 -ml-1">
                      <div className="text-[11px] font-semibold tabular-nums leading-tight text-left">
                        <div className="text-blue-500 dark:text-blue-400">F</div>
                        <div className="text-red-500 dark:text-red-400">P</div>
                        <div className="text-amber-500 dark:text-amber-400">C</div>
                      </div>
                    </div>
                  </button>
                );
              })()
            ))}
          </div>
        )}
      </div>
    </div>
  );
}



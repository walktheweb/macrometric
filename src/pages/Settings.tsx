import { useState, useEffect, ReactNode, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { getGoals, updateGoals, getRaceGoal, saveRaceGoal, getDaysUntilRace, changePassword, getStepGoal, saveStepGoal as saveStepGoalApi, exportUserData, importUserData, getEventGoals, saveEventGoalItem, deleteEventGoalItem, setPrimaryEventGoal, EventGoalItem } from '../lib/api';
import { formatDateDDMMYYYY } from '../lib/date';
import MaterialIcon from '../components/MaterialIcon';

const getVersionString = () => {
  return '1.1.0';
};

const normalizeToIsoDate = (value?: string | null): string => {
  if (!value) return '2026-05-23';
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;

  const dmyMatch = value.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/);
  if (dmyMatch) {
    const dd = dmyMatch[1].padStart(2, '0');
    const mm = dmyMatch[2].padStart(2, '0');
    const yyyy = dmyMatch[3];
    return `${yyyy}-${mm}-${dd}`;
  }

  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }

  return '2026-05-23';
};

const normalizeToDisplayDate = (value?: string | null): string => {
  return formatDateDDMMYYYY(normalizeToIsoDate(value));
};

interface CollapsibleSectionProps {
  title: string;
  icon: string;
  defaultExpanded?: boolean;
  gradient?: boolean;
  children: ReactNode;
}

function CollapsibleSection({ title, icon, defaultExpanded = false, gradient = false, children }: CollapsibleSectionProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const baseClasses = gradient
    ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white'
    : 'bg-white dark:bg-gray-800 shadow-sm';

  return (
    <div className={`${baseClasses} rounded-2xl overflow-hidden transition-all duration-300`}>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-5 flex items-center justify-between text-left"
      >
        <div className="flex items-center gap-3">
          <MaterialIcon name={icon} className="text-[24px]" />
          <h2 className={`font-semibold text-lg ${gradient ? 'text-white' : 'text-gray-800 dark:text-gray-100'}`}>
            {title}
          </h2>
        </div>
        <span className={`text-xl transition-transform duration-300 ${gradient ? 'text-white' : 'text-gray-400'} ${isExpanded ? 'rotate-180' : ''}`}><MaterialIcon name="expand_more" className="text-[24px]" /></span>
      </button>
      <div className={`overflow-hidden transition-all duration-300 ${isExpanded ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'}`}>
        <div className={gradient ? 'p-5 pt-0' : 'p-5 pt-0'}>
          {children}
        </div>
      </div>
    </div>
  );
}

export default function Settings() {
  const navigate = useNavigate();
  const { userId, email } = useAuth();
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
  
  const [raceDate, setRaceDate] = useState('23-05-2026');
  const [raceTargetWeight, setRaceTargetWeight] = useState(80);
  const [raceWeeklyTarget, setRaceWeeklyTarget] = useState(0.5);
  const [daysUntilRace, setDaysUntilRace] = useState(57);
  const [eventGoals, setEventGoals] = useState<EventGoalItem[]>([]);
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);
  const [showGoalForm, setShowGoalForm] = useState(false);
  const [goalFormName, setGoalFormName] = useState('');
  const [goalFormDate, setGoalFormDate] = useState('23-05-2026');
  const [goalFormTargetWeight, setGoalFormTargetWeight] = useState(80);
  const [goalFormWeeklyTarget, setGoalFormWeeklyTarget] = useState(0.5);
  const [goalSaved, setGoalSaved] = useState(false);
  const [stepGoal, setStepGoal] = useState(10000);

  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  const [releaseNotes, setReleaseNotes] = useState<{ date: string; note: string }[]>([
    { date: '30.03.2026', note: 'v1.2.0 - Event goals list (add/edit/delete), improved milestones flow, and safer race projection' },
    { date: '29.03.2026', note: 'v1.1.0 - Account login (email/password) across devices' },
    { date: '29.03.2026', note: 'v1.0.0 - MacroMetric official first release' },
    { date: '28.03.2026', note: 'v2.0.002 - Event Goal with name, Check-in notes, History Goals tab' },
    { date: '28.03.2026', note: 'v2.0.001 - Edit/Delete My Foods, No duplicate add' },
    { date: '27.03.2026', note: 'Added OCR nutrition label scanner (Scan Label)' },
    { date: '27.03.2026', note: 'Added Import Foods with all fields' },
    { date: '27.03.2026', note: 'Added collapsible sections and About page' },
    { date: '27.03.2026', note: 'Added password protection' },
  ]);

  const [featureRequests, setFeatureRequests] = useState<{ id: string; text: string }[]>([]);
  const [newFeature, setNewFeature] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [newReleaseNote, setNewReleaseNote] = useState('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [backupStatus, setBackupStatus] = useState('');
  const [backupBusy, setBackupBusy] = useState(false);
  const [selectedImportFile, setSelectedImportFile] = useState<File | null>(null);

  useEffect(() => {
    if (userId) {
      loadData();
    }
  }, [userId]);

  useEffect(() => {
    const savedNotes = localStorage.getItem('macrometric_release_notes');
    if (savedNotes) {
      setReleaseNotes(JSON.parse(savedNotes));
    }
    const savedFeatures = localStorage.getItem('macrometric_feature_requests');
    if (savedFeatures) {
      setFeatureRequests(JSON.parse(savedFeatures));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('macrometric_release_notes', JSON.stringify(releaseNotes));
  }, [releaseNotes]);

  useEffect(() => {
    localStorage.setItem('macrometric_feature_requests', JSON.stringify(featureRequests));
  }, [featureRequests]);

  const addReleaseNote = (note: string) => {
    const now = new Date();
    const dd = String(now.getDate()).padStart(2, '0');
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const yyyy = now.getFullYear();
    const dateStr = `${dd}.${mm}.${yyyy}`;
    
    const updated = [{ date: dateStr, note }, ...releaseNotes];
    setReleaseNotes(updated);
  };

  const loadData = async () => {
    if (!userId) return;
    setLoading(true);
    
    const [stored, raceGoalData, stepGoalData, eventGoalsData] = await Promise.all([
      getGoals(userId),
      getRaceGoal(userId),
      getStepGoal(userId),
      getEventGoals(userId),
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
    
    setRaceDate(normalizeToDisplayDate(raceGoalData.raceDate));
    setRaceTargetWeight(raceGoalData.targetWeight);
    setRaceWeeklyTarget(raceGoalData.weeklyTarget);
    setEventGoals(eventGoalsData);
    setGoalFormName('');
    setGoalFormDate(normalizeToDisplayDate(raceGoalData.raceDate));
    setGoalFormTargetWeight(raceGoalData.targetWeight);
    setGoalFormWeeklyTarget(raceGoalData.weeklyTarget);
    setEditingGoalId(null);
    setShowGoalForm(false);
    setDaysUntilRace(await getDaysUntilRace(userId));
    setStepGoal(stepGoalData);
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
    await Promise.all([
      updateGoals(userId, { calories, protein, carbs, fat, weight, height, targetBmi }),
      saveStepGoalApi(userId, stepGoal),
    ]);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleSetEditingGoal = (goal: EventGoalItem) => {
    setEditingGoalId(goal.id);
    setGoalFormName(goal.eventName || '');
    setGoalFormDate(normalizeToDisplayDate(goal.raceDate));
    setGoalFormTargetWeight(goal.targetWeight);
    setGoalFormWeeklyTarget(goal.weeklyTarget);
    setShowGoalForm(true);
  };

  const handleNewGoal = () => {
    setShowGoalForm((prev) => {
      const next = !prev;
      if (next) {
        setEditingGoalId(null);
        setGoalFormName('');
        setGoalFormDate(normalizeToDisplayDate(raceDate));
        setGoalFormTargetWeight(raceTargetWeight);
        setGoalFormWeeklyTarget(raceWeeklyTarget);
      } else {
        setEditingGoalId(null);
      }
      return next;
    });
  };

  const handleSaveGoalFromForm = async () => {
    if (!userId) return;
    if (!goalFormName.trim()) return;
    const safeRaceDate = normalizeToIsoDate(goalFormDate);
    await saveEventGoalItem(userId, {
      id: editingGoalId || undefined,
      eventName: goalFormName.trim(),
      raceDate: safeRaceDate,
      targetWeight: goalFormTargetWeight,
      weeklyTarget: goalFormWeeklyTarget,
    });
    await loadData();
    setGoalSaved(true);
    setTimeout(() => setGoalSaved(false), 2000);
    setShowGoalForm(false);
  };

  const handleSetActiveEventGoal = async (id: string) => {
    if (!userId) return;
    await setPrimaryEventGoal(userId, id);
    await loadData();
  };

  const handleDeleteEventGoal = async (id: string) => {
    if (!userId) return;
    await deleteEventGoalItem(userId, id);
    const updatedGoals = await getEventGoals(userId);
    setEventGoals(updatedGoals);
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    
    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError('All fields are required');
      return;
    }
    
    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match');
      return;
    }
    
    if (newPassword.length < 6) {
      setPasswordError('Password must be at least 6 characters');
      return;
    }
    
    const result = await changePassword(currentPassword, newPassword);
    
    if (result.success) {
      setPasswordSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setShowPasswordForm(false);
      setTimeout(() => setPasswordSuccess(false), 3000);
    } else {
      setPasswordError(result.error || 'Failed to change password');
    }
  };

  const normalizePercentages = (fat: number, protein: number, carbs: number) => {
    const total = fat + protein + carbs;
    
    if (total === 100) {
      return { fat, protein, carbs };
    }
    
    if (total === 0) {
      return { fat: 0, protein: 0, carbs: 0 };
    }
    
    const factor = 100 / total;
    let newFat = Math.round(fat * factor);
    let newProtein = Math.round(protein * factor);
    let newCarbs = 100 - newFat - newProtein;
    
    return { fat: newFat, protein: newProtein, carbs: newCarbs };
  };

  const adjustPct = (type: 'fat' | 'protein' | 'carbs', delta: number) => {
    let newFat = fatPct;
    let newProtein = proteinPct;
    let newCarbs = carbsPct;

    if (type === 'fat') {
      newFat = Math.max(0, Math.min(100, fatPct + delta));
    } else if (type === 'protein') {
      newProtein = Math.max(0, Math.min(100, proteinPct + delta));
    } else {
      newCarbs = Math.max(0, Math.min(100, carbsPct + delta));
    }

    const normalized = normalizePercentages(newFat, newProtein, newCarbs);
    setFatPct(normalized.fat);
    setProteinPct(normalized.protein);
    setCarbsPct(normalized.carbs);
  };

  const addFeatureRequest = () => {
    if (!newFeature.trim()) return;
    const updated = [...featureRequests, { id: Date.now().toString(), text: newFeature.trim() }];
    setFeatureRequests(updated);
    setNewFeature('');
  };

  const startEdit = (id: string, text: string) => {
    setEditingId(id);
    setEditText(text);
  };

  const saveEdit = () => {
    if (!editingId || !editText.trim()) return;
    const updated = featureRequests.map(f => f.id === editingId ? { ...f, text: editText.trim() } : f);
    setFeatureRequests(updated);
    setEditingId(null);
    setEditText('');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditText('');
  };

  const deleteFeatureRequest = (id: string) => {
    const updated = featureRequests.filter(f => f.id !== id);
    setFeatureRequests(updated);
  };

  const handleExportData = async () => {
    if (!userId) return;
    setBackupBusy(true);
    setBackupStatus('');
    try {
      const payload = await exportUserData(userId);
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const datePart = new Date().toISOString().slice(0, 10);
      a.href = url;
      a.download = `macrometric-backup-${datePart}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setBackupStatus('Export completed.');
    } catch (error) {
      console.error(error);
      setBackupStatus('Export failed.');
    } finally {
      setBackupBusy(false);
    }
  };

  const handleImportData = async () => {
    if (!userId || !selectedImportFile) return;
    setBackupBusy(true);
    setBackupStatus('');
    try {
      const text = await selectedImportFile.text();
      const parsed = JSON.parse(text);
      const result = await importUserData(userId, parsed);
      setBackupStatus(`Import completed. ${result.imported} row(s) processed.`);
      setSelectedImportFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      await loadData();
    } catch (error) {
      console.error(error);
      setBackupStatus('Import failed. Check file format.');
    } finally {
      setBackupBusy(false);
    }
  };

  const targetWeight = calculateTargetWeight();
  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-pulse text-gray-500 dark:text-gray-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Daily Goals */}
      <CollapsibleSection title="Daily Goals" icon="target" defaultExpanded={true}>
        <div className="flex justify-between items-center mb-4">
          <span className="text-sm text-gray-500 dark:text-gray-400">Set your macros & steps</span>
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
        
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
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
          <div>
            <label className="block text-sm font-medium text-green-600 dark:text-green-400 mb-2">
              Daily Steps
            </label>
            <input
              type="number"
              value={stepGoal}
              onChange={(e) => setStepGoal(Number(e.target.value))}
              className="w-full px-4 py-3 rounded-xl border border-green-200 dark:border-green-700 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 outline-none text-lg"
            />
          </div>
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
            <span className="inline-flex items-center justify-center gap-1">
              {saved && <MaterialIcon name="check_circle" className="text-[18px]" />}
              {saved ? 'Saved!' : 'Save Goals'}
            </span>
          </button>
      </CollapsibleSection>

      {/* Event Goals */}
      <CollapsibleSection title="Event Goals" icon="target" gradient>
        <div className="bg-white/10 rounded-xl p-4 space-y-4">
          <div className="text-xs uppercase tracking-wide opacity-70">Event Goals List</div>
          <div className="space-y-2">
            {eventGoals.map((goal) => (
              <div key={goal.id} className="rounded-lg bg-white/20 p-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-semibold">
                      {goal.eventName || 'Untitled goal'}
                      {(goal.id === 'primary' || goal.isPrimary) && <span className="ml-2 text-xs px-2 py-0.5 rounded bg-green-500 text-white">Active</span>}
                    </div>
                    <div className="text-xs opacity-80">
                      {formatDateDDMMYYYY(goal.raceDate)} | {goal.targetWeight} kg | {goal.weeklyTarget} kg/week
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {goal.id !== 'primary' && !goal.isPrimary && (
                      <button
                        onClick={() => handleSetActiveEventGoal(goal.id)}
                        className="px-3 py-1.5 rounded-md bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700"
                      >
                        Set Active
                      </button>
                    )}
                    <button
                      onClick={() => handleSetEditingGoal(goal)}
                      className="px-3 py-1.5 rounded-md bg-slate-900/90 text-white border border-white/30 text-xs font-semibold hover:bg-slate-900"
                    >
                      Edit
                    </button>
                    {goal.id !== 'primary' && !goal.isPrimary && (
                      <button
                        onClick={() => handleDeleteEventGoal(goal.id)}
                        className="px-3 py-1.5 rounded-md bg-red-600 text-white text-xs font-semibold hover:bg-red-700"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="border-t border-white/30 pt-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-xs uppercase tracking-wide opacity-70">
                {showGoalForm ? (editingGoalId ? 'Edit Goal' : 'Add Goal') : 'Form Collapsed'}
              </div>
              <button
                onClick={handleNewGoal}
                className="px-2 py-1 rounded-md bg-white/20 text-white text-xs font-medium hover:bg-white/30"
              >
                {showGoalForm ? 'Close' : '+ New'}
              </button>
            </div>
            {showGoalForm && (
              <>
                <div>
                  <label className="block text-sm opacity-80 mb-1">Event Name</label>
                  <input
                    type="text"
                    value={goalFormName}
                    onChange={(e) => setGoalFormName(e.target.value)}
                    placeholder="e.g. Race, Wedding, Bodybuilding show"
                    className="w-full px-3 py-2 rounded-lg bg-white/20 border border-white/30 text-white placeholder-white/50 focus:ring-2 focus:ring-white outline-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm opacity-80 mb-1">Event Date</label>
                    <input
                      type="text"
                      value={goalFormDate}
                      onChange={(e) => setGoalFormDate(e.target.value.replaceAll('/', '-').replaceAll('.', '-'))}
                      onBlur={() => setGoalFormDate(normalizeToDisplayDate(goalFormDate))}
                      placeholder="dd-mm-yyyy"
                      inputMode="numeric"
                      className="w-full px-3 py-2 rounded-lg bg-white/20 border border-white/30 text-white placeholder-white/50 focus:ring-2 focus:ring-white outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm opacity-80 mb-1">Target Weight</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        step="0.1"
                        value={goalFormTargetWeight}
                        onChange={(e) => setGoalFormTargetWeight(Number(e.target.value))}
                        className="w-full px-3 py-2 rounded-lg bg-white/20 border border-white/30 text-white placeholder-white/50 focus:ring-2 focus:ring-white outline-none"
                      />
                      <span className="text-white">kg</span>
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
                      value={goalFormWeeklyTarget}
                      onChange={(e) => setGoalFormWeeklyTarget(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-lg bg-white/20 border border-white/30 text-white placeholder-white/50 focus:ring-2 focus:ring-white outline-none"
                    />
                    <span className="text-white">kg/week</span>
                  </div>
                  <p className="text-xs opacity-70 mt-1">{daysUntilRace} days until active event</p>
                </div>
                <button
                  onClick={handleSaveGoalFromForm}
                  disabled={!goalFormName.trim()}
                  className={`w-full py-2 rounded-lg font-semibold transition-colors ${
                    !goalFormName.trim()
                      ? 'bg-white/30 text-white/60 cursor-not-allowed'
                      : 'bg-white text-blue-600 hover:bg-white/90'
                  }`}
                >
                  <span className="inline-flex items-center justify-center gap-1">
                    {goalSaved && <MaterialIcon name="check_circle" className="text-[18px]" />}
                    {goalSaved ? 'Saved!' : editingGoalId ? 'Save Changes' : 'Add Goal'}
                  </span>
                </button>
              </>
            )}
          </div>
        </div>
      </CollapsibleSection>

      {/* Auto Milestones */}
      <CollapsibleSection title="Auto Milestones" icon="emoji_events">
        <div className="space-y-3">
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Deze milestones worden automatisch berekend. In History zie je alleen de milestones die al zijn geraakt.
          </p>

          <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-3">
            <div className="inline-flex items-center gap-2 text-sm font-medium text-gray-800 dark:text-gray-100">
              <MaterialIcon name="monitor_weight" className="text-[18px] text-indigo-600 dark:text-indigo-400" />
              Every kg less
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Gebaseerd op je check-ins en target weight.
            </div>
            <div className="text-sm text-gray-700 dark:text-gray-200 mt-2">
              Target: <span className="font-semibold">{raceTargetWeight} kg</span>
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-3">
            <div className="inline-flex items-center gap-2 text-sm font-medium text-gray-800 dark:text-gray-100">
              <MaterialIcon name="flag" className="text-[18px] text-indigo-600 dark:text-indigo-400" />
              Race finish date
            </div>
            <div className="text-sm text-gray-700 dark:text-gray-200 mt-2">
              Event date: <span className="font-semibold">{raceDate}</span>
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-3">
            <div className="inline-flex items-center gap-2 text-sm font-medium text-gray-800 dark:text-gray-100">
              <MaterialIcon name="local_fire_department" className="text-[18px] text-orange-500 dark:text-orange-400" />
              Achievement: ketosis &gt; 0.5
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Zodra een check-in ketonen boven 0.5 heeft, wordt deze milestone als behaald getoond.
            </div>
          </div>
        </div>
      </CollapsibleSection>

      {/* Your Stats */}
      <CollapsibleSection title="Your Stats" icon="monitoring">
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
                <span className={`text-xl font-bold ${targetBmi < 18.5 ? 'text-blue-600' : targetBmi <= 25 ? 'text-green-600' : targetBmi < 30 ? 'text-amber-500' : 'text-red-600'}`}>
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
      </CollapsibleSection>

      {/* Appearance */}
      <CollapsibleSection title="Appearance" icon="palette">
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
              <span className="inline-flex items-center gap-1"><MaterialIcon name={t === 'system' ? 'devices' : t === 'light' ? 'light_mode' : 'dark_mode'} className="text-[18px]" />{t.charAt(0).toUpperCase() + t.slice(1)}</span>
            </button>
          ))}
        </div>
      </CollapsibleSection>

      {/* Data Backup */}
      <CollapsibleSection title="Data Backup" icon="backup">
        <div className="space-y-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Export your data to JSON for backup, or import a previous backup.
          </p>

          <button
            onClick={handleExportData}
            disabled={backupBusy}
            className={`w-full py-3 font-semibold rounded-xl transition-colors ${
              backupBusy
                ? 'bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                : 'bg-green-600 text-white hover:bg-green-700'
            }`}
          >
            Export Data (JSON)
          </button>

          <div className="space-y-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              onChange={(e) => setSelectedImportFile(e.target.files?.[0] || null)}
              className="block w-full text-sm text-gray-700 dark:text-gray-200 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-gray-100 dark:file:bg-gray-700 file:text-gray-700 dark:file:text-gray-200"
            />
            <button
              onClick={handleImportData}
              disabled={backupBusy || !selectedImportFile}
              className={`w-full py-3 font-semibold rounded-xl transition-colors ${
                backupBusy || !selectedImportFile
                  ? 'bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              Import Data (JSON)
            </button>
          </div>

          {backupStatus && (
            <div className="text-sm text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 rounded-lg px-3 py-2">
              {backupStatus}
            </div>
          )}
        </div>
      </CollapsibleSection>

      {/* Maintenance */}
      <CollapsibleSection title="Maintenance" icon="build">
        <div className="space-y-3">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Open the maintenance view for bulk search/review/edit/delete on your foods.
          </p>
          <button
            onClick={() => navigate('/my-foods')}
            className="w-full py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors"
          >
            Open Food Manager
          </button>
          <button
            onClick={() => navigate('/food-entries')}
            className="w-full py-3 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition-colors"
          >
            Open Food Entries Manager
          </button>
        </div>
      </CollapsibleSection>

      {/* Password */}
      <CollapsibleSection title="Password" icon="lock">
        <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg text-sm text-gray-700 dark:text-gray-200">
          Logged in as: <span className="font-semibold">{email || 'Unknown account'}</span>
        </div>
        {passwordSuccess && (
          <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-lg text-center">
            Password changed successfully!
          </div>
        )}
        
        {showPasswordForm ? (
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Current Password</label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">New Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Confirm New Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none"
              />
            </div>
            
            {passwordError && (
              <div className="p-3 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg text-sm">
                {passwordError}
              </div>
            )}
            
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowPasswordForm(false);
                  setCurrentPassword('');
                  setNewPassword('');
                  setConfirmPassword('');
                  setPasswordError('');
                }}
                className="flex-1 py-3 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 font-semibold rounded-xl hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors"
              >
                Change Password
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Your account is protected with your login password.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowPasswordForm(true)}
                className="w-full py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors"
              >
                Change Password
              </button>
            </div>
          </div>
        )}
      </CollapsibleSection>

      {/* About */}
      <CollapsibleSection title="About" icon="info">
        <div className="space-y-4">
          <div className="text-center pb-2">
            <p className="text-sm text-gray-500 dark:text-gray-400">Created by</p>
            <p className="text-lg font-semibold text-gray-800 dark:text-gray-100">JOB</p>
            <p className="text-xs text-gray-400 mt-1">v{getVersionString()}</p>
          </div>

          <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
            <h3 className="font-semibold text-gray-800 dark:text-gray-100 mb-2">Release Notes</h3>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {releaseNotes.map((note, index) => (
                <div key={index} className="text-sm bg-gray-50 dark:bg-gray-700 rounded-lg p-2">
                  <span className="text-xs text-gray-500 dark:text-gray-400">{note.date}</span>
                  <p className="text-gray-700 dark:text-gray-200">{note.note}</p>
                </div>
              ))}
            </div>
            <div className="mt-3 flex gap-2">
              <input
                type="text"
                value={newReleaseNote}
                onChange={(e) => setNewReleaseNote(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newReleaseNote.trim()) {
                    addReleaseNote(newReleaseNote.trim());
                    setNewReleaseNote('');
                  }
                }}
                placeholder="Add release note..."
                className="flex-1 px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none"
              />
              <button
                onClick={() => {
                  if (newReleaseNote.trim()) {
                    addReleaseNote(newReleaseNote.trim());
                    setNewReleaseNote('');
                  }
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors"
              >
                +
              </button>
            </div>
          </div>

          <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
            <h3 className="font-semibold text-gray-800 dark:text-gray-100 mb-2">Feature Requests / Todo</h3>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {featureRequests.length === 0 && (
                <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-2">No feature requests yet</p>
              )}
              {featureRequests.map((feature) => (
                <div key={feature.id} className="flex items-center gap-2 bg-gray-50 dark:bg-gray-700 rounded-lg p-2">
                  {editingId === feature.id ? (
                    <>
                      <input
                        type="text"
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        className="flex-1 px-2 py-1 text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                        autoFocus
                      />
                      <button onClick={saveEdit} className="text-green-600 hover:text-green-700 p-1"><MaterialIcon name="save" className="text-[18px]" /></button>
                      <button onClick={cancelEdit} className="text-gray-500 hover:text-gray-600 p-1"><MaterialIcon name="close" className="text-[18px]" /></button>
                    </>
                  ) : (
                    <>
                      <span className="flex-1 text-sm text-gray-700 dark:text-gray-200">{feature.text}</span>
                      <button onClick={() => startEdit(feature.id, feature.text)} className="text-blue-500 hover:text-blue-600 p-1"><MaterialIcon name="edit" className="text-[18px]" /></button>
                      <button onClick={() => deleteFeatureRequest(feature.id)} className="text-red-500 hover:text-red-600 p-1"><MaterialIcon name="delete" className="text-[18px]" /></button>
                    </>
                  )}
                </div>
              ))}
            </div>
            <div className="mt-3 flex gap-2">
              <input
                type="text"
                value={newFeature}
                onChange={(e) => setNewFeature(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addFeatureRequest()}
                placeholder="Add feature request..."
                className="flex-1 px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none"
              />
              <button
                onClick={addFeatureRequest}
                className="px-4 py-2 bg-primary-500 text-white rounded-xl hover:bg-primary-600 transition-colors"
              >
                +
              </button>
            </div>
          </div>
        </div>
      </CollapsibleSection>
    </div>
  );
}


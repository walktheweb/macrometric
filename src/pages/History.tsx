import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getHistory, DayLog, getCheckins, getRaceGoal, RaceGoal, deleteCheckin, Checkin, getEventGoals, EventGoalItem, getMilestones, Milestone, syncAutoWeightMilestones, getFastingSessions, deleteFastingSession, FastingSession } from '../lib/api';
import { formatDateDDMMYYYY } from '../lib/date';
import MaterialIcon from '../components/MaterialIcon';

function formatTimeWithoutSeconds(time?: string) {
  if (!time) return '';
  const parts = time.split(':');
  if (parts.length < 2) return time;
  return `${parts[0]}:${parts[1]}`;
}

function getToneClass(tone: 'green' | 'amber' | 'orange' | 'red' | 'critical') {
  if (tone === 'green') return 'text-green-600 dark:text-green-400';
  if (tone === 'amber') return 'text-amber-600 dark:text-amber-400';
  if (tone === 'orange') return 'text-orange-600 dark:text-orange-400';
  if (tone === 'critical') return 'text-red-700 dark:text-red-300';
  return 'text-red-600 dark:text-red-400';
}

function getBpHighToneClass(sys: number) {
  if (sys >= 150) return getToneClass('red');
  if (sys > 129) return getToneClass('orange');
  if (sys > 120) return getToneClass('amber');
  return getToneClass('green');
}

function getBpLowToneClass(dia: number) {
  if (dia > 95) return getToneClass('red');
  if (dia > 90) return getToneClass('orange');
  if (dia >= 85) return getToneClass('amber');
  if (dia < 85) return getToneClass('green');
  return getToneClass('amber');
}

function getKetonesToneClass(ketones: number) {
  if (ketones < 0.5) return getToneClass('red');
  if (ketones < 1) return getToneClass('amber');
  if (ketones <= 5) return getToneClass('green');
  return getToneClass('critical');
}

function getGlucoseToneClass(glucose: number) {
  if (glucose < 3.9) return getToneClass('red');
  if (glucose < 4.4) return getToneClass('amber');
  if (glucose <= 7.2) return getToneClass('green');
  if (glucose <= 10) return getToneClass('amber');
  if (glucose <= 13.9) return getToneClass('red');
  return getToneClass('critical');
}

function getHeartRateToneClass(heartRate: number) {
  if (heartRate < 43) return getToneClass('red');
  if (heartRate <= 140) return getToneClass('green');
  return getToneClass('red');
}

function getFerritinToneClass(ferritin: number) {
  if (ferritin < 250) return getToneClass('green');
  if (ferritin <= 400) return getToneClass('orange');
  return 'text-red-600 dark:text-red-400';
}

function getFastingHours(fastStartTime?: string | null, firstMealTime?: string | null) {
  if (!fastStartTime || !firstMealTime) return null;
  const [startHour, startMinute] = fastStartTime.split(':').map(Number);
  const [mealHour, mealMinute] = firstMealTime.split(':').map(Number);
  if ([startHour, startMinute, mealHour, mealMinute].some((value) => !Number.isFinite(value))) return null;
  let startTotal = startHour * 60 + startMinute;
  let mealTotal = mealHour * 60 + mealMinute;
  if (mealTotal <= startTotal) mealTotal += 24 * 60;
  return Math.round(((mealTotal - startTotal) / 60) * 10) / 10;
}

function getElapsedFastingHours(date?: string | null, fastStartTime?: string | null, now = new Date()) {
  if (!date || !fastStartTime) return null;
  const normalizedDate = /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : '';
  if (!normalizedDate) return null;
  const [hours, minutes] = fastStartTime.split(':').map(Number);
  if (![hours, minutes].every(Number.isFinite)) return null;

  const startedAt = new Date(`${normalizedDate}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`);
  if (Number.isNaN(startedAt.getTime())) return null;

  const diffMs = now.getTime() - startedAt.getTime();
  if (diffMs < 0) return 0;
  return Math.round((diffMs / (1000 * 60 * 60)) * 10) / 10;
}

export default function History() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { userId, loading: authLoading } = useAuth();
  const [history, setHistory] = useState<Record<string, DayLog>>({});
  const [checkins, setCheckins] = useState<Checkin[]>([]);
  const [allCheckins, setAllCheckins] = useState<Checkin[]>([]);
  const [fastingSessions, setFastingSessions] = useState<FastingSession[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [eventGoals, setEventGoals] = useState<EventGoalItem[]>([]);
  const [raceGoal, setRaceGoal] = useState<RaceGoal | null>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(7);
  const [nowTick, setNowTick] = useState(() => Date.now());
  const initialTab = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState<'food' | 'checkin' | 'fasting' | 'goals' | 'milestones'>(
    initialTab === 'checkin' || initialTab === 'fasting' || initialTab === 'goals' || initialTab === 'milestones' ? initialTab : 'food'
  );
  const [expandedFoodDates, setExpandedFoodDates] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (userId) {
      loadData();
    }
  }, [userId, days]);

  useEffect(() => {
    const timer = window.setInterval(() => setNowTick(Date.now()), 60000);
    return () => window.clearInterval(timer);
  }, []);

  const loadData = async () => {
    if (!userId) return;
    setLoading(true);
    try {
      await syncAutoWeightMilestones(userId);
      const [historyData, checkinsData, fastingData, raceGoalData, eventGoalsData, milestonesData] = await Promise.all([
        getHistory(userId, days),
        getCheckins(userId),
        getFastingSessions(userId),
        getRaceGoal(userId),
        getEventGoals(userId),
        getMilestones(userId),
      ]);
      setHistory(historyData);
      setAllCheckins(checkinsData);
      setCheckins(checkinsData.slice(0, 30));
      setFastingSessions(fastingData);
      setRaceGoal(raceGoalData);
      setEventGoals(eventGoalsData);
      setMilestones(milestonesData);
    } catch (error) {
      console.error('Failed to load history', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCheckin = async (checkinId: string) => {
    if (!userId) return;
    if (!confirm('Delete this check-in?')) return;
    await deleteCheckin(userId, checkinId);
    loadData();
  };

  const handleDeleteFasting = async (sessionId: string) => {
    if (!userId) return;
    if (!confirm('Delete this fasting session?')) return;
    await deleteFastingSession(userId, sessionId);
    loadData();
  };

  const handleEditFasting = (sessionId: string) => {
    navigate(`/?editFasting=${encodeURIComponent(sessionId)}&from=history`);
  };

  const toggleFoodDate = (dateStr: string) => {
    setExpandedFoodDates(prev => {
      const next = new Set(prev);
      if (next.has(dateStr)) next.delete(dateStr);
      else next.add(dateStr);
      return next;
    });
  };

  const formatDate = (dateStr: string, timeStr?: string) => {
    const cleanTime = formatTimeWithoutSeconds(timeStr);
    return cleanTime ? `${formatDateDDMMYYYY(dateStr)} - ${cleanTime}` : formatDateDDMMYYYY(dateStr);
  };

  const formatCreatedAtDate = (createdAt?: number) => {
    if (!createdAt) return '';
    const date = new Date(createdAt);
    if (Number.isNaN(date.getTime())) return '';
    return formatDateDDMMYYYY(date.toISOString().slice(0, 10));
  };



  if (authLoading || loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-pulse text-gray-500 dark:text-gray-400">Loading history...</div>
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

  const sortedDates = Object.keys(history).sort((a, b) => b.localeCompare(a));
  const today = new Date();
  const ketosisEntries = allCheckins
    .filter((item) => typeof item.ketones === 'number' && Number.isFinite(item.ketones))
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date));
  const ketosisMilestones = ketosisEntries
    .filter((item) => (item.ketones || 0) >= 0.5)
    .reduce<Record<string, Checkin>>((acc, item) => {
      const existing = acc[item.date];
      if (!existing) {
        acc[item.date] = item;
        return acc;
      }
      const existingKetones = existing.ketones || 0;
      const nextKetones = item.ketones || 0;
      if (nextKetones > existingKetones) {
        acc[item.date] = item;
        return acc;
      }
      if (nextKetones === existingKetones && (item.createdAt || 0) > (existing.createdAt || 0)) {
        acc[item.date] = item;
      }
      return acc;
    }, {});
  const ketoDone = Object.keys(ketosisMilestones).length > 0;
  const achievedEventGoals = eventGoals.filter((goal) => {
    const eventDate = new Date(`${goal.raceDate}T00:00:00`);
    return eventDate.getTime() <= new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  });
  const weightedAsc = allCheckins
    .filter((item) => typeof item.weight === 'number' && Number.isFinite(item.weight))
    .slice()
    .sort((a, b) => {
      const byDate = a.date.localeCompare(b.date);
      if (byDate !== 0) return byDate;
      return (a.createdAt || 0) - (b.createdAt || 0);
    });
  const latestWeight = weightedAsc[weightedAsc.length - 1]?.weight ?? null;
  const fallbackMilestones: Milestone[] = [];
  if (allCheckins.length > 0) {
    const firstCheckin = allCheckins
      .slice()
      .sort((a, b) => {
        const byDate = a.date.localeCompare(b.date);
        if (byDate !== 0) return byDate;
        return (a.createdAt || 0) - (b.createdAt || 0);
      })[0];
    if (firstCheckin) {
      fallbackMilestones.push({
        id: 'derived-first-checkin',
        title: 'First check-in',
        date: firstCheckin.date,
        notes:
          firstCheckin.notes ||
          (typeof firstCheckin.weight === 'number' ? `${firstCheckin.weight} kg` : 'Derived from check-ins'),
        done: true,
        createdAt: firstCheckin.createdAt || Date.now(),
      });
    }
  }
  if (weightedAsc.length > 0 && latestWeight !== null) {
    const firstWeight = weightedAsc[0].weight as number;
    const maxWeight = weightedAsc.reduce((max, item) => Math.max(max, item.weight as number), Number.NEGATIVE_INFINITY);
    const minWeight = weightedAsc.reduce((min, item) => Math.min(min, item.weight as number), Number.POSITIVE_INFINITY);
    const fromThreshold = Math.max(Math.floor(firstWeight), Math.ceil(maxWeight));
    const toThreshold = Math.floor(minWeight);
    for (let threshold = fromThreshold; threshold >= toThreshold; threshold -= 1) {
      const hit = weightedAsc.find((entry) => (entry.weight || Number.POSITIVE_INFINITY) < threshold);
      if (!hit) continue;
      fallbackMilestones.push({
        id: `derived-under-${threshold}`,
        title: `Under ${threshold} kg`,
        date: hit.date,
        notes: 'auto:weight-derived',
        done: true,
        createdAt: hit.createdAt || Date.now(),
      });
    }
  }
  const allMilestones = [...milestones, ...fallbackMilestones.filter((fallback) => !milestones.some((item) => item.title === fallback.title && item.date === fallback.date))]
    .slice()
    .sort((a, b) => {
      const byDate = b.date.localeCompare(a.date);
      if (byDate !== 0) return byDate;
      return (b.createdAt || 0) - (a.createdAt || 0);
    });
  const milestoneHistoryItems = [
    ...allMilestones.map((item) => ({
      id: item.id,
      date: item.date,
      createdAt: item.createdAt || 0,
      icon: (item.notes || '').startsWith('auto:weight') ? 'monitor_weight' : 'emoji_events',
      iconClass: 'text-green-600 dark:text-green-400',
      title: item.title,
      status: item.done ? 'Done' : 'Planned',
      statusClass: item.done ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400',
      subtitle: `${item.done ? 'Reached' : 'Target'}: ${formatDateDDMMYYYY(item.date)}`,
      meta: formatCreatedAtDate(item.createdAt) ? `Added: ${formatCreatedAtDate(item.createdAt)}` : '',
      notes: item.notes && !(item.notes || '').startsWith('auto:weight') ? item.notes : '',
    })),
    ...achievedEventGoals.map((goal) => ({
      id: `event-${goal.id}`,
      date: goal.raceDate,
      createdAt: goal.createdAt || 0,
      icon: 'flag',
      iconClass: 'text-green-600 dark:text-green-400',
      title: goal.eventName || 'Event goal reached',
      status: 'Done',
      statusClass: 'text-green-600 dark:text-green-400',
      subtitle: formatDateDDMMYYYY(goal.raceDate),
      meta: '',
      notes: '',
    })),
    ...Object.values(ketosisMilestones).map((entry) => ({
      id: `ketosis-${entry.date}`,
      date: entry.date,
      createdAt: entry.createdAt || 0,
      icon: 'local_fire_department',
      iconClass: 'text-orange-500 dark:text-orange-400',
      title: 'Ketosis >= 0.5',
      status: 'Done',
      statusClass: 'text-green-600 dark:text-green-400',
      subtitle: `${entry.ketones} on ${formatDateDDMMYYYY(entry.date)}`,
      meta: '',
      notes: '',
    })),
  ].sort((a, b) => {
    const byDate = b.date.localeCompare(a.date);
    if (byDate !== 0) return byDate;
    return (b.createdAt || 0) - (a.createdAt || 0);
  });
  const fastingEntries = fastingSessions
    .slice()
    .sort((a, b) => {
      const byDate = b.date.localeCompare(a.date);
      if (byDate !== 0) return byDate;
      const byTime = (b.startTime || '').localeCompare(a.startTime || '');
      if (byTime !== 0) return byTime;
      return (b.createdAt || 0) - (a.createdAt || 0);
    });

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">History</h2>
        <select
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
          className="px-3 py-1.5 bg-gray-100 dark:bg-gray-700 rounded-lg text-sm text-gray-700 dark:text-gray-200"
        >
          <option value={7}>Last 7 days</option>
          <option value={14}>Last 14 days</option>
          <option value={30}>Last 30 days</option>
        </select>
      </div>

      <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
        <button
          onClick={() => setActiveTab('food')}
          className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${
            activeTab === 'food' ? 'bg-white dark:bg-gray-600 shadow text-primary-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-300'
          }`}
        >
          Food
        </button>
        <button
          onClick={() => setActiveTab('checkin')}
          className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${
            activeTab === 'checkin' ? 'bg-white dark:bg-gray-600 shadow text-primary-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-300'
          }`}
        >
          Check-in
        </button>
        <button
          onClick={() => setActiveTab('goals')}
          className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${
            activeTab === 'goals' ? 'bg-white dark:bg-gray-600 shadow text-primary-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-300'
          }`}
        >
          Goals
        </button>
        <button
          onClick={() => setActiveTab('fasting')}
          className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${
            activeTab === 'fasting' ? 'bg-white dark:bg-gray-600 shadow text-primary-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-300'
          }`}
        >
          Fasting
        </button>
        <button
          onClick={() => setActiveTab('milestones')}
          className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${
            activeTab === 'milestones' ? 'bg-white dark:bg-gray-600 shadow text-primary-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-300'
          }`}
        >
          Milestones
        </button>
      </div>

      {activeTab === 'food' && (
        <>
          {sortedDates.length === 0 ? (
            <div className="text-center py-12 text-gray-400 dark:text-gray-500">
              No logs yet. Start tracking today!
            </div>
          ) : (
            <div className="space-y-3">
              {sortedDates.map(dateStr => {
                const dayData = history[dateStr];
                const isExpanded = expandedFoodDates.has(dateStr);
                return (
                  <div key={dateStr} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
                    <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700 border-b border-gray-100 dark:border-gray-600">
                      <div className="flex items-center justify-between gap-3">
                        <div className="font-medium text-gray-800 dark:text-gray-100">{formatDate(dateStr)}</div>
                        <div className="flex items-center gap-3 ml-auto">
                          <Link
                            to={`/food-entries?date=${dateStr}`}
                            className="text-xs text-blue-600 dark:text-blue-400 hover:underline whitespace-nowrap"
                          >
                            Open in Entry Manager
                          </Link>
                          <button
                            onClick={() => toggleFoodDate(dateStr)}
                            className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white text-sm leading-none"
                            aria-label={isExpanded ? 'Collapse items' : 'Expand items'}
                            title={isExpanded ? 'Collapse items' : 'Expand items'}
                          >
                            <MaterialIcon name={isExpanded ? 'expand_less' : 'expand_more'} className="text-[18px]" />
                          </button>
                        </div>
                      </div>
                    </div>
                    
                    <div className="p-4">
                      <div className="grid grid-cols-4 gap-2 mb-4">
                        <div className="text-center">
                          <div className="text-lg font-bold text-gray-900 dark:text-gray-100">
                            {Math.round(dayData.totals.calories)}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">kcal</div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-bold text-blue-500 dark:text-blue-400">
                            {Math.round(dayData.totals.fat)}g
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">Fat</div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-bold text-red-500 dark:text-red-400">
                            {Math.round(dayData.totals.protein)}g
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">Protein</div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-bold text-amber-500 dark:text-amber-400">
                            {Math.round(dayData.totals.carbs)}g
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">Carbs</div>
                        </div>
                      </div>
                      
                      {isExpanded && dayData.logs.length > 0 && (
                        <div className="border-t border-gray-100 dark:border-gray-700 pt-3 space-y-2">
                          {dayData.logs.map(log => (
                            <div key={log.id} className="flex justify-between text-sm">
                              <span className="text-gray-600 dark:text-gray-300 truncate">{log.name}</span>
                              <span className="text-gray-500 dark:text-gray-400 ml-2">{Math.round(log.calories)} kcal</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {activeTab === 'checkin' && (
        <>
          {checkins.length === 0 ? (
            <div className="text-center py-12 text-gray-400 dark:text-gray-500">
              No check-ins yet. Do your first check-in!
            </div>
          ) : (
            <div className="space-y-3">
              {checkins.map(checkin => (
                <Link
                  key={checkin.id}
                  to={`/?editCheckin=${checkin.id}&from=history`}
                  className="block bg-purple-50 dark:bg-purple-900/20 rounded-xl shadow-sm overflow-hidden border border-purple-100 dark:border-purple-800"
                >
                  <div className="px-4 py-3 bg-purple-100 dark:bg-purple-900/50 border-b border-purple-200 dark:border-purple-800 flex justify-between items-center">
                    <div className="grid grid-cols-[auto_auto] gap-x-3 items-center font-medium text-purple-800 dark:text-purple-200">
                      <div className="tabular-nums">{formatDateDDMMYYYY(checkin.date)}</div>
                      <div className="tabular-nums min-w-[3.5rem] text-right">{checkin.checkinTime ? formatTimeWithoutSeconds(checkin.checkinTime) : ''}</div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleDeleteCheckin(checkin.id)}
                        onMouseDown={(e) => e.preventDefault()}
                        onClickCapture={(e) => e.stopPropagation()}
                        onKeyDown={(e) => e.stopPropagation()}
                        className="p-2 text-red-500 hover:bg-red-100 dark:hover:bg-red-900 rounded-lg"
                        title="Delete"
                      >
                        <MaterialIcon name="delete" className="text-[18px]" />
                      </button>
                    </div>
                  </div>
                  
                  <div className="p-4">
                    <div className="grid grid-cols-4 gap-2">
                      {checkin.steps && (
                        <div className="text-center">
                          <div className="text-lg font-bold text-green-600 dark:text-green-400">{checkin.steps}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">steps</div>
                        </div>
                      )}
                      {checkin.weight && (
                        <div className="text-center">
                          <div className="text-lg font-bold text-gray-900 dark:text-gray-100">{checkin.weight}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">kg</div>
                        </div>
                      )}
                      {checkin.ketones && (
                        <div className="text-center">
                          <div className={`text-lg font-bold ${getKetonesToneClass(checkin.ketones)}`}>{checkin.ketones}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">ketones</div>
                        </div>
                      )}
                      {checkin.glucose && (
                        <div className="text-center">
                          <div className={`text-lg font-bold ${getGlucoseToneClass(checkin.glucose)}`}>{checkin.glucose}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">glucose</div>
                        </div>
                      )}
                      {checkin.heartRate && (
                        <div className="text-center">
                          <div className={`text-lg font-bold ${getHeartRateToneClass(checkin.heartRate)}`}>{checkin.heartRate}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">HR</div>
                        </div>
                      )}
                      {checkin.bpHigh && checkin.bpLow && (
                        <div className="text-center">
                          <div className="text-lg font-bold">
                            <span className={getBpHighToneClass(checkin.bpHigh)}>{checkin.bpHigh}</span>
                            <span className="text-gray-500 dark:text-gray-400">/</span>
                            <span className={getBpLowToneClass(checkin.bpLow)}>{checkin.bpLow}</span>
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">BP</div>
                        </div>
                      )}
                      {checkin.saturation && (
                        <div className="text-center">
                          <div className="text-lg font-bold text-blue-600 dark:text-blue-400">{checkin.saturation}%</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">sat</div>
                        </div>
                      )}
                      {checkin.cholesterol && (
                        <div className="text-center">
                          <div className="text-lg font-bold text-amber-600 dark:text-amber-400">{checkin.cholesterol}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">chol</div>
                        </div>
                      )}
                      {checkin.ferritin && (
                        <div className="text-center">
                          <div className={`text-lg font-bold ${getFerritinToneClass(checkin.ferritin)}`}>{checkin.ferritin}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">ferr</div>
                        </div>
                      )}
                    </div>
                    {checkin.notes && (
                      <div className="mt-3 pt-3 border-t border-purple-100 dark:border-purple-800">
                        <div className="text-sm text-gray-600 dark:text-gray-300 italic">{checkin.notes}</div>
                      </div>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </>
      )}

      {activeTab === 'goals' && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-5">
          <div className="flex items-center gap-3 mb-4">
            <MaterialIcon name="target" className="text-[30px] text-blue-500 dark:text-blue-400" />
            <div>
              <div className="font-semibold text-lg text-gray-900 dark:text-gray-100">
                {raceGoal?.eventName || 'Event Goal'}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                {raceGoal?.raceDate ? formatDateDDMMYYYY(raceGoal.raceDate) : 'No date set'}
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4 mt-4">
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {raceGoal?.targetWeight || '—'} kg
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Target Weight</div>
            </div>
            <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                {raceGoal?.weeklyTarget || '—'} kg
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Weekly Target</div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'fasting' && (
        <>
          {fastingEntries.length === 0 ? (
            <div className="text-center py-12 text-gray-400 dark:text-gray-500">
              No fasting history yet.
            </div>
          ) : (
            <div className="space-y-3">
              {fastingEntries.map((entry) => {
                const fastingHours = getFastingHours(entry.startTime, entry.endTime);
                const liveFastingHours = fastingHours ?? getElapsedFastingHours(entry.date, entry.startTime, new Date(nowTick));
                const isCompleted = fastingHours !== null;
                const isSuccessful = (fastingHours || 0) >= 16;
                return (
                  <div
                    key={`fasting-${entry.id}`}
                    className="bg-indigo-50 dark:bg-indigo-900/20 rounded-xl shadow-sm overflow-hidden border border-indigo-100 dark:border-indigo-800 cursor-pointer"
                    role="button"
                    tabIndex={0}
                    onClick={() => handleEditFasting(entry.id)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        handleEditFasting(entry.id);
                      }
                    }}
                  >
                    <div className="px-4 py-3 bg-indigo-100 dark:bg-indigo-900/50 border-b border-indigo-200 dark:border-indigo-800 flex items-center justify-between gap-3">
                      <div className="font-medium text-indigo-800 dark:text-indigo-200">
                        {formatDate(entry.date, entry.endTime || entry.startTime)}
                      </div>
                      <div className="flex items-center gap-2">
                        {isCompleted ? (
                          <span className={`text-sm font-semibold ${isSuccessful ? 'text-yellow-600 dark:text-yellow-400' : 'text-red-600 dark:text-red-400'}`}>
                            {isSuccessful ? 'Fast completed' : 'Fast to short'}
                          </span>
                        ) : (
                          <span className="text-sm font-semibold text-indigo-600 dark:text-indigo-300">In progress</span>
                        )}
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            handleDeleteFasting(entry.id);
                          }}
                          className="p-2 text-red-500 hover:bg-red-100 dark:hover:bg-red-900 rounded-lg"
                          title="Delete"
                          aria-label="Delete fasting entry"
                        >
                          <MaterialIcon name="delete" className="text-[18px]" />
                        </button>
                      </div>
                    </div>
                    <div className="p-4">
                      <div className="grid grid-cols-3 gap-3">
                        <div className="text-center">
                          <div className="text-lg font-bold text-indigo-600 dark:text-indigo-400">
                            {formatTimeWithoutSeconds(entry.startTime) || '--:--'}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">Fast start</div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-bold text-indigo-600 dark:text-indigo-400">
                            {formatTimeWithoutSeconds(entry.endTime) || '--:--'}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">First meal</div>
                        </div>
                        <div className="text-center">
                          <div className={`text-lg font-bold ${isCompleted ? (isSuccessful ? 'text-yellow-600 dark:text-yellow-400' : 'text-red-600 dark:text-red-400') : 'text-gray-900 dark:text-gray-100'}`}>
                            {liveFastingHours !== null ? `${liveFastingHours} h` : '--'}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">Duration</div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {activeTab === 'milestones' && (
        <div className="space-y-3">
          <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-xl shadow-sm p-4 border border-indigo-100 dark:border-indigo-800">
            <div className="text-sm font-semibold text-indigo-700 dark:text-indigo-300 mb-3">Milestones</div>
            <div className="space-y-2">
              {milestoneHistoryItems.map((item) => (
                <div key={item.id} className="rounded-lg border border-green-200 dark:border-green-800 bg-white/80 dark:bg-green-950/20 p-3">
                  <div className="flex items-center justify-between gap-2 text-sm">
                    <div className="inline-flex items-center gap-2 text-gray-800 dark:text-gray-100">
                      <MaterialIcon
                        name={item.icon}
                        className={`text-[18px] ${item.iconClass}`}
                      />
                      {item.title}
                    </div>
                    <span className={`font-semibold ${item.statusClass}`}>
                      {item.status}
                    </span>
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-300 mt-1">{item.subtitle}</div>
                  {item.meta && (
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {item.meta}
                    </div>
                  )}
                  {item.notes ? (
                    <div className="text-xs text-gray-600 dark:text-gray-300 mt-1">{item.notes}</div>
                  ) : null}
                </div>
              ))}

              {milestoneHistoryItems.length === 0 && !ketoDone && (
                <div className="text-sm text-gray-500 dark:text-gray-400">No milestones yet.</div>
              )}
            </div>
          </div>

        </div>
      )}
    </div>
  );
}



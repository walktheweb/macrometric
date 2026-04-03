import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  getTrips,
  saveTrip,
  updateTrip,
  deleteTrip,
  Trip,
  getCheckins,
  getRaceGoal,
  getMilestones,
  getEventGoals,
  Checkin,
  Milestone,
  EventGoalItem,
} from '../lib/api';
import { formatDateDDMMYYYY } from '../lib/date';
import MaterialIcon from '../components/MaterialIcon';

function formatTimeWithoutSeconds(time?: string) {
  if (!time) return '';
  const parts = time.split(':');
  if (parts.length < 2) return time;
  return `${parts[0]}:${parts[1]}`;
}

export default function Trips() {
  const { userId, loading: authLoading } = useAuth();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [checkins, setCheckins] = useState<Checkin[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [eventGoals, setEventGoals] = useState<EventGoalItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingTripId, setEditingTripId] = useState<string | null>(null);
  const [distance, setDistance] = useState('');
  const [hours, setHours] = useState('');
  const [minutes, setMinutes] = useState('');
  const [avgSpeed, setAvgSpeed] = useState('');
  const [avgHeartRate, setAvgHeartRate] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (userId) {
      loadTrips();
    }
  }, [userId]);

  const loadTrips = async () => {
    if (!userId) return;
    setLoading(true);
    const [tripData, checkinData, raceGoalData, milestoneData, eventGoalData] = await Promise.all([
      getTrips(userId),
      getCheckins(userId),
      getRaceGoal(userId),
      getMilestones(userId),
      getEventGoals(userId),
    ]);
    setTrips(tripData);
    setCheckins(checkinData);
    setMilestones(milestoneData);
    setEventGoals([
      {
        id: 'primary',
        eventName: raceGoalData.eventName,
        raceDate: raceGoalData.raceDate,
        targetWeight: raceGoalData.targetWeight,
        weeklyTarget: raceGoalData.weeklyTarget,
        createdAt: 0,
        isPrimary: true,
      },
      ...eventGoalData.filter((item) => item.id !== 'primary'),
    ]);
    setLoading(false);
  };

  const resetFormState = () => {
    setShowForm(false);
    setEditingTripId(null);
    setDistance('');
    setHours('');
    setMinutes('');
    setAvgSpeed('');
    setAvgHeartRate('');
    setDescription('');
  };

  const weekStats = useMemo(() => {
    const today = new Date();
    const dayOfWeek = (today.getDay() + 6) % 7; // Monday = 0
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - dayOfWeek);
    const startStr = startOfWeek.toISOString().split('T')[0];
    const weekTrips = trips.filter(t => t.date >= startStr);
    
    return {
      count: weekTrips.length,
      totalDistance: weekTrips.reduce((sum, t) => sum + t.distance, 0),
      totalDuration: weekTrips.reduce((sum, t) => sum + t.duration, 0),
    };
  }, [trips]);

  const getIsoWeekNumber = (date: Date) => {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  };

  const currentWeekNumber = getIsoWeekNumber(new Date());

  const handleSaveTrip = async () => {
    if (!userId || !distance || (!hours && !minutes)) return;

    const duration = (parseInt(hours) || 0) * 60 + (parseInt(minutes) || 0);
    if (duration <= 0) return;

    const payload = {
      distance: parseFloat(distance),
      duration,
      avgSpeed: parseFloat(avgSpeed) || 0,
      avgHeartRate: parseInt(avgHeartRate) || 0,
      description: description.trim() || undefined,
    };

    if (editingTripId) {
      await updateTrip(userId, editingTripId, payload);
    } else {
      await saveTrip(userId, payload);
    }

    await loadTrips();
    resetFormState();
  };

  useEffect(() => {
    if (!showForm) return;

    window.dispatchEvent(
      new CustomEvent('macrometric:header-context', {
        detail: {
          showBack: true,
          buttons: [
            { id: 'cancel-trip', label: 'Cancel', tone: 'danger' },
            { id: 'save-trip', label: 'Save', tone: 'primary' },
          ],
        },
      })
    );

    const handleHeaderBack = () => {
      resetFormState();
    };

    const handleHeaderAction = async (event: Event) => {
      const actionId = (event as CustomEvent<{ id?: string }>).detail?.id;
      if (actionId === 'cancel-trip') {
        resetFormState();
        return;
      }
      if (actionId === 'save-trip') {
        await handleSaveTrip();
      }
    };

    window.addEventListener('macrometric:header-back', handleHeaderBack);
    window.addEventListener('macrometric:header-action', handleHeaderAction as EventListener);

    return () => {
      window.removeEventListener('macrometric:header-back', handleHeaderBack);
      window.removeEventListener('macrometric:header-action', handleHeaderAction as EventListener);
      window.dispatchEvent(new CustomEvent('macrometric:header-context', { detail: null }));
    };
  }, [showForm, editingTripId, distance, hours, minutes, avgSpeed, avgHeartRate, description, userId]);

  const handleEdit = (trip: Trip) => {
    setEditingTripId(trip.id);
    setDistance(String(trip.distance || ''));
    const h = Math.floor((trip.duration || 0) / 60);
    const m = (trip.duration || 0) % 60;
    setHours(h > 0 ? String(h) : '');
    setMinutes(String(m));
    setAvgSpeed(trip.avgSpeed ? String(trip.avgSpeed) : '');
    setAvgHeartRate(trip.avgHeartRate ? String(trip.avgHeartRate) : '');
    setDescription(trip.description || '');
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!userId) return;
    if (!confirm('Delete this ride?')) return;
    await deleteTrip(userId, id);
    await loadTrips();
  };

  const formatDuration = (mins: number) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  const formatDate = (dateStr: string) => {
    return formatDateDDMMYYYY(dateStr);
  };

  const formatCreatedAtDate = (createdAt?: number) => {
    if (!createdAt) return '';
    const date = new Date(createdAt);
    if (Number.isNaN(date.getTime())) return '';
    return formatDateDDMMYYYY(date.toISOString().slice(0, 10));
  };

  const createdAtToIsoDate = (createdAt?: number) => {
    if (!createdAt) return '';
    const date = new Date(createdAt);
    if (Number.isNaN(date.getTime())) return '';
    return date.toISOString().slice(0, 10);
  };

  const firstCheckin = useMemo(() => {
    return checkins
      .slice()
      .sort((a, b) => {
        const byDate = a.date.localeCompare(b.date);
        if (byDate !== 0) return byDate;
        return (a.checkinTime || '').localeCompare(b.checkinTime || '');
      })[0] || null;
  }, [checkins]);

  const derivedMilestones = useMemo(() => {
    const result: Milestone[] = [];
    if (firstCheckin) {
      result.push({
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

    const weightedAsc = checkins
      .filter((item) => typeof item.weight === 'number' && Number.isFinite(item.weight))
      .slice()
      .sort((a, b) => {
        const byDate = a.date.localeCompare(b.date);
        if (byDate !== 0) return byDate;
        return (a.createdAt || 0) - (b.createdAt || 0);
      });

    if (weightedAsc.length === 0) return result;

    const firstWeight = weightedAsc[0].weight as number;
    const maxWeight = weightedAsc.reduce((max, item) => Math.max(max, item.weight as number), Number.NEGATIVE_INFINITY);
    const minWeight = weightedAsc.reduce((min, item) => Math.min(min, item.weight as number), Number.POSITIVE_INFINITY);
    const fromThreshold = Math.max(Math.floor(firstWeight), Math.ceil(maxWeight));
    const toThreshold = Math.floor(minWeight);

    for (let threshold = fromThreshold; threshold >= toThreshold; threshold -= 1) {
      const hit = weightedAsc.find((entry) => (entry.weight || Number.POSITIVE_INFINITY) < threshold);
      if (!hit) continue;
      result.push({
        id: `derived-under-${threshold}`,
        title: `Under ${threshold} kg`,
        date: hit.date,
        notes: 'auto:weight-derived',
        done: true,
        createdAt: hit.createdAt || Date.now(),
      });
    }

    return result;
  }, [checkins, firstCheckin]);

  const journeyCheckins = useMemo(
    () => checkins.filter((checkin) => !!checkin.notes?.trim()).slice(0, 12),
    [checkins]
  );
  const visibleMilestones = useMemo(
    () => [...milestones, ...derivedMilestones.filter((fallback) => !milestones.some((item) => item.title === fallback.title && item.date === fallback.date))].slice(0, 8),
    [derivedMilestones, milestones]
  );
  const journeyTimeline = useMemo(() => {
    const todayIso = new Date().toISOString().slice(0, 10);

    const goalItems = eventGoals.map((goal) => ({
      id: `goal-${goal.id}`,
      date: goal.raceDate,
      time: '',
      createdAt: goal.createdAt || 0,
      icon: 'flag',
      title: goal.eventName || 'Goal',
      subtitle: `${goal.targetWeight} kg | ${goal.weeklyTarget} kg/week`,
      accent: 'text-blue-600 dark:text-blue-400',
      titleClass: 'text-gray-900 dark:text-gray-100',
      badge: goal.isPrimary ? 'Active goal' : 'Goal',
    }));

    const milestoneItems = [...milestones, ...derivedMilestones.filter((fallback) => !milestones.some((item) => item.title === fallback.title && item.date === fallback.date))]
      .map((milestone) => ({
        id: `milestone-${milestone.id}`,
        date: milestone.done ? milestone.date : (createdAtToIsoDate(milestone.createdAt) || milestone.date),
        time: '',
        createdAt: milestone.createdAt || 0,
        icon: (milestone.notes || '').startsWith('auto:weight') ? 'monitor_weight' : 'emoji_events',
        title: milestone.title,
        subtitle: milestone.done
          ? (milestone.notes && !(milestone.notes || '').startsWith('auto:weight') ? milestone.notes : 'Milestone reached')
          : `Added${formatCreatedAtDate(milestone.createdAt) ? ` on ${formatCreatedAtDate(milestone.createdAt)}` : ''}`,
        accent: 'text-amber-600 dark:text-amber-400',
        titleClass: 'text-amber-700 dark:text-amber-300',
        badge: milestone.done ? 'Milestone done' : 'Milestone added',
      }));

    const tripItems = trips.map((trip) => ({
      id: `trip-${trip.id}`,
      date: trip.date,
      time: '',
      createdAt: trip.createdAt || 0,
      icon: 'directions_bike',
      title: `${trip.distance} km ride`,
      subtitle: `${formatDuration(trip.duration)}${trip.description ? ` | ${trip.description}` : ''}`,
      accent: 'text-green-600 dark:text-green-400',
      titleClass: 'text-gray-900 dark:text-gray-100',
      badge: 'Ride',
    }));

    const checkinItems = checkins
      .filter((checkin) => !!checkin.notes?.trim())
      .map((checkin) => ({
        id: `checkin-${checkin.id}`,
        date: checkin.date,
        time: checkin.checkinTime || '',
        createdAt: checkin.createdAt || 0,
        icon: 'monitor_heart',
        title: `${typeof checkin.weight === 'number' ? `${checkin.weight} kg` : 'Check-in'}${typeof checkin.steps === 'number' ? ` | ${checkin.steps} steps` : ''}`,
        subtitle: checkin.notes || '',
        accent: 'text-purple-600 dark:text-purple-400',
        titleClass: 'text-gray-900 dark:text-gray-100',
        badge: firstCheckin?.id === checkin.id ? 'First check-in' : 'Check-in',
      }));

    return [...checkinItems, ...milestoneItems, ...tripItems, ...goalItems]
      .filter((item) => item.date <= todayIso)
      .sort((a, b) => {
        const dateCompare = b.date.localeCompare(a.date);
        if (dateCompare !== 0) return dateCompare;
        const timeCompare = (b.time || '').localeCompare(a.time || '');
        if (timeCompare !== 0) return timeCompare;
        return (b.createdAt || 0) - (a.createdAt || 0);
      })
      .filter((item) => !!item.date)
      .slice(0, 20);
  }, [checkins, derivedMilestones, eventGoals, firstCheckin, milestones, trips]);

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

  return (
    <div className="space-y-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="text-sm text-gray-500 dark:text-gray-400">Journey week {currentWeekNumber}</div>
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {weekStats.count} rides | {weekStats.totalDistance.toFixed(0)} km | {formatDuration(weekStats.totalDuration)}
            </div>
          </div>
          <button
            onClick={() => {
              if (showForm) return;
              setShowForm(true);
            }}
            disabled={showForm}
            className="px-4 py-2 bg-green-500 text-white font-semibold rounded-xl hover:bg-green-600 transition-colors"
          >
            + Log Ride
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-4">
        <div className="flex items-center gap-2 mb-3">
          <MaterialIcon name="timeline" className="text-[22px] text-indigo-600 dark:text-indigo-400" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Journey Timeline</h2>
        </div>
        {journeyTimeline.length > 0 ? (
          <div className="space-y-2">
            {journeyTimeline.map((item) => (
              <div key={item.id} className="rounded-xl bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <MaterialIcon name={item.icon} className={`text-[20px] mt-0.5 ${item.accent}`} />
                    <div className="min-w-0">
                      <div className={`font-medium ${item.titleClass}`}>{item.title}</div>
                      {item.subtitle ? (
                        <div className="text-sm text-gray-600 dark:text-gray-300 truncate">{item.subtitle}</div>
                      ) : null}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-sm text-gray-700 dark:text-gray-200">
                      {formatDate(item.date)}{item.time ? ` - ${formatTimeWithoutSeconds(item.time)}` : ''}
                    </div>
                    <div className="text-xs font-semibold text-indigo-700 dark:text-indigo-300">{item.badge}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-sm text-gray-500 dark:text-gray-400">No journey items yet.</div>
        )}
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-4">
        <div className="flex items-center gap-2 mb-3">
          <MaterialIcon name="flag" className="text-[22px] text-blue-600 dark:text-blue-400" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Goals</h3>
        </div>
        <div className="space-y-3">
          {eventGoals.map((goal) => (
            <div key={goal.id} className="rounded-xl border border-blue-100 dark:border-blue-900 bg-blue-50/70 dark:bg-blue-900/20 p-3">
              <div className="flex items-center justify-between gap-3">
                <div className="font-medium text-gray-900 dark:text-gray-100">{goal.eventName || 'Goal'}</div>
                {goal.isPrimary && <span className="text-xs font-semibold text-blue-700 dark:text-blue-300">Active</span>}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-300">
                {formatDate(goal.raceDate)} | {goal.targetWeight} kg | {goal.weeklyTarget} kg/week
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-4">
        <div className="flex items-center gap-2 mb-3">
          <MaterialIcon name="emoji_events" className="text-[22px] text-amber-500 dark:text-amber-400" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Milestones</h3>
        </div>
        {visibleMilestones.length === 0 ? (
          <div className="text-sm text-gray-500 dark:text-gray-400">No milestones yet.</div>
        ) : (
          <div className="space-y-2">
            {visibleMilestones.map((milestone) => (
              <div key={milestone.id} className="rounded-xl border border-amber-100 dark:border-amber-900 bg-amber-50/70 dark:bg-amber-900/20 p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="font-medium text-gray-900 dark:text-gray-100">{milestone.title}</div>
                  <span className={`text-xs font-semibold ${milestone.done ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400'}`}>
                    {milestone.done ? 'Done' : 'Planned'}
                  </span>
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-300">
                  {milestone.done ? `Reached: ${formatDate(milestone.date)}` : `Target: ${formatDate(milestone.date)}`}
                  {milestone.notes && !(milestone.notes || '').startsWith('auto:weight') ? ` | ${milestone.notes}` : ''}
                </div>
                {formatCreatedAtDate(milestone.createdAt) && (
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Added: {formatCreatedAtDate(milestone.createdAt)}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-4">
        <div className="flex items-center gap-2 mb-3">
          <MaterialIcon name="monitor_heart" className="text-[22px] text-purple-600 dark:text-purple-400" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Check-ins</h3>
        </div>
        {journeyCheckins.length === 0 ? (
          <div className="text-sm text-gray-500 dark:text-gray-400">No check-ins yet.</div>
        ) : (
          <div className="space-y-2">
            {journeyCheckins.map((checkin) => (
              <div key={checkin.id} className="rounded-xl border border-purple-100 dark:border-purple-900 bg-purple-50/70 dark:bg-purple-900/20 p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="font-medium text-gray-900 dark:text-gray-100">
                    {formatDate(checkin.date)}
                    {checkin.checkinTime ? ` - ${formatTimeWithoutSeconds(checkin.checkinTime)}` : ''}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-300">
                    {typeof checkin.weight === 'number' ? `${checkin.weight} kg` : typeof checkin.steps === 'number' ? `${checkin.steps} steps` : 'Check-in'}
                  </div>
                </div>
                {checkin.notes && (
                  <div className="text-sm text-gray-600 dark:text-gray-300 mt-1">{checkin.notes}</div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {showForm && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSaveTrip();
          }}
          className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-4 space-y-4"
        >
          <h3 className="font-semibold text-gray-800 dark:text-gray-100">{editingTripId ? 'Edit Ride' : 'Log New Ride'}</h3>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">Distance (km)</label>
              <input
                type="number"
                step="0.1"
                value={distance}
                onChange={(e) => setDistance(e.target.value)}
                placeholder="e.g. 25"
                className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">Hours</label>
                <input
                  type="number"
                  value={hours}
                  onChange={(e) => setHours(e.target.value)}
                  placeholder="1"
                  className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">Minutes</label>
                <input
                  type="number"
                  value={minutes}
                  onChange={(e) => setMinutes(e.target.value)}
                  placeholder="30"
                  className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">Description</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Easy recovery ride / Intervals / Commute"
              className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">Avg Speed (km/h)</label>
              <input
                type="number"
                step="0.1"
                value={avgSpeed}
                onChange={(e) => setAvgSpeed(e.target.value)}
                placeholder="e.g. 18.5"
                className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">Avg Heart Rate (bpm)</label>
              <input
                type="number"
                value={avgHeartRate}
                onChange={(e) => setAvgHeartRate(e.target.value)}
                placeholder="e.g. 142"
                className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
          </div>

        </form>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100 dark:border-gray-700">
          <h3 className="font-semibold text-gray-800 dark:text-gray-100">Ride History</h3>
        </div>
        
        {trips.length === 0 ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">
            <div className="mb-3 flex justify-center">
              <MaterialIcon name="directions_bike" className="text-[40px]" />
            </div>
            <p>No rides logged yet</p>
            <p className="text-sm">Start tracking your cycling!</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {trips.map((trip) => (
              <div key={trip.id} className="p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">{formatDate(trip.date)}</div>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-lg font-semibold text-gray-900 dark:text-gray-100">{trip.distance} km</span>
                      <span className="text-gray-400">|</span>
                      <span className="text-gray-600 dark:text-gray-400">{formatDuration(trip.duration)}</span>
                    </div>
                  </div>
                                    <div className="flex items-center gap-3">
                    <button
                      onClick={() => handleEdit(trip)}
                      className="text-sm text-blue-500 hover:text-blue-600 transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(trip.id)}
                      className="text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <MaterialIcon name="delete" className="text-[18px]" />
                    </button>
                  </div>
                </div>
                <div className="flex gap-4 mt-2 text-sm text-gray-500 dark:text-gray-400">
                  {trip.avgSpeed > 0 && <span>{trip.avgSpeed} km/h</span>}
                  {trip.avgHeartRate > 0 && <span>{trip.avgHeartRate} bpm</span>}
                </div>
                {trip.description && (
                  <div className="mt-2 text-sm text-gray-700 dark:text-gray-300">
                    {trip.description}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

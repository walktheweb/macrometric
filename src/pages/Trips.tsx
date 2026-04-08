import { Fragment, useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  getTrips,
  saveTrip,
  updateTrip,
  deleteTrip,
  Trip,
  getCheckins,
  getFastingSessions,
  getRaceGoal,
  getMilestones,
  getEventGoals,
  getStepGoal,
  Checkin,
  FastingSession,
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

function formatMonthLabel(dateStr: string) {
  const date = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(date.getTime())) return dateStr;
  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    year: 'numeric',
  }).format(date);
}

function formatShortDateLabel(dateStr: string) {
  const date = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(date.getTime())) return dateStr;
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
  }).format(date);
}

function getExpectedGoalWeight(startWeight: number, weeklyTarget: number, startDate: string, date: string, targetWeight?: number) {
  const startMs = new Date(`${startDate}T00:00:00`).getTime();
  const currentMs = new Date(`${date}T00:00:00`).getTime();
  if (!Number.isFinite(startMs) || !Number.isFinite(currentMs)) return startWeight;
  const elapsedWeeks = Math.max(0, (currentMs - startMs) / (1000 * 60 * 60 * 24 * 7));
  const rawExpected = startWeight - (weeklyTarget * elapsedWeeks);
  if (typeof targetWeight === 'number' && Number.isFinite(targetWeight)) {
    return Math.max(targetWeight, rawExpected);
  }
  return rawExpected;
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

const DEFAULT_FASTING_TARGET_HOURS = 16;

export default function Trips() {
  const navigate = useNavigate();
  const { userId, loading: authLoading } = useAuth();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [checkins, setCheckins] = useState<Checkin[]>([]);
  const [fastingSessions, setFastingSessions] = useState<FastingSession[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [eventGoals, setEventGoals] = useState<EventGoalItem[]>([]);
  const [stepGoal, setStepGoal] = useState(10000);
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
    const [tripData, checkinData, fastingData, raceGoalData, milestoneData, eventGoalData, stepGoalData] = await Promise.all([
      getTrips(userId),
      getCheckins(userId),
      getFastingSessions(userId),
      getRaceGoal(userId),
      getMilestones(userId),
      getEventGoals(userId),
      getStepGoal(userId),
    ]);
    setTrips(tripData);
    setCheckins(checkinData);
    setFastingSessions(fastingData);
    setMilestones(milestoneData);
    setStepGoal(stepGoalData);
    setEventGoals([
      {
        id: 'primary',
        eventName: raceGoalData.eventName,
        startDate: raceGoalData.startDate,
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

  const handleJourneyItemClick = (item: {
    actionType?: 'trip' | 'checkin' | 'fasting' | 'milestone' | 'goal' | 'steps';
    actionId?: string;
  }) => {
    if (item.actionType === 'trip' && item.actionId) {
      const trip = trips.find((entry) => entry.id === item.actionId);
      if (trip) handleEdit(trip);
      return;
    }
    if (item.actionType === 'checkin' && item.actionId) {
      navigate(`/?editCheckin=${encodeURIComponent(item.actionId)}&from=history`);
      return;
    }
    if (item.actionType === 'fasting' && item.actionId) {
      navigate(`/?editFasting=${encodeURIComponent(item.actionId)}&from=history`);
      return;
    }
    if (item.actionType === 'milestone') {
      navigate('/history?tab=milestones');
      return;
    }
    if (item.actionType === 'goal') {
      navigate('/history?tab=goals');
      return;
    }
    if (item.actionType === 'steps') {
      navigate('/history?tab=checkin');
    }
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

    const goalStartItems = eventGoals
      .filter((goal) => !!goal.startDate)
      .map((goal) => ({
        id: `goal-start-${goal.id}`,
        date: goal.startDate as string,
        time: '',
        createdAt: goal.createdAt || 0,
        icon: 'play_circle',
        title: goal.eventName ? `Started ${goal.eventName}` : 'Started goal',
        subtitle: `Weight-loss period started | target ${goal.targetWeight} kg by ${formatDateDDMMYYYY(goal.raceDate)}`,
        accent: 'text-sky-500 dark:text-sky-300',
        titleClass: 'text-red-600 dark:text-red-400',
        cardClass: 'bg-sky-50 dark:bg-sky-950/25 border-sky-200 dark:border-sky-800',
        badgeClass: 'text-sky-700 dark:text-sky-300',
        badge: goal.isPrimary ? 'Active goal start' : 'Goal start',
        actionType: 'goal' as const,
        actionId: goal.id,
      }));

    const goalFinishItems = eventGoals.map((goal) => ({
      id: `goal-finish-${goal.id}`,
      date: goal.raceDate,
      time: '',
      createdAt: goal.createdAt || 0,
      icon: 'flag',
      title: goal.eventName || 'Goal',
      subtitle: `${goal.targetWeight} kg | ${goal.weeklyTarget} kg/week`,
      accent: 'text-sky-500 dark:text-sky-300',
      titleClass: 'text-red-600 dark:text-red-400',
      cardClass: 'bg-sky-50 dark:bg-sky-950/25 border-sky-200 dark:border-sky-800',
      badgeClass: 'text-sky-700 dark:text-sky-300',
      badge: goal.isPrimary ? 'Active goal' : 'Goal',
      actionType: 'goal' as const,
      actionId: goal.id,
    }));

    const milestoneItems = [...milestones, ...derivedMilestones.filter((fallback) => !milestones.some((item) => item.title === fallback.title && item.date === fallback.date))]
      .map((milestone) => ({
        id: `milestone-${milestone.id}`,
        date: milestone.done ? milestone.date : (createdAtToIsoDate(milestone.createdAt) || milestone.date),
        time: '',
        createdAt: milestone.createdAt || 0,
        icon: (milestone.notes || '').startsWith('auto:weight')
          ? 'monitor_weight'
          : (milestone.notes || '').startsWith('auto:ketosis')
            ? 'local_fire_department'
            : 'emoji_events',
        isWeightMilestone: (milestone.notes || '').startsWith('auto:weight'),
        isKetosisMilestone: (milestone.notes || '').startsWith('auto:ketosis'),
        title: milestone.title,
        subtitle: milestone.done
          ? (milestone.notes && !(milestone.notes || '').startsWith('auto:weight') && !(milestone.notes || '').startsWith('auto:ketosis') ? milestone.notes : 'Milestone reached')
          : `Added${formatCreatedAtDate(milestone.createdAt) ? ` on ${formatCreatedAtDate(milestone.createdAt)}` : ''}`,
        accent: 'text-amber-600 dark:text-amber-400',
        titleClass: 'text-amber-700 dark:text-amber-300',
        cardClass: 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-100 dark:border-indigo-800',
        badgeClass: 'text-indigo-700 dark:text-indigo-300',
        badge: milestone.done ? 'Milestone done' : 'Milestone added',
        actionType: 'milestone' as const,
        actionId: milestone.id,
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
      cardClass: 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-100 dark:border-indigo-800',
      badgeClass: 'text-indigo-700 dark:text-indigo-300',
      badge: 'Ride',
      actionType: 'trip' as const,
      actionId: trip.id,
    }));

    const checkinItems = checkins
      .filter((checkin) => !!checkin.notes?.trim() || ((checkin.ketones || 0) >= 0.5))
      .map((checkin) => ({
        id: `checkin-${checkin.id}`,
        date: checkin.date,
        time: checkin.checkinTime || '',
        createdAt: checkin.createdAt || 0,
        icon: 'monitor_heart',
        title: `${typeof checkin.weight === 'number' ? `${checkin.weight} kg` : 'Check-in'}${typeof checkin.steps === 'number' ? ` | ${checkin.steps} steps` : ''}`,
        subtitle: checkin.notes || `Ketones ${checkin.ketones}`,
        accent: 'text-purple-600 dark:text-purple-400',
        titleClass: 'text-gray-700 dark:text-gray-300 font-normal text-sm',
        cardClass: 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-100 dark:border-indigo-800',
        badgeClass: 'text-indigo-700 dark:text-indigo-300',
        badge: firstCheckin?.id === checkin.id ? 'First check-in' : 'Check-in',
        isKetosisCheckin: (checkin.ketones || 0) >= 0.5,
        ketonesValue: checkin.ketones,
        actionType: 'checkin' as const,
        actionId: checkin.id,
      }));

    const successfulFastItems = fastingSessions
      .map((session) => {
        const fastingHours = getFastingHours(session.startTime, session.endTime);
        if (fastingHours === null || fastingHours < DEFAULT_FASTING_TARGET_HOURS) return null;
        return {
          id: `fast-${session.id}`,
          date: session.date,
          time: session.endTime || session.startTime || '',
          createdAt: session.createdAt || 0,
          icon: 'timer',
          title: `Successful fast | ${fastingHours} h`,
          subtitle: `${formatTimeWithoutSeconds(session.startTime)} - ${formatTimeWithoutSeconds(session.endTime)}`,
          accent: 'text-green-600 dark:text-green-400',
          titleClass: 'text-gray-900 dark:text-gray-100',
          cardClass: 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-100 dark:border-indigo-800',
          badgeClass: 'text-indigo-700 dark:text-indigo-300',
          badge: 'Fast completed',
          actionType: 'fasting' as const,
          actionId: session.id,
        };
      })
      .filter(Boolean) as Array<{
        id: string;
        date: string;
        time: string;
        createdAt: number;
        icon: string;
        title: string;
        subtitle: string;
        accent: string;
        titleClass: string;
        badge: string;
      }>;

    const dailyStepGoalItems = Object.values(
      checkins.reduce<Record<string, { date: string; steps: number; createdAt: number; time: string }>>((acc, checkin) => {
        const steps = Number(checkin.steps) || 0;
        if (steps <= 0) return acc;
        const existing = acc[checkin.date];
        if (!existing) {
          acc[checkin.date] = {
            date: checkin.date,
            steps,
            createdAt: checkin.createdAt || 0,
            time: checkin.checkinTime || '',
          };
          return acc;
        }
        existing.steps += steps;
        if ((checkin.checkinTime || '') > existing.time) existing.time = checkin.checkinTime || existing.time;
        if ((checkin.createdAt || 0) > existing.createdAt) existing.createdAt = checkin.createdAt || existing.createdAt;
        return acc;
      }, {})
    )
      .filter((entry) => entry.steps >= stepGoal)
      .map((entry) => ({
        id: `steps-goal-${entry.date}`,
        date: entry.date,
        time: entry.time,
        createdAt: entry.createdAt,
        icon: 'directions_walk',
        title: `Step goal reached | ${entry.steps} steps`,
        subtitle: `Goal ${stepGoal} steps`,
        accent: 'text-green-600 dark:text-green-400',
        titleClass: 'text-gray-700 dark:text-gray-300 font-normal text-sm',
        cardClass: 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-100 dark:border-indigo-800',
        badgeClass: 'text-indigo-700 dark:text-indigo-300',
        badge: 'Step goal',
        actionType: 'steps' as const,
        actionId: entry.date,
      }));

    return [...checkinItems, ...successfulFastItems, ...dailyStepGoalItems, ...milestoneItems, ...tripItems, ...goalStartItems, ...goalFinishItems]
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
  }, [checkins, derivedMilestones, eventGoals, fastingSessions, firstCheckin, milestones, stepGoal, trips]);
  const weightGraph = useMemo(() => {
    const weights = checkins
      .filter((item) => typeof item.weight === 'number' && Number.isFinite(item.weight))
      .slice()
      .sort((a, b) => {
        const byDate = a.date.localeCompare(b.date);
        if (byDate !== 0) return byDate;
        const byTime = (a.checkinTime || '').localeCompare(b.checkinTime || '');
        if (byTime !== 0) return byTime;
        return (a.createdAt || 0) - (b.createdAt || 0);
      });

    if (weights.length === 0) {
      return null;
    }

    const activeGoal = eventGoals.find((goal) => goal.isPrimary) || eventGoals[0] || null;
    const latest = weights[weights.length - 1].weight as number;
    const first = weights[0].weight as number;
    const minWeight = weights.reduce((min, item) => Math.min(min, item.weight as number), Number.POSITIVE_INFINITY);
    const maxWeight = weights.reduce((max, item) => Math.max(max, item.weight as number), Number.NEGATIVE_INFINITY);
    const targetWeight = activeGoal?.targetWeight;
    const paddedMinSource = typeof targetWeight === 'number' ? Math.min(minWeight, targetWeight) : minWeight;
    const paddedMaxSource = typeof targetWeight === 'number' ? Math.max(maxWeight, targetWeight) : maxWeight;
    const padding = Math.max(0.6, (paddedMaxSource - paddedMinSource) * 0.15);
    const chartMin = paddedMinSource - padding;
    const chartMax = paddedMaxSource + padding;
    const width = 100;
    const height = 44;
    const points = weights.map((item, index) => {
      const x = weights.length === 1 ? width / 2 : (index / (weights.length - 1)) * width;
      const y = chartMax === chartMin ? height / 2 : ((chartMax - (item.weight as number)) / (chartMax - chartMin)) * height;
      return { x, y, date: item.date, weight: item.weight as number };
    });
    const targetLineY = typeof targetWeight === 'number' && chartMax !== chartMin
      ? ((chartMax - targetWeight) / (chartMax - chartMin)) * height
      : null;
    const todayMs = new Date().setHours(0, 0, 0, 0);
    const goalStartDate = activeGoal?.startDate || weights[0].date;
    const goalStartMs = new Date(`${goalStartDate}T00:00:00`).getTime();
    const raceDateMs = activeGoal?.raceDate ? new Date(`${activeGoal.raceDate}T00:00:00`).getTime() : null;
    const weeklyTarget = activeGoal?.weeklyTarget || 0;
    const startWeight = weights.find((item) => item.date >= goalStartDate)?.weight ?? first;
    const planPoints = weeklyTarget > 0
      ? points.map((point) => {
          const expectedWeight = getExpectedGoalWeight(startWeight, weeklyTarget, goalStartDate, point.date, targetWeight);
          const y = chartMax === chartMin ? height / 2 : ((chartMax - expectedWeight) / (chartMax - chartMin)) * height;
          return { x: point.x, y };
        })
      : [];
    let onTrackStatus: 'ahead' | 'on_track' | 'behind' | null = null;
    let expectedWeightToday: number | null = null;
    if (
      activeGoal &&
      Number.isFinite(goalStartMs) &&
      weeklyTarget > 0 &&
      typeof targetWeight === 'number'
    ) {
      expectedWeightToday = getExpectedGoalWeight(startWeight, weeklyTarget, goalStartDate, new Date(todayMs).toISOString().slice(0, 10), targetWeight);
      const tolerance = 0.3;
      if (latest <= expectedWeightToday - tolerance) onTrackStatus = 'ahead';
      else if (latest <= expectedWeightToday + tolerance) onTrackStatus = 'on_track';
      else onTrackStatus = 'behind';
    }

    return {
      points,
      activeGoal,
      latest,
      first,
      delta: Math.round((latest - first) * 10) / 10,
      minWeight,
      maxWeight,
      latestDate: weights[weights.length - 1].date,
      firstDate: weights[0].date,
      targetLineY,
      targetWeight,
      weeklyTarget,
      planPoints,
      onTrackStatus,
      expectedWeightToday,
      trendColorClass: latest <= first ? 'text-emerald-500 dark:text-emerald-400' : 'text-rose-500 dark:text-rose-400',
      trendPointColorClass: latest <= first ? 'text-emerald-600 dark:text-emerald-300' : 'text-rose-600 dark:text-rose-300',
    };
  }, [checkins, eventGoals]);


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
        <div className="flex items-center gap-2 mb-3">
          <MaterialIcon name="show_chart" className="text-[22px] text-emerald-600 dark:text-emerald-400" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Weight Trend</h2>
        </div>
        {weightGraph ? (
          <div className="space-y-3">
            <div className="rounded-xl bg-slate-50 dark:bg-slate-900/20 border border-slate-200 dark:border-slate-700 p-3">
              <div className="space-y-2">
                {weightGraph.onTrackStatus && (
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="text-gray-700 dark:text-gray-200">Doelstatus</span>
                    <span className={`font-semibold ${
                      weightGraph.onTrackStatus === 'ahead'
                        ? 'text-emerald-700 dark:text-emerald-300'
                        : weightGraph.onTrackStatus === 'on_track'
                          ? 'text-sky-700 dark:text-sky-300'
                          : 'text-rose-700 dark:text-rose-300'
                    }`}>
                      {weightGraph.onTrackStatus === 'ahead' ? 'Voor op schema' : weightGraph.onTrackStatus === 'on_track' ? 'Op schema' : 'Achter op schema'}
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-gray-700 dark:text-gray-200">Laatste gewicht</span>
                  <span className="font-semibold text-gray-900 dark:text-gray-100">{weightGraph.latest.toFixed(1)} kg</span>
                </div>
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-gray-700 dark:text-gray-200">Highest weight</span>
                  <span className="font-semibold text-gray-900 dark:text-gray-100">{weightGraph.maxWeight.toFixed(1)} kg</span>
                </div>
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-gray-700 dark:text-gray-200">Lowest weight</span>
                  <span className="font-semibold text-gray-900 dark:text-gray-100">{weightGraph.minWeight.toFixed(1)} kg</span>
                </div>
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-gray-700 dark:text-gray-200">Bereik</span>
                  <span className="font-semibold text-gray-900 dark:text-gray-100">{(weightGraph.maxWeight - weightGraph.minWeight).toFixed(1)} kg</span>
                </div>
                {weightGraph.expectedWeightToday !== null && (
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="text-gray-700 dark:text-gray-200">Verwacht vandaag</span>
                    <span className="font-semibold text-gray-900 dark:text-gray-100">{weightGraph.expectedWeightToday.toFixed(1)} kg</span>
                  </div>
                )}
              </div>
            </div>
            <div className="rounded-xl bg-gradient-to-b from-slate-50 to-white dark:from-slate-900/40 dark:to-gray-800 border border-slate-200 dark:border-slate-700 p-3">
              <svg viewBox="0 0 100 56" className="w-full h-36" preserveAspectRatio="none" aria-label="Weight trend graph">
                <line x1="0" y1="8" x2="100" y2="8" stroke="currentColor" className="text-slate-200 dark:text-slate-700" strokeWidth="0.6" />
                <line x1="0" y1="26" x2="100" y2="26" stroke="currentColor" className="text-slate-200 dark:text-slate-700" strokeWidth="0.6" />
                <line x1="0" y1="44" x2="100" y2="44" stroke="currentColor" className="text-slate-200 dark:text-slate-700" strokeWidth="0.6" />
                {weightGraph.planPoints.length > 1 && (
                  <polyline
                    fill="none"
                    stroke="currentColor"
                    className="text-sky-400 dark:text-sky-500"
                    strokeWidth="1.2"
                    strokeDasharray="2.5 2"
                    strokeLinejoin="round"
                    strokeLinecap="round"
                    points={weightGraph.planPoints.map((point) => `${point.x},${point.y}`).join(' ')}
                  />
                )}
                {weightGraph.targetLineY !== null && (
                  <line
                    x1="0"
                    y1={weightGraph.targetLineY}
                    x2="100"
                    y2={weightGraph.targetLineY}
                    stroke="currentColor"
                    className="text-amber-400 dark:text-amber-500"
                    strokeWidth="0.8"
                    strokeDasharray="2.5 2"
                  />
                )}
                <polyline
                  fill="none"
                  stroke="currentColor"
                  className={weightGraph.trendColorClass}
                  strokeWidth="1.8"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  points={weightGraph.points.map((point) => `${point.x},${point.y}`).join(' ')}
                />
                {weightGraph.points.map((point, index) => (
                  <circle
                    key={`${point.date}-${index}`}
                    cx={point.x}
                    cy={point.y}
                    r={index === weightGraph.points.length - 1 ? 1.8 : 1.3}
                    fill="currentColor"
                    className={index === weightGraph.points.length - 1 ? weightGraph.trendPointColorClass : weightGraph.trendColorClass}
                  />
                ))}
              </svg>
              <div className="mt-3 space-y-1.5 border-t border-slate-200 dark:border-slate-700 pt-3">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="inline-flex items-center gap-2 text-gray-700 dark:text-gray-200">
                    <span className="h-0.5 w-4 bg-sky-400 dark:bg-sky-500 rounded-full" />
                    Verwacht
                  </span>
                  <span className="font-semibold text-sky-600 dark:text-sky-400">
                    {weightGraph.weeklyTarget > 0 ? `${weightGraph.weeklyTarget.toFixed(1)} kg/week` : 'Geen doel'}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="inline-flex items-center gap-2 text-gray-700 dark:text-gray-200">
                    <span className={`h-2.5 w-2.5 rounded-full ${weightGraph.delta <= 0 ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                    Trend
                  </span>
                  <span className={`font-semibold ${weightGraph.delta <= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                    {weightGraph.delta > 0 ? '+' : ''}{weightGraph.delta.toFixed(1)} kg
                  </span>
                </div>
                {weightGraph.targetWeight !== undefined && (
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="inline-flex items-center gap-2 text-gray-700 dark:text-gray-200">
                      <span className="h-2.5 w-2.5 rounded-full bg-amber-400 dark:bg-amber-500" />
                      Doel
                    </span>
                    <span className="font-semibold text-amber-600 dark:text-amber-400">
                      {weightGraph.targetWeight.toFixed(1)} kg
                    </span>
                  </div>
                )}
              </div>
              <div className="mt-2 flex items-center justify-between text-xs tabular-nums text-gray-500 dark:text-gray-400">
                <span>{formatShortDateLabel(weightGraph.firstDate)}</span>
                <span>
                  {weightGraph.weeklyTarget > 0 ? `Plan ${weightGraph.weeklyTarget.toFixed(1)} kg/week` : weightGraph.targetWeight !== undefined ? `Target ${weightGraph.targetWeight.toFixed(1)} kg` : ''}
                </span>
                <span>{formatShortDateLabel(weightGraph.latestDate)}</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-sm text-gray-500 dark:text-gray-400">Log at least one weight check-in to see your trend.</div>
        )}
      </div>
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-4">
        <div className="flex items-center gap-2 mb-3">
          <MaterialIcon name="timeline" className="text-[22px] text-indigo-600 dark:text-indigo-400" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Journey Timeline</h2>
        </div>
        {journeyTimeline.length > 0 ? (
          <div className="space-y-2">
            {journeyTimeline.map((item, index) => {
              const previousItem = index > 0 ? journeyTimeline[index - 1] : null;
              const startsNewMonth = !previousItem || previousItem.date.slice(0, 7) !== item.date.slice(0, 7);

              return (
                <Fragment key={item.id}>
                  {startsNewMonth && (
                    <div className="px-1 pt-2 pb-1">
                      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-500 dark:text-indigo-300">
                        {formatMonthLabel(item.date)}
                      </div>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => handleJourneyItemClick(item)}
                    className={`w-full rounded-xl border p-3 text-left transition-colors hover:bg-white/40 dark:hover:bg-white/5 focus:outline-none focus:ring-2 focus:ring-primary-500 ${item.cardClass}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0">
                        <MaterialIcon name={item.icon} className={`text-[20px] mt-0.5 ${item.accent}`} />
                        <div className="min-w-0">
                          <div className={`font-medium ${item.titleClass}`}>{item.title}</div>
                          {item.subtitle ? (
                            <div className="text-sm text-white truncate">{item.subtitle}</div>
                          ) : null}
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                          <div className="inline-flex items-center gap-1 text-sm tabular-nums text-gray-700 dark:text-gray-200">
                            {item.isWeightMilestone ? (
                              <MaterialIcon name="emoji_events" className="text-[16px] text-amber-500 dark:text-amber-400" />
                            ) : item.isKetosisMilestone || item.isKetosisCheckin ? (
                              <span title={typeof item.ketonesValue === 'number' ? `Ketosis ${item.ketonesValue}` : 'Ketosis'} aria-label={typeof item.ketonesValue === 'number' ? `Ketosis ${item.ketonesValue}` : 'Ketosis'}>
                                <MaterialIcon name="local_fire_department" className="text-[16px] text-orange-500 dark:text-orange-400" />
                              </span>
                            ) : null}
                            {formatDateDDMMYYYY(item.date)}
                          </div>
                        <div className={`text-xs font-semibold tabular-nums ${item.badgeClass}`}>{item.badge}</div>
                      </div>
                    </div>
                  </button>
                </Fragment>
              );
            })}
          </div>
        ) : (
          <div className="text-sm text-gray-500 dark:text-gray-400">No journey items yet.</div>
        )}
      </div>
    </div>
  );
}

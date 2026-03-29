import { useMemo } from 'react';
import { Checkin, RaceGoal } from '../lib/api';
import { formatDateDDMMYYYY } from '../lib/date';
import MaterialIcon from './MaterialIcon';

interface RaceProgressProps {
  checkins: Checkin[];
  raceGoal: RaceGoal;
  daysUntil: number;
  weeksUntil: number;
}

export default function RaceProgress({ checkins, raceGoal, daysUntil, weeksUntil }: RaceProgressProps) {
  const { currentWeight, weeklyRate, projectedWeight, progress, usingGoalProjection } = useMemo(() => {
    const weightsWithDate = checkins
      .filter((c) => typeof c.weight === 'number' && Number.isFinite(c.weight) && (c.weight as number) > 0 && (c.weight as number) < 400)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const current = weightsWithDate[0]?.weight ?? null;
    const startWeight = weightsWithDate[weightsWithDate.length - 1]?.weight ?? current ?? 0;

    let rate = 0;
    let hasReliableTrend = false;
    if (weightsWithDate.length >= 2 && current !== null) {
      const daysDiff = Math.max(
        1,
        (new Date(weightsWithDate[0].date).getTime() - new Date(weightsWithDate[weightsWithDate.length - 1].date).getTime()) /
          (1000 * 60 * 60 * 24)
      );
      const weeksDiff = daysDiff / 7;
      // Prevent unstable rates when measurements are too close in time.
      if (daysDiff >= 7 && weeksDiff > 0) {
        rate = (startWeight - current) / weeksDiff;
        hasReliableTrend = true;
      }
    }

    const boundedRate = Math.max(-2, Math.min(2, rate));
    const goalRate = Math.max(0, Math.min(2, raceGoal.weeklyTarget || 0));
    const projectionRate = hasReliableTrend ? boundedRate : goalRate;
    const remainingWeeks = Math.max(0, daysUntil / 7);
    const rawProjected = current !== null ? current - projectionRate * remainingWeeks : null;
    const projWeight = rawProjected !== null ? Math.max(30, Math.min(250, rawProjected)) : null;

    const prog =
      current && startWeight && startWeight !== raceGoal.targetWeight
        ? ((startWeight - current) / (startWeight - raceGoal.targetWeight)) * 100
        : 0;

    return {
      currentWeight: current,
      weeklyRate: boundedRate,
      projectedWeight: projWeight,
      progress: Math.min(100, Math.max(0, prog)),
      usingGoalProjection: !hasReliableTrend,
    };
  }, [checkins, raceGoal, daysUntil, weeksUntil]);

  const formatDate = (dateStr: string) => {
    return formatDateDDMMYYYY(dateStr);
  };

  const getStatusColor = () => {
    if (weeklyRate >= raceGoal.weeklyTarget) return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
    if (weeklyRate >= raceGoal.weeklyTarget * 0.6) return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
    return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
  };

  const getStatusText = () => {
    if (weeklyRate >= raceGoal.weeklyTarget) return 'ON TRACK';
    if (weeklyRate >= raceGoal.weeklyTarget * 0.6) return 'SLIGHTLY BEHIND';
    return 'BEHIND';
  };

  if (!currentWeight) {
    return (
      <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl p-5 text-white">
        <div className="flex items-center gap-3 mb-4">
          <MaterialIcon name="target" className="text-[28px]" />
          <div>
            <div className="font-semibold">{raceGoal.eventName ? `${raceGoal.eventName}: ${formatDate(raceGoal.raceDate)}` : formatDate(raceGoal.raceDate)}</div>
            <div className="text-sm opacity-80">{daysUntil} days to go</div>
          </div>
        </div>
        <div className="bg-white/20 rounded-xl p-4 text-center">
          <div className="text-sm opacity-80 mb-1">Log your weight in Check-in</div>
          <div className="font-medium">to track event progress</div>
        </div>
      </div>
    );
  }

  const totalWeeks = Math.max(1, Math.ceil((new Date(raceGoal.raceDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24 * 7)));
  const weeksPassed = Math.max(0, totalWeeks - Math.ceil(weeksUntil));
  const weekDots = Array.from({ length: Math.min(8, totalWeeks) }, (_, i) => i < weeksPassed);

  return (
    <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl p-5 text-white">
      <div className="flex items-center gap-3 mb-4">
        <MaterialIcon name="target" className="text-[28px]" />
        <div>
          <div className="font-semibold">{raceGoal.eventName ? `${raceGoal.eventName}: ${formatDate(raceGoal.raceDate)}` : formatDate(raceGoal.raceDate)}</div>
          <div className="text-sm opacity-80">{daysUntil} days to go</div>
        </div>
      </div>

      <div className="bg-white/10 rounded-xl p-4 mb-4">
        <div className="flex justify-between text-sm mb-2">
          <span>Weight Progress</span>
          <span>{currentWeight}kg -&gt; {raceGoal.targetWeight}kg</span>
        </div>
        <div className="h-3 bg-white/20 rounded-full overflow-hidden">
          <div className="h-full bg-white rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
        </div>
        <div className="flex items-center gap-1 mt-3">
          {weekDots.map((filled, i) => (
            <div key={i} className={`w-4 h-4 rounded-full ${filled ? 'bg-white' : 'bg-white/30'}`} />
          ))}
          <span className="text-xs ml-2 opacity-80">Week {weeksPassed + 1}/{totalWeeks}</span>
        </div>
      </div>

      <div className={`rounded-xl p-3 flex items-center justify-between ${getStatusColor()}`}>
        <div>
          <div className="font-semibold text-sm">{getStatusText()}</div>
          <div className="text-xs opacity-80">{weeklyRate.toFixed(1)} kg/week (target: {raceGoal.weeklyTarget})</div>
        </div>
        {projectedWeight !== null && (
          <div className="text-right">
            <div className="text-xs opacity-80">{usingGoalProjection ? 'Projected (goal)' : 'Projected'}</div>
            <div className="font-semibold">{projectedWeight.toFixed(1)}kg</div>
          </div>
        )}
      </div>
    </div>
  );
}

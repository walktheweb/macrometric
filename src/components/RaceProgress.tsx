import { useMemo, useState } from 'react';
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
  const [isCollapsed, setIsCollapsed] = useState(true);
  const { currentWeight, weeklyRate, projectedWeight, progress, usingGoalProjection } = useMemo(() => {
    const allWeightsWithDate = checkins
      .filter((c) => typeof c.weight === 'number' && Number.isFinite(c.weight) && (c.weight as number) > 0 && (c.weight as number) < 400)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const weightsWithDate = raceGoal.startDate
      ? allWeightsWithDate.filter((entry) => new Date(entry.date).getTime() >= new Date(raceGoal.startDate as string).getTime())
      : allWeightsWithDate;

    const relevantWeights = weightsWithDate.length > 0 ? weightsWithDate : allWeightsWithDate;
    const current = allWeightsWithDate[0]?.weight ?? null;
    const startWeight = relevantWeights[relevantWeights.length - 1]?.weight ?? current ?? 0;

    let rate = 0;
    let hasReliableTrend = false;
    if (relevantWeights.length >= 2 && current !== null) {
      const daysDiff = Math.max(
        1,
        (new Date(relevantWeights[0].date).getTime() - new Date(relevantWeights[relevantWeights.length - 1].date).getTime()) /
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

  const getPaceLabel = () => {
    if (weeklyRate >= raceGoal.weeklyTarget) return 'On track';
    if (weeklyRate >= raceGoal.weeklyTarget * 0.6) return 'Close';
    return 'Behind';
  };

  if (!currentWeight) {
    return (
      <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl p-4 text-white">
        <div className="flex items-center gap-3">
          <MaterialIcon name="target" className="text-2xl" />
          <div>
            <div className="font-semibold">{raceGoal.eventName ? `${raceGoal.eventName}: ${formatDate(raceGoal.raceDate)}` : formatDate(raceGoal.raceDate)}</div>
            <div className="text-sm opacity-80">{daysUntil} days to go</div>
          </div>
        </div>
        <div className="mt-3 bg-white/15 rounded-xl px-4 py-3 text-center">
          <div className="text-sm opacity-80 mb-1">Log your weight in Check-in</div>
          <div className="font-medium">to track event progress</div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl text-white overflow-hidden">
      <button
        type="button"
        onClick={() => setIsCollapsed((value) => !value)}
        className="w-full p-4 text-left"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <MaterialIcon name="target" className="text-2xl shrink-0" />
            <div className="min-w-0">
              <div className="font-semibold truncate">{raceGoal.eventName ? `${raceGoal.eventName}: ${formatDate(raceGoal.raceDate)}` : formatDate(raceGoal.raceDate)}</div>
              <div className="text-sm opacity-80">{daysUntil} days to go</div>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <div className={`rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusColor()}`}>
              {getPaceLabel()}
            </div>
            <MaterialIcon name={isCollapsed ? 'chevron_right' : 'expand_more'} className="text-xl opacity-90" />
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between gap-3 text-sm">
          <div>
            <div className="text-[11px] uppercase tracking-[0.18em] opacity-75">Goal</div>
            <div className="font-semibold">{currentWeight}kg -&gt; {raceGoal.targetWeight}kg</div>
          </div>
          {projectedWeight !== null && (
            <div className="text-right">
              <div className="text-[11px] uppercase tracking-[0.18em] opacity-75">{usingGoalProjection ? 'Projected goal' : 'Projected'}</div>
              <div className="font-semibold">{projectedWeight.toFixed(1)}kg</div>
            </div>
          )}
        </div>

        <div className="mt-3 h-2 bg-white/20 rounded-full overflow-hidden">
          <div className="h-full bg-white rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
        </div>
        <div className="mt-2 flex items-center justify-between text-xs opacity-80">
          <span>{progress.toFixed(0)}% to target</span>
          <span>{Math.max(0, Math.ceil(weeksUntil))} weeks left</span>
        </div>
      </button>

      {!isCollapsed && (
        <div className="px-4 pb-4">
          <div className="border-t border-white/15 pt-3">
            {raceGoal.startDate && (
              <div className="mb-3 text-xs opacity-80">Started on {formatDate(raceGoal.startDate)}</div>
            )}
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-xl bg-white/10 px-3 py-2">
                <div className="text-[11px] uppercase tracking-[0.18em] opacity-75">Current pace</div>
                <div className="font-semibold">{weeklyRate.toFixed(1)} kg/week</div>
              </div>
              <div className="rounded-xl bg-white/10 px-3 py-2">
                <div className="text-[11px] uppercase tracking-[0.18em] opacity-75">Target pace</div>
                <div className="font-semibold">{raceGoal.weeklyTarget.toFixed(1)} kg/week</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

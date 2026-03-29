import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Trip } from '../lib/api';
import { formatDateDDMMYYYY } from '../lib/date';
import MaterialIcon from './MaterialIcon';

interface TripWidgetProps {
  trips: Trip[];
  userId: string;
  onRefresh: () => void;
}

export default function TripWidget({ trips }: TripWidgetProps) {
  const getIsoWeekNumber = (date: Date) => {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  };

  const currentWeekNumber = getIsoWeekNumber(new Date());

  const weekTrips = useMemo(() => {
    const today = new Date();
    const dayOfWeek = (today.getDay() + 6) % 7; // Monday = 0
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - dayOfWeek);
    const startStr = startOfWeek.toISOString().split('T')[0];
    return trips.filter(t => t.date >= startStr);
  }, [trips]);

  const weekStats = useMemo(() => {
    const totalDistance = weekTrips.reduce((sum, t) => sum + t.distance, 0);
    const totalDuration = weekTrips.reduce((sum, t) => sum + t.duration, 0);
    const avgSpeed = weekTrips.length > 0
      ? weekTrips.reduce((sum, t) => sum + t.avgSpeed, 0) / weekTrips.length
      : 0;
    const avgHr = weekTrips.length > 0
      ? weekTrips.reduce((sum, t) => sum + t.avgHeartRate, 0) / weekTrips.length
      : 0;
    return { totalDistance, totalDuration, avgSpeed, avgHr, count: weekTrips.length };
  }, [weekTrips]);

  const formatDuration = (mins: number) => {
    const hours = Math.floor(mins / 60);
    const minutes = mins % 60;
    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
  };

  const formatDate = (dateStr: string) => {
    return formatDateDDMMYYYY(dateStr);
  };

  const recentTrip = weekTrips[0];

  return (
    <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-2xl p-5 text-white">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <MaterialIcon name="directions_bike" className="text-[28px]" />
          <div>
            <div className="text-lg font-semibold">Rides</div>
            <div className="text-sm opacity-80">
              Week {currentWeekNumber} | {weekStats.count} ride{weekStats.count !== 1 ? 's' : ''} | {weekStats.totalDistance.toFixed(0)} km | {formatDuration(weekStats.totalDuration)}
            </div>
          </div>
        </div>
        <Link
          to="/trips"
          className="px-3 py-1.5 bg-white/20 rounded-lg text-sm font-medium hover:bg-white/30 transition-colors"
        >
          + Log Ride
        </Link>
      </div>

      {weekStats.count > 0 && (
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white/10 rounded-xl p-3">
            <div className="text-xs opacity-80 mb-1">Avg Speed</div>
            <div className="text-xl font-bold">{weekStats.avgSpeed.toFixed(1)}</div>
            <div className="text-xs opacity-80">km/h</div>
          </div>
          <div className="bg-white/10 rounded-xl p-3">
            <div className="text-xs opacity-80 mb-1">Avg Heart Rate</div>
            <div className="text-xl font-bold">{weekStats.avgHr.toFixed(0)}</div>
            <div className="text-xs opacity-80">bpm</div>
          </div>
        </div>
      )}

      {recentTrip && (
        <div className="mt-4 bg-white/10 rounded-xl p-3">
          <div className="text-xs opacity-80 mb-1">{formatDate(recentTrip.date)}</div>
          <div className="flex justify-between items-center">
            <div>
              <span className="font-semibold">{recentTrip.distance} km</span>
              <span className="text-sm opacity-80 ml-2">{formatDuration(recentTrip.duration)}</span>
            </div>
            <div className="text-sm">
              <span className="opacity-80">{recentTrip.avgSpeed} km/h</span>
              <span className="opacity-80 ml-2">{recentTrip.avgHeartRate} bpm</span>
            </div>
          </div>
          {recentTrip.description && (
            <div className="mt-2 text-sm opacity-90">
              {recentTrip.description}
            </div>
          )}
        </div>
      )}

      {weekStats.count === 0 && (
        <div className="bg-white/10 rounded-xl p-4 text-center">
          <div className="text-sm opacity-80">No rides this week yet</div>
          <Link
            to="/trips"
            className="inline-block mt-2 text-sm font-medium underline"
          >
            Log your first ride
          </Link>
        </div>
      )}
    </div>
  );
}


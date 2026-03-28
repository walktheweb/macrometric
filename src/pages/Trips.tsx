import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getTrips, saveTrip, updateTrip, deleteTrip, Trip } from '../lib/api';

export default function Trips() {
  const { userId, loading: authLoading } = useAuth();
  const [trips, setTrips] = useState<Trip[]>([]);
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
    const data = await getTrips(userId);
    setTrips(data);
    setLoading(false);
  };

  const weekStats = useMemo(() => {
    const today = new Date();
    const dayOfWeek = today.getDay();
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
    setShowForm(false);
    setEditingTripId(null);
    setDistance('');
    setHours('');
    setMinutes('');
    setAvgSpeed('');
    setAvgHeartRate('');
    setDescription('');
  };

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
    await deleteTrip(userId, id);
    await loadTrips();
  };

  const formatDuration = (mins: number) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
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

  return (
    <div className="space-y-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-gray-500 dark:text-gray-400">This Week</div>
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {weekStats.count} rides | {weekStats.totalDistance.toFixed(0)} km | {formatDuration(weekStats.totalDuration)}
            </div>
          </div>
          <button
            onClick={() => {
              const next = !showForm;
              setShowForm(next);
              if (!next) {
                setEditingTripId(null);
                setDistance('');
                setHours('');
                setMinutes('');
                setAvgSpeed('');
                setAvgHeartRate('');
                setDescription('');
              }
            }}
            className="px-4 py-2 bg-green-500 text-white font-semibold rounded-xl hover:bg-green-600 transition-colors"
          >
            {showForm ? 'Cancel' : '+ Log Ride'}
          </button>
        </div>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-4 space-y-4">
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

          <button
            type="submit"
            className="w-full py-3 bg-green-500 text-white font-semibold rounded-xl hover:bg-green-600 transition-colors"
          >
            {editingTripId ? 'Save Changes' : 'Save Ride'}
          </button>
        </form>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100 dark:border-gray-700">
          <h3 className="font-semibold text-gray-800 dark:text-gray-100">Ride History</h3>
        </div>
        
        {trips.length === 0 ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">
            <div className="text-4xl mb-3">🚴</div>
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
                      ?
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

import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getHistory, DayLog, getCheckins, getRaceGoal, RaceGoal, deleteCheckin, Checkin } from '../lib/api';
import { formatDateDDMMYYYY } from '../lib/date';
import MaterialIcon from '../components/MaterialIcon';

export default function History() {
  const [searchParams] = useSearchParams();
  const { userId, loading: authLoading } = useAuth();
  const [history, setHistory] = useState<Record<string, DayLog>>({});
  const [checkins, setCheckins] = useState<Checkin[]>([]);
  const [raceGoal, setRaceGoal] = useState<RaceGoal | null>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(7);
  const initialTab = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState<'food' | 'checkin' | 'goals'>(
    initialTab === 'checkin' || initialTab === 'goals' ? initialTab : 'food'
  );
  const [expandedFoodDates, setExpandedFoodDates] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (userId) {
      loadData();
    }
  }, [userId, days]);

  const loadData = async () => {
    if (!userId) return;
    setLoading(true);
    const [historyData, checkinsData, raceGoalData] = await Promise.all([
      getHistory(userId, days),
      getCheckins(userId),
      getRaceGoal(userId),
    ]);
    setHistory(historyData);
    setCheckins(checkinsData.slice(0, 30));
    setRaceGoal(raceGoalData);
    setLoading(false);
  };

  const handleDeleteCheckin = async (checkinId: string) => {
    if (!userId) return;
    if (!confirm('Delete this check-in?')) return;
    await deleteCheckin(userId, checkinId);
    loadData();
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
    let dateText = formatDateDDMMYYYY(dateStr);

    if (timeStr) {
      dateText += " - ";
    }

    return dateText;
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
                <div key={checkin.id} className="bg-purple-50 dark:bg-purple-900/20 rounded-xl shadow-sm overflow-hidden border border-purple-100 dark:border-purple-800">
                  <div className="px-4 py-3 bg-purple-100 dark:bg-purple-900/50 border-b border-purple-200 dark:border-purple-800 flex justify-between items-center">
                    <div className="font-medium text-purple-800 dark:text-purple-200">{formatDate(checkin.date, checkin.checkinTime)}</div>
                    <div className="flex gap-2">
                      <Link
                        to={`/?editCheckin=${checkin.id}&from=history`}
                        className="p-2 text-blue-500 hover:bg-blue-100 dark:hover:bg-blue-900 rounded-lg"
                        title="Edit"
                      >
                        <MaterialIcon name="edit" className="text-[18px]" />
                      </Link>
                      <button
                        onClick={() => handleDeleteCheckin(checkin.id)}
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
                          <div className="text-lg font-bold text-purple-600 dark:text-purple-400">{checkin.ketones}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">ketones</div>
                        </div>
                      )}
                      {checkin.glucose && (
                        <div className="text-center">
                          <div className="text-lg font-bold text-orange-600 dark:text-orange-400">{checkin.glucose}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">glucose</div>
                        </div>
                      )}
                      {checkin.heartRate && (
                        <div className="text-center">
                          <div className="text-lg font-bold text-red-600 dark:text-red-400">{checkin.heartRate}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">HR</div>
                        </div>
                      )}
                      {checkin.bpHigh && checkin.bpLow && (
                        <div className="text-center">
                          <div className="text-lg font-bold text-gray-900 dark:text-gray-100">{checkin.bpHigh}/{checkin.bpLow}</div>
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
                          <div className="text-lg font-bold text-indigo-600 dark:text-indigo-400">{checkin.ferritin}</div>
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
                </div>
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
    </div>
  );
}



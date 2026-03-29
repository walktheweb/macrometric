import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { addLog, deleteLog, FoodLog, getLogs, getToday, updateLog } from '../lib/api';

type EditableField = 'name' | 'brand' | 'calories' | 'protein' | 'carbs' | 'fat' | 'serving' | 'quantity';
type SortKey = 'name' | 'brand' | 'quantity' | 'serving' | 'calories' | 'protein' | 'carbs' | 'fat' | 'foodId';

export default function FoodEntries() {
  const { userId, loading: authLoading } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const today = getToday();
  const queryDate = searchParams.get('date');
  const isValidDate = (value: string | null): value is string => !!value && /^\d{4}-\d{2}-\d{2}$/.test(value);
  const date = isValidDate(queryDate) ? queryDate : today;
  const [logs, setLogs] = useState<FoodLog[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [inlineEdit, setInlineEdit] = useState<{ id: string; field: EditableField } | null>(null);
  const [inlineValue, setInlineValue] = useState('');
  const [busy, setBusy] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const firstLoadRef = useRef(true);

  useEffect(() => {
    if (isValidDate(queryDate)) return;
    const next = new URLSearchParams(searchParams);
    next.set('date', today);
    setSearchParams(next, { replace: true });
  }, [queryDate, searchParams, setSearchParams, today]);

  const sortedLogs = useMemo(() => {
    const rows = [...logs];
    const getValue = (log: FoodLog): string | number => {
      switch (sortKey) {
        case 'brand':
          return log.brand || '';
        case 'quantity':
        case 'calories':
        case 'protein':
        case 'carbs':
        case 'fat':
          return Number((log as any)[sortKey]) || 0;
        case 'foodId':
          return log.foodId || '';
        default:
          return String((log as any)[sortKey] || '').toLowerCase();
      }
    };

    rows.sort((a, b) => {
      const av = getValue(a);
      const bv = getValue(b);
      if (typeof av === 'number' && typeof bv === 'number') {
        return sortDir === 'asc' ? av - bv : bv - av;
      }
      const cmp = String(av).localeCompare(String(bv), undefined, { sensitivity: 'base' });
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return rows;
  }, [logs, sortKey, sortDir]);

  const allSelected = sortedLogs.length > 0 && sortedLogs.every(l => selectedIds.has(l.id));

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(prev => (prev === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setSortKey(key);
    setSortDir('asc');
  };

  const sortIndicator = (key: SortKey) => (sortKey === key ? (sortDir === 'asc' ? ' ↑' : ' ↓') : '');

  const loadData = async () => {
    if (!userId) return;
    if (firstLoadRef.current) setLoading(true);
    const day = await getLogs(userId, date);
    setLogs(day.logs);
    firstLoadRef.current = false;
    setLoading(false);
  };

  useEffect(() => {
    firstLoadRef.current = true;
  }, [userId]);

  useEffect(() => {
    if (userId) loadData();
  }, [userId, date]);

  useEffect(() => {
    // New date => clear row selection/edit state to avoid stale selected count.
    setSelectedIds(new Set());
    setInlineEdit(null);
    setInlineValue('');
  }, [date]);

  useEffect(() => {
    // Keep selected ids aligned with currently loaded rows.
    setSelectedIds(prev => {
      const currentIds = new Set(logs.map(l => l.id));
      const next = new Set(Array.from(prev).filter(id => currentIds.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [logs]);

  const startInlineEdit = (log: FoodLog, field: EditableField) => {
    setInlineEdit({ id: log.id, field });
    const raw = (log as any)[field];
    setInlineValue(raw === null || raw === undefined ? '' : String(raw));
  };

  const cancelInlineEdit = () => {
    setInlineEdit(null);
    setInlineValue('');
  };

  const saveInlineEdit = async (log: FoodLog) => {
    if (!userId || !inlineEdit || inlineEdit.id !== log.id) return;
    const field = inlineEdit.field;
    const updates: Partial<FoodLog> = {};

    if (['calories', 'protein', 'carbs', 'fat', 'quantity'].includes(field)) {
      (updates as any)[field] = Number(inlineValue) || 0;
    } else if (field === 'brand') {
      updates.brand = inlineValue.trim() ? inlineValue : null;
    } else {
      (updates as any)[field] = inlineValue;
    }

    if (field === 'name' && !String(updates.name || '').trim()) {
      alert('Name cannot be empty');
      cancelInlineEdit();
      return;
    }

    await updateLog(userId, log.id, updates);
    setLogs(prev => prev.map(l => (l.id === log.id ? { ...l, ...updates } : l)));
    cancelInlineEdit();
  };

  const handleDelete = async (id: string) => {
    if (!userId) return;
    if (!confirm('Delete this log entry?')) return;
    await deleteLog(userId, id);
    setLogs(prev => prev.filter(l => l.id !== id));
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const handleExport = () => {
    const selectedLogs = logs.filter(l => selectedIds.has(l.id));
    const exportLogs = selectedLogs.length > 0 ? selectedLogs : logs;
    const payload = {
      version: 1,
      type: 'food_logs_selection',
      exportedAt: new Date().toISOString(),
      date,
      logs: exportLogs,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `macrometric-food-entries-${date}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    setSelectedIds(prev => {
      if (allSelected) return new Set();
      return new Set(sortedLogs.map(l => l.id));
    });
  };

  const handleDeleteSelected = async () => {
    if (!userId || selectedIds.size === 0) return;
    if (!confirm(`Delete ${selectedIds.size} selected entries?`)) return;
    setBusy(true);
    try {
      await Promise.all(Array.from(selectedIds).map(id => deleteLog(userId, id)));
      setLogs(prev => prev.filter(l => !selectedIds.has(l.id)));
      setSelectedIds(new Set());
    } finally {
      setBusy(false);
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleImport = async (file?: File | null) => {
    if (!userId || !file) return;
    setBusy(true);
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const sourceLogs = Array.isArray(parsed) ? parsed : (parsed?.logs || []);
      if (!Array.isArray(sourceLogs) || sourceLogs.length === 0) {
        alert('No logs found in import file');
        return;
      }

      let imported = 0;
      for (const item of sourceLogs) {
        const created = await addLog(userId, {
          id: item.food_id || item.foodId || undefined,
          name: item.name || '',
          brand: item.brand || null,
          calories: Number(item.calories) || 0,
          protein: Number(item.protein) || 0,
          carbs: Number(item.carbs) || 0,
          fat: Number(item.fat) || 0,
          serving: item.serving || '1 serving',
          servingSize: Number(item.serving_size) || Number(item.servingSize) || undefined,
          netCarbs: Number(item.net_carbs) || Number(item.netCarbs) || undefined,
          packageWeight: Number(item.package_weight) || Number(item.packageWeight) || undefined,
          packageCount: Number(item.package_count) || Number(item.packageCount) || undefined,
          quantity: Number(item.quantity) || 1,
        });
        await updateLog(userId, created.id, { date } as any);
        imported += 1;
      }
      await loadData();
      alert(`Imported ${imported} entries to ${date}.`);
    } catch (error) {
      console.error(error);
      alert('Import failed. Please use a valid JSON export.');
    } finally {
      setBusy(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
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
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-3">
        <div className="flex items-center gap-3 flex-wrap">
          <label className="text-sm font-medium text-gray-600 dark:text-gray-300">Date</label>
          <input
            data-autofocus-first
            type="date"
            value={date}
            onChange={(e) => {
              const next = new URLSearchParams(searchParams);
              next.set('date', e.target.value);
              setSearchParams(next, { replace: true });
            }}
            className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
          <span className="text-sm text-gray-500 dark:text-gray-400">{logs.length} entries</span>
          <button
            onClick={handleExport}
            disabled={logs.length === 0 || busy}
            className="px-3 py-1.5 text-sm rounded-lg bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 disabled:opacity-50"
          >
            Export {selectedIds.size > 0 ? `Selected (${selectedIds.size})` : 'Entries'}
          </button>
          <button
            onClick={handleDeleteSelected}
            disabled={selectedIds.size === 0 || busy}
            className="px-3 py-1.5 text-sm rounded-lg bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 disabled:opacity-50"
          >
            Delete Selected ({selectedIds.size})
          </button>
          <button
            onClick={handleImportClick}
            disabled={busy}
            className="px-3 py-1.5 text-sm rounded-lg bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 disabled:opacity-50"
          >
            Import Entries
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            onChange={(e) => handleImport(e.target.files?.[0] || null)}
            className="hidden"
          />
        </div>
      </div>

      {sortedLogs.length === 0 ? (
        <div className="text-center py-10 bg-white dark:bg-gray-800 rounded-2xl shadow-sm text-gray-500 dark:text-gray-400">
          No entries for this day.
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr className="text-left text-gray-600 dark:text-gray-300">
                  <th className="px-2 py-2 font-semibold">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={toggleSelectAll}
                    />
                  </th>
                  <th className="px-2 py-2 font-semibold"><button onClick={() => toggleSort('name')} className="hover:underline">Name{sortIndicator('name')}</button></th>
                  <th className="px-2 py-2 font-semibold"><button onClick={() => toggleSort('brand')} className="hover:underline">Brand{sortIndicator('brand')}</button></th>
                  <th className="px-2 py-2 font-semibold"><button onClick={() => toggleSort('quantity')} className="hover:underline">Qty{sortIndicator('quantity')}</button></th>
                  <th className="px-2 py-2 font-semibold"><button onClick={() => toggleSort('serving')} className="hover:underline">Serving{sortIndicator('serving')}</button></th>
                  <th className="px-2 py-2 font-semibold"><button onClick={() => toggleSort('calories')} className="hover:underline">kcal{sortIndicator('calories')}</button></th>
                  <th className="px-2 py-2 font-semibold"><button onClick={() => toggleSort('protein')} className="hover:underline">P{sortIndicator('protein')}</button></th>
                  <th className="px-2 py-2 font-semibold"><button onClick={() => toggleSort('carbs')} className="hover:underline">C{sortIndicator('carbs')}</button></th>
                  <th className="px-2 py-2 font-semibold"><button onClick={() => toggleSort('fat')} className="hover:underline">F{sortIndicator('fat')}</button></th>
                  <th className="px-2 py-2 font-semibold"><button onClick={() => toggleSort('foodId')} className="hover:underline">Food ID{sortIndicator('foodId')}</button></th>
                  <th className="px-2 py-2 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {sortedLogs.map(log => (
                  <tr key={log.id} className="border-t border-gray-100 dark:border-gray-700 text-gray-700 dark:text-gray-200">
                    <td className="px-2 py-2 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(log.id)}
                        onChange={() => toggleSelect(log.id)}
                      />
                    </td>
                    {(['name', 'brand', 'quantity', 'serving', 'calories', 'protein', 'carbs', 'fat'] as EditableField[]).map(field => (
                      <td key={field} className="px-2 py-2 whitespace-nowrap">
                        {inlineEdit?.id === log.id && inlineEdit.field === field ? (
                          <input
                            autoFocus
                            type={['calories', 'protein', 'carbs', 'fat', 'quantity'].includes(field) ? 'number' : 'text'}
                            value={inlineValue}
                            onChange={(e) => setInlineValue(e.target.value)}
                            onBlur={() => saveInlineEdit(log)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') saveInlineEdit(log);
                              if (e.key === 'Escape') cancelInlineEdit();
                            }}
                            className="w-24 px-1 py-0.5 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700"
                          />
                        ) : (
                          <button
                            onClick={() => startInlineEdit(log, field)}
                            className="hover:underline text-left"
                          >
                            {(log as any)[field] ?? '-'}
                          </button>
                        )}
                      </td>
                    ))}
                    <td className="px-2 py-2 whitespace-nowrap text-gray-400 dark:text-gray-500">{log.foodId || '-'}</td>
                    <td className="px-2 py-2 whitespace-nowrap">
                      <button onClick={() => handleDelete(log.id)} className="text-red-500 hover:underline">Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { addLog, deleteLog, FoodLog, getLogs, getToday, updateLog } from '../lib/api';
import { normalizeToDisplayDate, normalizeToIsoDate } from '../lib/date';

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
  const [editingLog, setEditingLog] = useState<FoodLog | null>(null);
  const [editQuantity, setEditQuantity] = useState(1);
  const [editQuantityInput, setEditQuantityInput] = useState('1');
  const [editQuantityType, setEditQuantityType] = useState<'number' | 'grams'>('grams');
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

  const totals = useMemo(() => {
    return sortedLogs.reduce(
      (acc, log) => {
        acc.calories += Number(log.calories) || 0;
        acc.protein += Number(log.protein) || 0;
        acc.carbs += Number(log.carbs) || 0;
        acc.fat += Number(log.fat) || 0;
        return acc;
      },
      { calories: 0, protein: 0, carbs: 0, fat: 0 }
    );
  }, [sortedLogs]);

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
    if (!editingLog) return;

    window.dispatchEvent(
      new CustomEvent('macrometric:header-context', {
        detail: {
          showBack: true,
          buttons: [
            { id: 'delete', label: 'Delete', tone: 'danger' },
            { id: 'save', label: 'Save', tone: 'primary' },
          ],
        },
      })
    );

    const handleHeaderBack = () => {
      setEditingLog(null);
    };

    const handleHeaderAction = async (event: Event) => {
      const actionId = (event as CustomEvent<{ id?: string }>).detail?.id;
      if (!actionId) return;
      if (actionId === 'delete') {
        await handleDelete(editingLog.id);
        setEditingLog(null);
        return;
      }
      if (actionId === 'save') {
        await savePopupEdit();
      }
    };

    window.addEventListener('macrometric:header-back', handleHeaderBack);
    window.addEventListener('macrometric:header-action', handleHeaderAction as EventListener);

    return () => {
      window.removeEventListener('macrometric:header-back', handleHeaderBack);
      window.removeEventListener('macrometric:header-action', handleHeaderAction as EventListener);
      window.dispatchEvent(new CustomEvent('macrometric:header-context', { detail: null }));
    };
  }, [editingLog, userId, editQuantityInput, editQuantityType]);

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
    const raw = field === 'quantity'
      ? (log.quantity || 1) * (Number(log.servingSize) || 100)
      : (log as any)[field];
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

    if (field === 'quantity') {
      const grams = Number(inlineValue.replace(',', '.')) || 0;
      const servingSize = Number(log.servingSize) || 100;
      updates.quantity = grams > 0 ? grams / servingSize : 0;
    } else if (['calories', 'protein', 'carbs', 'fat'].includes(field)) {
      (updates as any)[field] = Number(inlineValue.replace(',', '.')) || 0;
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

  const openEditPopup = (log: FoodLog) => {
    const servingSize = Number(log.servingSize) || 100;
    const currentRatio = log.quantity || 1;
    const currentGrams = Math.round(currentRatio * servingSize * 100) / 100;
    setEditingLog(log);
    setEditQuantity(currentGrams);
    setEditQuantityInput(String(currentGrams));
    setEditQuantityType('grams');
  };

  const openFoodEditor = (log: FoodLog) => {
    const params = new URLSearchParams();
    params.set('logDate', date);

    if (log.foodId) {
      params.set('editFoodId', log.foodId);
    } else {
      params.set('newFoodName', log.name || '');
      params.set('newFoodBrand', log.brand || '');
      params.set('newCalories', String(Number(log.calories) || 0));
      params.set('newProtein', String(Number(log.protein) || 0));
      params.set('newCarbs', String(Number(log.carbs) || 0));
      params.set('newFat', String(Number(log.fat) || 0));
      params.set('newServing', log.serving || '100g');
      params.set('newServingSize', String(Number(log.servingSize) || 100));
      params.set('newNetCarbs', String(Number(log.netCarbs) || Number(log.carbs) || 0));
      params.set('newPackageWeight', String(Number(log.packageWeight) || 0));
      params.set('newPackageCount', String(Number(log.packageCount) || 0));
    }

    // Force a clean page switch so the food edit page is shown standalone.
    window.location.assign(`/my-foods?${params.toString()}`);
  };

  const savePopupEdit = async () => {
    if (!editingLog || !userId) return;
    const servingSize = Number(editingLog.servingSize) || 100;
    const parsed = Number(editQuantityInput.replace(',', '.'));
    const safeQuantity = Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
    const quantityInput = editQuantityType === 'grams' ? safeQuantity : Math.max(1, Math.floor(safeQuantity));
    const quantityToSave = editQuantityType === 'grams' ? quantityInput / servingSize : quantityInput;

    const baseMacros = {
      calories: editingLog.calories / (editingLog.quantity || 1),
      protein: editingLog.protein / (editingLog.quantity || 1),
      carbs: editingLog.carbs / (editingLog.quantity || 1),
      fat: editingLog.fat / (editingLog.quantity || 1),
    };

    const multiplier = editQuantityType === 'grams' ? quantityToSave : quantityToSave;
    const updates: Partial<FoodLog> = {
      quantity: quantityToSave,
      calories: Math.round(baseMacros.calories * multiplier * 10) / 10,
      protein: Math.round(baseMacros.protein * multiplier * 10) / 10,
      carbs: Math.round(baseMacros.carbs * multiplier * 10) / 10,
      fat: Math.round(baseMacros.fat * multiplier * 10) / 10,
      serving: editQuantityType === 'grams' ? `${quantityInput}g` : `${quantityInput}`,
    };

    await updateLog(userId, editingLog.id, updates);
    setLogs(prev => prev.map(l => (l.id === editingLog.id ? { ...l, ...updates } : l)));
    setEditingLog(null);
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

  if (editingLog) {
    const servingSize = Number(editingLog.servingSize) || 100;
    const baseMacros = {
      calories: editingLog.calories / (editingLog.quantity || 1),
      protein: editingLog.protein / (editingLog.quantity || 1),
      carbs: editingLog.carbs / (editingLog.quantity || 1),
      fat: editingLog.fat / (editingLog.quantity || 1),
    };
    const parsedPreview = Number(editQuantityInput.replace(',', '.'));
    const previewQuantity = Number.isFinite(parsedPreview) && parsedPreview > 0
      ? (editQuantityType === 'grams' ? parsedPreview : Math.max(1, Math.floor(parsedPreview)))
      : editQuantity;
    const multiplier = editQuantityType === 'grams' ? previewQuantity / servingSize : previewQuantity;
    const calcCals = Math.round(baseMacros.calories * multiplier);
    const calcProtein = Math.round(baseMacros.protein * multiplier);
    const calcCarbs = Math.round(baseMacros.carbs * multiplier);
    const calcFat = Math.round(baseMacros.fat * multiplier);

    return (
      <div className="space-y-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-5">
          <div className="flex items-start justify-between gap-3 mb-1">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{editingLog.name}</h2>
            <button
              type="button"
              onClick={() => openFoodEditor(editingLog)}
              className="text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
              aria-label={`Edit food item ${editingLog.name}`}
              title="Edit food item"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4" aria-hidden="true">
                <path d="M12 20h9" />
                <path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
              </svg>
            </button>
          </div>
          <p className="text-gray-500 dark:text-gray-400 mb-4">Tap to adjust amount</p>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">Amount</label>
            <div className="flex gap-2 mb-3">
              <button
                onClick={() => setEditQuantityType('number')}
                className={`flex-1 py-2 rounded-lg font-medium transition-colors ${
                  editQuantityType === 'number'
                    ? 'bg-primary-500 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                }`}
              >
                Number
              </button>
              <button
                onClick={() => setEditQuantityType('grams')}
                className={`flex-1 py-2 rounded-lg font-medium transition-colors ${
                  editQuantityType === 'grams'
                    ? 'bg-primary-500 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                }`}
              >
                Grams
              </button>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                inputMode="decimal"
                autoFocus
                value={editQuantityInput}
                onChange={(e) => setEditQuantityInput(e.target.value.replace(',', '.'))}
                onBlur={() => {
                  const parsed = Number(editQuantityInput.replace(',', '.'));
                  const safe = Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
                  const normalized = editQuantityType === 'grams' ? safe : Math.max(1, Math.floor(safe));
                  setEditQuantity(normalized);
                  setEditQuantityInput(String(normalized));
                }}
                min={1}
                step={editQuantityType === 'grams' ? 10 : 1}
                className="flex-1 px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none text-lg text-center"
              />
              <span className="text-gray-500 dark:text-gray-400 w-16">
                {editQuantityType === 'grams' ? 'g' : 'x'}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-3 mb-6">
            <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-xl">
              <div className="text-lg font-bold text-gray-900 dark:text-white">{calcCals}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">kcal</div>
            </div>
            <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/30 rounded-xl">
              <div className="text-lg font-bold text-blue-600 dark:text-blue-400">{calcFat}g</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Fat</div>
            </div>
            <div className="text-center p-3 bg-red-50 dark:bg-red-900/30 rounded-xl">
              <div className="text-lg font-bold text-red-600 dark:text-red-400">{calcProtein}g</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Protein</div>
            </div>
            <div className="text-center p-3 bg-amber-50 dark:bg-amber-900/30 rounded-xl">
              <div className="text-lg font-bold text-amber-600 dark:text-amber-400">{calcCarbs}g</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Carbs</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-3">
        <div className="flex items-center gap-3 flex-wrap">
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
          <div className="ml-auto flex items-center gap-3">
            <label className="text-sm font-medium text-gray-600 dark:text-gray-300">Date</label>
            <input
              data-autofocus-first
              type="text"
              inputMode="numeric"
              value={normalizeToDisplayDate(date, normalizeToDisplayDate(today))}
              onChange={(e) => {
                const normalized = normalizeToIsoDate(e.target.value, date);
                const next = new URLSearchParams(searchParams);
                next.set('date', normalized);
                setSearchParams(next, { replace: true });
              }}
              placeholder="DD-MM-YYYY"
              className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
            <Link
              to={`/my-foods?logDate=${date}`}
              className="px-3 py-1.5 text-sm rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600"
            >
              Open Food Manager
            </Link>
          </div>
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
                  <th className="px-2 py-2 font-semibold">Edit</th>
                  <th className="px-2 py-2 font-semibold"><button onClick={() => toggleSort('brand')} className="hover:underline">Brand{sortIndicator('brand')}</button></th>
                  <th className="px-2 py-2 font-semibold"><button onClick={() => toggleSort('quantity')} className="hover:underline">Qty{sortIndicator('quantity')}</button></th>
                  <th className="px-2 py-2 font-semibold"><button onClick={() => toggleSort('serving')} className="hover:underline">Serving{sortIndicator('serving')}</button></th>
                  <th className="px-2 py-2 font-semibold"><button onClick={() => toggleSort('calories')} className="hover:underline">kcal{sortIndicator('calories')}</button></th>
                  <th className="px-2 py-2 font-semibold"><button onClick={() => toggleSort('protein')} className="hover:underline text-red-600 dark:text-red-400">P{sortIndicator('protein')}</button></th>
                  <th className="px-2 py-2 font-semibold"><button onClick={() => toggleSort('carbs')} className="hover:underline text-amber-600 dark:text-amber-400">C{sortIndicator('carbs')}</button></th>
                  <th className="px-2 py-2 font-semibold"><button onClick={() => toggleSort('fat')} className="hover:underline text-blue-600 dark:text-blue-400">F{sortIndicator('fat')}</button></th>
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
                    <td className="px-2 py-2 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {inlineEdit?.id === log.id && inlineEdit.field === 'name' ? (
                          <input
                            autoFocus
                            type="text"
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
                            onClick={() => startInlineEdit(log, 'name')}
                            className="hover:underline text-left"
                          >
                            {log.name ?? '-'}
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => openFoodEditor(log)}
                          className="text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                          aria-label={`Edit food item ${log.name}`}
                          title="Edit food item"
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5" aria-hidden="true">
                            <path d="M12 20h9" />
                            <path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
                          </svg>
                        </button>
                      </div>
                    </td>
                    <td className="px-2 py-2 whitespace-nowrap">
                      <button
                        onClick={() => openEditPopup(log)}
                        className="text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                        aria-label={`Open edit popup for ${log.name}`}
                        title="Open edit popup"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5" aria-hidden="true">
                          <path d="M12 20h9" />
                          <path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
                        </svg>
                      </button>
                    </td>
                    {(['brand', 'quantity', 'serving', 'calories', 'protein', 'carbs', 'fat'] as EditableField[]).map(field => (
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
                            {field === 'quantity'
                              ? `${Math.round(((log.quantity || 1) * (Number(log.servingSize) || 100)) * 100) / 100}g`
                              : ((log as any)[field] ?? '-')}
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
              <tfoot className="bg-gray-50 dark:bg-gray-700 border-t border-gray-200 dark:border-gray-600">
                <tr className="font-semibold text-gray-700 dark:text-gray-200">
                  <td className="px-2 py-2" />
                  <td className="px-2 py-2 whitespace-nowrap">Totals ({sortedLogs.length} entries)</td>
                  <td className="px-2 py-2" />
                  <td className="px-2 py-2" />
                  <td className="px-2 py-2" />
                  <td className="px-2 py-2" />
                  <td className="px-2 py-2 whitespace-nowrap">{Math.round(totals.calories)}</td>
                  <td className="px-2 py-2 whitespace-nowrap text-red-600 dark:text-red-400">{Math.round(totals.protein)}g</td>
                  <td className="px-2 py-2 whitespace-nowrap text-amber-600 dark:text-amber-400">{Math.round(totals.carbs)}g</td>
                  <td className="px-2 py-2 whitespace-nowrap text-blue-600 dark:text-blue-400">{Math.round(totals.fat)}g</td>
                  <td className="px-2 py-2" />
                  <td className="px-2 py-2" />
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

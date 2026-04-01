import { useRef, useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getMyFoods, addMyFood, deleteMyFood, addLog, updateMyFoodAndLogs, updateLog, Food, getToday } from '../lib/api';
import MaterialIcon from '../components/MaterialIcon';

type EditableField =
  | 'name'
  | 'brand'
  | 'calories'
  | 'protein'
  | 'carbs'
  | 'netCarbs'
  | 'fat'
  | 'serving'
  | 'servingSize'
  | 'packageWeight'
  | 'packageCount';

type SortKey =
  | 'name'
  | 'brand'
  | 'calories'
  | 'protein'
  | 'carbs'
  | 'netCarbs'
  | 'fat'
  | 'serving'
  | 'servingSize'
  | 'packageWeight'
  | 'packageCount'
  | 'id';

export default function MyFoods() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { userId, loading: authLoading } = useAuth();
  const [allFoods, setAllFoods] = useState<Food[]>([]);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingFood, setEditingFood] = useState<Food | null>(null);
  const [loading, setLoading] = useState(true);
  const [showImportInput, setShowImportInput] = useState(false);
  const [importText, setImportText] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [inlineEdit, setInlineEdit] = useState<{ id: string; field: EditableField } | null>(null);
  const [inlineValue, setInlineValue] = useState('');
  const [bulkBusy, setBulkBusy] = useState(false);
  const initialLogDateParam = searchParams.get('logDate');
  const [logDate, setLogDate] = useState(
    initialLogDateParam && /^\d{4}-\d{2}-\d{2}$/.test(initialLogDateParam)
      ? initialLogDateParam
      : getToday()
  );
  const [logInputs, setLogInputs] = useState<Record<string, { count: string; grams: string }>>({});
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const editFoodIdParam = searchParams.get('editFoodId');
  const deepLinkHandledRef = useRef<string>('');
  const newFoodNameParam = searchParams.get('newFoodName');
  const newFoodBrandParam = searchParams.get('newFoodBrand');
  const newCaloriesParam = searchParams.get('newCalories');
  const newProteinParam = searchParams.get('newProtein');
  const newCarbsParam = searchParams.get('newCarbs');
  const newFatParam = searchParams.get('newFat');
  const newServingParam = searchParams.get('newServing');
  const newServingSizeParam = searchParams.get('newServingSize');
  const newNetCarbsParam = searchParams.get('newNetCarbs');
  const newPackageWeightParam = searchParams.get('newPackageWeight');
  const newPackageCountParam = searchParams.get('newPackageCount');
  const logWeightParam = searchParams.get('logWeight');
  const logIdParam = searchParams.get('logId');
  const [logWeightInput, setLogWeightInput] = useState('');
  const [targetLogId, setTargetLogId] = useState('');
  const showTodayLogWeightField = !!targetLogId;
  const [formData, setFormData] = useState<Food>({
    id: '',
    name: '',
    brand: null,
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
    serving: '100g',
    netCarbs: 0,
    packageWeight: 0,
    packageCount: 0,
  });

  useEffect(() => {
    if (userId) {
      loadFoods();
    }
  }, [userId]);

  useEffect(() => {
    if (!showForm) return;

    window.dispatchEvent(
      new CustomEvent('macrometric:header-context', {
        detail: {
          showBack: true,
          buttons: [{ id: 'save-food', label: editingFood ? 'Save' : 'Add', tone: 'primary' }],
        },
      })
    );

    const handleHeaderBack = () => {
      setShowForm(false);
    };

    const handleHeaderAction = async (event: Event) => {
      const actionId = (event as CustomEvent<{ id?: string }>).detail?.id;
      if (actionId === 'save-food') {
        await handleSave();
      }
    };

    window.addEventListener('macrometric:header-back', handleHeaderBack);
    window.addEventListener('macrometric:header-action', handleHeaderAction as EventListener);

    return () => {
      window.removeEventListener('macrometric:header-back', handleHeaderBack);
      window.removeEventListener('macrometric:header-action', handleHeaderAction as EventListener);
      window.dispatchEvent(new CustomEvent('macrometric:header-context', { detail: null }));
    };
  }, [showForm, editingFood, formData, userId]);

  useEffect(() => {
    const logDateParam = searchParams.get('logDate');
    if (!logDateParam || !/^\d{4}-\d{2}-\d{2}$/.test(logDateParam)) return;
    if (logDateParam !== logDate) setLogDate(logDateParam);
  }, [searchParams, logDate]);

  useEffect(() => {
    const deepLinkKey = searchParams.toString();
    if (!deepLinkKey || deepLinkHandledRef.current === deepLinkKey) return;

    if (editFoodIdParam && allFoods.length > 0) {
      const targetFood = allFoods.find((food) => food.id === editFoodIdParam);
      if (targetFood) {
        openEditForm(targetFood, logWeightParam || '', logIdParam || '');
      }
      setTargetLogId(logIdParam || '');
      const next = new URLSearchParams(searchParams);
      next.delete('editFoodId');
      next.delete('logWeight');
      next.delete('logId');
      setSearchParams(next, { replace: true });
      deepLinkHandledRef.current = deepLinkKey;
      return;
    }

    if (newFoodNameParam) {
      setEditingFood(null);
      setFormData({
        id: '',
        name: newFoodNameParam,
        brand: newFoodBrandParam || null,
        calories: Number(newCaloriesParam) || 0,
        protein: Number(newProteinParam) || 0,
        carbs: Number(newCarbsParam) || 0,
        fat: Number(newFatParam) || 0,
        serving: newServingParam || '100g',
        servingSize: Number(newServingSizeParam) || 100,
        netCarbs: Number(newNetCarbsParam) || Number(newCarbsParam) || 0,
        packageWeight: Number(newPackageWeightParam) || 0,
        packageCount: Number(newPackageCountParam) || 0,
      });
      setLogWeightInput(logWeightParam || '');
      setTargetLogId(logIdParam || '');
      setShowForm(true);
      const next = new URLSearchParams(searchParams);
      next.delete('newFoodName');
      next.delete('newFoodBrand');
      next.delete('newCalories');
      next.delete('newProtein');
      next.delete('newCarbs');
      next.delete('newFat');
      next.delete('newServing');
      next.delete('newServingSize');
      next.delete('newNetCarbs');
      next.delete('newPackageWeight');
      next.delete('newPackageCount');
      next.delete('logWeight');
      next.delete('logId');
      setSearchParams(next, { replace: true });
      deepLinkHandledRef.current = deepLinkKey;
    }
  }, [
    searchParams,
    setSearchParams,
    editFoodIdParam,
    allFoods,
    newFoodNameParam,
    newFoodBrandParam,
    newCaloriesParam,
    newProteinParam,
    newCarbsParam,
    newFatParam,
    newServingParam,
    newServingSizeParam,
    newNetCarbsParam,
    newPackageWeightParam,
    newPackageCountParam,
    logWeightParam,
    logIdParam,
  ]);

  const loadFoods = async () => {
    if (!userId) return;
    setLoading(true);
    const foods = await getMyFoods(userId);
    setAllFoods(foods);
    setLoading(false);
  };

  const filteredFoods = search.trim()
    ? allFoods.filter(f => 
        f.name.toLowerCase().includes(search.toLowerCase()) ||
        (f.brand && f.brand.toLowerCase().includes(search.toLowerCase()))
      )
    : allFoods;
  
  const sortedFoods = useMemo(() => {
    const items = [...filteredFoods];
    const getValue = (food: Food): string | number => {
      switch (sortKey) {
        case 'brand':
          return food.brand || '';
        case 'calories':
        case 'protein':
        case 'carbs':
        case 'netCarbs':
        case 'fat':
        case 'servingSize':
        case 'packageWeight':
        case 'packageCount':
          return Number((food as any)[sortKey]) || 0;
        case 'id':
          return food.id || '';
        default:
          return String((food as any)[sortKey] || '').toLowerCase();
      }
    };

    items.sort((a, b) => {
      const av = getValue(a);
      const bv = getValue(b);
      if (typeof av === 'number' && typeof bv === 'number') {
        return sortDir === 'asc' ? av - bv : bv - av;
      }
      const cmp = String(av).localeCompare(String(bv), undefined, { sensitivity: 'base' });
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return items;
  }, [filteredFoods, sortKey, sortDir]);

  const selectableFilteredIds = sortedFoods.map(f => f.id).filter(Boolean) as string[];
  const allFilteredSelected = selectableFilteredIds.length > 0 && selectableFilteredIds.every(id => selectedIds.has(id));

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(prev => (prev === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setSortKey(key);
    setSortDir('asc');
  };

  const sortIndicator = (key: SortKey) => (sortKey === key ? (sortDir === 'asc' ? ' ↑' : ' ↓') : '');

  const openAddForm = () => {
    setEditingFood(null);
    setLogWeightInput('');
    setTargetLogId('');
    setFormData({
      id: '',
      name: '',
      brand: null,
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      serving: '100g',
      netCarbs: 0,
      packageWeight: 0,
      packageCount: 0,
    });
    setShowForm(true);
  };

  const openEditForm = (food: Food, presetLogWeight = '', presetLogId = '') => {
    setEditingFood(food);
    setLogWeightInput(presetLogWeight);
    setTargetLogId(presetLogId);
    setFormData({ ...food });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!userId) return;
    if (!formData.name.trim()) {
      alert('Please enter a food name');
      return;
    }

    let foodForLog: Food;
    if (editingFood) {
      const result = await updateMyFoodAndLogs(userId, formData);
      foodForLog = { ...formData, id: editingFood.id };
      if (result.updatedLogs > 0) {
        alert(`Saved! Updated ${result.updatedLogs} past entry(s).`);
      }
    } else {
      const savedFood = await addMyFood(userId, formData);
      foodForLog = { ...formData, id: savedFood.id };
    }

    const parsedLogWeight = Number(logWeightInput.replace(',', '.'));
    if (Number.isFinite(parsedLogWeight) && parsedLogWeight > 0) {
      const servingSize = Number(foodForLog.servingSize) || 100;
      const quantity = parsedLogWeight / servingSize;
      const multiplier = quantity;
      const netCarbsPerUnit = (foodForLog.netCarbs && foodForLog.netCarbs > 0) ? foodForLog.netCarbs : foodForLog.carbs;
      const logPayload = {
        ...foodForLog,
        calories: Math.round((foodForLog.calories || 0) * multiplier * 10) / 10,
        protein: Math.round((foodForLog.protein || 0) * multiplier * 10) / 10,
        carbs: Math.round((foodForLog.carbs || 0) * multiplier * 10) / 10,
        fat: Math.round((foodForLog.fat || 0) * multiplier * 10) / 10,
        netCarbs: Math.round((netCarbsPerUnit || 0) * multiplier * 10) / 10,
        serving: `${Math.round(parsedLogWeight * 10) / 10}g`,
        quantity,
        date: logDate,
      };
      if (targetLogId) {
        await updateLog(userId, targetLogId, logPayload);
      } else {
        await addLog(userId, logPayload);
      }
    }
    
    await loadFoods();
    setShowForm(false);
    navigate('/');
  };

  const handleDelete = async (id: string) => {
    if (!userId) return;
    if (confirm('Delete this food from your database?')) {
      await deleteMyFood(userId, id);
      await loadFoods();
    }
  };

  const toggleSelect = (id?: string) => {
    if (!id) return;
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAllFiltered = () => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (allFilteredSelected) {
        selectableFilteredIds.forEach(id => next.delete(id));
      } else {
        selectableFilteredIds.forEach(id => next.add(id));
      }
      return next;
    });
  };

  const handleDeleteSelected = async () => {
    if (!userId || selectedIds.size === 0) return;
    if (!confirm(`Delete ${selectedIds.size} selected food item(s)?`)) return;

    setBulkBusy(true);
    try {
      await Promise.all(Array.from(selectedIds).map(id => deleteMyFood(userId, id)));
      setSelectedIds(new Set());
      await loadFoods();
    } finally {
      setBulkBusy(false);
    }
  };

  const handleLogSelected = async () => {
    if (!userId || selectedIds.size === 0) return;
    setBulkBusy(true);
    try {
      const selectedFoods = allFoods.filter(f => f.id && selectedIds.has(f.id));
      await Promise.all(
        selectedFoods.map(food => {
          const input = food.id ? logInputs[food.id] : undefined;
          const countValue = Number(input?.count ?? '1');
          const gramsValue = Number(input?.grams ?? '');
          const safeCount = Number.isFinite(countValue) && countValue > 0 ? countValue : 1;
          let quantity = safeCount;

          if (Number.isFinite(gramsValue) && gramsValue > 0) {
            const servingSize = Number(food.servingSize) || 100;
            quantity = gramsValue / servingSize;
          }

          const multiplier = quantity;
          return addLog(userId, {
            ...food,
            calories: Math.round((food.calories || 0) * multiplier * 10) / 10,
            protein: Math.round((food.protein || 0) * multiplier * 10) / 10,
            carbs: Math.round((food.carbs || 0) * multiplier * 10) / 10,
            fat: Math.round((food.fat || 0) * multiplier * 10) / 10,
            netCarbs: Math.round(((food.netCarbs && food.netCarbs > 0 ? food.netCarbs : food.carbs) || 0) * multiplier * 10) / 10,
            quantity,
            date: logDate,
          });
        })
      );
      alert(`Logged ${selectedFoods.length} item(s) to ${logDate}.`);
    } finally {
      setBulkBusy(false);
    }
  };

  const updateLogInput = (foodId: string | undefined, field: 'count' | 'grams', value: string) => {
    if (!foodId) return;
    setLogInputs(prev => ({
      ...prev,
      [foodId]: {
        count: prev[foodId]?.count ?? '1',
        grams: prev[foodId]?.grams ?? '',
        [field]: value,
      },
    }));
  };

  const handleExportSelected = () => {
    const selectedFoods = allFoods.filter(f => f.id && selectedIds.has(f.id));
    if (selectedFoods.length === 0) return;

    const payload = {
      version: 1,
      exportedAt: new Date().toISOString(),
      type: 'my_foods_selection',
      foods: selectedFoods,
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const datePart = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `macrometric-my-foods-selected-${datePart}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleImportFoods = async (file?: File | null) => {
    if (!userId || !file) return;
    setBulkBusy(true);
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const sourceFoods = Array.isArray(parsed) ? parsed : (parsed?.foods || []);
      if (!Array.isArray(sourceFoods) || sourceFoods.length === 0) {
        alert('No foods found in import file');
        return;
      }

      let imported = 0;
      for (const item of sourceFoods) {
        if (!item?.name) continue;
        await addMyFood(userId, {
          name: String(item.name),
          brand: item.brand ? String(item.brand) : null,
          calories: Number(item.calories) || 0,
          protein: Number(item.protein) || 0,
          carbs: Number(item.carbs) || 0,
          fat: Number(item.fat) || 0,
          serving: item.serving ? String(item.serving) : '100g',
          servingSize: Number(item.servingSize) || Number(item.serving_size) || 100,
          netCarbs: Number(item.netCarbs) || Number(item.net_carbs) || 0,
          packageWeight: Number(item.packageWeight) || Number(item.package_weight) || 0,
          packageCount: Number(item.packageCount) || Number(item.package_count) || 0,
        });
        imported += 1;
      }

      await loadFoods();
      alert(`Imported ${imported} food item(s).`);
    } catch (error) {
      console.error(error);
      alert('Import failed. Please use a valid JSON export file.');
    } finally {
      setBulkBusy(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleQuickLog = async (food: Food) => {
    if (!userId) return;
    await addLog(userId, { ...food, quantity: 1, date: logDate });
  };

  const handleImportAndFill = () => {
    const line = importText.trim().split('\n')[0];
    if (!line) return;

    const parts = line.split(';');
    const [
      name, calories, fat, protein, carbs, netCarbs,
      servingSize, servingUnit, brand, packageWeight, packageCount
    ] = parts;

    const serving = servingSize && servingUnit ? `${servingSize}${servingUnit}` : (formData.serving || '100g');

    setFormData({
      ...formData,
      name: name || '',
      calories: Number(calories) || 0,
      fat: Number(fat) || 0,
      protein: Number(protein) || 0,
      carbs: Number(carbs) || 0,
      netCarbs: Number(netCarbs) || 0,
      serving,
      servingSize: Number(servingSize) || formData.servingSize || 100,
      brand: brand || null,
      packageWeight: Number(packageWeight) || 0,
      packageCount: Number(packageCount) || 0,
    });

    setShowImportInput(false);
    setImportText('');
  };

  const startInlineEdit = (food: Food, field: EditableField) => {
    if (!food.id) return;
    setInlineEdit({ id: food.id, field });
    const raw = (food as any)[field];
    setInlineValue(raw === null || raw === undefined ? '' : String(raw));
  };

  const saveInlineEdit = async (food: Food) => {
    if (!userId || !food.id || !inlineEdit || inlineEdit.id !== food.id) return;
    const field = inlineEdit.field;
    const updatedFood: Food = { ...food };
    const numericFields: EditableField[] = ['calories', 'protein', 'carbs', 'netCarbs', 'fat', 'servingSize', 'packageWeight', 'packageCount'];

    if (numericFields.includes(field)) {
      (updatedFood as any)[field] = Number(inlineValue) || 0;
    } else if (field === 'brand') {
      updatedFood.brand = inlineValue.trim() ? inlineValue : null;
    } else {
      (updatedFood as any)[field] = inlineValue;
    }

    // Prevent accidental disappearing row due to empty required name.
    if (field === 'name' && !String(updatedFood.name || '').trim()) {
      alert('Name cannot be empty');
      cancelInlineEdit();
      return;
    }

    await updateMyFoodAndLogs(userId, updatedFood);
    setAllFoods(prev => prev.map(f => (f.id === updatedFood.id ? updatedFood : f)));
    setInlineEdit(null);
    setInlineValue('');
  };

  const cancelInlineEdit = () => {
    setInlineEdit(null);
    setInlineValue('');
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

  if (showForm) {
    return (
      <div className="space-y-4">
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-2xl shadow-sm p-5 border border-blue-100 dark:border-blue-800">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              {editingFood ? 'Edit Food' : 'Add New Food'}
            </h2>
            <button
              onClick={() => setShowImportInput(!showImportInput)}
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
            >
              Import
            </button>
          </div>

          {showImportInput && (
            <div className="mb-4 p-3 bg-white dark:bg-gray-800 rounded-xl">
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-2">
                Paste semicolon data:
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={importText}
                  onChange={(e) => setImportText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleImportAndFill()}
                  placeholder="Zure Haring;160;11;15;0.5;0.5;100;g;Zeelandia;;"
                  className="flex-1 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none text-sm font-mono"
                />
                <button
                  onClick={handleImportAndFill}
                  disabled={!importText.trim()}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    !importText.trim()
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-green-500 text-white hover:bg-green-600'
                  }`}
                >
                  Fill
                </button>
              </div>
            </div>
          )}
          
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 mb-4">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3">Basic Info</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Food Name</label>
                <input
                  type="text"
                  autoFocus
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Raw Egg"
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Brand (optional)</label>
                <input
                  type="text"
                  value={formData.brand || ''}
                  onChange={(e) => setFormData({ ...formData, brand: e.target.value || null })}
                  placeholder="e.g. Albert Heijn"
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none text-sm"
                />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 mb-4">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3">Macros (per 100g or per serving)</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Calories</label>
                <input
                  type="number"
                  value={formData.calories || ''}
                  onChange={(e) => setFormData({ ...formData, calories: Number(e.target.value) || 0 })}
                  placeholder="0"
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-blue-600 dark:text-blue-400 mb-1 font-semibold">Fat (g)</label>
                <input
                  type="number"
                  value={formData.fat || ''}
                  onChange={(e) => setFormData({ ...formData, fat: Number(e.target.value) || 0 })}
                  placeholder="0"
                  className="w-full px-3 py-2 rounded-lg border-blue-200 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/30 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-red-600 dark:text-red-400 mb-1 font-semibold">Protein (g)</label>
                <input
                  type="number"
                  value={formData.protein || ''}
                  onChange={(e) => setFormData({ ...formData, protein: Number(e.target.value) || 0 })}
                  placeholder="0"
                  className="w-full px-3 py-2 rounded-lg border-red-200 dark:border-red-700 bg-red-50 dark:bg-red-900/30 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 outline-none text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-amber-600 dark:text-amber-400 mb-1 font-semibold">Carbs (g)</label>
                <input
                  type="number"
                  value={formData.carbs || ''}
                  onChange={(e) => setFormData({ ...formData, carbs: Number(e.target.value) || 0 })}
                  placeholder="0"
                  className="w-full px-3 py-2 rounded-lg border-amber-200 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/30 text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500 outline-none text-sm"
                />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 mb-4">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3">Package Info</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Package Weight (g)</label>
                <input
                  type="number"
                  value={formData.packageWeight || ''}
                  onChange={(e) => setFormData({ ...formData, packageWeight: Number(e.target.value) || 0 })}
                  placeholder="e.g. 500"
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Items in Package</label>
                <input
                  type="number"
                  value={formData.packageCount || ''}
                  onChange={(e) => setFormData({ ...formData, packageCount: Number(e.target.value) || 0 })}
                  placeholder="e.g. 10"
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none text-sm"
                />
              </div>
            </div>
          </div>

          {showTodayLogWeightField && (
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 mb-4">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3">Log to Date (Optional)</h3>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">
                  Amount Weight for {logDate} (g)
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={logWeightInput}
                  onChange={(e) => setLogWeightInput(e.target.value)}
                  placeholder="e.g. 150"
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none text-sm"
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  This value is only used for the daily log entry and is not stored in the My Foods database.
                </p>
              </div>
            </div>
          )}
            
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-3 mb-4">
        <div className="flex items-center gap-2 whitespace-nowrap overflow-x-auto">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mr-1">Food Manager</h2>
          <span className="text-sm text-gray-500 dark:text-gray-400 mr-2">{allFoods.length} foods</span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search..."
            className="w-44 min-w-[140px] px-2 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none text-sm"
          />
          <button
            onClick={handleLogSelected}
            disabled={selectedIds.size === 0 || bulkBusy}
            className="px-3 py-1.5 text-sm rounded-lg bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 disabled:opacity-50"
          >
            Log{selectedIds.size > 0 ? ` (${selectedIds.size})` : ''}
          </button>
          <button
            onClick={handleDeleteSelected}
            disabled={selectedIds.size === 0 || bulkBusy}
            className="px-3 py-1.5 text-sm rounded-lg bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 disabled:opacity-50"
          >
            Delete{selectedIds.size > 0 ? ` (${selectedIds.size})` : ''}
          </button>
          <button
            onClick={handleExportSelected}
            disabled={selectedIds.size === 0}
            className="px-3 py-1.5 text-sm rounded-lg bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 disabled:opacity-50"
          >
            Export{selectedIds.size > 0 ? ` (${selectedIds.size})` : ''}
          </button>
          <button
            onClick={handleImportClick}
            disabled={bulkBusy}
            className="px-3 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 text-sm font-medium rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
          >
            Import Foods
          </button>
          <button
            onClick={openAddForm}
            className="px-4 py-2 bg-primary-500 text-white font-medium rounded-lg hover:bg-primary-600 transition-colors"
          >
            + Add
          </button>
          <div className="ml-auto flex items-center gap-2">
            <input
              type="date"
              value={logDate}
              onChange={(e) => setLogDate(e.target.value)}
              className="px-2 py-1 rounded border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
            <button
              onClick={() => navigate(`/food-entries?date=${logDate}`)}
              className="px-3 py-1.5 text-sm rounded-lg bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-200 dark:hover:bg-emerald-900/60"
              title="Open Food Entry Manager for selected date"
            >
              Log Date
            </button>
          </div>
        </div>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept=".json,application/json"
        onChange={(e) => handleImportFoods(e.target.files?.[0] || null)}
        className="hidden"
      />

      {sortedFoods.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-2xl shadow-sm">
          <div className="mb-4 flex justify-center">
            <MaterialIcon name="search" className="text-[48px] text-gray-400 dark:text-gray-500" />
          </div>
          <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-2">No Foods Found</h3>
          <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-xs mx-auto">
            {search ? 'No foods match your search.' : 'Add your own foods to build a personalized database.'}
          </p>
          {!search && (
            <button
              onClick={openAddForm}
              className="px-6 py-3 bg-primary-500 text-white font-semibold rounded-xl hover:bg-primary-600 transition-colors"
            >
              Add Your First Food
            </button>
          )}
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
                      checked={allFilteredSelected}
                      onChange={toggleSelectAllFiltered}
                    />
                  </th>
                  <th className="px-2 py-2 font-semibold">
                    <button onClick={() => toggleSort('name')} className="hover:underline">
                      Name{sortIndicator('name')}
                    </button>
                  </th>
                  <th className="px-2 py-2 font-semibold">Edit</th>
                  <th className="px-2 py-2 font-semibold text-green-700 dark:text-green-300">Aantal</th>
                  <th className="px-2 py-2 font-semibold text-green-700 dark:text-green-300">Gewicht (g)</th>
                  <th className="px-2 py-2 font-semibold">
                    <button onClick={() => toggleSort('brand')} className="hover:underline">
                      Brand{sortIndicator('brand')}
                    </button>
                  </th>
                  <th className="px-2 py-2 font-semibold">
                    <button onClick={() => toggleSort('calories')} className="hover:underline">
                      kcal{sortIndicator('calories')}
                    </button>
                  </th>
                  <th className="px-2 py-2 font-semibold">
                    <button onClick={() => toggleSort('protein')} className="hover:underline">
                      P{sortIndicator('protein')}
                    </button>
                  </th>
                  <th className="px-2 py-2 font-semibold">
                    <button onClick={() => toggleSort('carbs')} className="hover:underline">
                      C{sortIndicator('carbs')}
                    </button>
                  </th>
                  <th className="px-2 py-2 font-semibold">
                    <button onClick={() => toggleSort('netCarbs')} className="hover:underline">
                      Net C{sortIndicator('netCarbs')}
                    </button>
                  </th>
                  <th className="px-2 py-2 font-semibold">
                    <button onClick={() => toggleSort('fat')} className="hover:underline">
                      F{sortIndicator('fat')}
                    </button>
                  </th>
                  <th className="px-2 py-2 font-semibold">
                    <button onClick={() => toggleSort('serving')} className="hover:underline">
                      Serving{sortIndicator('serving')}
                    </button>
                  </th>
                  <th className="px-2 py-2 font-semibold">
                    <button onClick={() => toggleSort('servingSize')} className="hover:underline">
                      Serving Size{sortIndicator('servingSize')}
                    </button>
                  </th>
                  <th className="px-2 py-2 font-semibold">
                    <button onClick={() => toggleSort('packageWeight')} className="hover:underline">
                      Gewicht (g){sortIndicator('packageWeight')}
                    </button>
                  </th>
                  <th className="px-2 py-2 font-semibold">
                    <button onClick={() => toggleSort('packageCount')} className="hover:underline">
                      Aantal{sortIndicator('packageCount')}
                    </button>
                  </th>
                  <th className="px-2 py-2 font-semibold">
                    <button onClick={() => toggleSort('id')} className="hover:underline">
                      ID{sortIndicator('id')}
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedFoods.map((food: Food) => (
                  <tr key={food.id} className="border-t border-gray-100 dark:border-gray-700 text-gray-700 dark:text-gray-200 align-top">
                    <td className="px-2 py-2 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={!!food.id && selectedIds.has(food.id)}
                        onChange={() => toggleSelect(food.id)}
                      />
                    </td>
                    <td className="px-2 py-2 whitespace-nowrap font-medium">
                      {inlineEdit?.id === food.id && inlineEdit.field === 'name' ? (
                        <input
                          autoFocus
                          value={inlineValue}
                          onChange={(e) => setInlineValue(e.target.value)}
                          onBlur={() => saveInlineEdit(food)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') saveInlineEdit(food);
                            if (e.key === 'Escape') cancelInlineEdit();
                          }}
                          className="w-40 px-1 py-0.5 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700"
                        />
                      ) : (
                        <button onClick={() => startInlineEdit(food, 'name')} className="hover:underline text-left">{food.name}</button>
                      )}
                    </td>
                    <td className="px-2 py-2 whitespace-nowrap">
                      <button
                        onClick={() => openEditForm(food)}
                        className="text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                        aria-label={`Open edit dialog for ${food.name}`}
                        title="Open edit dialog"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5" aria-hidden="true">
                          <path d="M12 20h9" />
                          <path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
                        </svg>
                      </button>
                    </td>
                    <td className="px-2 py-2 whitespace-nowrap">
                      <input
                        type="number"
                        min="0"
                        step="0.1"
                        value={(food.id && logInputs[food.id]?.count) ?? '1'}
                        onChange={(e) => updateLogInput(food.id, 'count', e.target.value)}
                        className="w-16 px-1 py-0.5 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700"
                      />
                    </td>
                    <td className="px-2 py-2 whitespace-nowrap">
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={(food.id && logInputs[food.id]?.grams) ?? ''}
                        onChange={(e) => updateLogInput(food.id, 'grams', e.target.value)}
                        placeholder="g"
                        className="w-20 px-1 py-0.5 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700"
                      />
                    </td>
                    <td className="px-2 py-2 whitespace-nowrap">
                      {inlineEdit?.id === food.id && inlineEdit.field === 'brand' ? (
                        <input
                          autoFocus
                          value={inlineValue}
                          onChange={(e) => setInlineValue(e.target.value)}
                          onBlur={() => saveInlineEdit(food)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') saveInlineEdit(food);
                            if (e.key === 'Escape') cancelInlineEdit();
                          }}
                          className="w-40 px-1 py-0.5 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700"
                        />
                      ) : (
                        <button onClick={() => startInlineEdit(food, 'brand')} className="hover:underline text-left">{food.brand || '-'}</button>
                      )}
                    </td>
                    <td className="px-2 py-2 whitespace-nowrap">
                      {inlineEdit?.id === food.id && inlineEdit.field === 'calories' ? (
                        <input autoFocus type="number" value={inlineValue} onChange={(e) => setInlineValue(e.target.value)} onBlur={() => saveInlineEdit(food)} onKeyDown={(e) => { if (e.key === 'Enter') saveInlineEdit(food); if (e.key === 'Escape') cancelInlineEdit(); }} className="w-20 px-1 py-0.5 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700" />
                      ) : (
                        <button onClick={() => startInlineEdit(food, 'calories')} className="hover:underline text-left">{Math.round(food.calories)}</button>
                      )}
                    </td>
                    <td className="px-2 py-2 whitespace-nowrap">
                      {inlineEdit?.id === food.id && inlineEdit.field === 'protein' ? (
                        <input autoFocus type="number" value={inlineValue} onChange={(e) => setInlineValue(e.target.value)} onBlur={() => saveInlineEdit(food)} onKeyDown={(e) => { if (e.key === 'Enter') saveInlineEdit(food); if (e.key === 'Escape') cancelInlineEdit(); }} className="w-20 px-1 py-0.5 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700" />
                      ) : (
                        <button onClick={() => startInlineEdit(food, 'protein')} className="hover:underline text-left">{Math.round(food.protein)}</button>
                      )}
                    </td>
                    <td className="px-2 py-2 whitespace-nowrap">
                      {inlineEdit?.id === food.id && inlineEdit.field === 'carbs' ? (
                        <input autoFocus type="number" value={inlineValue} onChange={(e) => setInlineValue(e.target.value)} onBlur={() => saveInlineEdit(food)} onKeyDown={(e) => { if (e.key === 'Enter') saveInlineEdit(food); if (e.key === 'Escape') cancelInlineEdit(); }} className="w-20 px-1 py-0.5 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700" />
                      ) : (
                        <button onClick={() => startInlineEdit(food, 'carbs')} className="hover:underline text-left">{Math.round(food.carbs)}</button>
                      )}
                    </td>
                    <td className="px-2 py-2 whitespace-nowrap">
                      {inlineEdit?.id === food.id && inlineEdit.field === 'netCarbs' ? (
                        <input autoFocus type="number" value={inlineValue} onChange={(e) => setInlineValue(e.target.value)} onBlur={() => saveInlineEdit(food)} onKeyDown={(e) => { if (e.key === 'Enter') saveInlineEdit(food); if (e.key === 'Escape') cancelInlineEdit(); }} className="w-20 px-1 py-0.5 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700" />
                      ) : (
                        <button onClick={() => startInlineEdit(food, 'netCarbs')} className="hover:underline text-left">{Math.round(food.netCarbs && food.netCarbs > 0 ? food.netCarbs : food.carbs)}</button>
                      )}
                    </td>
                    <td className="px-2 py-2 whitespace-nowrap">
                      {inlineEdit?.id === food.id && inlineEdit.field === 'fat' ? (
                        <input autoFocus type="number" value={inlineValue} onChange={(e) => setInlineValue(e.target.value)} onBlur={() => saveInlineEdit(food)} onKeyDown={(e) => { if (e.key === 'Enter') saveInlineEdit(food); if (e.key === 'Escape') cancelInlineEdit(); }} className="w-20 px-1 py-0.5 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700" />
                      ) : (
                        <button onClick={() => startInlineEdit(food, 'fat')} className="hover:underline text-left">{Math.round(food.fat)}</button>
                      )}
                    </td>
                    <td className="px-2 py-2 whitespace-nowrap">
                      {inlineEdit?.id === food.id && inlineEdit.field === 'serving' ? (
                        <input autoFocus value={inlineValue} onChange={(e) => setInlineValue(e.target.value)} onBlur={() => saveInlineEdit(food)} onKeyDown={(e) => { if (e.key === 'Enter') saveInlineEdit(food); if (e.key === 'Escape') cancelInlineEdit(); }} className="w-24 px-1 py-0.5 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700" />
                      ) : (
                        <button onClick={() => startInlineEdit(food, 'serving')} className="hover:underline text-left">{food.serving || '-'}</button>
                      )}
                    </td>
                    <td className="px-2 py-2 whitespace-nowrap">
                      {inlineEdit?.id === food.id && inlineEdit.field === 'servingSize' ? (
                        <input autoFocus type="number" value={inlineValue} onChange={(e) => setInlineValue(e.target.value)} onBlur={() => saveInlineEdit(food)} onKeyDown={(e) => { if (e.key === 'Enter') saveInlineEdit(food); if (e.key === 'Escape') cancelInlineEdit(); }} className="w-20 px-1 py-0.5 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700" />
                      ) : (
                        <button onClick={() => startInlineEdit(food, 'servingSize')} className="hover:underline text-left">{food.servingSize || '-'}</button>
                      )}
                    </td>
                    <td className="px-2 py-2 whitespace-nowrap">
                      {inlineEdit?.id === food.id && inlineEdit.field === 'packageWeight' ? (
                        <input autoFocus type="number" value={inlineValue} onChange={(e) => setInlineValue(e.target.value)} onBlur={() => saveInlineEdit(food)} onKeyDown={(e) => { if (e.key === 'Enter') saveInlineEdit(food); if (e.key === 'Escape') cancelInlineEdit(); }} className="w-20 px-1 py-0.5 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700" />
                      ) : (
                        <button onClick={() => startInlineEdit(food, 'packageWeight')} className="hover:underline text-left">{food.packageWeight || '-'}</button>
                      )}
                    </td>
                    <td className="px-2 py-2 whitespace-nowrap">
                      {inlineEdit?.id === food.id && inlineEdit.field === 'packageCount' ? (
                        <input autoFocus type="number" value={inlineValue} onChange={(e) => setInlineValue(e.target.value)} onBlur={() => saveInlineEdit(food)} onKeyDown={(e) => { if (e.key === 'Enter') saveInlineEdit(food); if (e.key === 'Escape') cancelInlineEdit(); }} className="w-20 px-1 py-0.5 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700" />
                      ) : (
                        <button onClick={() => startInlineEdit(food, 'packageCount')} className="hover:underline text-left">{food.packageCount || '-'}</button>
                      )}
                    </td>
                    <td className="px-2 py-2 whitespace-nowrap text-gray-400 dark:text-gray-500">{food.id || '-'}</td>
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

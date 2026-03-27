import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { searchAllFoods, searchByBarcode, addLog, Food, addMyFood, updateMyFood, deleteMyFood } from '../lib/api';
import BarcodeScanner from '../components/BarcodeScanner';
import NutritionScanner from '../components/NutritionScanner';

export default function FoodLog() {
  const navigate = useNavigate();
  const { userId, loading: authLoading } = useAuth();
  const [query, setQuery] = useState('');
  const [myFoods, setMyFoods] = useState<Food[]>([]);
  const [databaseFoods, setDatabaseFoods] = useState<Food[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [selectedFood, setSelectedFood] = useState<Food | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [quantityType, setQuantityType] = useState<'number' | 'grams'>('number');
  const [showScanner, setShowScanner] = useState(false);
  const [showManualAdd, setShowManualAdd] = useState(false);
  const [showImportInput, setShowImportInput] = useState(false);
  const [showNutritionScanner, setShowNutritionScanner] = useState(false);
  const [importText, setImportText] = useState('');
  const [editingFood, setEditingFood] = useState<Food | null>(null);
  const [manualFood, setManualFood] = useState<Food>({
    name: '',
    brand: null,
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
    netCarbs: 0,
    serving: '100g',
    servingSize: 100,
    packageWeight: 0,
    packageCount: 0,
  });

  useEffect(() => {
    if (!userId || query.length < 2) {
      setMyFoods([]);
      setDatabaseFoods([]);
      return;
    }
    const timer = setTimeout(() => search(), 300);
    return () => clearTimeout(timer);
  }, [query, userId]);

  const search = async () => {
    if (!userId) return;
    setLoading(true);
    setSearchError(null);
    try {
      const { myFoods: my, databaseFoods: db } = await searchAllFoods(userId, query);
      setMyFoods(my);
      setDatabaseFoods(db);
    } catch (error) {
      console.error('Search failed:', error);
      setSearchError('Food database temporarily unavailable. Try adding foods manually.');
    } finally {
      setLoading(false);
    }
  };

  const handleBarcode = async (barcode: string) => {
    setShowScanner(false);
    setLoading(true);
    try {
      const { products } = await searchByBarcode(barcode);
      if (products.length > 0) {
        setSelectedFood(products[0]);
        setQuantity(1);
        setQuantityType('number');
      } else {
        alert('Product not found. Try searching by name.');
      }
    } catch (error) {
      console.error('Barcode search failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDisplayCarbs = (food: Food) => food.netCarbs && food.netCarbs > 0 ? food.netCarbs : food.carbs;

  const handleAdd = async (food: Food) => {
    if (!userId) return;
    const displayCarbs = getDisplayCarbs(food);
    const baseMacros = {
      calories: food.calories,
      protein: food.protein,
      carbs: displayCarbs,
      fat: food.fat,
    };

    let multiplier = quantity;
    if (quantityType === 'grams') {
      multiplier = quantity / 100;
    }
    
    const loggedFood = {
      ...food,
      calories: Math.round(food.calories * multiplier * 10) / 10,
      protein: Math.round(food.protein * multiplier * 10) / 10,
      carbs: Math.round(displayCarbs * multiplier * 10) / 10,
      fat: Math.round(food.fat * multiplier * 10) / 10,
      serving: quantityType === 'grams' ? `${quantity}g` : `${quantity}`,
      quantity,
      baseMacros,
    };
    
    const isFromMyFoods = myFoods.some(f => f.id === food.id);
    if (!isFromMyFoods) {
      await addMyFood(userId, {
        name: food.name,
        brand: food.brand,
        calories: food.calories,
        protein: food.protein,
        carbs: food.carbs,
        fat: food.fat,
        serving: food.serving,
        servingSize: food.servingSize,
      });
    }
    
    await addLog(userId, loggedFood);
    navigate('/');
  };

  const handleEditFood = (food: Food) => {
    setEditingFood(food);
    setManualFood({
      name: food.name,
      brand: food.brand,
      calories: food.calories,
      protein: food.protein,
      carbs: food.carbs,
      fat: food.fat,
      netCarbs: food.netCarbs || 0,
      serving: food.serving || '100g',
      servingSize: food.servingSize || 100,
      packageWeight: food.packageWeight || 0,
      packageCount: food.packageCount || 0,
    });
    setShowManualAdd(true);
  };

  const handleDeleteFood = async (food: Food) => {
    if (!userId || !food.id) return;
    if (!confirm(`Delete "${food.name}" from My Foods?`)) return;
    
    await deleteMyFood(userId, food.id);
    await search();
  };

  const handleAddToMyFoods = async () => {
    if (!userId) return;
    if (!manualFood.name.trim()) {
      alert('Please enter a food name');
      return;
    }
    const { brand, ...rest } = manualFood;
    
    if (editingFood && editingFood.id) {
      await updateMyFood(userId, { ...editingFood, ...manualFood, brand: brand || null });
      setEditingFood(null);
    } else {
      await addMyFood(userId, { ...rest, brand: brand || null });
    }
    
    await search();
    setShowManualAdd(false);
  };

  const selectFood = (food: Food) => {
    setSelectedFood(food);
    setQuantity(1);
    setQuantityType('number');
  };

  const incompleteFoods = myFoods.filter(f => f.name.toLowerCase().startsWith('incomplete '));
  const completeFoods = myFoods.filter(f => !f.name.toLowerCase().startsWith('incomplete '));

  const handleImportAndFill = () => {
    const line = importText.trim().split('\n')[0];
    if (!line) return;
    
    const parts = line.split(';');
    const [
      name, calories, fat, protein, carbs, netCarbs,
      serving_size, serving_unit, brand, package_weight, package_count
    ] = parts;
    
    const serving = serving_size && serving_unit ? `${serving_size}${serving_unit}` : '';
    
    setManualFood({
      ...manualFood,
      name: name || '',
      calories: Number(calories) || 0,
      fat: Number(fat) || 0,
      protein: Number(protein) || 0,
      carbs: Number(carbs) || 0,
      netCarbs: Number(netCarbs) || 0,
      serving: serving,
      servingSize: Number(serving_size) || 100,
      brand: brand || null,
      packageWeight: Number(package_weight) || 0,
      packageCount: Number(package_count) || 0,
    });
    
    setShowImportInput(false);
    setImportText('');
  };

  const handleNutritionScan = (data: {
    name: string;
    calories: number;
    fat: number;
    protein: number;
    carbs: number;
    netCarbs: number;
    servingSize: string;
  }) => {
    setManualFood({
      ...manualFood,
      name: data.name || '',
      calories: data.calories,
      fat: data.fat,
      protein: data.protein,
      carbs: data.carbs,
      netCarbs: data.netCarbs,
      serving: data.servingSize,
      servingSize: parseInt(data.servingSize.replace(/\D/g, '')) || 100,
    });
    setShowNutritionScanner(false);
  };

  if (authLoading) {
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

  if (showScanner) {
    return (
      <div className="fixed inset-0 bg-black z-50">
        <button
          onClick={() => setShowScanner(false)}
          className="absolute top-4 right-4 z-10 p-2 bg-white rounded-full"
        >
          ✕
        </button>
        <BarcodeScanner onDetected={handleBarcode} />
      </div>
    );
  }

  if (showNutritionScanner) {
    return (
      <NutritionScanner
        onScan={handleNutritionScan}
        onClose={() => setShowNutritionScanner(false)}
      />
    );
  }

  if (selectedFood) {
    const displayServing = selectedFood.servingSize ? `${selectedFood.servingSize}g` : 'serving';
    
    return (
      <div className="space-y-4">
        <button
          onClick={() => setSelectedFood(null)}
          className="text-primary-600 dark:text-blue-400 font-medium flex items-center gap-1"
        >
          Back to search
        </button>
        
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-5">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-1">{selectedFood.name}</h2>
          {selectedFood.brand && (
            <p className="text-gray-500 dark:text-gray-400 mb-4">{selectedFood.brand}</p>
          )}
          
          <div className="text-sm text-gray-500 dark:text-gray-400 mb-4">Per {displayServing}</div>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">Amount</label>
            <div className="flex gap-2 mb-3">
              <button
                onClick={() => setQuantityType('number')}
                className={`flex-1 py-2 rounded-lg font-medium transition-colors ${
                  quantityType === 'number'
                    ? 'bg-primary-500 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                }`}
              >
                Number
              </button>
              <button
                onClick={() => setQuantityType('grams')}
                className={`flex-1 py-2 rounded-lg font-medium transition-colors ${
                  quantityType === 'grams'
                    ? 'bg-primary-500 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                }`}
              >
                Grams
              </button>
            </div>
            
            <div className="flex items-center gap-2">
              <input
                type="number"
                autoFocus
                value={quantity}
                onChange={(e) => setQuantity(Math.max(0.1, Number(e.target.value)))}
                min="0.1"
                step={quantityType === 'grams' ? 10 : 0.5}
                className="flex-1 px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none text-lg text-center"
              />
              <span className="text-gray-500 dark:text-gray-400 w-16">
                {quantityType === 'grams' ? 'g' : 'x'}
              </span>
            </div>
          </div>
          
          <div className="grid grid-cols-4 gap-3 mb-6">
            <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-xl">
              <div className="text-lg font-bold text-gray-900 dark:text-white">
                {Math.round(selectedFood.calories * (quantityType === 'grams' ? quantity / 100 : quantity))}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">kcal</div>
            </div>
            <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/30 rounded-xl">
              <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
                {Math.round(selectedFood.fat * (quantityType === 'grams' ? quantity / 100 : quantity))}g
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Fat</div>
            </div>
            <div className="text-center p-3 bg-red-50 dark:bg-red-900/30 rounded-xl">
              <div className="text-lg font-bold text-red-600 dark:text-red-400">
                {Math.round(selectedFood.protein * (quantityType === 'grams' ? quantity / 100 : quantity))}g
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Protein</div>
            </div>
            <div className="text-center p-3 bg-amber-50 dark:bg-amber-900/30 rounded-xl">
              <div className="text-lg font-bold text-amber-600 dark:text-amber-400">
                {Math.round(getDisplayCarbs(selectedFood) * (quantityType === 'grams' ? quantity / 100 : quantity))}g
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Carbs</div>
            </div>
          </div>
          
          <button
            onClick={() => handleAdd(selectedFood)}
            className="w-full py-3 bg-primary-500 text-white font-semibold rounded-xl hover:bg-primary-600 transition-colors"
          >
            Add to Log
          </button>
        </div>
      </div>
    );
  }

  if (showManualAdd) {
    return (
      <div className="space-y-4">
        <button
          onClick={() => { setShowManualAdd(false); setEditingFood(null); }}
          className="text-primary-600 dark:text-blue-400 font-medium flex items-center gap-1"
        >
          Back
        </button>
        
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-2xl shadow-sm p-5 border border-blue-100 dark:border-blue-800">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{editingFood ? 'Edit Food' : 'Add to My Foods'}</h2>
            <div className="flex gap-3">
              <button
                onClick={() => setShowNutritionScanner(true)}
                className="text-sm text-green-600 dark:text-green-400 hover:underline flex items-center gap-1"
              >
                📷 Scan Label
              </button>
              <button
                onClick={() => setShowImportInput(!showImportInput)}
                className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
              >
                📥 Import
              </button>
            </div>
          </div>
          
          {showImportInput && (
            <div className="mb-4 p-3 bg-white dark:bg-gray-800 rounded-xl">
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-2">
                Paste TSV data (semicolon-separated):
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={importText}
                  onChange={(e) => setImportText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleImportAndFill()}
                  placeholder="name;calories;fat;protein;carbs;netCarbs;serving_size;serving_unit;brand;package_weight;package_count&#10;Sardine;130;7.7;15;0.5;;60;g;Dirk;120;10"
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
                  Import
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
                  value={manualFood.name}
                  onChange={(e) => setManualFood({ ...manualFood, name: e.target.value })}
                  placeholder="e.g. Raw Egg"
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none text-sm"
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
                  value={manualFood.packageWeight || ''}
                  onChange={(e) => setManualFood({ ...manualFood, packageWeight: Number(e.target.value) || 0 })}
                  placeholder="e.g. 500"
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Items in Package</label>
                <input
                  type="number"
                  value={manualFood.packageCount || ''}
                  onChange={(e) => setManualFood({ ...manualFood, packageCount: Number(e.target.value) || 0 })}
                  placeholder="e.g. 10"
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none text-sm"
                />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 mb-4">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3">Serving</h3>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Serving Size</label>
              <input
                type="text"
                value={manualFood.serving}
                onChange={(e) => setManualFood({ ...manualFood, serving: e.target.value })}
                placeholder="e.g. 100g or 1 egg (50g)"
                className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none text-sm"
              />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 mb-4">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3">Macros (per 100g or per serving)</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Calories</label>
                <input
                  type="number"
                  value={manualFood.calories || ''}
                  onChange={(e) => setManualFood({ ...manualFood, calories: Number(e.target.value) || 0 })}
                  placeholder="0"
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-blue-600 dark:text-blue-400 mb-1 font-semibold">Fat (g)</label>
                <input
                  type="number"
                  value={manualFood.fat || ''}
                  onChange={(e) => setManualFood({ ...manualFood, fat: Number(e.target.value) || 0 })}
                  placeholder="0"
                  className="w-full px-3 py-2 rounded-lg border-blue-200 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/30 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-red-600 dark:text-red-400 mb-1 font-semibold">Protein (g)</label>
                <input
                  type="number"
                  value={manualFood.protein || ''}
                  onChange={(e) => setManualFood({ ...manualFood, protein: Number(e.target.value) || 0 })}
                  placeholder="0"
                  className="w-full px-3 py-2 rounded-lg border-red-200 dark:border-red-700 bg-red-50 dark:bg-red-900/30 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 outline-none text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-amber-600 dark:text-amber-400 mb-1 font-semibold">Carbs (g)</label>
                <input
                  type="number"
                  value={manualFood.carbs || ''}
                  onChange={(e) => setManualFood({ ...manualFood, carbs: Number(e.target.value) || 0 })}
                  placeholder="0"
                  className="w-full px-3 py-2 rounded-lg border-amber-200 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/30 text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500 outline-none text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-purple-600 dark:text-purple-400 mb-1 font-semibold">Net Carbs (g)</label>
                <input
                  type="number"
                  value={manualFood.netCarbs || ''}
                  onChange={(e) => setManualFood({ ...manualFood, netCarbs: Number(e.target.value) || 0 })}
                  placeholder="0"
                  className="w-full px-3 py-2 rounded-lg border-purple-200 dark:border-purple-700 bg-purple-50 dark:bg-purple-900/30 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 outline-none text-sm"
                />
              </div>
            </div>
          </div>
            
          <button
            onClick={handleAddToMyFoods}
            className="w-full py-3 bg-green-500 text-white font-semibold rounded-xl hover:bg-green-600 transition-colors"
          >
            {editingFood ? 'Update Food' : 'Save to My Foods & Add to Log'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search your foods or database..."
            className="flex-1 px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none"
          />
          <button
            onClick={() => setShowScanner(true)}
            className="px-4 py-3 bg-gray-100 dark:bg-gray-700 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            title="Scan barcode"
          >
            📷
          </button>
        </div>
        <button
          onClick={() => setShowManualAdd(true)}
          className="w-full mt-3 py-2 text-green-600 dark:text-green-400 font-medium text-sm hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors"
        >
          + Add to My Foods Database
        </button>
      </div>
      
      {loading && (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">Searching...</div>
      )}
      
      {!loading && myFoods.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-green-600 dark:text-green-400 flex items-center gap-1 mb-2">
            <span>🌱</span> My Foods ({completeFoods.length})
          </h3>
          
          {incompleteFoods.length > 0 && (
            <div className="mb-4">
              <h4 className="text-sm font-medium text-red-600 dark:text-red-400 mb-2 flex items-center gap-1">
                <span>🔴</span> Needs Review ({incompleteFoods.length})
              </h4>
              <div className="space-y-2">
                {incompleteFoods.map(food => (
                  <div
                    key={food.id}
                    className="w-full bg-red-50 dark:bg-red-900/20 rounded-xl p-4 text-left hover:shadow-md transition-shadow border border-red-200 dark:border-red-800"
                  >
                    <div className="flex justify-between items-start">
                      <button
                        onClick={() => selectFood(food)}
                        className="flex-1 min-w-0 text-left"
                      >
                        <div className="font-medium text-gray-900 dark:text-gray-100 truncate">{food.name}</div>
                        {food.brand && (
                          <div className="text-sm text-gray-500 dark:text-gray-400 truncate">{food.brand}</div>
                        )}
                        <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">{food.serving}</div>
                      </button>
                      <div className="flex items-center gap-2 ml-4">
                        <div className="text-right">
                          <div className="font-semibold text-gray-900 dark:text-gray-100">{Math.round(food.calories)}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">kcal</div>
                        </div>
                        <div className="flex gap-1 ml-2">
                          <button
                            onClick={() => handleEditFood(food)}
                            className="p-2 text-blue-500 hover:bg-blue-100 dark:hover:bg-blue-900 rounded-lg"
                            title="Edit"
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => handleDeleteFood(food)}
                            className="p-2 text-red-500 hover:bg-red-100 dark:hover:bg-red-900 rounded-lg"
                            title="Delete"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          <div className="space-y-2">
            {completeFoods.map(food => (
              <div
                key={food.id}
                className="w-full bg-green-50 dark:bg-green-900/20 rounded-xl p-4 text-left hover:shadow-md transition-shadow border border-green-100 dark:border-green-800"
              >
                <div className="flex justify-between items-start">
                  <button
                    onClick={() => selectFood(food)}
                    className="flex-1 min-w-0 text-left"
                  >
                    <div className="font-medium text-gray-900 dark:text-gray-100 truncate">{food.name}</div>
                    {food.brand && (
                      <div className="text-sm text-gray-500 dark:text-gray-400 truncate">{food.brand}</div>
                    )}
                    <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">{food.serving}</div>
                  </button>
                  <div className="flex items-center gap-2 ml-4">
                    <div className="text-right">
                      <div className="font-semibold text-gray-900 dark:text-gray-100">{Math.round(food.calories)}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">kcal</div>
                    </div>
                    <div className="flex gap-1 ml-2">
                      <button
                        onClick={() => handleEditFood(food)}
                        className="p-2 text-blue-500 hover:bg-blue-100 dark:hover:bg-blue-900 rounded-lg"
                        title="Edit"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => handleDeleteFood(food)}
                        className="p-2 text-red-500 hover:bg-red-100 dark:hover:bg-red-900 rounded-lg"
                        title="Delete"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {!loading && databaseFoods.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-1">
            <span>🌍</span> OpenFoodFacts ({databaseFoods.length})
          </h3>
          <div className="space-y-2">
            {databaseFoods.map((food, index) => (
              <button
                key={`${food.id}-${index}`}
                onClick={() => selectFood(food)}
                className="w-full bg-white dark:bg-gray-800 rounded-xl p-4 text-left hover:shadow-md transition-shadow"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900 dark:text-gray-100 truncate">{food.name}</div>
                    {food.brand && (
                      <div className="text-sm text-gray-500 dark:text-gray-400 truncate">{food.brand}</div>
                    )}
                    <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">Per 100g</div>
                  </div>
                  <div className="text-right ml-4">
                    <div className="font-semibold text-gray-900 dark:text-gray-100">{Math.round(food.calories)}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">kcal</div>
                  </div>
                </div>
              <div className="flex gap-4 mt-2 text-xs text-gray-500 dark:text-gray-400">
                <span>P: {Math.round(food.protein)}g</span>
                <span>C: {Math.round(getDisplayCarbs(food))}g</span>
                <span>F: {Math.round(food.fat)}g</span>
              </div>
              </button>
            ))}
          </div>
        </div>
      )}
      
      {searchError && (
        <div className="text-center py-4 text-red-500 bg-red-50 dark:bg-red-900/20 rounded-xl">
          {searchError}
        </div>
      )}
      
      {!loading && query.length >= 2 && myFoods.length === 0 && databaseFoods.length === 0 && !searchError && (
        <div className="text-center py-8 text-gray-400 dark:text-gray-500">
          No foods found. Click "+ Add to My Foods Database" above.
        </div>
      )}
      
      {!loading && query.length < 2 && (
        <div className="text-center py-4 text-gray-400 dark:text-gray-500 text-sm">
          Start typing to search your foods or the OpenFoodFacts database
        </div>
      )}
    </div>
  );
}

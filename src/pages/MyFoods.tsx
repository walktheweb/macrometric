import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getMyFoods, addMyFood, deleteMyFood, addLog, updateMyFoodAndLogs, Food } from '../lib/api';

export default function MyFoods() {
  const navigate = useNavigate();
  const { userId, loading: authLoading } = useAuth();
  const [allFoods, setAllFoods] = useState<Food[]>([]);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingFood, setEditingFood] = useState<Food | null>(null);
  const [loading, setLoading] = useState(true);
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

  const openAddForm = () => {
    setEditingFood(null);
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

  const openEditForm = (food: Food) => {
    setEditingFood(food);
    setFormData({ ...food });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!userId) return;
    if (!formData.name.trim()) {
      alert('Please enter a food name');
      return;
    }

    if (editingFood) {
      const result = await updateMyFoodAndLogs(userId, formData);
      if (result.updatedLogs > 0) {
        alert(`Saved! Updated ${result.updatedLogs} past entry(s).`);
      }
    } else {
      await addMyFood(userId, formData);
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

  const handleQuickLog = async (food: Food) => {
    if (!userId) return;
    await addLog(userId, { ...food, quantity: 1 });
    navigate('/');
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
        <button
          onClick={() => setShowForm(false)}
          className="text-primary-600 dark:text-blue-400 font-medium flex items-center gap-1"
        >
          Back to My Foods
        </button>
        
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-2xl shadow-sm p-5 border border-blue-100 dark:border-blue-800">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            {editingFood ? 'Edit Food' : 'Add New Food'}
          </h2>
          
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 mb-4">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3">Basic Info</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Food Name</label>
                <input
                  type="text"
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
            
          <button
            onClick={handleSave}
            className="w-full py-3 bg-primary-500 text-white font-semibold rounded-xl hover:bg-primary-600 transition-colors"
          >
            {editingFood ? 'Save Changes' : 'Add to My Foods'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">My Foods Database</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">{allFoods.length} foods saved</p>
        </div>
        <button
          onClick={openAddForm}
          className="px-4 py-2 bg-primary-500 text-white font-medium rounded-lg hover:bg-primary-600 transition-colors"
        >
          + Add
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-3 mb-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search your foods..."
          className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none text-sm"
        />
      </div>

      {filteredFoods.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-2xl shadow-sm">
          <div className="text-5xl mb-4">🔍</div>
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
        <div className="space-y-2">
          {filteredFoods.map((food: Food) => (
            <div key={food.id} className="bg-blue-50 dark:bg-blue-900/20 rounded-xl shadow-sm overflow-hidden border border-blue-100 dark:border-blue-800">
              <div className="p-4">
                <div className="flex justify-between items-start">
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-gray-900 dark:text-gray-100 text-lg">{food.name}</div>
                    {food.brand && (
                      <div className="text-sm text-gray-600 dark:text-gray-400">{food.brand}</div>
                    )}
                    {(food.packageWeight || food.packageCount) && (
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {food.packageWeight && <span>{food.packageWeight}g</span>}
                        {food.packageWeight && food.packageCount && <span> | </span>}
                        {food.packageCount && <span>{food.packageCount} items</span>}
                      </div>
                    )}
                    <div className="text-xs text-gray-400 dark:text-gray-500">{food.serving}</div>
                  </div>
                  <div className="text-right ml-4">
                    <div className="text-2xl font-bold text-primary-600 dark:text-blue-400">{Math.round(food.calories)}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">kcal</div>
                  </div>
                </div>
                <div className="flex gap-4 mt-3 pt-3 border-t border-blue-100 dark:border-blue-800">
                  <div className="flex-1 text-center bg-blue-100 dark:bg-blue-900/50 rounded-lg py-2">
                    <div className="text-lg font-bold text-blue-600 dark:text-blue-400">{Math.round(food.fat)}g</div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">Fat</div>
                  </div>
                  <div className="flex-1 text-center bg-red-100 dark:bg-red-900/50 rounded-lg py-2">
                    <div className="text-lg font-bold text-red-600 dark:text-red-400">{Math.round(food.protein)}g</div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">Protein</div>
                  </div>
                  <div className="flex-1 text-center bg-amber-100 dark:bg-amber-900/50 rounded-lg py-2">
                    <div className="text-lg font-bold text-amber-600 dark:text-amber-400">{Math.round(food.netCarbs && food.netCarbs > 0 ? food.netCarbs : food.carbs)}g</div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">Carbs</div>
                  </div>
                </div>
              </div>
              <div className="px-4 py-2 bg-blue-100 dark:bg-blue-900/50 border-t border-blue-200 dark:border-blue-800 flex justify-between">
                <button
                  onClick={() => handleQuickLog(food)}
                  className="text-sm text-primary-600 dark:text-blue-400 font-bold hover:text-primary-700 dark:hover:text-blue-300"
                >
                  Log Now
                </button>
                <div className="flex gap-4">
                  <button
                    onClick={() => openEditForm(food)}
                    className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => food.id && handleDelete(food.id)}
                    className="text-sm text-red-500 hover:text-red-600"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

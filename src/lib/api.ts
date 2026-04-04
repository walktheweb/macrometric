import { supabase } from './supabase';

export interface Food {
  id?: string;
  name: string;
  brand: string | null;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  serving: string;
  servingSize?: number;
  netCarbs?: number;
  packageWeight?: number;
  packageCount?: number;
}

export interface FoodLog extends Food {
  id: string;
  foodId?: string;
  quantity?: number;
  date?: string;
  baseMacros?: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
}

// Step Goals
export async function getStepGoal(userId: string): Promise<number> {
  const { data, error } = await supabase
    .from('step_goals')
    .select('daily_goal')
    .eq('user_id', userId)
    .single();
  
  if (error || !data) {
    return 10000;
  }
  
  return data.daily_goal || 10000;
}

export async function saveStepGoal(userId: string, dailyGoal: number): Promise<void> {
  const { error } = await supabase
    .from('step_goals')
    .upsert({
      user_id: userId,
      daily_goal: dailyGoal,
    }, { onConflict: 'user_id' });
  
  if (error) {
    console.error('Error saving step goal:', error);
  }
}


export interface Goal {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  weight?: number;
  height?: number;
  targetBmi?: number;
}

export interface Preset extends Food {
  id: string;
}

export interface DayLog {
  logs: FoodLog[];
  totals: { calories: number; protein: number; carbs: number; fat: number };
}

export interface Checkin {
  id: string;
  date: string;
  checkinTime?: string;
  weight?: number;
  fastStartTime?: string;
  firstMealTime?: string;
  ketones?: number;
  glucose?: number;
  heartRate?: number;
  bpHigh?: number;
  bpLow?: number;
  steps?: number;
  saturation?: number;
  cholesterol?: number;
  ferritin?: number;
  notes?: string;
  createdAt: number;
}

export interface GoalChange {
  id: string;
  date: string;
  field: string;
  oldValue: string | number;
  newValue: string | number;
  createdAt: number;
}

export interface Trip {
  id: string;
  date: string;
  distance: number;
  duration: number;
  avgSpeed: number;
  avgHeartRate: number;
  description?: string;
  createdAt: number;
}

export interface RaceGoal {
  eventName: string;
  raceDate: string;
  targetWeight: number;
  weeklyTarget: number;
}

export interface EventGoalItem extends RaceGoal {
  id: string;
  createdAt: number;
  isPrimary?: boolean;
}

export interface Milestone {
  id: string;
  title: string;
  date: string;
  notes?: string;
  done: boolean;
  createdAt: number;
  updatedAt?: number;
}

export interface ReleaseNoteItem {
  id: string;
  date: string;
  note: string;
  createdAt: number;
}

export interface FeatureRequestItem {
  id: string;
  text: string;
  createdAt: number;
}

export interface DataExportV1 {
  version: 1;
  exportedAt: string;
  userId: string;
  data: {
    my_foods: any[];
    food_logs: any[];
    presets: any[];
    goals: any[];
    checkins: any[];
    step_goals: any[];
    trips: any[];
    race_goals: any[];
    event_goals: any[];
    milestones: any[];
    release_notes: any[];
    feature_requests: any[];
  };
}

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

export function getToday(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Helper to get user ID from localStorage (used by components)
export function getUserId(): string | null {
  return localStorage.getItem('supabase_user_id');
}

export function setUserId(userId: string): void {
  localStorage.setItem('supabase_user_id', userId);
}

// Food Logs
export async function getLogs(userId: string, date?: string): Promise<DayLog> {
  const targetDate = date || getToday();
  
  const { data, error } = await supabase
    .from('food_logs')
    .select('*')
    .eq('user_id', userId)
    .eq('date', targetDate);
  
  if (error) {
    console.error('Error fetching logs:', error);
    return { logs: [], totals: { calories: 0, protein: 0, carbs: 0, fat: 0 } };
  }
  
  const logs = (data || []) as any[];
  const foodIds = [...new Set(logs.map(log => log.food_id).filter(Boolean))];
  let myFoodsById: Record<string, any> = {};

  if (foodIds.length > 0) {
    const { data: myFoods } = await supabase
      .from('my_foods')
      .select('id, name, brand, calories, protein, carbs, fat, serving_size, net_carbs, package_weight, package_count')
      .eq('user_id', userId)
      .in('id', foodIds);

    myFoodsById = Object.fromEntries((myFoods || []).map((f: any) => [f.id, f]));
  }

  const filtered = logs.map(log => {
    const linkedFood = myFoodsById[log.food_id] || null;
    const quantity = Number(log.quantity) || 1;
    const loggedCalories = Number(log.calories) || 0;
    const loggedProtein = Number(log.protein) || 0;
    const loggedCarbs = Number(log.carbs) || 0;
    const loggedFat = Number(log.fat) || 0;
    const hasLoggedMacros = loggedCalories > 0 || loggedProtein > 0 || loggedCarbs > 0 || loggedFat > 0;

    const foodCalories = Number(linkedFood?.calories) || 0;
    const foodProtein = Number(linkedFood?.protein) || 0;
    const foodCarbs = Number(linkedFood?.carbs) || 0;
    const foodFat = Number(linkedFood?.fat) || 0;

    const calories = hasLoggedMacros ? loggedCalories : Math.round(foodCalories * quantity * 10) / 10;
    const protein = hasLoggedMacros ? loggedProtein : Math.round(foodProtein * quantity * 10) / 10;
    const carbs = hasLoggedMacros ? loggedCarbs : Math.round(foodCarbs * quantity * 10) / 10;
    const fat = hasLoggedMacros ? loggedFat : Math.round(foodFat * quantity * 10) / 10;

    return {
      ...log,
      id: log.id,
      foodId: log.food_id || undefined,
      name: linkedFood?.name || log.name || '',
      brand: linkedFood?.brand || log.brand || null,
      calories,
      protein,
      carbs,
      fat,
      serving: log.serving || '1 serving',
      servingSize: Number(log.serving_size) || Number(linkedFood?.serving_size) || undefined,
      netCarbs: Number(log.net_carbs) || Number(linkedFood?.net_carbs) || undefined,
      packageWeight: Number(log.package_weight) || Number(linkedFood?.package_weight) || undefined,
      packageCount: Number(log.package_count) || Number(linkedFood?.package_count) || undefined,
      quantity,
      date: log.date,
      createdAt: log.created_at,
    };
  });
  
  const totals = filtered.reduce(
    (acc, log) => ({
      calories: acc.calories + log.calories,
      protein: acc.protein + log.protein,
      carbs: acc.carbs + log.carbs,
      fat: acc.fat + log.fat,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );
  
  return { logs: filtered, totals };
}

export async function addLog(userId: string, food: Partial<FoodLog>): Promise<FoodLog> {
  const newLog = {
    id: generateId(),
    user_id: userId,
    food_id: food.id || null,
    name: food.name || '',
    brand: food.brand || null,
    calories: food.calories || 0,
    protein: food.protein || 0,
    carbs: food.carbs || 0,
    fat: food.fat || 0,
    serving: food.serving || '1 serving',
    serving_size: food.servingSize,
    net_carbs: food.netCarbs,
    package_weight: food.packageWeight,
    package_count: food.packageCount,
    quantity: food.quantity || 1,
    date: food.date || getToday(),
    created_at: Date.now(),
  };
  
  const { error } = await supabase.from('food_logs').insert(newLog);
  
  if (error) {
    console.error('Error adding log:', error);
  }
  
  return {
    ...newLog,
    foodId: newLog.food_id,
    createdAt: newLog.created_at,
  } as FoodLog;
}

export async function deleteLog(userId: string, id: string): Promise<void> {
  const { error } = await supabase
    .from('food_logs')
    .delete()
    .eq('id', id)
    .eq('user_id', userId);
  
  if (error) {
    console.error('Error deleting log:', error);
  }
}

export async function updateLog(userId: string, id: string, updates: Partial<FoodLog>): Promise<FoodLog | null> {
  const dbUpdates: any = {};

  if (updates.name !== undefined) dbUpdates.name = updates.name;
  if (updates.brand !== undefined) dbUpdates.brand = updates.brand;
  if (updates.calories !== undefined) dbUpdates.calories = updates.calories;
  if (updates.protein !== undefined) dbUpdates.protein = updates.protein;
  if (updates.carbs !== undefined) dbUpdates.carbs = updates.carbs;
  if (updates.fat !== undefined) dbUpdates.fat = updates.fat;
  if (updates.serving !== undefined) dbUpdates.serving = updates.serving;
  if (updates.servingSize !== undefined) dbUpdates.serving_size = updates.servingSize;
  if (updates.netCarbs !== undefined) dbUpdates.net_carbs = updates.netCarbs;
  if (updates.packageWeight !== undefined) dbUpdates.package_weight = updates.packageWeight;
  if (updates.packageCount !== undefined) dbUpdates.package_count = updates.packageCount;
  if (updates.quantity !== undefined) dbUpdates.quantity = updates.quantity;
  if (updates.foodId !== undefined) dbUpdates.food_id = updates.foodId;
  if ((updates as any).date !== undefined) dbUpdates.date = (updates as any).date;
  
  const { data, error } = await supabase
    .from('food_logs')
    .update(dbUpdates)
    .eq('id', id)
    .eq('user_id', userId)
    .select()
    .single();
  
  if (error) {
    console.error('Error updating log:', error);
    return null;
  }
  
  return data;
}

export async function getHistory(userId: string, days = 7): Promise<Record<string, DayLog>> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  const startStr = startDate.toISOString().split('T')[0];
  
  const { data, error } = await supabase
    .from('food_logs')
    .select('*')
    .eq('user_id', userId)
    .gte('date', startStr);
  
  if (error) {
    console.error('Error fetching history:', error);
    return {};
  }
  
  const logs = (data || []) as any[];
  const grouped: Record<string, DayLog> = {};
  
  for (const log of logs) {
    if (!grouped[log.date]) {
      grouped[log.date] = { logs: [], totals: { calories: 0, protein: 0, carbs: 0, fat: 0 } };
    }
    grouped[log.date].logs.push(log);
    grouped[log.date].totals.calories += log.calories || 0;
    grouped[log.date].totals.protein += log.protein || 0;
    grouped[log.date].totals.carbs += log.carbs || 0;
    grouped[log.date].totals.fat += log.fat || 0;
  }
  
  return grouped;
}

// Presets
export async function getPresets(userId: string): Promise<Preset[]> {
  const { data, error } = await supabase
    .from('presets')
    .select('*')
    .eq('user_id', userId);
  
  if (error) {
    console.error('Error fetching presets:', error);
    return [];
  }
  
  return (data || []) as Preset[];
}

export async function addPreset(userId: string, food: Food): Promise<Preset> {
  const newPreset = {
    id: generateId(),
    user_id: userId,
    name: food.name,
    brand: food.brand,
    calories: food.calories,
    protein: food.protein,
    carbs: food.carbs,
    fat: food.fat,
    serving: food.serving,
    serving_size: food.servingSize,
    net_carbs: food.netCarbs,
    created_at: Date.now(),
  };
  
  const { error } = await supabase.from('presets').insert(newPreset);
  
  if (error) {
    console.error('Error adding preset:', error);
  }
  
  return { ...newPreset, createdAt: newPreset.created_at } as unknown as Preset;
}

export async function deletePreset(userId: string, id: string): Promise<void> {
  const { error } = await supabase
    .from('presets')
    .delete()
    .eq('id', id)
    .eq('user_id', userId);
  
  if (error) {
    console.error('Error deleting preset:', error);
  }
}

// Goals
export async function getGoals(userId: string): Promise<Goal> {
  const { data, error } = await supabase
    .from('goals')
    .select('*')
    .eq('user_id', userId)
    .single();
  
  if (error || !data) {
    return { calories: 1500, protein: 20, carbs: 5, fat: 75, weight: 83, height: 169 };
  }
  
  return {
    calories: data.calories || 1500,
    protein: data.protein || 20,
    carbs: data.carbs || 5,
    fat: data.fat || 75,
    weight: data.weight,
    height: data.height,
    targetBmi: data.target_bmi,
  };
}

export async function updateGoals(userId: string, goals: Goal): Promise<Goal> {
  const dbGoals = {
    user_id: userId,
    calories: goals.calories,
    protein: goals.protein,
    carbs: goals.carbs,
    fat: goals.fat,
    weight: goals.weight,
    height: goals.height,
    target_bmi: goals.targetBmi,
  };
  
  const { error } = await supabase
    .from('goals')
    .upsert(dbGoals, { onConflict: 'user_id' });
  
  if (error) {
    console.error('Error updating goals:', error);
  }
  
  return goals;
}

// Food search (OpenFoodFacts - external, no user ID needed)
export async function searchFoods(query: string): Promise<{ products: Food[] }> {
  if (query.length < 2) return { products: [] };
  
  try {
    const response = await fetch(
      `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1&page_size=20`,
      {
        cache: 'no-store',
      }
    );
    const data = await response.json();
    
    const products: Food[] = (data.products || [])
      .filter((p: any) => p.product_name || p.product_name_en)
      .map((p: any) => ({
        id: p.code,
        name: p.product_name || p.product_name_en || 'Unknown',
        brand: p.brands || null,
        calories: p.nutriments?.['energy-kcal_100g'] || 0,
        protein: p.nutriments?.proteins_100g || 0,
        carbs: p.nutriments?.carbohydrates_100g || 0,
        fat: p.nutriments?.fat_100g || 0,
        serving: p.serving_size || '100g',
      }));
    
    return { products };
  } catch (error) {
    console.error('Search failed:', error);
    return { products: [] };
  }
}

export async function searchByBarcode(barcode: string): Promise<{ products: Food[] }> {
  try {
    const response = await fetch(
      `https://world.openfoodfacts.org/api/v2/product/${barcode}.json`,
      {
        cache: 'no-store',
      }
    );
    const data = await response.json();
    
    if (data.status === 1 && data.product) {
      const product = data.product;
      return {
        products: [{
          id: product.code,
          name: product.product_name || product.product_name_en || 'Unknown Product',
          brand: product.brands || null,
          calories: product.nutriments?.['energy-kcal_100g'] || 0,
          protein: product.nutriments?.proteins_100g || 0,
          carbs: product.nutriments?.carbohydrates_100g || 0,
          fat: product.nutriments?.fat_100g || 0,
          serving: product.serving_size || '100g',
        }]
      };
    }
    return { products: [] };
  } catch (error) {
    console.error('Barcode search failed:', error);
    return { products: [] };
  }
}

// My Foods
export async function getMyFoods(userId: string): Promise<Food[]> {
  const { data, error } = await supabase
    .from('my_foods')
    .select('*')
    .eq('user_id', userId);
  
  if (error) {
    console.error('Error fetching my foods:', error);
    return [];
  }
  
  return (data || []).map((f: any) => ({
    id: f.id,
    name: f.name,
    brand: f.brand,
    calories: f.calories,
    protein: f.protein,
    carbs: f.carbs,
    fat: f.fat,
    serving: f.serving,
    servingSize: f.serving_size,
    netCarbs: f.net_carbs,
    packageWeight: f.package_weight,
    packageCount: f.package_count,
  }));
}

export async function addMyFood(userId: string, food: Omit<Food, 'id'>): Promise<Food> {
  const newFood = {
    id: generateId(),
    user_id: userId,
    name: food.name,
    brand: food.brand,
    calories: food.calories,
    protein: food.protein,
    carbs: food.carbs,
    fat: food.fat,
    serving: food.serving,
    serving_size: food.servingSize,
    net_carbs: food.netCarbs,
    package_weight: food.packageWeight,
    package_count: food.packageCount,
    created_at: Date.now(),
  };
  
  const { error } = await supabase.from('my_foods').insert(newFood);
  
  if (error) {
    console.error('Error adding my food:', error);
  }
  
  return { ...newFood, id: newFood.id };
}

export async function updateMyFood(userId: string, food: Food): Promise<Food | null> {
  const dbFood = {
    name: food.name,
    brand: food.brand,
    calories: food.calories,
    protein: food.protein,
    carbs: food.carbs,
    fat: food.fat,
    serving: food.serving,
    serving_size: food.servingSize,
    net_carbs: food.netCarbs,
    package_weight: food.packageWeight,
    package_count: food.packageCount,
  };
  
  const { error } = await supabase
    .from('my_foods')
    .update(dbFood)
    .eq('id', food.id)
    .eq('user_id', userId);
  
  if (error) {
    console.error('Error updating my food:', error);
    return null;
  }
  
  return food;
}

export async function updateMyFoodAndLogs(
  userId: string,
  food: Food
): Promise<{ food: Food; updatedLogs: number }> {
  const dbFood = {
    name: food.name,
    brand: food.brand,
    calories: food.calories,
    protein: food.protein,
    carbs: food.carbs,
    fat: food.fat,
    serving: food.serving,
    serving_size: food.servingSize,
    net_carbs: food.netCarbs,
    package_weight: food.packageWeight,
    package_count: food.packageCount,
  };
  
  const { error: updateError } = await supabase
    .from('my_foods')
    .update(dbFood)
    .eq('id', food.id)
    .eq('user_id', userId);
  
  if (updateError) {
    console.error('Error updating my food:', updateError);
    return { food, updatedLogs: 0 };
  }
  
  const { data: logs, error: fetchError } = await supabase
    .from('food_logs')
    .select('*')
    .eq('user_id', userId);
  
  if (fetchError) {
    console.error('Error fetching logs:', fetchError);
    return { food, updatedLogs: 0 };
  }
  
  if (!logs || logs.length === 0) {
    return { food, updatedLogs: 0 };
  }

  const matchingLogs = logs.filter(log => log.food_id === food.id);

  if (matchingLogs.length === 0) {
    return { food, updatedLogs: 0 };
  }
  
  const updates = matchingLogs.map(log => {
    const ratio = log.quantity || 1;
    return {
      id: log.id,
      name: food.name,
      brand: food.brand,
      calories: Math.round(food.calories * ratio * 10) / 10,
      protein: Math.round(food.protein * ratio * 10) / 10,
      carbs: Math.round(food.carbs * ratio * 10) / 10,
      fat: Math.round(food.fat * ratio * 10) / 10,
      serving: food.serving,
      serving_size: food.servingSize,
      net_carbs: food.netCarbs,
    };
  });
  
  let updatedLogs = 0;
  for (const update of updates) {
    const { id, ...fields } = update;
    const { error: rowError } = await supabase
      .from('food_logs')
      .update(fields)
      .eq('id', id)
      .eq('user_id', userId);
    if (rowError) {
      console.error(`Error updating log ${id}:`, rowError);
    } else {
      updatedLogs += 1;
    }
  }
  
  return { food, updatedLogs };
}

export async function deleteMyFood(userId: string, id: string): Promise<void> {
  const { error } = await supabase
    .from('my_foods')
    .delete()
    .eq('id', id)
    .eq('user_id', userId);
  
  if (error) {
    console.error('Error deleting my food:', error);
  }
}

export async function searchMyFoods(userId: string, query: string): Promise<Food[]> {
  const foods = await getMyFoods(userId);
  const lowerQuery = query.toLowerCase();
  return foods.filter(f => 
    f.name.toLowerCase().includes(lowerQuery) ||
    (f.brand && f.brand.toLowerCase().includes(lowerQuery))
  );
}

const SAMPLE_FOODS: Food[] = [
  { id: 'sample-egg', name: 'Egg (large)', brand: null, calories: 78, protein: 6, carbs: 1, fat: 5, serving: '1 egg (50g)' },
  { id: 'sample-milk', name: 'Whole Milk', brand: null, calories: 61, protein: 3, carbs: 5, fat: 3, serving: '100ml' },
  { id: 'sample-chicken', name: 'Chicken Breast', brand: null, calories: 165, protein: 31, carbs: 0, fat: 4, serving: '100g' },
  { id: 'sample-rice', name: 'White Rice', brand: null, calories: 130, protein: 3, carbs: 28, fat: 0, serving: '100g' },
  { id: 'sample-bread', name: 'Bread (whole wheat)', brand: null, calories: 247, protein: 13, carbs: 41, fat: 4, serving: '100g' },
  { id: 'sample-butter', name: 'Butter', brand: null, calories: 717, protein: 1, carbs: 0, fat: 81, serving: '100g' },
  { id: 'sample-cheese', name: 'Cheddar Cheese', brand: null, calories: 403, protein: 25, carbs: 1, fat: 33, serving: '100g' },
  { id: 'sample-avocado', name: 'Avocado', brand: null, calories: 160, protein: 2, carbs: 9, fat: 15, serving: '100g' },
  { id: 'sample-banana', name: 'Banana', brand: null, calories: 89, protein: 1, carbs: 23, fat: 0, serving: '100g' },
  { id: 'sample-salmon', name: 'Salmon Fillet', brand: null, calories: 208, protein: 20, carbs: 0, fat: 13, serving: '100g' },
  { id: 'sample-beef', name: 'Beef (ground)', brand: null, calories: 250, protein: 26, carbs: 0, fat: 15, serving: '100g' },
  { id: 'sample-potato', name: 'Potato', brand: null, calories: 77, protein: 2, carbs: 17, fat: 0, serving: '100g' },
  { id: 'sample-oats', name: 'Oats', brand: null, calories: 389, protein: 17, carbs: 66, fat: 7, serving: '100g' },
  { id: 'sample-yogurt', name: 'Greek Yogurt', brand: null, calories: 97, protein: 9, carbs: 4, fat: 5, serving: '100g' },
  { id: 'sample-almonds', name: 'Almonds', brand: null, calories: 579, protein: 21, carbs: 22, fat: 50, serving: '100g' },
];

export async function searchAllFoods(userId: string, query: string): Promise<{ myFoods: Food[]; databaseFoods: Food[] }> {
  if (query.length < 2) return { myFoods: [], databaseFoods: [] };
  
  const queryLower = query.toLowerCase();
  const myFoods = await searchMyFoods(userId, query);
  
  let databaseFoods: Food[] = [];
  try {
    const searchUrl = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1&page_size=30&fields=code,product_name,product_name_en,brands,nutriments,serving_size`;
    
    const response = await fetch(searchUrl, {
      cache: 'no-store',
    });
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    const contentType = response.headers.get('content-type');
    if (!contentType?.includes('application/json')) {
      throw new Error('API returned non-JSON response');
    }
    
    const data = await response.json();
    
    databaseFoods = (data.products || [])
      .filter((p: any) => (p.product_name || p.product_name_en) && (p.product_name || p.product_name_en).trim().length > 0)
      .map((p: any) => {
        const name = (p.product_name_en || p.product_name || 'Unknown').substring(0, 100);
        return {
          id: p.code,
          name,
          brand: p.brands || null,
          calories: Math.round(p.nutriments?.['energy-kcal_100g'] || 0),
          protein: Math.round(p.nutriments?.proteins_100g || 0),
          carbs: Math.round(p.nutriments?.carbohydrates_100g || 0),
          fat: Math.round(p.nutriments?.fat_100g || 0),
          serving: p.serving_size || '100g',
        };
      });
  } catch (error) {
    console.error('Database search failed:', error);
  }
  
  if (databaseFoods.length === 0) {
    databaseFoods = SAMPLE_FOODS.filter(f => 
      f.name.toLowerCase().includes(queryLower)
    );
  }
  
  return { myFoods, databaseFoods };
}

// Check-ins
export async function getCheckins(userId: string): Promise<Checkin[]> {
  const { data, error } = await supabase
    .from('checkins')
    .select('*')
    .eq('user_id', userId)
    .order('date', { ascending: false })
    .order('checkin_time', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('Error fetching checkins:', error);
    return [];
  }
  
  return (data || []).map((c: any) => ({
    id: c.id,
    date: c.date,
    checkinTime: c.checkin_time,
    weight: c.weight,
    fastStartTime: c.fast_start_time,
    firstMealTime: c.first_meal_time,
    ketones: c.ketones,
    glucose: c.glucose,
    heartRate: c.heart_rate,
    bpHigh: c.bp_high,
    bpLow: c.bp_low,
    steps: c.steps,
    saturation: c.saturation,
    cholesterol: c.cholesterol,
    ferritin: c.ferritin,
    notes: c.notes,
    createdAt: c.created_at,
  }));
}

export async function getTodayCheckin(userId: string): Promise<Checkin | null> {
  const today = getToday();
  const { data, error } = await supabase
    .from('checkins')
    .select('*')
    .eq('user_id', userId)
    .eq('date', today)
    .order('checkin_time', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })
    .limit(1);

  const item = data?.[0];

  if (error || !item) {
    return null;
  }
  
  return {
    id: item.id,
    date: item.date,
    checkinTime: item.checkin_time,
    weight: item.weight,
    fastStartTime: item.fast_start_time,
    firstMealTime: item.first_meal_time,
    ketones: item.ketones,
    glucose: item.glucose,
    heartRate: item.heart_rate,
    bpHigh: item.bp_high,
    bpLow: item.bp_low,
    steps: item.steps,
    saturation: item.saturation,
    cholesterol: item.cholesterol,
    ferritin: item.ferritin,
    notes: item.notes,
    createdAt: item.created_at,
  };
}

export async function getCheckinsForDate(userId: string, date: string): Promise<Checkin[]> {
  const { data, error } = await supabase
    .from('checkins')
    .select('*')
    .eq('user_id', userId)
    .eq('date', date)
    .order('checkin_time', { ascending: true, nullsFirst: false });
  
  if (error || !data) {
    return [];
  }
  
  return data.map(d => ({
    id: d.id,
    date: d.date,
    checkinTime: d.checkin_time,
    weight: d.weight,
    fastStartTime: d.fast_start_time,
    firstMealTime: d.first_meal_time,
    ketones: d.ketones,
    glucose: d.glucose,
    heartRate: d.heart_rate,
    bpHigh: d.bp_high,
    bpLow: d.bp_low,
    steps: d.steps,
    saturation: d.saturation,
    cholesterol: d.cholesterol,
    ferritin: d.ferritin,
    notes: d.notes,
    createdAt: d.created_at,
  }));
}

export async function saveCheckin(userId: string, data: { 
  id?: string;
  date: string;
  checkinTime?: string;
  weight?: number;
  fastStartTime?: string | null;
  firstMealTime?: string | null;
  ketones?: number;
  glucose?: number;
  heartRate?: number;
  bpHigh?: number;
  bpLow?: number;
  steps?: number;
  saturation?: number;
  cholesterol?: number;
  ferritin?: number;
  notes?: string;
}): Promise<Checkin> {
  const checkin: any = {
    id: data.id || generateId(),
    user_id: userId,
    date: data.date,
    created_at: Date.now(),
  };
  
  if (data.checkinTime) checkin.checkin_time = data.checkinTime;
  if (data.weight !== undefined) checkin.weight = data.weight;
  if (data.fastStartTime !== undefined) checkin.fast_start_time = data.fastStartTime;
  if (data.firstMealTime !== undefined) checkin.first_meal_time = data.firstMealTime;
  if (data.ketones !== undefined) checkin.ketones = data.ketones;
  if (data.glucose !== undefined) checkin.glucose = data.glucose;
  if (data.heartRate !== undefined) checkin.heart_rate = data.heartRate;
  if (data.bpHigh !== undefined) checkin.bp_high = data.bpHigh;
  if (data.bpLow !== undefined) checkin.bp_low = data.bpLow;
  if (data.steps !== undefined) checkin.steps = data.steps;
  if (data.saturation !== undefined) checkin.saturation = data.saturation;
  if (data.cholesterol !== undefined) checkin.cholesterol = data.cholesterol;
  if (data.ferritin !== undefined) checkin.ferritin = data.ferritin;
  if (data.notes !== undefined) checkin.notes = data.notes;
  
  const { error } = await supabase
    .from('checkins')
    .upsert(checkin, { onConflict: 'id' });
  
  if (error) {
    console.error('Error saving checkin:', error);
  } else {
    await syncAutoWeightMilestones(userId);
  }
  
  return {
    id: checkin.id,
    date: checkin.date,
    checkinTime: checkin.checkin_time,
    weight: checkin.weight,
    fastStartTime: checkin.fast_start_time,
    firstMealTime: checkin.first_meal_time,
    ketones: checkin.ketones,
    glucose: checkin.glucose,
    heartRate: checkin.heart_rate,
    bpHigh: checkin.bp_high,
    bpLow: checkin.bp_low,
    steps: checkin.steps,
    saturation: checkin.saturation,
    cholesterol: checkin.cholesterol,
    ferritin: checkin.ferritin,
    notes: checkin.notes,
    createdAt: checkin.created_at,
  };
}

export async function deleteCheckin(userId: string, checkinId: string): Promise<void> {
  const { error } = await supabase
    .from('checkins')
    .delete()
    .eq('id', checkinId)
    .eq('user_id', userId);
  
  if (error) {
    console.error('Error deleting checkin:', error);
  } else {
    await syncAutoWeightMilestones(userId);
  }
}

// Trips
export async function getTrips(userId: string): Promise<Trip[]> {
  const { data, error } = await supabase
    .from('trips')
    .select('*')
    .eq('user_id', userId)
    .order('date', { ascending: false });
  
  if (error) {
    console.error('Error fetching trips:', error);
    return [];
  }
  
  return (data || []).map((t: any) => ({
    id: t.id,
    date: t.date,
    distance: t.distance,
    duration: t.duration,
    avgSpeed: t.avg_speed,
    avgHeartRate: t.avg_heart_rate,
    description: t.description,
    createdAt: t.created_at,
  }));
}

export async function getTripsByDateRange(userId: string, startDate: string, endDate: string): Promise<Trip[]> {
  const { data, error } = await supabase
    .from('trips')
    .select('*')
    .eq('user_id', userId)
    .gte('date', startDate)
    .lte('date', endDate);
  
  if (error) {
    console.error('Error fetching trips by date range:', error);
    return [];
  }
  
  return (data || []).map((t: any) => ({
    id: t.id,
    date: t.date,
    distance: t.distance,
    duration: t.duration,
    avgSpeed: t.avg_speed,
    avgHeartRate: t.avg_heart_rate,
    description: t.description,
    createdAt: t.created_at,
  }));
}

export async function getWeekTrips(userId: string): Promise<Trip[]> {
  const today = new Date();
  const dayOfWeek = (today.getDay() + 6) % 7; // Monday = 0
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - dayOfWeek);
  const startStr = startOfWeek.toISOString().split('T')[0];
  const endStr = getToday();
  return getTripsByDateRange(userId, startStr, endStr);
}

export async function saveTrip(userId: string, data: Omit<Trip, 'id' | 'date' | 'createdAt'>): Promise<Trip> {
  const trip = {
    id: generateId(),
    user_id: userId,
    date: getToday(),
    distance: data.distance,
    duration: data.duration,
    avg_speed: data.avgSpeed,
    avg_heart_rate: data.avgHeartRate,
    description: data.description || null,
    created_at: Date.now(),
  };
  
  let { error } = await supabase.from('trips').insert(trip);

  // Backward-compatible fallback for databases where the description column
  // has not been added yet.
  if (error && String((error as any)?.message || '').toLowerCase().includes('description')) {
    const { description, ...tripWithoutDescription } = trip as any;
    const retry = await supabase.from('trips').insert(tripWithoutDescription);
    error = retry.error;
  }

  if (error) {
    console.error('Error saving trip:', error);
  }
  
  return {
    ...trip,
    createdAt: trip.created_at,
    avgSpeed: trip.avg_speed,
    avgHeartRate: trip.avg_heart_rate,
  };
}

export async function updateTrip(
  userId: string,
  id: string,
  data: Omit<Trip, 'id' | 'date' | 'createdAt'>
): Promise<void> {
  const updates: any = {
    distance: data.distance,
    duration: data.duration,
    avg_speed: data.avgSpeed,
    avg_heart_rate: data.avgHeartRate,
    description: data.description || null,
  };

  let { error } = await supabase
    .from('trips')
    .update(updates)
    .eq('id', id)
    .eq('user_id', userId);

  // Backward-compatible fallback for databases where the description column
  // has not been added yet.
  if (error && String((error as any)?.message || '').toLowerCase().includes('description')) {
    const { description, ...updatesWithoutDescription } = updates;
    const retry = await supabase
      .from('trips')
      .update(updatesWithoutDescription)
      .eq('id', id)
      .eq('user_id', userId);
    error = retry.error;
  }

  if (error) {
    console.error('Error updating trip:', error);
  }
}

export async function deleteTrip(userId: string, id: string): Promise<void> {
  const { error } = await supabase
    .from('trips')
    .delete()
    .eq('id', id)
    .eq('user_id', userId);
  
  if (error) {
    console.error('Error deleting trip:', error);
  }
}

// Race Goal
export async function getRaceGoal(userId: string): Promise<RaceGoal> {
  const { data, error } = await supabase
    .from('race_goals')
    .select('*')
    .eq('user_id', userId)
    .single();
  
  if (error || !data) {
    return { eventName: '', raceDate: '2026-05-23', targetWeight: 80, weeklyTarget: 0.5 };
  }
  
  return {
    eventName: data.event_name || '',
    raceDate: data.race_date || '2026-05-23',
    targetWeight: data.target_weight || 80,
    weeklyTarget: data.weekly_target || 0.5,
  };
}

export async function saveRaceGoal(userId: string, goal: RaceGoal): Promise<RaceGoal> {
  const dbGoal = {
    user_id: userId,
    event_name: goal.eventName,
    race_date: goal.raceDate,
    target_weight: goal.targetWeight,
    weekly_target: goal.weeklyTarget,
  };
  
  const { error } = await supabase
    .from('race_goals')
    .upsert(dbGoal, { onConflict: 'user_id' });
  
  if (error) {
    console.error('Error saving race goal:', error);
  }
  
  return goal;
}

export async function getDaysUntilRace(userId: string): Promise<number> {
  const goal = await getRaceGoal(userId);
  const today = new Date();
  const raceDate = new Date(goal.raceDate);
  const diff = raceDate.getTime() - today.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export async function getWeeksUntilRace(userId: string): Promise<number> {
  const days = await getDaysUntilRace(userId);
  return days / 7;
}

export async function getEventGoals(userId: string): Promise<EventGoalItem[]> {
  const primary = await getRaceGoal(userId);
  const { data, error } = await supabase
    .from('event_goals')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching event goals:', error);
  }

  const extras = ((data || []) as any[]).map((g) => ({
    id: g.id,
    eventName: g.event_name || '',
    raceDate: g.race_date || getToday(),
    targetWeight: g.target_weight || 80,
    weeklyTarget: g.weekly_target || 0.5,
    createdAt: g.created_at || Date.now(),
    isPrimary: false,
  })) as EventGoalItem[];

  return [
    {
      id: 'primary',
      eventName: primary.eventName,
      raceDate: primary.raceDate,
      targetWeight: primary.targetWeight,
      weeklyTarget: primary.weeklyTarget,
      createdAt: 0,
      isPrimary: true,
    },
    ...extras,
  ];
}

export async function saveEventGoalItem(
  userId: string,
  goal: { id?: string; eventName: string; raceDate: string; targetWeight: number; weeklyTarget: number }
): Promise<EventGoalItem> {
  if (goal.id === 'primary') {
    await saveRaceGoal(userId, {
      eventName: goal.eventName,
      raceDate: goal.raceDate,
      targetWeight: goal.targetWeight,
      weeklyTarget: goal.weeklyTarget,
    });
    return {
      id: 'primary',
      eventName: goal.eventName,
      raceDate: goal.raceDate,
      targetWeight: goal.targetWeight,
      weeklyTarget: goal.weeklyTarget,
      createdAt: 0,
      isPrimary: true,
    };
  }

  const id = goal.id || generateId();
  const record = {
    id,
    user_id: userId,
    event_name: goal.eventName,
    race_date: goal.raceDate,
    target_weight: goal.targetWeight,
    weekly_target: goal.weeklyTarget,
    created_at: Date.now(),
  };

  const { error } = await supabase
    .from('event_goals')
    .upsert(record, { onConflict: 'id' });

  if (error) {
    console.error('Error saving event goal item:', error);
    throw new Error(error.message || 'Failed to save event goal');
  }

  return {
    id: record.id,
    eventName: record.event_name,
    raceDate: record.race_date,
    targetWeight: record.target_weight,
    weeklyTarget: record.weekly_target,
    createdAt: record.created_at,
    isPrimary: false,
  };
}

export async function deleteEventGoalItem(userId: string, id: string): Promise<void> {
  if (id === 'primary') return;
  const { error } = await supabase
    .from('event_goals')
    .delete()
    .eq('id', id)
    .eq('user_id', userId);

  if (error) {
    console.error('Error deleting event goal item:', error);
    throw new Error(error.message || 'Failed to delete event goal');
  }
}

export async function setPrimaryEventGoal(userId: string, id: string): Promise<void> {
  if (id === 'primary') return;
  const { data: selected, error: selectedError } = await supabase
    .from('event_goals')
    .select('*')
    .eq('id', id)
    .eq('user_id', userId)
    .single();

  if (selectedError || !selected) {
    console.error('Error loading selected event goal:', selectedError);
    throw new Error(selectedError?.message || 'Selected event goal not found');
  }

  const selectedGoal: EventGoalItem = {
    id: selected.id,
    eventName: selected.event_name || '',
    raceDate: selected.race_date || getToday(),
    targetWeight: selected.target_weight || 80,
    weeklyTarget: selected.weekly_target || 0.5,
    createdAt: selected.created_at || Date.now(),
  };

  const currentPrimary = await getRaceGoal(userId);
  const shouldStoreCurrentPrimary =
    currentPrimary.eventName ||
    currentPrimary.raceDate ||
    currentPrimary.targetWeight > 0 ||
    currentPrimary.weeklyTarget > 0;

  if (shouldStoreCurrentPrimary) {
    const previousPrimaryInsert = {
      id: generateId(),
      user_id: userId,
      event_name: currentPrimary.eventName,
      race_date: currentPrimary.raceDate,
      target_weight: currentPrimary.targetWeight,
      weekly_target: currentPrimary.weeklyTarget,
      created_at: Date.now(),
    };
    const { error: savePrevError } = await supabase.from('event_goals').insert(previousPrimaryInsert);
    if (savePrevError) {
      console.error('Error archiving previous primary event goal:', savePrevError);
      throw new Error(savePrevError.message || 'Failed to archive active event goal');
    }
  }

  await saveRaceGoal(userId, {
    eventName: selectedGoal.eventName,
    raceDate: selectedGoal.raceDate,
    targetWeight: selectedGoal.targetWeight,
    weeklyTarget: selectedGoal.weeklyTarget,
  });

  const { error: deleteSelectedError } = await supabase
    .from('event_goals')
    .delete()
    .eq('id', id)
    .eq('user_id', userId);

  if (deleteSelectedError) {
    console.error('Error deleting selected event goal after activation:', deleteSelectedError);
    throw new Error(deleteSelectedError.message || 'Failed to finalize active event goal');
  }
}

// Milestones
export async function syncAutoWeightMilestones(userId: string): Promise<number> {
  const [checkins, raceGoal, existingMilestones] = await Promise.all([
    getCheckins(userId),
    getRaceGoal(userId),
    getMilestones(userId),
  ]);

  const weightedAsc = checkins
    .filter((item) => typeof item.weight === 'number' && Number.isFinite(item.weight))
    .slice()
    .sort((a, b) => {
      const byDate = a.date.localeCompare(b.date);
      if (byDate !== 0) return byDate;
      return (a.createdAt || 0) - (b.createdAt || 0);
    });

  if (weightedAsc.length === 0) {
    return 0;
  }

  const firstWeight = weightedAsc[0]?.weight ?? null;
  const maxWeight = weightedAsc.reduce((max, item) => {
    const value = item.weight as number;
    return value > max ? value : max;
  }, Number.NEGATIVE_INFINITY);
  const minWeight = weightedAsc.reduce((min, item) => {
    const value = item.weight as number;
    return value < min ? value : min;
  }, Number.POSITIVE_INFINITY);

  if (firstWeight === null || !Number.isFinite(minWeight) || !Number.isFinite(maxWeight)) {
    return 0;
  }

  const raceThreshold = raceGoal?.targetWeight ? Math.floor(raceGoal.targetWeight) : null;
  const fromThreshold = Math.max(
    Math.floor(firstWeight),
    Math.ceil(maxWeight),
    raceThreshold ?? Number.NEGATIVE_INFINITY
  );
  const lowerBound = raceGoal?.targetWeight
    ? Math.min(Math.floor(raceGoal.targetWeight), Math.floor(minWeight))
    : Math.floor(minWeight);

  if (fromThreshold < lowerBound) {
    return 0;
  }

  const existingAutoByTitle = new Map(
    existingMilestones
      .filter((m) => (m.notes || '').startsWith('auto:weight'))
      .map((m) => [m.title, m])
  );

  const now = Date.now();
  const recordsToUpsert: any[] = [];

  for (let threshold = fromThreshold; threshold >= lowerBound; threshold -= 1) {
    const firstHit = weightedAsc.find((entry) => (entry.weight || Number.POSITIVE_INFINITY) < threshold);
    if (!firstHit) continue;

    const title = `Under ${threshold} kg`;
    const existing = existingAutoByTitle.get(title);

    const nextRecord = {
      id: existing?.id || generateId(),
      user_id: userId,
      title,
      date: firstHit.date,
      notes: 'auto:weight',
      done: true,
      created_at: existing?.createdAt || now,
      updated_at: now,
    };

    const hasChanges =
      !existing ||
      existing.date !== nextRecord.date ||
      existing.done !== true ||
      (existing.notes || '') !== 'auto:weight';

    if (hasChanges) {
      recordsToUpsert.push(nextRecord);
    }
  }

  if (recordsToUpsert.length === 0) {
    return 0;
  }

  const { error } = await supabase
    .from('milestones')
    .upsert(recordsToUpsert, { onConflict: 'id' });

  if (error) {
    console.error('Error syncing auto weight milestones:', error);
    return 0;
  }

  return recordsToUpsert.length;
}

export async function getMilestones(userId: string): Promise<Milestone[]> {
  const { data, error } = await supabase
    .from('milestones')
    .select('*')
    .eq('user_id', userId)
    .order('date', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching milestones:', error);
    return [];
  }

  return ((data || []) as any[]).map((m: any) => ({
    id: m.id,
    title: m.title || '',
    date: m.date || getToday(),
    notes: m.notes || '',
    done: !!m.done,
    createdAt: m.created_at || Date.now(),
    updatedAt: m.updated_at || undefined,
  }));
}

export async function saveMilestone(
  userId: string,
  milestone: { id?: string; title: string; date: string; notes?: string; done?: boolean }
): Promise<Milestone> {
  const record = {
    id: milestone.id || generateId(),
    user_id: userId,
    title: milestone.title,
    date: milestone.date,
    notes: milestone.notes || '',
    done: !!milestone.done,
    created_at: Date.now(),
    updated_at: Date.now(),
  };

  const { error } = await supabase
    .from('milestones')
    .upsert(record, { onConflict: 'id' });

  if (error) {
    console.error('Error saving milestone:', error);
  }

  return {
    id: record.id,
    title: record.title,
    date: record.date,
    notes: record.notes,
    done: record.done,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
  };
}

export async function deleteMilestone(userId: string, id: string): Promise<void> {
  const { error } = await supabase
    .from('milestones')
    .delete()
    .eq('id', id)
    .eq('user_id', userId);

  if (error) {
    console.error('Error deleting milestone:', error);
  }
}

// Release notes & feature requests
export async function getReleaseNotes(userId: string): Promise<ReleaseNoteItem[]> {
  const { data, error } = await supabase
    .from('release_notes')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching release notes:', error);
    return [];
  }

  return ((data || []) as any[]).map((r) => ({
    id: r.id,
    date: r.date || '',
    note: r.note || '',
    createdAt: r.created_at || Date.now(),
  }));
}

export async function addReleaseNote(userId: string, note: string, date: string): Promise<void> {
  const payload = {
    id: generateId(),
    user_id: userId,
    date,
    note,
    created_at: Date.now(),
  };
  const { error } = await supabase.from('release_notes').insert(payload);
  if (error) {
    console.error('Error adding release note:', error);
  }
}

export async function getFeatureRequests(userId: string): Promise<FeatureRequestItem[]> {
  const { data, error } = await supabase
    .from('feature_requests')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching feature requests:', error);
    return [];
  }

  return ((data || []) as any[]).map((f) => ({
    id: f.id,
    text: f.text || '',
    createdAt: f.created_at || Date.now(),
  }));
}

export async function saveFeatureRequest(userId: string, item: { id?: string; text: string; createdAt?: number }): Promise<void> {
  const payload = {
    id: item.id || generateId(),
    user_id: userId,
    text: item.text,
    created_at: item.createdAt || Date.now(),
  };
  const { error } = await supabase.from('feature_requests').upsert(payload, { onConflict: 'id' });
  if (error) {
    console.error('Error saving feature request:', error);
    throw new Error(error.message || 'Failed to save feature request');
  }
}

export async function deleteFeatureRequest(userId: string, id: string): Promise<void> {
  const { error } = await supabase
    .from('feature_requests')
    .delete()
    .eq('id', id)
    .eq('user_id', userId);

  if (error) {
    console.error('Error deleting feature request:', error);
    throw new Error(error.message || 'Failed to delete feature request');
  }
}

export async function reorderFeatureRequests(userId: string, items: FeatureRequestItem[]): Promise<FeatureRequestItem[]> {
  const base = Date.now() + items.length;
  const reordered = items.map((item, index) => ({
    id: item.id,
    text: item.text,
    createdAt: base - index,
  }));

  const rows = reordered.map((item) => ({
    id: item.id,
    user_id: userId,
    text: item.text,
    created_at: item.createdAt,
  }));

  const { error } = await supabase.from('feature_requests').upsert(rows, { onConflict: 'id' });
  if (error) {
    console.error('Error reordering feature requests:', error);
    throw new Error(error.message || 'Failed to reorder feature requests');
  }

  return reordered;
}

// Data backup
export async function exportUserData(userId: string): Promise<DataExportV1> {
  const [
    myFoodsRes,
    foodLogsRes,
    presetsRes,
    goalsRes,
    checkinsRes,
    stepGoalsRes,
    tripsRes,
    raceGoalsRes,
    eventGoalsRes,
    milestonesRes,
    releaseNotesRes,
    featureRequestsRes,
  ] = await Promise.all([
    supabase.from('my_foods').select('*').eq('user_id', userId),
    supabase.from('food_logs').select('*').eq('user_id', userId),
    supabase.from('presets').select('*').eq('user_id', userId),
    supabase.from('goals').select('*').eq('user_id', userId),
    supabase.from('checkins').select('*').eq('user_id', userId),
    supabase.from('step_goals').select('*').eq('user_id', userId),
    supabase.from('trips').select('*').eq('user_id', userId),
    supabase.from('race_goals').select('*').eq('user_id', userId),
    supabase.from('event_goals').select('*').eq('user_id', userId),
    supabase.from('milestones').select('*').eq('user_id', userId),
    supabase.from('release_notes').select('*').eq('user_id', userId),
    supabase.from('feature_requests').select('*').eq('user_id', userId),
  ]);

  const errors = [
    myFoodsRes.error,
    foodLogsRes.error,
    presetsRes.error,
    goalsRes.error,
    checkinsRes.error,
    stepGoalsRes.error,
    tripsRes.error,
    raceGoalsRes.error,
    eventGoalsRes.error,
    milestonesRes.error,
    releaseNotesRes.error,
    featureRequestsRes.error,
  ].filter(Boolean);

  if (errors.length > 0) {
    throw new Error('Failed to export one or more tables');
  }

  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    userId,
    data: {
      my_foods: myFoodsRes.data || [],
      food_logs: foodLogsRes.data || [],
      presets: presetsRes.data || [],
      goals: goalsRes.data || [],
      checkins: checkinsRes.data || [],
      step_goals: stepGoalsRes.data || [],
      trips: tripsRes.data || [],
      race_goals: raceGoalsRes.data || [],
      event_goals: eventGoalsRes.data || [],
      milestones: milestonesRes.data || [],
      release_notes: releaseNotesRes.data || [],
      feature_requests: featureRequestsRes.data || [],
    },
  };
}

export async function importUserData(
  userId: string,
  payload: unknown
): Promise<{ imported: number }> {
  const input = payload as Partial<DataExportV1> | null;

  if (!input || typeof input !== 'object' || !input.data || typeof input.data !== 'object') {
    throw new Error('Invalid backup file format');
  }

  const data = input.data as DataExportV1['data'];
  const toRows = (rows: any[] | undefined) => (rows || []).map((row: any) => ({ ...row, user_id: userId }));

  const myFoods = toRows(data.my_foods);
  const foodLogs = toRows(data.food_logs);
  const presets = toRows(data.presets);
  const goals = toRows(data.goals);
  const checkins = toRows(data.checkins);
  const stepGoals = toRows(data.step_goals);
  const trips = toRows(data.trips);
  const raceGoals = toRows(data.race_goals);
  const releaseNotes = toRows(data.release_notes);
  const featureRequests = toRows(data.feature_requests);
  const eventGoals = Array.isArray((data as any).event_goals) ? (data as any).event_goals : [];
  const milestones = Array.isArray((data as any).milestones) ? (data as any).milestones : [];

  const results = await Promise.all([
    myFoods.length ? supabase.from('my_foods').upsert(myFoods, { onConflict: 'id' }) : Promise.resolve({ error: null } as any),
    foodLogs.length ? supabase.from('food_logs').upsert(foodLogs, { onConflict: 'id' }) : Promise.resolve({ error: null } as any),
    presets.length ? supabase.from('presets').upsert(presets, { onConflict: 'id' }) : Promise.resolve({ error: null } as any),
    goals.length ? supabase.from('goals').upsert(goals, { onConflict: 'user_id' }) : Promise.resolve({ error: null } as any),
    checkins.length ? supabase.from('checkins').upsert(checkins, { onConflict: 'id' }) : Promise.resolve({ error: null } as any),
    stepGoals.length ? supabase.from('step_goals').upsert(stepGoals, { onConflict: 'user_id' }) : Promise.resolve({ error: null } as any),
    trips.length ? supabase.from('trips').upsert(trips, { onConflict: 'id' }) : Promise.resolve({ error: null } as any),
    raceGoals.length ? supabase.from('race_goals').upsert(raceGoals, { onConflict: 'user_id' }) : Promise.resolve({ error: null } as any),
    eventGoals.length ? supabase.from('event_goals').upsert(toRows(eventGoals), { onConflict: 'id' }) : Promise.resolve({ error: null } as any),
    milestones.length ? supabase.from('milestones').upsert(toRows(milestones), { onConflict: 'id' }) : Promise.resolve({ error: null } as any),
    releaseNotes.length ? supabase.from('release_notes').upsert(releaseNotes, { onConflict: 'id' }) : Promise.resolve({ error: null } as any),
    featureRequests.length ? supabase.from('feature_requests').upsert(featureRequests, { onConflict: 'id' }) : Promise.resolve({ error: null } as any),
  ]);

  const hasErrors = results.some((res: any) => res.error);
  if (hasErrors) {
    throw new Error('Import failed for one or more tables');
  }

  return {
    imported:
      myFoods.length +
      foodLogs.length +
      presets.length +
      goals.length +
      checkins.length +
      stepGoals.length +
      trips.length +
      raceGoals.length +
      releaseNotes.length +
      featureRequests.length +
      eventGoals.length +
      milestones.length,
  };
}

// Password / Authentication
export function isAuthenticated(): boolean {
  // Legacy helper kept for compatibility with older code paths.
  // The app now relies on Supabase session state.
  return true;
}

export async function logout(): Promise<void> {
  await supabase.auth.signOut();
}

export async function verifyPassword(_password: string): Promise<boolean> {
  try {
    const { data } = await supabase.auth.getUser();
    return !!data.user;
  } catch {
    return false;
  }
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user?.email) {
      return { success: false, error: 'Not logged in' };
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: userData.user.email,
      password: currentPassword,
    });

    if (signInError) {
      return { success: false, error: 'Current password is incorrect' };
    }

    const { error } = await supabase.auth.updateUser({ password: newPassword });

    if (error) {
      return { success: false, error: error.message || 'Failed to update password' };
    }

    return { success: true };
  } catch {
    return { success: false, error: 'Connection error' };
  }
}

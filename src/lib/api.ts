import { isSupabaseConfigured, supabase } from './supabase';
import { localDateIso } from './date';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';
const USE_SUPABASE_LEGACY = !import.meta.env.VITE_API_BASE_URL && isSupabaseConfigured;

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
  createdAt?: number;
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

export interface FastingSession {
  id: string;
  date: string;
  startTime: string;
  endTime?: string;
  sourceCheckinId?: string;
  createdAt: number;
  updatedAt?: number;
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
  startDate?: string;
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
    fasting_sessions: any[];
    step_goals: any[];
    trips: any[];
    race_goals: any[];
    event_goals: any[];
    milestones: any[];
    release_notes: any[];
    feature_requests: any[];
  };
}

export interface AuthUser {
  id: string;
  email: string;
}

type RequestOptions = RequestInit & { skipAuthEvent?: boolean };

function requireSupabase() {
  if (!supabase) {
    throw new Error('Supabase is not configured');
  }
  return supabase;
}

function fromFoodRow(row: any): Food {
  return {
    id: row.id,
    name: row.name || '',
    brand: row.brand ?? null,
    calories: Number(row.calories) || 0,
    protein: Number(row.protein) || 0,
    carbs: Number(row.carbs) || 0,
    fat: Number(row.fat) || 0,
    serving: row.serving || '1 serving',
    servingSize: row.serving_size ?? undefined,
    netCarbs: row.net_carbs ?? undefined,
    packageWeight: row.package_weight ?? undefined,
    packageCount: row.package_count ?? undefined,
  };
}

function toFoodRow(food: Partial<Food>) {
  return {
    ...(food.id ? { id: food.id } : {}),
    ...(food.name !== undefined ? { name: food.name } : {}),
    ...(food.brand !== undefined ? { brand: food.brand } : {}),
    ...(food.calories !== undefined ? { calories: food.calories } : {}),
    ...(food.protein !== undefined ? { protein: food.protein } : {}),
    ...(food.carbs !== undefined ? { carbs: food.carbs } : {}),
    ...(food.fat !== undefined ? { fat: food.fat } : {}),
    ...(food.serving !== undefined ? { serving: food.serving } : {}),
    ...(food.servingSize !== undefined ? { serving_size: food.servingSize } : {}),
    ...(food.netCarbs !== undefined ? { net_carbs: food.netCarbs } : {}),
    ...(food.packageWeight !== undefined ? { package_weight: food.packageWeight } : {}),
    ...(food.packageCount !== undefined ? { package_count: food.packageCount } : {}),
  };
}

function fromFoodLogRow(row: any): FoodLog {
  return {
    ...fromFoodRow(row),
    id: row.id,
    foodId: row.food_id ?? undefined,
    quantity: Number(row.quantity) || 1,
    date: row.date ?? undefined,
    createdAt: Number(row.created_at) || Date.now(),
  };
}

function toFoodLogRow(log: Partial<FoodLog>) {
  return {
    ...toFoodRow(log),
    ...(log.id !== undefined ? { id: log.id } : {}),
    ...(log.foodId !== undefined ? { food_id: log.foodId } : {}),
    ...(log.quantity !== undefined ? { quantity: log.quantity } : {}),
    ...(log.date !== undefined ? { date: log.date } : {}),
    ...(log.createdAt !== undefined ? { created_at: log.createdAt } : {}),
  };
}

function fromCheckinRow(row: any): Checkin {
  return {
    id: row.id,
    date: row.date,
    checkinTime: row.checkin_time ?? undefined,
    weight: row.weight ?? undefined,
    fastStartTime: row.fast_start_time ?? undefined,
    firstMealTime: row.first_meal_time ?? undefined,
    ketones: row.ketones ?? undefined,
    glucose: row.glucose ?? undefined,
    heartRate: row.heart_rate ?? undefined,
    bpHigh: row.bp_high ?? undefined,
    bpLow: row.bp_low ?? undefined,
    steps: row.steps ?? undefined,
    saturation: row.saturation ?? undefined,
    cholesterol: row.cholesterol ?? undefined,
    ferritin: row.ferritin ?? undefined,
    notes: row.notes ?? undefined,
    createdAt: Number(row.created_at) || Date.now(),
  };
}

function toCheckinRow(checkin: Partial<Checkin> & { fastStartTime?: string | null; firstMealTime?: string | null }) {
  return {
    ...(checkin.id !== undefined ? { id: checkin.id } : {}),
    ...(checkin.date !== undefined ? { date: checkin.date } : {}),
    ...(checkin.checkinTime !== undefined ? { checkin_time: checkin.checkinTime } : {}),
    ...(checkin.weight !== undefined ? { weight: checkin.weight } : {}),
    ...(checkin.fastStartTime !== undefined ? { fast_start_time: checkin.fastStartTime } : {}),
    ...(checkin.firstMealTime !== undefined ? { first_meal_time: checkin.firstMealTime } : {}),
    ...(checkin.ketones !== undefined ? { ketones: checkin.ketones } : {}),
    ...(checkin.glucose !== undefined ? { glucose: checkin.glucose } : {}),
    ...(checkin.heartRate !== undefined ? { heart_rate: checkin.heartRate } : {}),
    ...(checkin.bpHigh !== undefined ? { bp_high: checkin.bpHigh } : {}),
    ...(checkin.bpLow !== undefined ? { bp_low: checkin.bpLow } : {}),
    ...(checkin.steps !== undefined ? { steps: checkin.steps } : {}),
    ...(checkin.saturation !== undefined ? { saturation: checkin.saturation } : {}),
    ...(checkin.cholesterol !== undefined ? { cholesterol: checkin.cholesterol } : {}),
    ...(checkin.ferritin !== undefined ? { ferritin: checkin.ferritin } : {}),
    ...(checkin.notes !== undefined ? { notes: checkin.notes } : {}),
    ...(checkin.createdAt !== undefined ? { created_at: checkin.createdAt } : {}),
  };
}

function fromTripRow(row: any): Trip {
  return {
    id: row.id,
    date: row.date,
    distance: Number(row.distance) || 0,
    duration: Number(row.duration) || 0,
    avgSpeed: Number(row.avg_speed) || 0,
    avgHeartRate: Number(row.avg_heart_rate) || 0,
    description: row.description ?? undefined,
    createdAt: Number(row.created_at) || Date.now(),
  };
}

function toTripRow(trip: Partial<Trip>) {
  return {
    ...(trip.id !== undefined ? { id: trip.id } : {}),
    ...(trip.date !== undefined ? { date: trip.date } : {}),
    ...(trip.distance !== undefined ? { distance: trip.distance } : {}),
    ...(trip.duration !== undefined ? { duration: trip.duration } : {}),
    ...(trip.avgSpeed !== undefined ? { avg_speed: trip.avgSpeed } : {}),
    ...(trip.avgHeartRate !== undefined ? { avg_heart_rate: trip.avgHeartRate } : {}),
    ...(trip.description !== undefined ? { description: trip.description } : {}),
    ...(trip.createdAt !== undefined ? { created_at: trip.createdAt } : {}),
  };
}

function fromEventGoalRow(row: any): EventGoalItem {
  return {
    id: row.id,
    eventName: row.event_name || '',
    startDate: row.start_date ?? undefined,
    raceDate: row.race_date,
    targetWeight: Number(row.target_weight) || 80,
    weeklyTarget: Number(row.weekly_target) || 0.5,
    createdAt: Number(row.created_at) || Date.now(),
  };
}

function fromMilestoneRow(row: any): Milestone {
  return {
    id: row.id,
    title: row.title || '',
    date: row.date,
    notes: row.notes ?? '',
    done: !!row.done,
    createdAt: Number(row.created_at) || Date.now(),
    updatedAt: row.updated_at ?? undefined,
  };
}

function fromReleaseNoteRow(row: any): ReleaseNoteItem {
  return {
    id: row.id,
    date: row.date,
    note: row.note,
    createdAt: Number(row.created_at) || Date.now(),
  };
}

function fromFeatureRequestRow(row: any): FeatureRequestItem {
  return {
    id: row.id,
    text: row.text,
    createdAt: Number(row.created_at) || Date.now(),
  };
}

async function getSupabaseUserOrThrow() {
  const client = requireSupabase();
  const { data, error } = await client.auth.getUser();
  if (error) throw error;
  if (!data.user) throw new Error('Not authenticated');
  return data.user;
}

async function getLegacyCheckinsForUser() {
  const client = requireSupabase();
  const user = await getSupabaseUserOrThrow();
  const { data, error } = await client
    .from('checkins')
    .select('*')
    .eq('user_id', user.id)
    .order('date', { ascending: false })
    .order('checkin_time', { ascending: false });
  if (error) throw error;
  return (data || []).map(fromCheckinRow);
}

function deriveLegacyFastingSessions(checkins: Checkin[]): FastingSession[] {
  return checkins
    .filter((checkin) => !!checkin.fastStartTime)
    .map((checkin) => ({
      id: `legacy-${checkin.id}`,
      date: checkin.date,
      startTime: checkin.fastStartTime as string,
      endTime: checkin.firstMealTime,
      sourceCheckinId: checkin.id,
      createdAt: checkin.createdAt,
      updatedAt: checkin.createdAt,
    }))
    .sort((a, b) => {
      const byDate = b.date.localeCompare(a.date);
      if (byDate !== 0) return byDate;
      return (b.startTime || '').localeCompare(a.startTime || '');
    });
}

async function request<T>(path: string, init?: RequestOptions): Promise<T> {
  const headers = new Headers(init?.headers || {});
  const hasBody = init?.body !== undefined && init?.body !== null;
  if (hasBody && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`${API_BASE}${path}`, {
    credentials: 'include',
    headers,
    ...init,
  });

  if (response.status === 401 && !init?.skipAuthEvent) {
    window.dispatchEvent(new Event('auth-change'));
  }

  const isJson = response.headers.get('content-type')?.includes('application/json');
  const body = isJson ? await response.json() : null;

  if (!response.ok) {
    throw new Error(body?.error || `Request failed (${response.status})`);
  }

  return body as T;
}

async function requestVoid(path: string, init?: RequestOptions): Promise<void> {
  await request(path, init);
}

function normalizeLogPayload(food: Partial<FoodLog>) {
  const { id, foodId, ...rest } = food;
  const linkedFoodId = foodId ?? id;
  return {
    ...rest,
    ...(linkedFoodId ? { foodId: linkedFoodId } : {}),
  };
}

async function hydrateLogsWithFoods(logs: FoodLog[]): Promise<FoodLog[]> {
  if (!logs.length) return logs;
  const foodIds = Array.from(new Set(logs.map((log) => log.foodId).filter(Boolean))) as string[];
  if (!foodIds.length) return logs;

  const foods = await getMyFoods('');
  const foodsById = new Map(foods.filter((food) => food.id).map((food) => [food.id as string, food]));

  return logs.map((log) => {
    const linkedFood = log.foodId ? foodsById.get(log.foodId) : undefined;
    if (!linkedFood) return log;

    const quantity = Number(log.quantity) || 1;
    const loggedCalories = Number(log.calories) || 0;
    const loggedProtein = Number(log.protein) || 0;
    const loggedCarbs = Number(log.carbs) || 0;
    const loggedFat = Number(log.fat) || 0;
    const hasLoggedMacros = loggedCalories > 0 || loggedProtein > 0 || loggedCarbs > 0 || loggedFat > 0;

    const foodCalories = Number(linkedFood.calories) || 0;
    const foodProtein = Number(linkedFood.protein) || 0;
    const foodCarbs = Number(linkedFood.carbs) || 0;
    const foodFat = Number(linkedFood.fat) || 0;

    return {
      ...log,
      name: linkedFood.name || log.name,
      brand: linkedFood.brand || log.brand,
      calories: hasLoggedMacros ? loggedCalories : Math.round(foodCalories * quantity * 10) / 10,
      protein: hasLoggedMacros ? loggedProtein : Math.round(foodProtein * quantity * 10) / 10,
      carbs: hasLoggedMacros ? loggedCarbs : Math.round(foodCarbs * quantity * 10) / 10,
      fat: hasLoggedMacros ? loggedFat : Math.round(foodFat * quantity * 10) / 10,
      serving: log.serving || linkedFood.serving || '1 serving',
      servingSize: Number(log.servingSize) || Number(linkedFood.servingSize) || undefined,
      netCarbs: Number(log.netCarbs) || Number(linkedFood.netCarbs) || undefined,
      packageWeight: Number(log.packageWeight) || Number(linkedFood.packageWeight) || undefined,
      packageCount: Number(log.packageCount) || Number(linkedFood.packageCount) || undefined,
    };
  });
}

function sumTotals(logs: FoodLog[]) {
  return logs.reduce(
    (acc, log) => ({
      calories: acc.calories + (log.calories || 0),
      protein: acc.protein + (log.protein || 0),
      carbs: acc.carbs + (log.carbs || 0),
      fat: acc.fat + (log.fat || 0),
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );
}

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

export function getToday(): string {
  return localDateIso();
}

export function getUserId(): string | null {
  return localStorage.getItem('macrometric_user_id');
}

export function setUserId(userId: string | null): void {
  if (!userId) {
    localStorage.removeItem('macrometric_user_id');
    return;
  }
  localStorage.setItem('macrometric_user_id', userId);
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  if (USE_SUPABASE_LEGACY) {
    try {
      const client = requireSupabase();
      const { data, error } = await client.auth.getUser();
      if (error || !data.user) {
        setUserId(null);
        return null;
      }
      const user = { id: data.user.id, email: data.user.email || '' };
      setUserId(user.id);
      return user;
    } catch {
      setUserId(null);
      return null;
    }
  }
  try {
    const data = await request<{ user: AuthUser }>('/auth/me', { skipAuthEvent: true });
    setUserId(data.user.id);
    return data.user;
  } catch {
    setUserId(null);
    return null;
  }
}

export async function signIn(email: string, password: string, rememberMe: boolean): Promise<AuthUser> {
  if (USE_SUPABASE_LEGACY) {
    const client = requireSupabase();
    const { data, error } = await client.auth.signInWithPassword({ email, password });
    if (error || !data.user) throw error || new Error('Sign in failed');
    const user = { id: data.user.id, email: data.user.email || email };
    setUserId(user.id);
    window.dispatchEvent(new Event('auth-change'));
    return user;
  }
  const data = await request<{ user: AuthUser }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password, rememberMe }),
  });
  setUserId(data.user.id);
  window.dispatchEvent(new Event('auth-change'));
  return data.user;
}

export async function signUp(email: string, password: string, rememberMe: boolean): Promise<AuthUser> {
  if (USE_SUPABASE_LEGACY) {
    const client = requireSupabase();
    const { data, error } = await client.auth.signUp({ email, password });
    if (error || !data.user) throw error || new Error('Sign up failed');
    const user = { id: data.user.id, email: data.user.email || email };
    setUserId(user.id);
    window.dispatchEvent(new Event('auth-change'));
    return user;
  }
  const data = await request<{ user: AuthUser }>('/auth/signup', {
    method: 'POST',
    body: JSON.stringify({ email, password, rememberMe }),
  });
  setUserId(data.user.id);
  window.dispatchEvent(new Event('auth-change'));
  return data.user;
}

export async function getStepGoal(_userId: string): Promise<number> {
  if (USE_SUPABASE_LEGACY) {
    const client = requireSupabase();
    const user = await getSupabaseUserOrThrow();
    const { data, error } = await client.from('step_goals').select('daily_goal').eq('user_id', user.id).maybeSingle();
    if (error) throw error;
    return Number(data?.daily_goal) || 10000;
  }
  const data = await request<{ dailyGoal: number }>('/step-goal');
  return data.dailyGoal || 10000;
}

export async function saveStepGoal(_userId: string, dailyGoal: number): Promise<void> {
  if (USE_SUPABASE_LEGACY) {
    const client = requireSupabase();
    const user = await getSupabaseUserOrThrow();
    const { error } = await client.from('step_goals').upsert({
      user_id: user.id,
      daily_goal: dailyGoal,
      created_at: Date.now(),
    }, { onConflict: 'user_id' });
    if (error) throw error;
    return;
  }
  await requestVoid('/step-goal', {
    method: 'PUT',
    body: JSON.stringify({ dailyGoal }),
  });
}

export async function getLogs(_userId: string, date?: string): Promise<DayLog> {
  if (USE_SUPABASE_LEGACY) {
    const client = requireSupabase();
    const user = await getSupabaseUserOrThrow();
    const targetDate = date || getToday();
    const { data, error } = await client.from('food_logs').select('*').eq('user_id', user.id).eq('date', targetDate).order('created_at');
    if (error) throw error;
    const logs = await hydrateLogsWithFoods((data || []).map(fromFoodLogRow));
    return { logs, totals: sumTotals(logs) };
  }
  const targetDate = date || getToday();
  const query = `?date=${encodeURIComponent(targetDate)}`;
  const data = await request<{ logs: FoodLog[] }>(`/logs${query}`);
  const logs = await hydrateLogsWithFoods(data.logs || []);
  return { logs, totals: sumTotals(logs) };
}

export async function addLog(_userId: string, food: Partial<FoodLog>): Promise<FoodLog> {
  if (USE_SUPABASE_LEGACY) {
    const client = requireSupabase();
    const user = await getSupabaseUserOrThrow();
    const payload = normalizeLogPayload(food);
    const row = {
      ...toFoodLogRow(payload),
      id: payload.id || generateId(),
      user_id: user.id,
      date: payload.date || getToday(),
      created_at: Date.now(),
    };
    const { data, error } = await client.from('food_logs').insert(row).select().single();
    if (error) throw error;
    return fromFoodLogRow(data);
  }
  const payload = normalizeLogPayload(food);
  return request<FoodLog>('/logs', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function deleteLog(_userId: string, id: string): Promise<void> {
  if (USE_SUPABASE_LEGACY) {
    const client = requireSupabase();
    const user = await getSupabaseUserOrThrow();
    const { error } = await client.from('food_logs').delete().eq('id', id).eq('user_id', user.id);
    if (error) throw error;
    return;
  }
  await requestVoid(`/logs/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

export async function updateLog(_userId: string, id: string, updates: Partial<FoodLog>): Promise<FoodLog | null> {
  if (USE_SUPABASE_LEGACY) {
    const client = requireSupabase();
    const user = await getSupabaseUserOrThrow();
    const { data, error } = await client
      .from('food_logs')
      .update(toFoodLogRow(updates))
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .maybeSingle();
    if (error) throw error;
    return data ? fromFoodLogRow(data) : null;
  }
  return request<FoodLog | null>(`/logs/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
}

export async function getHistory(_userId: string, days = 7): Promise<Record<string, DayLog>> {
  if (USE_SUPABASE_LEGACY) {
    const client = requireSupabase();
    const user = await getSupabaseUserOrThrow();
    const start = new Date();
    start.setDate(start.getDate() - (days - 1));
    const startDate = localDateIso(start);
    const { data, error } = await client
      .from('food_logs')
      .select('*')
      .eq('user_id', user.id)
      .gte('date', startDate)
      .order('date', { ascending: false })
      .order('created_at', { ascending: true });
    if (error) throw error;
    const hydratedLogs = await hydrateLogsWithFoods((data || []).map(fromFoodLogRow));
    return hydratedLogs.reduce<Record<string, DayLog>>((acc, log) => {
      const key = log.date || getToday();
      if (!acc[key]) {
        acc[key] = { logs: [], totals: { calories: 0, protein: 0, carbs: 0, fat: 0 } };
      }
      acc[key].logs.push(log);
      acc[key].totals = sumTotals(acc[key].logs);
      return acc;
    }, {});
  }
  const data = await request<{ logs: FoodLog[] }>(`/history?days=${days}`);
  const hydratedLogs = await hydrateLogsWithFoods(data.logs || []);
  return hydratedLogs.reduce<Record<string, DayLog>>((acc, log) => {
    const key = log.date || getToday();
    if (!acc[key]) {
      acc[key] = { logs: [], totals: { calories: 0, protein: 0, carbs: 0, fat: 0 } };
    }
    acc[key].logs.push(log);
    acc[key].totals = sumTotals(acc[key].logs);
    return acc;
  }, {});
}

export async function getPresets(_userId: string): Promise<Preset[]> {
  if (USE_SUPABASE_LEGACY) {
    const client = requireSupabase();
    const user = await getSupabaseUserOrThrow();
    const { data, error } = await client.from('presets').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []).map((row) => fromFoodRow(row) as Preset);
  }
  const data = await request<{ presets: Preset[] }>('/presets');
  return data.presets || [];
}

export async function addPreset(_userId: string, food: Food): Promise<Preset> {
  if (USE_SUPABASE_LEGACY) {
    const client = requireSupabase();
    const user = await getSupabaseUserOrThrow();
    const row = { id: generateId(), user_id: user.id, created_at: Date.now(), ...toFoodRow(food) };
    const { data, error } = await client.from('presets').insert(row).select().single();
    if (error) throw error;
    return fromFoodRow(data) as Preset;
  }
  return request<Preset>('/presets', {
    method: 'POST',
    body: JSON.stringify(food),
  });
}

export async function deletePreset(_userId: string, id: string): Promise<void> {
  if (USE_SUPABASE_LEGACY) {
    const client = requireSupabase();
    const user = await getSupabaseUserOrThrow();
    const { error } = await client.from('presets').delete().eq('id', id).eq('user_id', user.id);
    if (error) throw error;
    return;
  }
  await requestVoid(`/presets/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

export async function getGoals(_userId: string): Promise<Goal> {
  if (USE_SUPABASE_LEGACY) {
    const client = requireSupabase();
    const user = await getSupabaseUserOrThrow();
    const { data, error } = await client.from('goals').select('*').eq('user_id', user.id).maybeSingle();
    if (error) throw error;
    return {
      calories: Number(data?.calories) || 1500,
      protein: Number(data?.protein) || 20,
      carbs: Number(data?.carbs) || 5,
      fat: Number(data?.fat) || 75,
      weight: data?.weight ?? undefined,
      height: data?.height ?? undefined,
      targetBmi: data?.target_bmi ?? undefined,
    };
  }
  return request<Goal>('/goals');
}

export async function updateGoals(_userId: string, goals: Goal): Promise<Goal> {
  if (USE_SUPABASE_LEGACY) {
    const client = requireSupabase();
    const user = await getSupabaseUserOrThrow();
    const row = {
      user_id: user.id,
      calories: goals.calories,
      protein: goals.protein,
      carbs: goals.carbs,
      fat: goals.fat,
      weight: goals.weight ?? null,
      height: goals.height ?? null,
      target_bmi: goals.targetBmi ?? null,
    };
    const { data, error } = await client.from('goals').upsert(row, { onConflict: 'user_id' }).select().single();
    if (error) throw error;
    return {
      calories: Number(data.calories) || 1500,
      protein: Number(data.protein) || 20,
      carbs: Number(data.carbs) || 5,
      fat: Number(data.fat) || 75,
      weight: data.weight ?? undefined,
      height: data.height ?? undefined,
      targetBmi: data.target_bmi ?? undefined,
    };
  }
  return request<Goal>('/goals', {
    method: 'PUT',
    body: JSON.stringify(goals),
  });
}

export async function searchFoods(query: string): Promise<{ products: Food[] }> {
  if (query.length < 2) return { products: [] };
  try {
    const response = await fetch(
      `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1&page_size=20`,
      { cache: 'no-store' }
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
  } catch {
    return { products: [] };
  }
}

export async function searchByBarcode(barcode: string): Promise<{ products: Food[] }> {
  try {
    const response = await fetch(`https://world.openfoodfacts.org/api/v2/product/${barcode}.json`, {
      cache: 'no-store',
    });
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
        }],
      };
    }
    return { products: [] };
  } catch {
    return { products: [] };
  }
}

export async function getMyFoods(_userId: string): Promise<Food[]> {
  if (USE_SUPABASE_LEGACY) {
    const client = requireSupabase();
    const user = await getSupabaseUserOrThrow();
    const { data, error } = await client.from('my_foods').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []).map(fromFoodRow);
  }
  const data = await request<{ foods: Food[] }>('/my-foods');
  return data.foods || [];
}

export async function addMyFood(_userId: string, food: Omit<Food, 'id'>): Promise<Food> {
  if (USE_SUPABASE_LEGACY) {
    const client = requireSupabase();
    const user = await getSupabaseUserOrThrow();
    const row = { id: generateId(), user_id: user.id, created_at: Date.now(), ...toFoodRow(food) };
    const { data, error } = await client.from('my_foods').insert(row).select().single();
    if (error) throw error;
    return fromFoodRow(data);
  }
  return request<Food>('/my-foods', {
    method: 'POST',
    body: JSON.stringify(food),
  });
}

export async function updateMyFood(_userId: string, food: Food): Promise<Food | null> {
  if (!food.id) return null;
  if (USE_SUPABASE_LEGACY) {
    const client = requireSupabase();
    const user = await getSupabaseUserOrThrow();
    const { data, error } = await client.from('my_foods').update(toFoodRow(food)).eq('id', food.id).eq('user_id', user.id).select().maybeSingle();
    if (error) throw error;
    return data ? fromFoodRow(data) : null;
  }
  return request<Food>(`/my-foods/${encodeURIComponent(food.id)}`, {
    method: 'PUT',
    body: JSON.stringify(food),
  });
}

export async function updateMyFoodAndLogs(userId: string, food: Food): Promise<{ food: Food; updatedLogs: number }> {
  await updateMyFood(userId, food);
  const allLogs = await getHistory(userId, 3650);
  const targetLogs = Object.values(allLogs)
    .flatMap((day) => day.logs)
    .filter((log) => log.foodId === food.id);

  let updatedLogs = 0;
  for (const log of targetLogs) {
    const ratio = log.quantity || 1;
    await updateLog(userId, log.id, {
      name: food.name,
      brand: food.brand,
      calories: Math.round(food.calories * ratio * 10) / 10,
      protein: Math.round(food.protein * ratio * 10) / 10,
      carbs: Math.round(food.carbs * ratio * 10) / 10,
      fat: Math.round(food.fat * ratio * 10) / 10,
      serving: food.serving,
      servingSize: food.servingSize,
      netCarbs: food.netCarbs,
      packageWeight: food.packageWeight,
      packageCount: food.packageCount,
    });
    updatedLogs += 1;
  }

  return { food, updatedLogs };
}

export async function deleteMyFood(_userId: string, id: string): Promise<void> {
  if (USE_SUPABASE_LEGACY) {
    const client = requireSupabase();
    const user = await getSupabaseUserOrThrow();
    const { error } = await client.from('my_foods').delete().eq('id', id).eq('user_id', user.id);
    if (error) throw error;
    return;
  }
  await requestVoid(`/my-foods/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

export async function searchMyFoods(userId: string, query: string): Promise<Food[]> {
  const foods = await getMyFoods(userId);
  const lower = query.toLowerCase();
  return foods.filter((food) => food.name.toLowerCase().includes(lower) || (food.brand || '').toLowerCase().includes(lower));
}

const SAMPLE_FOODS: Food[] = [
  { id: 'sample-egg', name: 'Egg (large)', brand: null, calories: 78, protein: 6, carbs: 1, fat: 5, serving: '1 egg (50g)' },
  { id: 'sample-chicken', name: 'Chicken Breast', brand: null, calories: 165, protein: 31, carbs: 0, fat: 4, serving: '100g' },
  { id: 'sample-rice', name: 'White Rice', brand: null, calories: 130, protein: 3, carbs: 28, fat: 0, serving: '100g' },
];

export async function searchAllFoods(userId: string, query: string): Promise<{ myFoods: Food[]; databaseFoods: Food[] }> {
  if (query.length < 2) return { myFoods: [], databaseFoods: [] };
  const [myFoods, database] = await Promise.all([searchMyFoods(userId, query), searchFoods(query)]);
  return {
    myFoods,
    databaseFoods: database.products.length ? database.products : SAMPLE_FOODS.filter((food) => food.name.toLowerCase().includes(query.toLowerCase())),
  };
}

export async function getCheckins(_userId: string): Promise<Checkin[]> {
  if (USE_SUPABASE_LEGACY) {
    return getLegacyCheckinsForUser();
  }
  const data = await request<{ checkins: Checkin[] }>('/checkins');
  return data.checkins || [];
}

export async function getTodayCheckin(_userId: string): Promise<Checkin | null> {
  if (USE_SUPABASE_LEGACY) {
    const today = getToday();
    const checkins = await getLegacyCheckinsForUser();
    return checkins.find((item) => item.date === today) || null;
  }
  const data = await request<{ checkin: Checkin | null }>('/checkins/today');
  return data.checkin || null;
}

export async function getCheckinsForDate(_userId: string, date: string): Promise<Checkin[]> {
  if (USE_SUPABASE_LEGACY) {
    const checkins = await getLegacyCheckinsForUser();
    return checkins.filter((item) => item.date === date);
  }
  const data = await request<{ checkins: Checkin[] }>(`/checkins/by-date/${encodeURIComponent(date)}`);
  return data.checkins || [];
}

export async function saveCheckin(_userId: string, data: { id?: string; date: string; checkinTime?: string; weight?: number; fastStartTime?: string | null; firstMealTime?: string | null; ketones?: number; glucose?: number; heartRate?: number; bpHigh?: number; bpLow?: number; steps?: number; saturation?: number; cholesterol?: number; ferritin?: number; notes?: string; }): Promise<Checkin> {
  if (USE_SUPABASE_LEGACY) {
    const client = requireSupabase();
    const user = await getSupabaseUserOrThrow();
    const row = {
      id: data.id || generateId(),
      user_id: user.id,
      created_at: Date.now(),
      ...toCheckinRow(data),
    };
    const { data: saved, error } = await client.from('checkins').upsert(row, { onConflict: 'id' }).select().single();
    if (error) throw error;
    return fromCheckinRow(saved);
  }
  return request<Checkin>('/checkins', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function deleteCheckin(_userId: string, checkinId: string): Promise<void> {
  if (USE_SUPABASE_LEGACY) {
    const client = requireSupabase();
    const user = await getSupabaseUserOrThrow();
    const { error } = await client.from('checkins').delete().eq('id', checkinId).eq('user_id', user.id);
    if (error) throw error;
    return;
  }
  await requestVoid(`/checkins/${encodeURIComponent(checkinId)}`, { method: 'DELETE' });
}

export async function clearCheckinFasting(_userId: string, checkinId: string): Promise<void> {
  if (USE_SUPABASE_LEGACY) {
    const client = requireSupabase();
    const user = await getSupabaseUserOrThrow();
    const { error } = await client
      .from('checkins')
      .update({ fast_start_time: null, first_meal_time: null })
      .eq('id', checkinId)
      .eq('user_id', user.id);
    if (error) throw error;
    return;
  }
  await requestVoid(`/checkins/${encodeURIComponent(checkinId)}/clear-fasting`, { method: 'POST' });
}

export async function getFastingSessions(_userId: string): Promise<FastingSession[]> {
  if (USE_SUPABASE_LEGACY) {
    const checkins = await getLegacyCheckinsForUser();
    return deriveLegacyFastingSessions(checkins);
  }
  const data = await request<{ sessions: FastingSession[] }>('/fasting');
  return data.sessions || [];
}

export async function getActiveFastingSession(_userId: string): Promise<FastingSession | null> {
  if (USE_SUPABASE_LEGACY) {
    const sessions = await getFastingSessions(_userId);
    return sessions.find((item) => !item.endTime) || null;
  }
  const data = await request<{ session: FastingSession | null }>('/fasting/active');
  return data.session || null;
}

export async function startFasting(_userId: string, payload?: { date?: string; startTime?: string }): Promise<FastingSession> {
  if (USE_SUPABASE_LEGACY) {
    const date = payload?.date || getToday();
    const startTime = payload?.startTime || new Date().toISOString().slice(11, 16);
    const existingToday = (await getCheckinsForDate(_userId, date)).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))[0];
    const saved = await saveCheckin(_userId, {
      id: existingToday?.id,
      date,
      checkinTime: existingToday?.checkinTime || startTime,
      weight: existingToday?.weight,
      fastStartTime: startTime,
      firstMealTime: null,
      ketones: existingToday?.ketones,
      glucose: existingToday?.glucose,
      heartRate: existingToday?.heartRate,
      bpHigh: existingToday?.bpHigh,
      bpLow: existingToday?.bpLow,
      steps: existingToday?.steps,
      saturation: existingToday?.saturation,
      cholesterol: existingToday?.cholesterol,
      ferritin: existingToday?.ferritin,
      notes: existingToday?.notes,
    });
    return {
      id: `legacy-${saved.id}`,
      date: saved.date,
      startTime: startTime,
      endTime: undefined,
      sourceCheckinId: saved.id,
      createdAt: saved.createdAt,
      updatedAt: saved.createdAt,
    };
  }
  return request<FastingSession>('/fasting/start', {
    method: 'POST',
    body: JSON.stringify(payload || {}),
  });
}

export async function endFasting(_userId: string, sessionId: string, payload?: { endTime?: string }): Promise<FastingSession> {
  if (USE_SUPABASE_LEGACY) {
    const sourceCheckinId = sessionId.replace(/^legacy-/, '');
    const checkins = await getCheckins(_userId);
    const source = checkins.find((item) => item.id === sourceCheckinId);
    if (!source) throw new Error('Fasting session not found');
    const saved = await saveCheckin(_userId, {
      id: source.id,
      date: source.date,
      checkinTime: source.checkinTime,
      weight: source.weight,
      fastStartTime: source.fastStartTime,
      firstMealTime: payload?.endTime || new Date().toISOString().slice(11, 16),
      ketones: source.ketones,
      glucose: source.glucose,
      heartRate: source.heartRate,
      bpHigh: source.bpHigh,
      bpLow: source.bpLow,
      steps: source.steps,
      saturation: source.saturation,
      cholesterol: source.cholesterol,
      ferritin: source.ferritin,
      notes: source.notes,
    });
    return {
      id: `legacy-${saved.id}`,
      date: saved.date,
      startTime: saved.fastStartTime || '',
      endTime: saved.firstMealTime,
      sourceCheckinId: saved.id,
      createdAt: saved.createdAt,
      updatedAt: saved.createdAt,
    };
  }
  return request<FastingSession>(`/fasting/${encodeURIComponent(sessionId)}/end`, {
    method: 'POST',
    body: JSON.stringify(payload || {}),
  });
}

export async function updateFastingSession(
  _userId: string,
  sessionId: string,
  payload: { date: string; startTime: string; endTime?: string | null }
): Promise<FastingSession> {
  if (USE_SUPABASE_LEGACY) {
    const sourceCheckinId = sessionId.replace(/^legacy-/, '');
    const checkins = await getCheckins(_userId);
    const source = checkins.find((item) => item.id === sourceCheckinId);
    if (!source) throw new Error('Fasting session not found');
    const saved = await saveCheckin(_userId, {
      id: source.id,
      date: payload.date,
      checkinTime: source.checkinTime,
      weight: source.weight,
      fastStartTime: payload.startTime,
      firstMealTime: payload.endTime ?? null,
      ketones: source.ketones,
      glucose: source.glucose,
      heartRate: source.heartRate,
      bpHigh: source.bpHigh,
      bpLow: source.bpLow,
      steps: source.steps,
      saturation: source.saturation,
      cholesterol: source.cholesterol,
      ferritin: source.ferritin,
      notes: source.notes,
    });
    return {
      id: `legacy-${saved.id}`,
      date: saved.date,
      startTime: saved.fastStartTime || payload.startTime,
      endTime: saved.firstMealTime,
      sourceCheckinId: saved.id,
      createdAt: saved.createdAt,
      updatedAt: saved.createdAt,
    };
  }
  return request<FastingSession>(`/fasting/${encodeURIComponent(sessionId)}`, {
    method: 'PUT',
    body: JSON.stringify({
      date: payload.date,
      startTime: payload.startTime,
      endTime: payload.endTime ?? null,
    }),
  });
}

export async function deleteFastingSession(_userId: string, sessionId: string): Promise<void> {
  if (USE_SUPABASE_LEGACY) {
    await clearCheckinFasting(_userId, sessionId.replace(/^legacy-/, ''));
    return;
  }
  await requestVoid(`/fasting/${encodeURIComponent(sessionId)}`, { method: 'DELETE' });
}

export async function getTrips(_userId: string): Promise<Trip[]> {
  if (USE_SUPABASE_LEGACY) {
    const client = requireSupabase();
    const user = await getSupabaseUserOrThrow();
    const { data, error } = await client.from('trips').select('*').eq('user_id', user.id).order('date', { ascending: false });
    if (error) throw error;
    return (data || []).map(fromTripRow);
  }
  const data = await request<{ trips: Trip[] }>('/trips');
  return data.trips || [];
}

export async function getTripsByDateRange(_userId: string, startDate: string, endDate: string): Promise<Trip[]> {
  if (USE_SUPABASE_LEGACY) {
    const client = requireSupabase();
    const user = await getSupabaseUserOrThrow();
    const { data, error } = await client.from('trips').select('*').eq('user_id', user.id).gte('date', startDate).lte('date', endDate).order('date', { ascending: false });
    if (error) throw error;
    return (data || []).map(fromTripRow);
  }
  const data = await request<{ trips: Trip[] }>(`/trips/range?startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`);
  return data.trips || [];
}

export async function getWeekTrips(userId: string): Promise<Trip[]> {
  const today = new Date();
  const dayOfWeek = (today.getDay() + 6) % 7;
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - dayOfWeek);
  return getTripsByDateRange(userId, localDateIso(startOfWeek), getToday());
}

export async function saveTrip(_userId: string, data: Omit<Trip, 'id' | 'date' | 'createdAt'>): Promise<Trip> {
  if (USE_SUPABASE_LEGACY) {
    const client = requireSupabase();
    const user = await getSupabaseUserOrThrow();
    const row = {
      id: generateId(),
      user_id: user.id,
      date: getToday(),
      created_at: Date.now(),
      avg_speed: data.avgSpeed,
      avg_heart_rate: data.avgHeartRate,
      distance: data.distance,
      duration: data.duration,
      description: data.description ?? null,
    };
    const { data: saved, error } = await client.from('trips').insert(row).select().single();
    if (error) throw error;
    return fromTripRow(saved);
  }
  return request<Trip>('/trips', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateTrip(_userId: string, id: string, data: Omit<Trip, 'id' | 'date' | 'createdAt'>): Promise<void> {
  if (USE_SUPABASE_LEGACY) {
    const client = requireSupabase();
    const user = await getSupabaseUserOrThrow();
    const { error } = await client
      .from('trips')
      .update({
        distance: data.distance,
        duration: data.duration,
        avg_speed: data.avgSpeed,
        avg_heart_rate: data.avgHeartRate,
        description: data.description ?? null,
      })
      .eq('id', id)
      .eq('user_id', user.id);
    if (error) throw error;
    return;
  }
  await requestVoid(`/trips/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteTrip(_userId: string, id: string): Promise<void> {
  if (USE_SUPABASE_LEGACY) {
    const client = requireSupabase();
    const user = await getSupabaseUserOrThrow();
    const { error } = await client.from('trips').delete().eq('id', id).eq('user_id', user.id);
    if (error) throw error;
    return;
  }
  await requestVoid(`/trips/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

export async function getRaceGoal(_userId: string): Promise<RaceGoal> {
  if (USE_SUPABASE_LEGACY) {
    const client = requireSupabase();
    const user = await getSupabaseUserOrThrow();
    const { data, error } = await client.from('race_goals').select('*').eq('user_id', user.id).maybeSingle();
    if (error) throw error;
    return {
      eventName: data?.event_name || '',
      startDate: data?.start_date ?? undefined,
      raceDate: data?.race_date || '2026-05-23',
      targetWeight: Number(data?.target_weight) || 80,
      weeklyTarget: Number(data?.weekly_target) || 0.5,
    };
  }
  return request<RaceGoal>('/race-goal');
}

export async function saveRaceGoal(_userId: string, goal: RaceGoal): Promise<RaceGoal> {
  if (USE_SUPABASE_LEGACY) {
    const client = requireSupabase();
    const user = await getSupabaseUserOrThrow();
    const row = {
      user_id: user.id,
      event_name: goal.eventName,
      start_date: goal.startDate ?? null,
      race_date: goal.raceDate,
      target_weight: goal.targetWeight,
      weekly_target: goal.weeklyTarget,
    };
    const { data, error } = await client.from('race_goals').upsert(row, { onConflict: 'user_id' }).select().single();
    if (error) throw error;
    return {
      eventName: data.event_name || '',
      startDate: data.start_date ?? undefined,
      raceDate: data.race_date,
      targetWeight: Number(data.target_weight) || 80,
      weeklyTarget: Number(data.weekly_target) || 0.5,
    };
  }
  return request<RaceGoal>('/race-goal', {
    method: 'PUT',
    body: JSON.stringify(goal),
  });
}

export async function getDaysUntilRace(userId: string): Promise<number> {
  const goal = await getRaceGoal(userId);
  return Math.ceil((new Date(goal.raceDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

export async function getWeeksUntilRace(userId: string): Promise<number> {
  return (await getDaysUntilRace(userId)) / 7;
}

export async function getEventGoals(userId: string): Promise<EventGoalItem[]> {
  if (USE_SUPABASE_LEGACY) {
    const client = requireSupabase();
    const primary = await getRaceGoal(userId);
    const user = await getSupabaseUserOrThrow();
    const { data, error } = await client.from('event_goals').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
    if (error) throw error;
    return [
      {
        id: 'primary',
        eventName: primary.eventName,
        startDate: primary.startDate,
        raceDate: primary.raceDate,
        targetWeight: primary.targetWeight,
        weeklyTarget: primary.weeklyTarget,
        createdAt: 0,
        isPrimary: true,
      },
      ...(data || []).map((row) => ({ ...fromEventGoalRow(row), isPrimary: false })),
    ];
  }
  const [primary, data] = await Promise.all([
    getRaceGoal(userId),
    request<{ eventGoals: EventGoalItem[] }>('/event-goals'),
  ]);

  return [
    {
      id: 'primary',
      eventName: primary.eventName,
      startDate: primary.startDate,
      raceDate: primary.raceDate,
      targetWeight: primary.targetWeight,
      weeklyTarget: primary.weeklyTarget,
      createdAt: 0,
      isPrimary: true,
    },
    ...(data.eventGoals || []).map((item) => ({ ...item, isPrimary: false })),
  ];
}

export async function saveEventGoalItem(_userId: string, goal: { id?: string; eventName: string; startDate?: string; raceDate: string; targetWeight: number; weeklyTarget: number }): Promise<EventGoalItem> {
  if (USE_SUPABASE_LEGACY) {
    const client = requireSupabase();
    const user = await getSupabaseUserOrThrow();
    const row = {
      id: goal.id || generateId(),
      user_id: user.id,
      event_name: goal.eventName,
      start_date: goal.startDate ?? null,
      race_date: goal.raceDate,
      target_weight: goal.targetWeight,
      weekly_target: goal.weeklyTarget,
      created_at: Date.now(),
    };
    const { data, error } = await client.from('event_goals').upsert(row, { onConflict: 'id' }).select().single();
    if (error) throw error;
    return fromEventGoalRow(data);
  }
  return request<EventGoalItem>('/event-goals', {
    method: 'POST',
    body: JSON.stringify(goal),
  });
}

export async function deleteEventGoalItem(_userId: string, id: string): Promise<void> {
  if (USE_SUPABASE_LEGACY) {
    const client = requireSupabase();
    const user = await getSupabaseUserOrThrow();
    const { error } = await client.from('event_goals').delete().eq('id', id).eq('user_id', user.id);
    if (error) throw error;
    return;
  }
  await requestVoid(`/event-goals/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

export async function setPrimaryEventGoal(_userId: string, id: string): Promise<void> {
  if (USE_SUPABASE_LEGACY) {
    const goals = await getEventGoals(_userId);
    const selected = goals.find((goal) => goal.id === id);
    if (!selected || selected.isPrimary) return;
    await saveRaceGoal(_userId, {
      eventName: selected.eventName,
      startDate: selected.startDate,
      raceDate: selected.raceDate,
      targetWeight: selected.targetWeight,
      weeklyTarget: selected.weeklyTarget,
    });
    await deleteEventGoalItem(_userId, id);
    return;
  }
  await requestVoid(`/event-goals/${encodeURIComponent(id)}/set-primary`, { method: 'POST' });
}

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

  if (weightedAsc.length === 0) return 0;

  const firstWeight = weightedAsc[0]?.weight ?? null;
  const maxWeight = weightedAsc.reduce((max, item) => Math.max(max, item.weight || Number.NEGATIVE_INFINITY), Number.NEGATIVE_INFINITY);
  const minWeight = weightedAsc.reduce((min, item) => Math.min(min, item.weight || Number.POSITIVE_INFINITY), Number.POSITIVE_INFINITY);
  if (firstWeight === null || !Number.isFinite(maxWeight) || !Number.isFinite(minWeight)) return 0;

  const raceThreshold = raceGoal?.targetWeight ? Math.floor(raceGoal.targetWeight) : null;
  const fromThreshold = Math.max(Math.floor(firstWeight), Math.ceil(maxWeight), raceThreshold ?? Number.NEGATIVE_INFINITY);
  const lowerBound = raceGoal?.targetWeight ? Math.min(Math.floor(raceGoal.targetWeight), Math.floor(minWeight)) : Math.floor(minWeight);
  if (fromThreshold < lowerBound) return 0;

  const existingAuto = new Map(existingMilestones.filter((m) => (m.notes || '').startsWith('auto:weight')).map((m) => [m.title, m]));
  let changes = 0;
  for (let threshold = fromThreshold; threshold >= lowerBound; threshold -= 1) {
    const firstHit = weightedAsc.find((entry) => (entry.weight || Number.POSITIVE_INFINITY) < threshold);
    if (!firstHit) continue;
    const title = `Under ${threshold} kg`;
    const existing = existingAuto.get(title);
    const needsUpdate = !existing || existing.date !== firstHit.date || existing.done !== true || (existing.notes || '') !== 'auto:weight';
    if (!needsUpdate) continue;
    await saveMilestone(userId, {
      id: existing?.id,
      title,
      date: firstHit.date,
      notes: 'auto:weight',
      done: true,
    });
    changes += 1;
  }
  return changes;
}

export async function getMilestones(_userId: string): Promise<Milestone[]> {
  if (USE_SUPABASE_LEGACY) {
    const client = requireSupabase();
    const user = await getSupabaseUserOrThrow();
    const { data, error } = await client.from('milestones').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []).map(fromMilestoneRow);
  }
  const data = await request<{ milestones: Milestone[] }>('/milestones');
  return data.milestones || [];
}

export async function saveMilestone(_userId: string, milestone: { id?: string; title: string; date: string; notes?: string; done?: boolean }): Promise<Milestone> {
  if (USE_SUPABASE_LEGACY) {
    const client = requireSupabase();
    const user = await getSupabaseUserOrThrow();
    const row = {
      id: milestone.id || generateId(),
      user_id: user.id,
      title: milestone.title,
      date: milestone.date,
      notes: milestone.notes ?? '',
      done: milestone.done ?? false,
      created_at: Date.now(),
      updated_at: Date.now(),
    };
    const { data, error } = await client.from('milestones').upsert(row, { onConflict: 'id' }).select().single();
    if (error) throw error;
    return fromMilestoneRow(data);
  }
  return request<Milestone>('/milestones', {
    method: 'POST',
    body: JSON.stringify(milestone),
  });
}

export async function deleteMilestone(_userId: string, id: string): Promise<void> {
  if (USE_SUPABASE_LEGACY) {
    const client = requireSupabase();
    const user = await getSupabaseUserOrThrow();
    const { error } = await client.from('milestones').delete().eq('id', id).eq('user_id', user.id);
    if (error) throw error;
    return;
  }
  await requestVoid(`/milestones/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

export async function getReleaseNotes(_userId: string): Promise<ReleaseNoteItem[]> {
  if (USE_SUPABASE_LEGACY) {
    const client = requireSupabase();
    const user = await getSupabaseUserOrThrow();
    const { data, error } = await client.from('release_notes').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []).map(fromReleaseNoteRow);
  }
  const data = await request<{ releaseNotes: ReleaseNoteItem[] }>('/release-notes');
  return data.releaseNotes || [];
}

export async function addReleaseNote(_userId: string, note: string, date: string): Promise<void> {
  if (USE_SUPABASE_LEGACY) {
    const client = requireSupabase();
    const user = await getSupabaseUserOrThrow();
    const { error } = await client.from('release_notes').insert({
      id: generateId(),
      user_id: user.id,
      note,
      date,
      created_at: Date.now(),
    });
    if (error) throw error;
    return;
  }
  await requestVoid('/release-notes', {
    method: 'POST',
    body: JSON.stringify({ note, date }),
  });
}

export async function getFeatureRequests(_userId: string): Promise<FeatureRequestItem[]> {
  if (USE_SUPABASE_LEGACY) {
    const client = requireSupabase();
    const user = await getSupabaseUserOrThrow();
    const { data, error } = await client.from('feature_requests').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []).map(fromFeatureRequestRow);
  }
  const data = await request<{ featureRequests: FeatureRequestItem[] }>('/feature-requests');
  return data.featureRequests || [];
}

export async function saveFeatureRequest(_userId: string, item: { id?: string; text: string; createdAt?: number }): Promise<void> {
  if (USE_SUPABASE_LEGACY) {
    const client = requireSupabase();
    const user = await getSupabaseUserOrThrow();
    const { error } = await client.from('feature_requests').upsert({
      id: item.id || generateId(),
      user_id: user.id,
      text: item.text,
      created_at: item.createdAt || Date.now(),
    }, { onConflict: 'id' });
    if (error) throw error;
    return;
  }
  await requestVoid('/feature-requests', {
    method: 'POST',
    body: JSON.stringify(item),
  });
}

export async function deleteFeatureRequest(_userId: string, id: string): Promise<void> {
  if (USE_SUPABASE_LEGACY) {
    const client = requireSupabase();
    const user = await getSupabaseUserOrThrow();
    const { error } = await client.from('feature_requests').delete().eq('id', id).eq('user_id', user.id);
    if (error) throw error;
    return;
  }
  await requestVoid(`/feature-requests/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

export async function reorderFeatureRequests(_userId: string, items: FeatureRequestItem[]): Promise<FeatureRequestItem[]> {
  if (USE_SUPABASE_LEGACY) {
    for (const item of items) {
      await saveFeatureRequest(_userId, item);
    }
    return items;
  }
  const base = Date.now() + items.length;
  const reordered = items.map((item, index) => ({ ...item, createdAt: base - index }));
  await requestVoid('/feature-requests/reorder', {
    method: 'POST',
    body: JSON.stringify({ items: reordered }),
  });
  return reordered;
}

export async function exportUserData(_userId: string): Promise<DataExportV1> {
  if (USE_SUPABASE_LEGACY) {
    const client = requireSupabase();
    const user = await getSupabaseUserOrThrow();
    const tables = ['my_foods', 'food_logs', 'presets', 'goals', 'checkins', 'step_goals', 'trips', 'race_goals', 'event_goals', 'milestones', 'release_notes', 'feature_requests'] as const;
    const data: Record<string, any[]> = {};
    for (const table of tables) {
      const { data: rows, error } = await client.from(table).select('*').eq('user_id', user.id);
      if (error) throw error;
      data[table] = rows || [];
    }
    data.fasting_sessions = deriveLegacyFastingSessions((data.checkins || []).map(fromCheckinRow)).map((session) => ({
      id: session.id,
      user_id: user.id,
      date: session.date,
      start_time: session.startTime,
      end_time: session.endTime ?? null,
      source_checkin_id: session.sourceCheckinId ?? null,
      created_at: session.createdAt,
      updated_at: session.updatedAt ?? null,
    }));
    return {
      version: 1,
      exportedAt: new Date().toISOString(),
      userId: user.id,
      data: data as DataExportV1['data'],
    };
  }
  return request<DataExportV1>('/export');
}

export async function importUserData(_userId: string, payload: unknown): Promise<{ imported: number }> {
  if (USE_SUPABASE_LEGACY) {
    const parsed = payload as DataExportV1;
    const client = requireSupabase();
    const user = await getSupabaseUserOrThrow();
    const tableConfigs: Array<{ table: keyof DataExportV1['data']; conflict: string }> = [
      { table: 'my_foods', conflict: 'id' },
      { table: 'food_logs', conflict: 'id' },
      { table: 'presets', conflict: 'id' },
      { table: 'goals', conflict: 'user_id' },
      { table: 'checkins', conflict: 'id' },
      { table: 'step_goals', conflict: 'user_id' },
      { table: 'trips', conflict: 'id' },
      { table: 'race_goals', conflict: 'user_id' },
      { table: 'event_goals', conflict: 'id' },
      { table: 'milestones', conflict: 'id' },
      { table: 'release_notes', conflict: 'id' },
      { table: 'feature_requests', conflict: 'id' },
    ];
    let imported = 0;
    for (const { table, conflict } of tableConfigs) {
      const rows = (parsed.data?.[table] || []).map((row: any) => ({ ...row, user_id: user.id }));
      if (!rows.length) continue;
      const { error } = await client.from(table).upsert(rows, { onConflict: conflict });
      if (error) throw error;
      imported += rows.length;
    }
    if (Array.isArray(parsed.data?.fasting_sessions)) {
      for (const session of parsed.data.fasting_sessions) {
        if (!session?.start_time && !session?.startTime) continue;
        const sourceCheckinId = session.source_checkin_id || session.sourceCheckinId || generateId();
        await saveCheckin(_userId, {
          id: String(sourceCheckinId).replace(/^legacy-/, ''),
          date: session.date,
          fastStartTime: session.start_time || session.startTime,
          firstMealTime: session.end_time || session.endTime || null,
        });
        imported += 1;
      }
    }
    return { imported };
  }
  return request<{ imported: number }>('/import', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function isAuthenticated(): boolean {
  return !!getUserId();
}

export async function logout(): Promise<void> {
  if (USE_SUPABASE_LEGACY) {
    try {
      const client = requireSupabase();
      await client.auth.signOut();
    } finally {
      setUserId(null);
      window.dispatchEvent(new Event('auth-change'));
    }
    return;
  }
  try {
    await requestVoid('/auth/logout', { method: 'POST', skipAuthEvent: true });
  } finally {
    setUserId(null);
    window.dispatchEvent(new Event('auth-change'));
  }
}

export async function verifyPassword(password: string): Promise<boolean> {
  if (USE_SUPABASE_LEGACY) {
    try {
      const client = requireSupabase();
      const { data } = await client.auth.getUser();
      if (!data.user?.email) return false;
      const { error } = await client.auth.signInWithPassword({ email: data.user.email, password });
      return !error;
    } catch {
      return false;
    }
  }
  try {
    const data = await request<{ valid: boolean }>('/auth/verify-password', {
      method: 'POST',
      body: JSON.stringify({ password }),
    });
    return !!data.valid;
  } catch {
    return false;
  }
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<{ success: boolean; error?: string }> {
  if (USE_SUPABASE_LEGACY) {
    try {
      const valid = await verifyPassword(currentPassword);
      if (!valid) return { success: false, error: 'Current password is incorrect' };
      const client = requireSupabase();
      const { error } = await client.auth.updateUser({ password: newPassword });
      if (error) return { success: false, error: error.message };
      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Connection error' };
    }
  }
  try {
    await request<{ success: boolean }>('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Connection error' };
  }
}

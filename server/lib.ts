import crypto from 'node:crypto';

export const SESSION_COOKIE = 'macrometric_session';

export function now(): number {
  return Date.now();
}

export function generateId(): string {
  return crypto.randomUUID();
}

export function localDateIso(value: Date = new Date()): string {
  const yyyy = value.getFullYear();
  const mm = String(value.getMonth() + 1).padStart(2, '0');
  const dd = String(value.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export function toNumber(value: unknown): number | undefined {
  if (value === null || value === undefined || value === '') return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function todayIso(): string {
  return localDateIso();
}

export function toDateString(value: unknown): string | undefined {
  if (!value) return undefined;
  if (value instanceof Date) {
    const yyyy = value.getFullYear();
    const mm = String(value.getMonth() + 1).padStart(2, '0');
    const dd = String(value.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }
  const text = String(value);
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
  const parsed = new Date(text);
  if (!Number.isNaN(parsed.getTime())) {
    return localDateIso(parsed);
  }
  return text;
}

export function toTimeString(value: unknown): string | undefined {
  if (!value) return undefined;
  const text = String(value).trim();
  const match = text.match(/^(\d{2}):(\d{2})(?::\d{2}(?:\.\d+)?)?$/);
  if (match) {
    return `${match[1]}:${match[2]}`;
  }
  return text;
}

export function toFood(row: Record<string, unknown>) {
  return {
    id: row.id ? String(row.id) : undefined,
    name: String(row.name ?? ''),
    brand: row.brand ? String(row.brand) : null,
    calories: toNumber(row.calories) ?? 0,
    protein: toNumber(row.protein) ?? 0,
    carbs: toNumber(row.carbs) ?? 0,
    fat: toNumber(row.fat) ?? 0,
    serving: String(row.serving ?? '1 serving'),
    servingSize: toNumber(row.serving_size),
    netCarbs: toNumber(row.net_carbs),
    packageWeight: toNumber(row.package_weight),
    packageCount: toNumber(row.package_count),
  };
}

export function toFoodLog(row: Record<string, unknown>) {
  return {
    ...toFood(row),
    id: String(row.id),
    foodId: row.food_id ? String(row.food_id) : undefined,
    quantity: toNumber(row.quantity) ?? 1,
    date: toDateString(row.date),
    createdAt: toNumber(row.created_at) ?? now(),
  };
}

export function toCheckin(row: Record<string, unknown>) {
  const vitals = Array.isArray(row.vitals) ? row.vitals : [];
  return {
    id: String(row.id),
    date: toDateString(row.date) ?? '',
    checkinTime: toTimeString(row.checkin_time),
    weight: toNumber(row.weight),
    fastStartTime: toTimeString(row.fast_start_time),
    firstMealTime: toTimeString(row.first_meal_time),
    ketones: toNumber(row.ketones),
    glucose: toNumber(row.glucose),
    heartRate: toNumber(row.heart_rate),
    bpHigh: toNumber(row.bp_high),
    bpLow: toNumber(row.bp_low),
    steps: toNumber(row.steps),
    saturation: toNumber(row.saturation),
    cholesterol: toNumber(row.cholesterol),
    ferritin: toNumber(row.ferritin),
    vitals,
    notes: row.notes ? String(row.notes) : undefined,
    createdAt: toNumber(row.created_at) ?? now(),
  };
}

export function toFastingSession(row: Record<string, unknown>) {
  return {
    id: String(row.id),
    date: toDateString(row.date) ?? '',
    startTime: toTimeString(row.start_time) ?? '',
    endTime: toTimeString(row.end_time),
    sourceCheckinId: row.source_checkin_id ? String(row.source_checkin_id) : undefined,
    createdAt: toNumber(row.created_at) ?? now(),
    updatedAt: toNumber(row.updated_at),
  };
}

export function toTrip(row: Record<string, unknown>) {
  return {
    id: String(row.id),
    date: toDateString(row.date) ?? '',
    distance: toNumber(row.distance) ?? 0,
    duration: toNumber(row.duration) ?? 0,
    avgSpeed: toNumber(row.avg_speed) ?? 0,
    avgHeartRate: toNumber(row.avg_heart_rate) ?? 0,
    description: row.description ? String(row.description) : undefined,
    createdAt: toNumber(row.created_at) ?? now(),
  };
}

export function toEventGoal(row: Record<string, unknown>) {
  return {
    id: String(row.id),
    eventName: row.event_name ? String(row.event_name) : '',
    startDate: toDateString(row.start_date),
    raceDate: toDateString(row.race_date) ?? '',
    targetWeight: toNumber(row.target_weight) ?? 80,
    weeklyTarget: toNumber(row.weekly_target) ?? 0.5,
    createdAt: toNumber(row.created_at) ?? now(),
  };
}

export function toMilestone(row: Record<string, unknown>) {
  return {
    id: String(row.id),
    title: String(row.title ?? ''),
    date: toDateString(row.date) ?? '',
    notes: row.notes ? String(row.notes) : '',
    done: !!row.done,
    createdAt: toNumber(row.created_at) ?? now(),
    updatedAt: toNumber(row.updated_at),
  };
}

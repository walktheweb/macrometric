import { promises as fs } from 'node:fs';
import path from 'node:path';
import { pool } from './db.js';

const exportTables = [
  'my_foods',
  'food_logs',
  'presets',
  'goals',
  'checkins',
  'fasting_sessions',
  'step_goals',
  'trips',
  'race_goals',
  'event_goals',
  'milestones',
  'release_notes',
  'feature_requests',
] as const;

export interface UserExportPayload {
  version: 1;
  exportedAt: string;
  userId: string;
  data: Record<string, unknown[]>;
}

export interface AutoDailyExportConfig {
  enabled: boolean;
  directory: string;
}

function sanitizePathSegment(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'user';
}

function toFilenameTimestamp(value = new Date()) {
  const yyyy = value.getFullYear();
  const mm = String(value.getMonth() + 1).padStart(2, '0');
  const dd = String(value.getDate()).padStart(2, '0');
  const hh = String(value.getHours()).padStart(2, '0');
  const min = String(value.getMinutes()).padStart(2, '0');
  const sec = String(value.getSeconds()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}T${hh}-${min}-${sec}`;
}

export async function buildUserExportPayload(userId: string): Promise<UserExportPayload> {
  const data: Record<string, unknown[]> = {};
  for (const table of exportTables) {
    const result = await pool.query(`SELECT * FROM ${table} WHERE user_id = $1`, [userId]);
    data[table] = result.rows;
  }
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    userId,
    data,
  };
}

export async function writeAutomaticDailyExport(params: {
  userId: string;
  userLabel?: string | null;
  date: string;
  config: AutoDailyExportConfig;
}): Promise<{ status: 'disabled' | 'skipped' | 'saved'; filePath?: string }> {
  const { userId, userLabel, date, config } = params;
  if (!config.enabled || !config.directory) {
    return { status: 'disabled' };
  }

  const safeUserLabel = sanitizePathSegment(userLabel || userId);
  const targetDir = path.join(config.directory, date, safeUserLabel);
  await fs.mkdir(targetDir, { recursive: true });

  const existing = await fs.readdir(targetDir);
  if (existing.some((name) => name.toLowerCase().endsWith('.json'))) {
    return { status: 'skipped' };
  }

  const payload = await buildUserExportPayload(userId);
  const fileName = `macrometric-backup-${toFilenameTimestamp()}.json`;
  const filePath = path.join(targetDir, fileName);
  await fs.writeFile(filePath, JSON.stringify(payload, null, 2), 'utf8');
  return { status: 'saved', filePath };
}

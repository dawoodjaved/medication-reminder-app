import AsyncStorage from '@react-native-async-storage/async-storage';
import { todayISO } from './dates';
import { predictRefill, RefillInfo } from './refillPrediction';

const WIDGET_KEY = 'medrem_widget_snapshot';

export type WidgetSnapshot = {
  updatedAt: string;
  date: string;
  nextDose: { medicineName: string; time: string; isCritical?: boolean } | null;
  taken: number;
  total: number;
  overdue: number;
  lowStock: string[];
  refillPreview: RefillInfo[];
};

/** Persist a glance payload for home-widget consumers / Today glance */
export async function saveWidgetSnapshot(snapshot: WidgetSnapshot): Promise<void> {
  await AsyncStorage.setItem(WIDGET_KEY, JSON.stringify(snapshot));
}

export async function loadWidgetSnapshot(): Promise<WidgetSnapshot | null> {
  const raw = await AsyncStorage.getItem(WIDGET_KEY);
  return raw ? JSON.parse(raw) : null;
}

export function buildWidgetSnapshot(opts: {
  reminders: {
    medicineName: string;
    time: string;
    taken: boolean;
    medicines?: { isCritical?: boolean };
  }[];
  medicines?: any[];
}): WidgetSnapshot {
  const now = new Date();
  const nowMins = now.getHours() * 60 + now.getMinutes();
  const pending = opts.reminders.filter((r) => !r.taken);
  const overdue = pending.filter((r) => {
    const [h, m] = r.time.split(':').map(Number);
    return h * 60 + m < nowMins;
  });
  const upcoming = pending
    .filter((r) => {
      const [h, m] = r.time.split(':').map(Number);
      return h * 60 + m >= nowMins;
    })
    .sort((a, b) => a.time.localeCompare(b.time));
  const next = upcoming[0];
  const taken = opts.reminders.filter((r) => r.taken).length;
  const refills = (opts.medicines || []).map(predictRefill).filter((r) => r.isLow);

  return {
    updatedAt: now.toISOString(),
    date: todayISO(),
    nextDose: next
      ? {
          medicineName: next.medicineName,
          time: next.time,
          isCritical: !!(next as any).medicines?.isCritical,
        }
      : null,
    taken,
    total: opts.reminders.length,
    overdue: overdue.length,
    lowStock: refills.map((r) => r.medicineName),
    refillPreview: refills,
  };
}

import AsyncStorage from '@react-native-async-storage/async-storage';

const QUEUE_KEY = 'medrem_offline_queue';

export type OfflineAction =
  | { type: 'taken'; reminderId: string; medicineId?: string; createdAt: string }
  | { type: 'snooze'; reminderId: string; time: string; createdAt: string };

export async function enqueueAction(action: OfflineAction) {
  const raw = await AsyncStorage.getItem(QUEUE_KEY);
  const list: OfflineAction[] = raw ? JSON.parse(raw) : [];
  list.push(action);
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(list));
}

export async function peekQueue(): Promise<OfflineAction[]> {
  const raw = await AsyncStorage.getItem(QUEUE_KEY);
  return raw ? JSON.parse(raw) : [];
}

export async function clearQueue() {
  await AsyncStorage.removeItem(QUEUE_KEY);
}

export async function setQueue(list: OfflineAction[]) {
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(list));
}

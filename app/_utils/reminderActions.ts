import { database, config } from '../../config/appwriteConfig';
import { addMinutesToTimeString } from './timeConversion';
import { enqueueAction, peekQueue, setQueue, OfflineAction } from './offlineQueue';

async function isOnline(): Promise<boolean> {
  try {
    // Lightweight connectivity probe — Appwrite endpoint HEAD/GET may fail CORS on web;
    // for RN, fetch with short timeout against a known host.
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 3000);
    await fetch('https://cloud.appwrite.io/v1/health', { signal: controller.signal });
    clearTimeout(t);
    return true;
  } catch {
    return false;
  }
}

export async function markTaken(reminderId: string, medicineId?: string) {
  const online = await isOnline();
  if (!online) {
    await enqueueAction({
      type: 'taken',
      reminderId,
      medicineId,
      createdAt: new Date().toISOString(),
    });
    return { queued: true };
  }

  await database.updateDocument(config.db, config.col.reminders, reminderId, {
    taken: true,
    notificationSend: true,
  });

  if (medicineId) {
    try {
      const med = await database.getDocument(config.db, config.col.medicines, medicineId);
      const qty = Number(med.quantityRemaining ?? med.quantity ?? 0);
      if (qty > 0) {
        await database.updateDocument(config.db, config.col.medicines, medicineId, {
          quantityRemaining: qty - 1,
        });
      }
    } catch {
      /* optional field */
    }
  }

  return { queued: false };
}

export async function markSnooze(reminderId: string, time: string) {
  const online = await isOnline();
  const newTime = addMinutesToTimeString(time, 5);

  if (!online) {
    await enqueueAction({
      type: 'snooze',
      reminderId,
      time: newTime,
      createdAt: new Date().toISOString(),
    });
    return { queued: true, time: newTime };
  }

  await database.updateDocument(config.db, config.col.reminders, reminderId, {
    snoozed: true,
    notificationSend: false,
    time: newTime,
  });

  return { queued: false, time: newTime };
}

export async function flushOfflineQueue() {
  const online = await isOnline();
  if (!online) return 0;

  const queue = await peekQueue();
  if (!queue.length) return 0;

  const remaining: OfflineAction[] = [];
  let flushed = 0;

  for (const action of queue) {
    try {
      if (action.type === 'taken') {
        await markTaken(action.reminderId, action.medicineId);
      } else if (action.type === 'snooze') {
        await database.updateDocument(config.db, config.col.reminders, action.reminderId, {
          snoozed: true,
          notificationSend: false,
          time: action.time,
        });
      }
      flushed++;
    } catch {
      remaining.push(action);
    }
  }

  await setQueue(remaining);
  return flushed;
}

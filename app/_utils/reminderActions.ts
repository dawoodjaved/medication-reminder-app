import { account, database, config } from '../../config/appwriteConfig';
import { addMinutesToTimeString } from './timeConversion';
import { enqueueAction, peekQueue, setQueue, OfflineAction } from './offlineQueue';
import { getCachedScope } from './patientScope';

async function isOnline(): Promise<boolean> {
  try {
    // Probe the project Appwrite endpoint (not a generic cloud host).
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 1200);
    await fetch(`${config.endpoint}/health`, { signal: controller.signal });
    clearTimeout(t);
    return true;
  } catch {
    return false;
  }
}

/** Block IDOR if someone guesses another user's reminderId */
async function assertCanMutateReminder(reminderId: string) {
  const [user, scope, doc] = await Promise.all([
    account.get(),
    getCachedScope(),
    database.getDocument(config.db, config.col.reminders, reminderId),
  ]);
  const allowedPatient = scope?.patientId || user.$id;
  const owner = (doc as any).patientId || (doc as any).userId;
  if (owner && owner !== allowedPatient && owner !== user.$id) {
    throw new Error('Not authorized to update this reminder');
  }
  return doc;
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

  await assertCanMutateReminder(reminderId);
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

  await assertCanMutateReminder(reminderId);
  await database.updateDocument(config.db, config.col.reminders, reminderId, {
    snoozed: true,
    notificationSend: false,
    time: newTime,
  });

  return { queued: false, time: newTime };
}

export async function flushOfflineQueue() {
  // Skip network probe when there is nothing to flush (common path).
  const queue = await peekQueue();
  if (!queue.length) return 0;

  const online = await isOnline();
  if (!online) return 0;

  const remaining: OfflineAction[] = [];
  let flushed = 0;

  for (const action of queue) {
    try {
      await assertCanMutateReminder(action.reminderId);
      if (action.type === 'taken') {
        await database.updateDocument(config.db, config.col.reminders, action.reminderId, {
          taken: true,
          notificationSend: true,
        });
        if (action.medicineId) {
          try {
            const med = await database.getDocument(
              config.db,
              config.col.medicines,
              action.medicineId
            );
            const qty = Number(med.quantityRemaining ?? med.quantity ?? 0);
            if (qty > 0) {
              await database.updateDocument(config.db, config.col.medicines, action.medicineId, {
                quantityRemaining: qty - 1,
              });
            }
          } catch {
            /* optional field */
          }
        }
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

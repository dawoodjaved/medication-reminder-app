import { account, database, config } from '../../config/appwriteConfig';
import { ID, Permission, Role } from 'appwrite';
import { addDays, dosesPerDay, formatDateISO } from './dates';
import { sharedPermissions } from './patientScope';

type ScheduleOptions = {
  times: string[];
  medicineName: string;
  description: string;
  medicineId: string;
  patientId: string;
  frequency: string;
  repeatSchedule: boolean;
  numberOfDays?: number;
};

/**
 * Creates reminder documents for each dose time across the schedule window.
 * - repeat + N days → N days from today
 * - Everyday → 30 days
 * - Weekly → same weekday for 8 weeks
 * - otherwise → today only
 */
export async function scheduleReminders(opts: ScheduleOptions) {
  const {
    times,
    medicineName,
    description,
    medicineId,
    patientId,
    frequency,
    repeatSchedule,
    numberOfDays,
  } = opts;

  const user = await account.get();
  const ownerId = patientId || user.$id;
  const validTimes = times.filter(Boolean);
  const perms = sharedPermissions(ownerId);

  const dates: string[] = [];
  const start = new Date();
  start.setHours(0, 0, 0, 0);

  if (repeatSchedule && numberOfDays && numberOfDays > 0) {
    for (let i = 0; i < numberOfDays; i++) {
      dates.push(formatDateISO(addDays(start, i)));
    }
  } else if (frequency === 'Everyday') {
    for (let i = 0; i < 30; i++) {
      dates.push(formatDateISO(addDays(start, i)));
    }
  } else if (frequency === 'Weekly') {
    for (let i = 0; i < 8; i++) {
      dates.push(formatDateISO(addDays(start, i * 7)));
    }
  } else {
    dates.push(formatDateISO(start));
  }

  const creates: Promise<unknown>[] = [];

  for (const date of dates) {
    for (const t of validTimes) {
      const reminder = {
        medicineName,
        time: t,
        description,
        taken: false,
        snoozed: false,
        notificationSend: false,
        missedNotified: false,
        date,
        userId: ownerId,
        patientId: ownerId,
        medicines: medicineId,
      };

      creates.push(
        database.createDocument(
          config.db,
          config.col.reminders,
          ID.unique(),
          reminder,
          perms.length
            ? perms
            : [
                Permission.read(Role.user(ownerId)),
                Permission.write(Role.user(ownerId)),
              ]
        )
      );
    }
  }

  await Promise.all(creates);
  return {
    days: dates.length,
    doses: dates.length * validTimes.length,
    dosesPerDay: dosesPerDay(frequency),
  };
}

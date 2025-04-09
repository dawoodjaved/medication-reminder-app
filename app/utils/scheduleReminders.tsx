import { account, database, config } from '../../config/appwriteConfig';
import { ID, Permission, Role } from 'appwrite';

export const scheduleReminders = async (
  times: string[],
  medicineName: string,
  description: string,
  medicineId: string
) => {
  console.log("Scheduling reminder...", times);
  const user = await account.get();

  await Promise.all(times.map(t => {
    const [hourStr, minuteStr] = t.split(':');
    const hour = parseInt(hourStr);
    const minute = parseInt(minuteStr);
  
    const reminderDate = new Date();
    reminderDate.setHours(hour, minute, 0, 0);
  
    const reminder = {
      medicineName,
      time: t,
      description,
      taken: false,
      snoozed: false,
      date: reminderDate.toISOString().split('T')[0],
      userId: user.$id,
      medicines: medicineId,
    };
  
    return database.createDocument(
      config.db,
      config.col.reminders,
      ID.unique(),
      reminder,
      [Permission.read(Role.user(user.$id)), Permission.write(Role.user(user.$id))],
    );
  }));
}
import { Client, Databases, Account } from 'react-native-appwrite';
import { Platform } from 'react-native';

/**
 * Project id / endpoint are public (like a Supabase project ref).
 * Never put APPWRITE_API_KEY in EXPO_PUBLIC_* — it must stay server-only.
 */
const projectId =
  process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID || '6abac4d80027b9f5ed92';
const endpoint =
  process.env.EXPO_PUBLIC_APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1';

const config = {
  endpoint,
  projectId,
  db: process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID || 'medrem_db',
  col: {
    medicines: 'medicines',
    reminders: 'reminders',
    pushTokens: 'pushTokens',
    caregivers: 'caregivers',
    symptoms: 'symptoms',
    appointments: 'appointments',
    doctors: 'doctors',
  },
};

const client = new Client().setEndpoint(config.endpoint).setProject(config.projectId);

if (Platform.OS === 'ios' || Platform.OS === 'android') {
  client.setPlatform('com.medication-reminder.med-rem');
}

const database = new Databases(client);
const account = new Account(client);

export { database, config, client, account };

import { Client, Databases, Account } from 'react-native-appwrite';
import { Platform } from 'react-native';

const config = {
  endpoint: 'https://fra.cloud.appwrite.io/v1',
  projectId: '6abac4d80027b9f5ed92',
  db: 'medrem_db',
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

import { Client, Databases, Account } from "react-native-appwrite";
import { Platform } from "react-native";

const config = {
    endpoint: 'https://cloud.appwrite.io/v1',
    projectId: '67e8cee6002ab8f4812d',
    db: '67e8dda8000a4aa5c67c',
    col: {
      medicines: '67e8ddf2002e07685150',
      reminders: '67ee2174003151d7cf78',
      pushTokens: '67f09673002ed075f53f',
      caregivers: '6803f33700371034307f'
    },
};

const client = new Client()
    .setEndpoint(config.endpoint)
    .setProject(config.projectId);

switch (Platform.OS) {
    case "ios":
        // client.setPlatform(process.env.EXPO_PUBLIC_APPWRITE_BUNDLE_ID);
    case "android":
        client.setPlatform('com.medication-reminder.med-rem');
}

const database = new Databases(client);
const account = new Account(client);

export { database, config, client, account };
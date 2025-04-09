import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { account, database, config } from '../../config/appwriteConfig';
import { Query, ID, Permission, Role } from 'appwrite';

export const registerPushToken = async () => {
  if (!Device.isDevice) return;

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  
  if (finalStatus !== 'granted') {
    console.warn('Push permission not granted!');
    return;
  }

  const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;

  const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;

  const user = await account.get();

  const existing = await database.listDocuments(config.db, config.col.pushTokens, [Query.equal('userId', user.$id)]);

  if (existing.total === 0) {
    await database.createDocument(
      config.db,
      config.col.pushTokens,
      ID.unique(),
      {
        userId: user.$id,
        token,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
      },
      [Permission.read(Role.user(user.$id)),
        Permission.write(Role.user(user.$id))
            ]
    );
  } else {
    const docId = existing.documents[0].$id;

    await database.updateDocument(config.db, config.col.pushTokens, docId, {
      token,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
    }, [Permission.read(Role.user(user.$id)),
      Permission.write(Role.user(user.$id))
          ]);
  }
};

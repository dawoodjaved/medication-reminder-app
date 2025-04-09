import { useEffect } from 'react';
import * as Notifications from 'expo-notifications';

export const useNotificationHandlers = (navigation: any) => {
  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener(async response => {
      const data = response.notification.request.content.data;
      const reminderId = data?.reminderId;

      if (!reminderId) return;
      navigation.navigate('ReminderScreen', { reminderId });
    });

    return () => Notifications.removeNotificationSubscription(subscription);
  }, []);
};

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { account, database, config } from '../../config/appwriteConfig';
import { Query } from 'appwrite';

type NotificationSettingsContextType = {
  reminderNotifications: boolean;
  setReminderNotifications: (value: boolean) => void;
  soundAlerts: boolean;
  setSoundAlerts: (value: boolean) => void;
  ready: boolean;
};

const STORAGE_KEY = 'medrem_notification_settings';

const NotificationSettingsContext = createContext<NotificationSettingsContextType | undefined>(
  undefined
);

async function syncToPushToken(notificationsEnabled: boolean, soundEnabled: boolean) {
  try {
    const user = await account.get();
    const existing = await database.listDocuments(config.db, config.col.pushTokens, [
      Query.equal('userId', user.$id),
    ]);
    if (existing.total > 0) {
      await database.updateDocument(config.db, config.col.pushTokens, existing.documents[0].$id, {
        notificationsEnabled,
        soundEnabled,
      });
    }
  } catch {
    /* optional attrs / not logged in */
  }
}

export const NotificationSettingsProvider = ({ children }: { children: ReactNode }) => {
  const [reminderNotifications, setReminderNotificationsState] = useState(true);
  const [soundAlerts, setSoundAlertsState] = useState(true);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          if (typeof parsed.reminderNotifications === 'boolean') {
            setReminderNotificationsState(parsed.reminderNotifications);
          }
          if (typeof parsed.soundAlerts === 'boolean') {
            setSoundAlertsState(parsed.soundAlerts);
          }
        } catch {
          /* ignore */
        }
      }
      setReady(true);
    });
  }, []);

  const persist = (n: boolean, s: boolean) => {
    AsyncStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ reminderNotifications: n, soundAlerts: s })
    );
    syncToPushToken(n, s);
  };

  const setReminderNotifications = (value: boolean) => {
    setReminderNotificationsState(value);
    persist(value, soundAlerts);
  };

  const setSoundAlerts = (value: boolean) => {
    setSoundAlertsState(value);
    persist(reminderNotifications, value);
  };

  return (
    <NotificationSettingsContext.Provider
      value={{
        reminderNotifications,
        setReminderNotifications,
        soundAlerts,
        setSoundAlerts,
        ready,
      }}
    >
      {children}
    </NotificationSettingsContext.Provider>
  );
};

export const useNotificationSettings = () => {
  const context = useContext(NotificationSettingsContext);
  if (context === undefined) {
    throw new Error('useNotificationSettings must be used within a NotificationSettingsProvider');
  }
  return context;
};

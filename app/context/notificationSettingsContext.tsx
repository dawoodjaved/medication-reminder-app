import React, { createContext, useContext, useState, ReactNode } from 'react';

type NotificationSettingsContextType = {
  reminderNotifications: boolean;
  setReminderNotifications: (value: boolean) => void;
  soundAlerts: boolean;
  setSoundAlerts: (value: boolean) => void;
};

const NotificationSettingsContext = createContext<NotificationSettingsContextType | undefined>(undefined);

export const NotificationSettingsProvider = ({ children }: { children: ReactNode }) => {
  const [reminderNotifications, setReminderNotifications] = useState(true);
  const [soundAlerts, setSoundAlerts] = useState(true);

  return (
    <NotificationSettingsContext.Provider
      value={{ reminderNotifications, setReminderNotifications, soundAlerts, setSoundAlerts }}
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

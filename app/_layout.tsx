import { router, Stack } from 'expo-router';
import { FontSizeProvider } from './_context/fontSizeContext';
import { AuthProvider } from './_context/authContext';
import * as Notifications from 'expo-notifications';
import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import Toast, { BaseToast, ToastConfig, ToastProps } from 'react-native-toast-message';
import { NotificationSettingsProvider, useNotificationSettings } from './_context/notificationSettingsContext';
import { colors } from './_theme/colors';
import { flushOfflineQueue } from './_utils/reminderActions';
import * as Linking from 'expo-linking';

const toastConfig: ToastConfig = {
  snoozed: (props: ToastProps) => (
    <BaseToast
      {...props}
      style={{
        borderLeftColor: colors.warning,
        minHeight: 80,
        paddingVertical: 16,
      }}
      contentContainerStyle={{ paddingHorizontal: 20, justifyContent: 'center' }}
      text1Style={{ fontSize: 18, fontWeight: 'bold', color: colors.text }}
      text2Style={{ fontSize: 15, color: colors.textMuted }}
    />
  ),
};

function handleInviteUrl(url: string | null) {
  if (!url) return;
  try {
    const parsed = Linking.parse(url);
    const path = (parsed.path || '').replace(/^\//, '');
    const token = (parsed.queryParams?.token as string) || undefined;
    if (token || path === 'invite' || url.includes('invite')) {
      const t =
        token ||
        (() => {
          const m = url.match(/[?&]token=([^&]+)/);
          return m ? decodeURIComponent(m[1]) : '';
        })();
      router.push({ pathname: '/AcceptInvite', params: t ? { token: t } : {} });
    }
  } catch (e) {
    console.warn('Invite link parse failed', e);
  }
}

function NotificationBootstrap({ children }: { children: React.ReactNode }) {
  const { reminderNotifications, soundAlerts } = useNotificationSettings();
  const responseListener = useRef<Notifications.EventSubscription>();
  const isNative = Platform.OS !== 'web';

  useEffect(() => {
    const sub = Linking.addEventListener('url', ({ url: u }) => handleInviteUrl(u));
    Linking.getInitialURL().then(handleInviteUrl);
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (!isNative) return;
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: reminderNotifications,
        shouldPlaySound: reminderNotifications && soundAlerts,
        shouldSetBadge: false,
      }),
    });
  }, [reminderNotifications, soundAlerts, isNative]);

  useEffect(() => {
    flushOfflineQueue();
    if (!isNative) return;

    registerForPushNotificationsAsync();

    Notifications.setNotificationCategoryAsync('med-reminders-category', [
      {
        identifier: 'TAKEN',
        buttonTitle: 'Taken',
        options: { opensAppToForeground: true },
      },
      {
        identifier: 'SNOOZE',
        buttonTitle: 'Snooze',
        options: { opensAppToForeground: false },
      },
    ]);

    responseListener.current = Notifications.addNotificationResponseReceivedListener(
      async (response) => {
        const data = response.notification.request.content.data;
        const reminderId = data?.reminderId;
        if (!reminderId) return;

        router.push({
          pathname: '/ReminderNotification',
          params: {
            reminderId: String(reminderId),
            time: String(data?.time || ''),
            medicineName: String(data?.medicineName || ''),
            description: String(data?.description || ''),
            medicineId: data?.medicineId ? String(data.medicineId) : '',
          },
        });
      }
    );

    return () => {
      responseListener.current &&
        Notifications.removeNotificationSubscription(responseListener.current);
    };
  }, [isNative]);

  return <>{children}</>;
}

const RootLayout = () => {
  return (
    <NotificationSettingsProvider>
      <FontSizeProvider>
        <AuthProvider>
          <NotificationBootstrap>
            <Stack>
              <Stack.Screen name="index" options={{ headerShown: false }} />
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen name="Onboarding" options={{ headerShown: false }} />
              <Stack.Screen name="ManuallyAdd" options={{ headerShown: false }} />
              <Stack.Screen name="HomeScreen" options={{ headerShown: false }} />
              <Stack.Screen name="EditMedicine" options={{ headerShown: false }} />
              <Stack.Screen name="AddMedicine" options={{ headerShown: false }} />
              <Stack.Screen name="AddCaregiver" options={{ headerShown: false }} />
              <Stack.Screen name="AcceptInvite" options={{ headerShown: false }} />
              <Stack.Screen name="CaregiverFeed" options={{ headerShown: false }} />
              <Stack.Screen name="LogSymptom" options={{ headerShown: false }} />
              <Stack.Screen name="DoctorDetail" options={{ headerShown: false }} />
              <Stack.Screen name="BookAppointment" options={{ headerShown: false }} />
              <Stack.Screen name="MyAppointments" options={{ headerShown: false }} />
              <Stack.Screen name="PhoneLoginScreen" options={{ headerShown: false }} />
              <Stack.Screen name="CareGiverLoginScreen" options={{ headerShown: false }} />
              <Stack.Screen name="ScanMedicineScreen" options={{ headerShown: false }} />
              <Stack.Screen name="OtpVerificationScreen" options={{ headerShown: false }} />
              <Stack.Screen name="ReminderNotification" options={{ headerShown: false }} />
            </Stack>
            <Toast config={toastConfig} />
          </NotificationBootstrap>
        </AuthProvider>
      </FontSizeProvider>
    </NotificationSettingsProvider>
  );
};

async function registerForPushNotificationsAsync() {
  if (Platform.OS === 'web') return;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('myNotificationChannel', {
      name: 'Medication reminders',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: colors.accent,
    });
    await Notifications.setNotificationChannelAsync('med-critical', {
      name: 'Critical medication alerts',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 500, 250, 500],
      lightColor: colors.danger,
    });
    await Notifications.setNotificationChannelAsync('med-reminders', {
      name: 'Medication reminders',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: colors.accent,
    });
  }

  if (!Device.isDevice) return;

  try {
    const projectId =
      Constants?.expoConfig?.extra?.eas?.projectId ?? Constants?.easConfig?.projectId;
    if (!projectId) return;
    await Notifications.getExpoPushTokenAsync({ projectId });
  } catch (e) {
    console.warn('Push token error', e);
  }
}

export default RootLayout;

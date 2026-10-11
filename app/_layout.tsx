import { router, Stack } from 'expo-router';
import { FontSizeProvider } from './_context/fontSizeContext';
import { AuthProvider } from './_context/authContext';
import * as Notifications from 'expo-notifications';
import { useEffect, useRef } from 'react';
import { Platform, StatusBar } from 'react-native';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import Toast, { BaseToast, ToastConfig, ToastProps } from 'react-native-toast-message';
import { NotificationSettingsProvider, useNotificationSettings } from './_context/notificationSettingsContext';
import { colors } from './_theme/colors';
import { flushOfflineQueue, markTaken, markSnooze } from './_utils/reminderActions';
import * as Linking from 'expo-linking';
import * as SystemUI from 'expo-system-ui';

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
        const data = response.notification.request.content.data || {};
        const reminderId = data?.reminderId;
        if (!reminderId) return;

        const action = response.actionIdentifier;
        const medicineId = data?.medicineId ? String(data.medicineId) : undefined;
        const time = String(data?.time || '');

        // Android / iOS notification action buttons
        if (action === 'TAKEN' || action === 'taken-action') {
          try {
            const result = await markTaken(String(reminderId), medicineId);
            Toast.show({
              type: 'success',
              text1: result.queued ? 'Saved offline' : 'Marked taken',
            });
          } catch (e) {
            console.warn('Taken action failed', e);
            Toast.show({ type: 'error', text1: 'Could not mark taken' });
          }
          return;
        }

        if (action === 'SNOOZE' || action === 'snooze-action') {
          try {
            const result = await markSnooze(String(reminderId), time || '00:00');
            Toast.show({
              type: result.queued ? 'snoozed' : 'success',
              text1: result.queued ? 'Snooze saved offline' : `Snoozed to ${result.time}`,
            });
          } catch (e) {
            console.warn('Snooze action failed', e);
            Toast.show({ type: 'error', text1: 'Could not snooze' });
          }
          return;
        }

        router.push({
          pathname: '/ReminderNotification',
          params: {
            reminderId: String(reminderId),
            time,
            medicineName: String(data?.medicineName || ''),
            description: String(data?.description || ''),
            medicineId: medicineId || '',
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
  useEffect(() => {
    // Android status / nav bar paint — avoid white flash under system UI.
    if (Platform.OS === 'android') {
      StatusBar.setBarStyle('dark-content');
      StatusBar.setBackgroundColor(colors.bg);
      StatusBar.setTranslucent(false);
      void SystemUI.setBackgroundColorAsync(colors.bg);
    }
  }, []);

  return (
    <NotificationSettingsProvider>
      <FontSizeProvider>
        <AuthProvider>
          <NotificationBootstrap>
            {Platform.OS === 'android' ? (
              <StatusBar barStyle="dark-content" backgroundColor={colors.bg} translucent={false} />
            ) : null}
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
    // Keep channel IDs in sync with app.json defaultChannel + reminder payloads.
    await Notifications.setNotificationChannelAsync('med-reminders', {
      name: 'Medication reminders',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: colors.accent,
    });
    await Notifications.setNotificationChannelAsync('med-critical', {
      name: 'Critical medication alerts',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 500, 250, 500],
      lightColor: colors.danger,
    });
  }

  // Android 13+ needs runtime notification permission (also works on physical devices).
  try {
    const { status: existing } = await Notifications.getPermissionsAsync();
    if (existing !== 'granted') {
      await Notifications.requestPermissionsAsync();
    }
  } catch (e) {
    console.warn('Notification permission error', e);
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

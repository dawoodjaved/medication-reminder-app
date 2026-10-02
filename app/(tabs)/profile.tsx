import React, { useCallback } from 'react';
import {
  View,
  StyleSheet,
  Switch,
  TouchableOpacity,
  ScrollView,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { Text } from '../_components/customizableFontElements';
import { colors, radii, spacing } from '../_theme/colors';
import { SoftOrbs, FadeBlock } from '../_theme/visuals';
import { useFontSize } from '../_context/fontSizeContext';
import { useNotificationSettings } from '../_context/notificationSettingsContext';
import { useAuth } from '../_context/authContext';

function MenuOrb({
  icon,
  label,
  onPress,
  tone = 'primary',
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  tone?: 'primary' | 'accent' | 'danger';
}) {
  const bg =
    tone === 'accent' ? colors.sandGlow : tone === 'danger' ? 'rgba(196,92,92,0.12)' : colors.cobaltGlow;
  const fg =
    tone === 'accent' ? colors.accentDeep : tone === 'danger' ? colors.danger : colors.primary;
  return (
    <TouchableOpacity style={styles.menuOrb} onPress={onPress} activeOpacity={0.85}>
      <View style={[styles.menuIcon, { backgroundColor: bg }]}>
        <Ionicons name={icon} size={22} color={fg} />
      </View>
      <Text style={styles.menuLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

export default function ProfileScreen() {
  const router = useRouter();
  const { size, setSize } = useFontSize();
  const {
    reminderNotifications,
    setReminderNotifications,
    soundAlerts,
    setSoundAlerts,
  } = useNotificationSettings();
  const { scope, logout, biometricEnabled, setBiometricEnabled } = useAuth();

  const handleBiometricToggle = useCallback(
    async (value: boolean) => {
      if (Platform.OS === 'web') {
        Alert.alert('Unavailable', 'Biometrics are not available on web.');
        return;
      }
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const LocalAuthentication = require('expo-local-authentication');
      if (value) {
        const compatible = await LocalAuthentication.hasHardwareAsync();
        const enrolled = await LocalAuthentication.isEnrolledAsync();
        if (!compatible || !enrolled) {
          Alert.alert('Unavailable', 'Biometrics are not set up on this device.');
          return;
        }
        const result = await LocalAuthentication.authenticateAsync({
          promptMessage: 'Enable MedRem lock',
        });
        if (!result.success) return;
      }
      setBiometricEnabled(value);
    },
    [setBiometricEnabled]
  );

  const handleLogout = useCallback(async () => {
    await logout();
    Toast.show({ type: 'success', text1: 'Logged out' });
    router.replace('/HomeScreen');
  }, [logout, router]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <FadeBlock style={styles.hero}>
          <SoftOrbs />
          <View style={styles.avatar}>
            <Ionicons
              name={scope?.role === 'caregiver' ? 'heart' : 'person'}
              size={32}
              color={colors.white}
            />
          </View>
          <Text style={styles.role}>
            {!scope ? 'Guest' : scope.role === 'caregiver' ? 'Caregiver' : 'Patient'}
          </Text>
        </FadeBlock>

        {!scope && (
          <TouchableOpacity style={styles.signIn} onPress={() => router.replace('/HomeScreen')}>
            <Text style={styles.signInText}>Sign in</Text>
          </TouchableOpacity>
        )}

        <View style={styles.grid}>
          {scope?.role === 'patient' && (
            <MenuOrb icon="person-add-outline" label="Invite" onPress={() => router.push('/AddCaregiver')} />
          )}
          {scope?.role === 'caregiver' && (
            <MenuOrb icon="pulse" label="Feed" onPress={() => router.push('/CaregiverFeed')} tone="accent" />
          )}
          <MenuOrb icon="heart-outline" label="Symptom" onPress={() => router.push('/LogSymptom')} tone="accent" />
          <MenuOrb icon="link-outline" label="Code" onPress={() => router.push('/AcceptInvite')} />
          <MenuOrb icon="calendar-outline" label="Appts" onPress={() => router.push('/MyAppointments')} />
        </View>

        <View style={styles.section}>
          <View style={styles.row}>
            <Ionicons name="notifications-outline" size={20} color={colors.primary} />
            <Text style={styles.label}>Reminders</Text>
            <Switch
              value={reminderNotifications}
              onValueChange={setReminderNotifications}
              trackColor={{ true: colors.accentSoft, false: colors.border }}
              thumbColor={reminderNotifications ? colors.accent : '#f4f3f4'}
            />
          </View>
          <View style={styles.row}>
            <Ionicons name="volume-high-outline" size={20} color={colors.primary} />
            <Text style={styles.label}>Sound</Text>
            <Switch
              value={soundAlerts}
              onValueChange={setSoundAlerts}
              trackColor={{ true: colors.accentSoft, false: colors.border }}
              thumbColor={soundAlerts ? colors.accent : '#f4f3f4'}
            />
          </View>
          <View style={styles.row}>
            <Ionicons name="finger-print" size={20} color={colors.primary} />
            <Text style={styles.label}>Lock</Text>
            <Switch
              value={biometricEnabled}
              onValueChange={handleBiometricToggle}
              trackColor={{ true: colors.accentSoft, false: colors.border }}
              thumbColor={biometricEnabled ? colors.accent : '#f4f3f4'}
            />
          </View>
        </View>

        <View style={styles.sizeRow}>
          {(['small', 'medium', 'large'] as const).map((s) => (
            <TouchableOpacity
              key={s}
              style={[styles.sizeBtn, size === s && styles.sizeBtnActive]}
              onPress={() => setSize(s)}
            >
              <Text style={[styles.sizeLetter, size === s && styles.sizeLetterActive]}>
                {s === 'small' ? 'A' : s === 'medium' ? 'A' : 'A'}
              </Text>
              <View
                style={{
                  width: s === 'small' ? 10 : s === 'medium' ? 14 : 18,
                  height: 3,
                  backgroundColor: size === s ? colors.white : colors.border,
                  borderRadius: 2,
                  marginTop: 4,
                }}
              />
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={styles.logout} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color={colors.white} />
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, paddingBottom: 48 },
  hero: {
    backgroundColor: colors.primary,
    borderRadius: radii.lg,
    padding: spacing.lg,
    alignItems: 'center',
    marginBottom: spacing.md,
    overflow: 'hidden',
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.accentSoft,
    marginBottom: 10,
  },
  role: { color: colors.white, fontWeight: '800', fontSize: 18 },
  signIn: {
    backgroundColor: colors.accent,
    padding: 14,
    borderRadius: radii.md,
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  signInText: { color: colors.white, fontWeight: '700' },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: spacing.md,
  },
  menuOrb: {
    width: '47%',
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  menuIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  menuLabel: { fontWeight: '700', color: colors.text, fontSize: 13 },
  section: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 10,
  },
  label: { color: colors.text, flex: 1, fontWeight: '600' },
  sizeRow: { flexDirection: 'row', gap: 8, marginBottom: spacing.md },
  sizeBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  sizeBtnActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  sizeLetter: { fontWeight: '800', color: colors.text, fontSize: 16 },
  sizeLetterActive: { color: colors.white },
  logout: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
});

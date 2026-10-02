import React from 'react';
import { View, Text, StyleSheet, Image, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { router, useLocalSearchParams } from 'expo-router';
import { colors, radii, spacing } from './_theme/colors';
import { screen } from './_theme/styles';
import { markTaken, markSnooze } from './_utils/reminderActions';

const ReminderNotification = () => {
  const { time, medicineName, description, reminderId, medicineId } = useLocalSearchParams<{
    time: string;
    medicineName: string;
    description?: string;
    reminderId?: string;
    medicineId?: string;
  }>();

  const handleTaken = async () => {
    if (reminderId) {
      try {
        const result = await markTaken(reminderId, medicineId);
        Toast.show({
          type: 'success',
          text1: result.queued ? 'Saved offline' : 'Medication taken',
          text2: `You marked ${medicineName} as taken.`,
        });
      } catch {
        Toast.show({ type: 'error', text1: 'Update failed' });
      }
    }
    router.replace('/(tabs)');
  };

  const handleSnooze = async () => {
    if (reminderId && time) {
      try {
        const result = await markSnooze(reminderId, time);
        Toast.show({
          type: 'info',
          text1: result.queued ? 'Snoozed offline' : 'Snoozed',
          text2: `Reminder for ${medicineName} in 5 minutes.`,
        });
      } catch {
        Toast.show({ type: 'error', text1: 'Snooze failed' });
      }
    }
    router.replace('/(tabs)');
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={screen.sheetGrow}>
        <Text style={screen.brand}>MedRem</Text>
        <View style={styles.card}>
          <Image source={require('../assets/images/Alarm.png')} style={styles.icon} />
          <Text style={styles.title}>{medicineName || 'Medication reminder'}</Text>
          <Text style={styles.time}>
            Scheduled for: <Text style={styles.timeHighlight}>{time}</Text>
          </Text>
          {description ? <Text style={styles.description}>{description}</Text> : null}

          <View style={styles.buttons}>
            <Pressable onPress={handleSnooze} style={[styles.button, styles.snoozeBtn]}>
              <Text style={styles.buttonText}>Snooze</Text>
            </Pressable>
            <Pressable onPress={handleTaken} style={[styles.button, styles.takenBtn]}>
              <Text style={styles.buttonText}>Taken</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.primary },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.xl,
    alignItems: 'center',
    width: '100%',
    borderWidth: 1,
    borderColor: colors.border,
  },
  icon: { width: 90, height: 90, marginBottom: spacing.md },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 8,
    textAlign: 'center',
  },
  time: { fontSize: 16, color: colors.textMuted, marginBottom: 10 },
  timeHighlight: { color: colors.accent, fontWeight: '700' },
  description: {
    fontSize: 16,
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  buttons: { flexDirection: 'row', width: '100%' },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: radii.md,
    marginHorizontal: 8,
    alignItems: 'center',
  },
  snoozeBtn: { backgroundColor: colors.warning },
  takenBtn: { backgroundColor: colors.accent },
  buttonText: { fontSize: 17, color: colors.white, fontWeight: '700' },
});

export default ReminderNotification;

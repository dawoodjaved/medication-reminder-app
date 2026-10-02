import React, { useCallback, useState } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Toast from 'react-native-toast-message';
import { ID } from 'appwrite';
import { Ionicons } from '@expo/vector-icons';
import { Text } from './_components/customizableFontElements';
import { database, config } from '../config/appwriteConfig';
import { colors, radii, spacing } from './_theme/colors';
import { screen } from './_theme/styles';
import { SoftOrbs, HeartPulseGlyph, FadeBlock } from './_theme/visuals';
import { useAuth } from './_context/authContext';
import { todayISO } from './_utils/dates';
import { sharedPermissions } from './_utils/patientScope';

const SEVERITIES = [
  { id: 'mild' as const, icon: 'happy-outline' as const, color: colors.success },
  { id: 'moderate' as const, icon: 'remove-outline' as const, color: colors.warning },
  { id: 'severe' as const, icon: 'sad-outline' as const, color: colors.danger },
];

export default function LogSymptom() {
  const router = useRouter();
  const { scope } = useAuth();
  const params = useLocalSearchParams<{
    reminderId?: string;
    medicineName?: string;
  }>();
  const [note, setNote] = useState('');
  const [severity, setSeverity] = useState<(typeof SEVERITIES)[number]['id']>('mild');
  const [medicineName, setMedicineName] = useState(String(params.medicineName || ''));
  const [saving, setSaving] = useState(false);

  const save = useCallback(async () => {
    if (!scope?.patientId) {
      Toast.show({ type: 'error', text1: 'Sign in required' });
      return;
    }
    if (!note.trim()) {
      Toast.show({ type: 'error', text1: 'Add a note' });
      return;
    }
    setSaving(true);
    try {
      const data: Record<string, string> = {
        patientId: scope.patientId,
        date: todayISO(),
        note: note.trim(),
        severity,
      };
      if (medicineName.trim()) data.medicineName = medicineName.trim();
      if (params.reminderId) data.linkedReminderId = String(params.reminderId);

      await database.createDocument(
        config.db,
        config.col.symptoms,
        ID.unique(),
        data,
        sharedPermissions(scope.patientId)
      );
      Toast.show({ type: 'success', text1: 'Logged' });
      router.back();
    } catch (e) {
      console.error(e);
      Toast.show({ type: 'error', text1: 'Could not save' });
    } finally {
      setSaving(false);
    }
  }, [scope, note, severity, medicineName, params.reminderId, router]);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.heroTop}>
        <SoftOrbs />
        <TouchableOpacity style={styles.back} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={colors.white} />
        </TouchableOpacity>
        <FadeBlock style={styles.heartWrap}>
          <HeartPulseGlyph size={56} />
        </FadeBlock>
      </View>

      <ScrollView contentContainerStyle={screen.sheetGrow}>
        <Text style={screen.brand}>FEELING</Text>
        <Text style={screen.title}>Symptom</Text>

        <View style={styles.sevRow}>
          {SEVERITIES.map((s) => (
            <TouchableOpacity
              key={s.id}
              style={[styles.sevBtn, severity === s.id && { backgroundColor: s.color }]}
              onPress={() => setSeverity(s.id)}
            >
              <Ionicons
                name={s.icon}
                size={28}
                color={severity === s.id ? colors.white : s.color}
              />
            </TouchableOpacity>
          ))}
        </View>

        <TextInput
          style={screen.input}
          placeholder="Medicine (optional)"
          placeholderTextColor={colors.textMuted}
          value={medicineName}
          onChangeText={setMedicineName}
        />

        <TextInput
          style={[screen.input, { minHeight: 110, textAlignVertical: 'top' }]}
          placeholder="What happened?"
          placeholderTextColor={colors.textMuted}
          multiline
          value={note}
          onChangeText={setNote}
        />

        <TouchableOpacity
          style={[screen.primaryBtn, saving && { opacity: 0.7 }]}
          onPress={save}
          disabled={saving}
        >
          <Text style={screen.primaryBtnText}>{saving ? '…' : 'Save'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.primary },
  heroTop: { height: 140, overflow: 'hidden', justifyContent: 'flex-end' },
  back: { position: 'absolute', top: spacing.sm, left: spacing.lg, zIndex: 2 },
  heartWrap: { alignItems: 'center', marginBottom: spacing.md },
  sevRow: { flexDirection: 'row', gap: 10, marginBottom: spacing.md },
  sevBtn: {
    flex: 1,
    height: 64,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

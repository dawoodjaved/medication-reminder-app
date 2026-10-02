import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Picker } from '@react-native-picker/picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Toast from 'react-native-toast-message';
import { Ionicons } from '@expo/vector-icons';
import { Text } from './_components/customizableFontElements';
import { colors, radii, spacing } from './_theme/colors';
import { screen } from './_theme/styles';
import { database, config } from '../config/appwriteConfig';

export default function EditMedicine() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    medicineName: '',
    medicineType: 'Pill',
    quantity: '',
    quantityRemaining: '',
    refillThreshold: '5',
    frequency: '',
    notes: '',
    isCritical: false,
    instructions: '',
  });

  useEffect(() => {
    (async () => {
      if (!id) {
        setLoading(false);
        Toast.show({ type: 'error', text1: 'Missing medicine id' });
        return;
      }
      try {
        const doc = await database.getDocument(config.db, config.col.medicines, id);
        setForm({
          medicineName: doc.medicineName || '',
          medicineType: doc.medicineType || 'Pill',
          quantity: String(doc.quantity ?? ''),
          quantityRemaining: String(doc.quantityRemaining ?? doc.quantity ?? ''),
          refillThreshold: String(doc.refillThreshold ?? 5),
          frequency: doc.frequency || '',
          notes: doc.notes || '',
          isCritical: !!doc.isCritical,
          instructions: doc.instructions || '',
        });
      } catch {
        Toast.show({ type: 'error', text1: 'Could not load medicine' });
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const save = useCallback(async () => {
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        medicineName: form.medicineName,
        medicineType: form.medicineType,
        quantity: form.quantity,
        notes: form.notes,
      };
      try {
        await database.updateDocument(config.db, config.col.medicines, id!, {
          ...payload,
          quantityRemaining: parseInt(form.quantityRemaining, 10) || 0,
          refillThreshold: parseInt(form.refillThreshold, 10) || 5,
          isCritical: form.isCritical,
          instructions: form.instructions,
        });
      } catch {
        await database.updateDocument(config.db, config.col.medicines, id!, payload);
      }
      Toast.show({ type: 'success', text1: 'Medicine updated' });
      router.back();
    } catch {
      Toast.show({ type: 'error', text1: 'Save failed' });
    } finally {
      setSaving(false);
    }
  }, [form, id, router]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <SafeAreaView style={styles.safe}>
        <TouchableOpacity style={styles.back} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={colors.white} />
        </TouchableOpacity>

        <ScrollView style={styles.sheet} contentContainerStyle={styles.content}>
          <Text style={screen.brand}>MedRem</Text>
          <Text style={screen.title}>Edit medicine</Text>
          <Text style={screen.subtitle}>Update stock and details</Text>

          <Text style={screen.label}>Name</Text>
          <TextInput
            style={screen.input}
            value={form.medicineName}
            onChangeText={(t) => setForm((f) => ({ ...f, medicineName: t }))}
          />

          <Text style={screen.label}>Type</Text>
          <View style={styles.pickerWrap}>
            <Picker
              selectedValue={form.medicineType}
              onValueChange={(v) => setForm((f) => ({ ...f, medicineType: v }))}
            >
              <Picker.Item label="Pill" value="Pill" />
              <Picker.Item label="Syrup" value="Syrup" />
              <Picker.Item label="Injection" value="Injection" />
            </Picker>
          </View>

          <Text style={screen.label}>Quantity remaining</Text>
          <TextInput
            style={screen.input}
            keyboardType="numeric"
            value={form.quantityRemaining}
            onChangeText={(t) => setForm((f) => ({ ...f, quantityRemaining: t }))}
          />

          <Text style={screen.label}>Refill threshold</Text>
          <TextInput
            style={screen.input}
            keyboardType="numeric"
            value={form.refillThreshold}
            onChangeText={(t) => setForm((f) => ({ ...f, refillThreshold: t }))}
          />

          <View style={styles.row}>
            <View style={{ flex: 1, paddingRight: 12 }}>
              <Text style={styles.criticalLabel}>Critical dose</Text>
              <Text style={styles.criticalHint}>Escalate to caregivers faster if missed</Text>
            </View>
            <Switch
              value={form.isCritical}
              onValueChange={(v) => setForm((f) => ({ ...f, isCritical: v }))}
              trackColor={{ true: colors.accentSoft, false: colors.border }}
              thumbColor={form.isCritical ? colors.danger : '#f4f3f4'}
            />
          </View>

          <Text style={screen.label}>Instructions (optional)</Text>
          <TextInput
            style={screen.input}
            placeholder="With food / empty stomach / don’t crush"
            placeholderTextColor={colors.textMuted}
            value={form.instructions}
            onChangeText={(t) => setForm((f) => ({ ...f, instructions: t }))}
          />

          <Text style={screen.label}>Notes</Text>
          <TextInput
            style={[screen.input, { height: 90, textAlignVertical: 'top' }]}
            multiline
            value={form.notes}
            onChangeText={(t) => setForm((f) => ({ ...f, notes: t }))}
          />

          <TouchableOpacity style={screen.primaryBtn} onPress={save} disabled={saving}>
            <Text style={screen.primaryBtnText}>{saving ? 'Saving…' : 'Save changes'}</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bg },
  safe: { flex: 1, backgroundColor: colors.primary },
  back: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
  sheet: {
    flex: 1,
    backgroundColor: colors.bg,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
  },
  content: { padding: spacing.lg, paddingBottom: 40 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radii.sm,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  criticalLabel: { fontWeight: '700', color: colors.text },
  criticalHint: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  pickerWrap: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.sm,
    backgroundColor: colors.surface,
    marginBottom: spacing.md,
  },
});

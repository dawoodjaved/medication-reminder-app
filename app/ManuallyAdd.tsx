import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  TouchableWithoutFeedback,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Picker } from '@react-native-picker/picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import Toast from 'react-native-toast-message';
import { Ionicons } from '@expo/vector-icons';
import { scheduleReminders } from './_utils/scheduleReminders';
import { ID } from 'appwrite';
import { config, database, account } from '../config/appwriteConfig';
import { colors, radii, spacing } from './_theme/colors';
import { screen } from './_theme/styles';
import { useAuth } from './_context/authContext';
import { sharedPermissions } from './_utils/patientScope';
import { dosesPerDay } from './_utils/dates';

type MedicationData = {
  medicineName: string;
  medicineType: string;
  quantity: string;
  frequency: string;
  time1: string;
  time2?: string;
  time3?: string;
  notes?: string;
  repeatSchedule: boolean;
  totalRemindersLeft?: string;
  refillThreshold?: string;
  isCritical?: boolean;
  instructions?: string;
};

type Errors = Partial<Record<keyof MedicationData, string>>;

const formatTime = (date: Date) =>
  date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });

const ManuallyAdd: React.FC = () => {
  const params = useLocalSearchParams();
  const router = useRouter();
  const { scope, refreshScope } = useAuth();

  const [form, setForm] = useState<MedicationData>({
    medicineName: (params.medicineName as string) || '',
    medicineType: (params.medicineType as string) || '',
    quantity: (params.quantity as string) || '',
    frequency: (params.frequency as string) || '',
    time1: '',
    time2: '',
    time3: '',
    notes: '',
    repeatSchedule: false,
    totalRemindersLeft: '',
    refillThreshold: '5',
    isCritical: false,
    instructions: '',
  });
  const [errors, setErrors] = useState<Errors>({});
  const [isTime1Visible, setTime1Visible] = useState(false);
  const [isTime2Visible, setTime2Visible] = useState(false);
  const [isTime3Visible, setTime3Visible] = useState(false);

  const handleChange = useCallback((field: keyof MedicationData, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  }, []);

  const validateForm = useCallback((): boolean => {
    const newErrors: Errors = {};
    if (!form.medicineName) newErrors.medicineName = 'Medicine name is required';
    if (!form.medicineType) newErrors.medicineType = 'Medicine type is required';
    if (!form.quantity) newErrors.quantity = 'Quantity is required';
    if (!form.frequency) newErrors.frequency = 'Frequency is required';
    if (!form.time1) newErrors.time1 = 'At least one time is required';

    if ((form.frequency === 'Twice a day' || form.frequency === 'Three times a day') && !form.time2)
      newErrors.time2 = 'Time 2 is required';
    if (form.frequency === 'Three times a day' && !form.time3)
      newErrors.time3 = 'Time 3 is required';

    if (form.repeatSchedule) {
      if (!form.totalRemindersLeft) {
        newErrors.totalRemindersLeft = 'Number of days is required';
      } else if (!/^\d+$/.test(form.totalRemindersLeft) || parseInt(form.totalRemindersLeft, 10) <= 0) {
        newErrors.totalRemindersLeft = 'Enter a valid positive number of days';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [form]);

  const handleSave = useCallback(async () => {
    try {
      const user = await account.get();
      let patientId = scope?.patientId || user.$id;
      if (!scope) {
        const s = await refreshScope();
        patientId = s?.patientId || user.$id;
      }

      if (!validateForm()) {
        Toast.show({
          type: 'error',
          text1: 'Validation error',
          text2: 'Please fix the errors before saving.',
        });
        return;
      }

      const multiplier = dosesPerDay(form.frequency);
      let numberOfDays = 1;
      if (form.repeatSchedule && form.totalRemindersLeft) {
        numberOfDays = parseInt(form.totalRemindersLeft, 10);
      } else if (form.frequency === 'Everyday') {
        numberOfDays = 30;
      } else if (form.frequency === 'Weekly') {
        numberOfDays = 56; // informational; scheduleReminders handles weekly
      }

      const totalRemindersLeft = multiplier * (form.repeatSchedule ? numberOfDays : 1);
      const qty = parseInt(form.quantity, 10) || 0;

      const documentData: Record<string, unknown> = {
        medicineName: form.medicineName,
        medicineType: form.medicineType,
        quantity: form.quantity,
        frequency: form.frequency,
        time1: form.time1,
        time2: form.time2 || '',
        time3: form.time3 || '',
        notes: form.notes || '',
        repeatSchedule: form.repeatSchedule,
        totalRemindersLeft,
        patientId,
        quantityRemaining: qty,
        refillThreshold: parseInt(form.refillThreshold || '5', 10),
        isCritical: !!form.isCritical,
        instructions: form.instructions || '',
      };

      let medicineDoc;
      try {
        medicineDoc = await database.createDocument(
          config.db,
          config.col.medicines,
          ID.unique(),
          documentData,
          sharedPermissions(patientId)
        );
      } catch {
        // Fallback without optional attrs if Console schema not updated yet
        const {
          quantityRemaining,
          refillThreshold,
          patientId: _p,
          isCritical: _c,
          instructions: _i,
          ...basic
        } = documentData;
        medicineDoc = await database.createDocument(
          config.db,
          config.col.medicines,
          ID.unique(),
          basic,
          sharedPermissions(patientId)
        );
      }

      const times = [form.time1];
      if (form.frequency === 'Twice a day' || form.frequency === 'Three times a day') {
        times.push(form.time2 || '');
      }
      if (form.frequency === 'Three times a day') {
        times.push(form.time3 || '');
      }

      const result = await scheduleReminders({
        times: times.filter(Boolean),
        medicineName: form.medicineName,
        description: form.notes || '',
        medicineId: medicineDoc.$id,
        patientId,
        frequency: form.frequency,
        repeatSchedule: form.repeatSchedule,
        numberOfDays: form.repeatSchedule ? numberOfDays : undefined,
      });

      Toast.show({
        type: 'success',
        text1: 'Medication saved',
        text2: `Scheduled ${result.doses} reminder${result.doses === 1 ? '' : 's'}.`,
      });
      router.replace('/(tabs)/meds');
    } catch (err) {
      console.error(err);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to save medication.',
      });
    }
  }, [form, scope, refreshScope, validateForm, router]);

  const frequencyOptions = form.repeatSchedule
    ? ['Once a day', 'Twice a day', 'Three times a day']
    : ['Once a day', 'Twice a day', 'Three times a day', 'Everyday', 'Weekly'];

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <SafeAreaView style={styles.safe}>
          <TouchableOpacity style={styles.back} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={22} color={colors.white} />
          </TouchableOpacity>

          <ScrollView
            style={styles.sheet}
            contentContainerStyle={styles.scrollContainer}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={screen.brand}>MedRem</Text>
            <Text style={styles.title}>Add medication</Text>
            <Text style={screen.subtitle}>Schedule doses across your course</Text>

          <Text style={styles.label}>Medicine name</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter medicine name"
            placeholderTextColor={colors.textMuted}
            value={form.medicineName}
            onChangeText={(text) => handleChange('medicineName', text)}
          />
          {errors.medicineName && <Text style={styles.error}>{errors.medicineName}</Text>}

          <Text style={styles.label}>Medicine type</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={form.medicineType}
              onValueChange={(value) => handleChange('medicineType', value)}
              style={styles.picker}
            >
              <Picker.Item label="Select type" value="" />
              <Picker.Item label="Pill" value="Pill" />
              <Picker.Item label="Syrup" value="Syrup" />
              <Picker.Item label="Injection" value="Injection" />
            </Picker>
          </View>
          {errors.medicineType && <Text style={styles.error}>{errors.medicineType}</Text>}

          <Text style={styles.label}>Quantity (stock)</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter quantity"
            placeholderTextColor={colors.textMuted}
            keyboardType="numeric"
            value={form.quantity}
            onChangeText={(text) => handleChange('quantity', text)}
          />
          {errors.quantity && <Text style={styles.error}>{errors.quantity}</Text>}

          <Text style={styles.label}>Refill alert when stock ≤</Text>
          <TextInput
            style={styles.input}
            keyboardType="numeric"
            value={form.refillThreshold}
            onChangeText={(text) => handleChange('refillThreshold', text)}
          />

          <View style={styles.criticalRow}>
            <View style={{ flex: 1, paddingRight: 12 }}>
              <Text style={styles.label}>Critical dose</Text>
              <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: -8, marginBottom: 8 }}>
                Faster caregiver escalation if missed
              </Text>
            </View>
            <Switch
              value={!!form.isCritical}
              onValueChange={(v) => handleChange('isCritical', v)}
              trackColor={{ true: colors.accentSoft, false: colors.border }}
              thumbColor={form.isCritical ? colors.danger : '#f4f3f4'}
            />
          </View>

          <Text style={styles.label}>Instructions (optional)</Text>
          <TextInput
            style={styles.input}
            placeholder="With food / empty stomach"
            placeholderTextColor={colors.textMuted}
            value={form.instructions}
            onChangeText={(text) => handleChange('instructions', text)}
          />

          <Text style={styles.label}>Repeat schedule?</Text>
          <View style={styles.buttonContainer}>
            {['Yes', 'No'].map((option) => (
              <TouchableOpacity
                key={option}
                style={[
                  styles.frequencyButton,
                  ((option === 'Yes' && form.repeatSchedule) ||
                    (option === 'No' && !form.repeatSchedule)) &&
                    styles.selectedButton,
                ]}
                onPress={() => handleChange('repeatSchedule', option === 'Yes')}
              >
                <Text style={styles.buttonText}>{option}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {form.repeatSchedule && (
            <>
              <Text style={styles.label}>Number of days</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. 7"
                placeholderTextColor={colors.textMuted}
                keyboardType="numeric"
                value={form.totalRemindersLeft}
                onChangeText={(text) => handleChange('totalRemindersLeft', text)}
              />
              {errors.totalRemindersLeft && (
                <Text style={styles.error}>{errors.totalRemindersLeft}</Text>
              )}
            </>
          )}

          <Text style={styles.label}>Frequency</Text>
          <View style={styles.buttonContainer}>
            {frequencyOptions.map((freq) => (
              <TouchableOpacity
                key={freq}
                style={[styles.frequencyButton, form.frequency === freq && styles.selectedButton]}
                onPress={() => handleChange('frequency', freq)}
              >
                <Text style={styles.buttonText}>{freq}</Text>
              </TouchableOpacity>
            ))}
          </View>
          {errors.frequency && <Text style={styles.error}>{errors.frequency}</Text>}

          {form.frequency && (
            <>
              <Text style={styles.label}>Time 1</Text>
              <TouchableOpacity style={styles.input} onPress={() => setTime1Visible(true)}>
                <Text>{form.time1 || 'Select time'}</Text>
              </TouchableOpacity>
              <DateTimePickerModal
                isVisible={isTime1Visible}
                mode="time"
                onConfirm={(date) => {
                  handleChange('time1', formatTime(date));
                  setTime1Visible(false);
                }}
                onCancel={() => setTime1Visible(false)}
              />
              {errors.time1 && <Text style={styles.error}>{errors.time1}</Text>}
            </>
          )}

          {(form.frequency === 'Twice a day' || form.frequency === 'Three times a day') && (
            <>
              <Text style={styles.label}>Time 2</Text>
              <TouchableOpacity style={styles.input} onPress={() => setTime2Visible(true)}>
                <Text>{form.time2 || 'Select time'}</Text>
              </TouchableOpacity>
              <DateTimePickerModal
                isVisible={isTime2Visible}
                mode="time"
                onConfirm={(date) => {
                  handleChange('time2', formatTime(date));
                  setTime2Visible(false);
                }}
                onCancel={() => setTime2Visible(false)}
              />
              {errors.time2 && <Text style={styles.error}>{errors.time2}</Text>}
            </>
          )}

          {form.frequency === 'Three times a day' && (
            <>
              <Text style={styles.label}>Time 3</Text>
              <TouchableOpacity style={styles.input} onPress={() => setTime3Visible(true)}>
                <Text>{form.time3 || 'Select time'}</Text>
              </TouchableOpacity>
              <DateTimePickerModal
                isVisible={isTime3Visible}
                mode="time"
                onConfirm={(date) => {
                  handleChange('time3', formatTime(date));
                  setTime3Visible(false);
                }}
                onCancel={() => setTime3Visible(false)}
              />
              {errors.time3 && <Text style={styles.error}>{errors.time3}</Text>}
            </>
          )}

          <Text style={styles.label}>Notes (optional)</Text>
          <TextInput
            style={styles.input}
            placeholder="Additional instructions"
            placeholderTextColor={colors.textMuted}
            value={form.notes}
            onChangeText={(text) => handleChange('notes', text)}
            multiline
          />
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
              <Text style={styles.saveButtonText}>Save</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.primary },
  back: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
  sheet: {
    flex: 1,
    backgroundColor: colors.bg,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
  },
  scrollContainer: {
    flexGrow: 1,
    padding: spacing.lg,
    paddingBottom: 24,
  },
  criticalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  footer: {
    backgroundColor: colors.bg,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 4,
    color: colors.primary,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 6,
    color: colors.text,
  },
  input: {
    borderWidth: 1,
    borderRadius: radii.sm,
    padding: 12,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    marginBottom: spacing.sm,
    color: colors.text,
  },
  pickerContainer: {
    borderWidth: 1,
    borderRadius: radii.sm,
    borderColor: colors.border,
    marginBottom: spacing.sm,
    backgroundColor: colors.surface,
  },
  picker: { height: 50, width: '100%' },
  buttonContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: spacing.sm,
  },
  frequencyButton: {
    padding: 10,
    margin: 4,
    borderWidth: 1,
    borderRadius: radii.sm,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  selectedButton: {
    backgroundColor: colors.accentSoft,
    borderColor: colors.accent,
  },
  buttonText: { fontSize: 15, textAlign: 'center', color: colors.text },
  saveButton: {
    backgroundColor: colors.accent,
    padding: 16,
    borderRadius: radii.md,
    alignItems: 'center',
  },
  saveButtonText: { fontSize: 17, fontWeight: '700', color: colors.white },
  error: { color: colors.danger, fontSize: 13, marginBottom: 8 },
});

export default ManuallyAdd;

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
  TouchableWithoutFeedback
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useLocalSearchParams, useNavigation } from 'expo-router';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Toast from 'react-native-toast-message';
const { config, database, account } = require("../config/appwriteConfig");
import { scheduleReminders } from './utils/scheduleReminders';
import { ID, Permission, Role } from 'appwrite';

type MedicationData = {
  medicineName: string;
  medicineType: string;
  quantity: string;
  frequency: string;
  time1: string;
  time2?: string;
  time3?: string;
  notes?: string;
};

type Errors = Partial<Record<keyof MedicationData, string>>;

const formatTime = (date: Date) =>
  date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }); // e.g., "08:00" in 24hr

const ManuallyAdd: React.FC = () => {
  const params = useLocalSearchParams();
  const navigation = useNavigation<NativeStackNavigationProp<any>>();

  const [form, setForm] = useState<MedicationData>({
    medicineName: params.medicineName || '',
    medicineType: params.medicineType || '',
    quantity: params.quantity || '',
    frequency: params.frequency || '',
    time1: '',
    time2: '',
    time3: '',
    notes: '',
  });
  const [errors, setErrors] = useState<Errors>({});
  const [isTime1Visible, setTime1Visible] = useState(false);
  const [isTime2Visible, setTime2Visible] = useState(false);
  const [isTime3Visible, setTime3Visible] = useState(false);

  // useCallback to avoid unnecessary re-renders
  const handleChange = useCallback((field: keyof MedicationData, value: string) => {
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

    if (form.frequency === 'Twice a day' || form.frequency === 'Three times a day') {
      if (!form.time2) newErrors.time2 = 'Time 2 is required';
    }
    if (form.frequency === 'Three times a day') {
      if (!form.time3) newErrors.time3 = 'Time 3 is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [form]);

  const handleSave = useCallback(async () => {
    try {
      // Get current user; if fails, show error toast
      const user = await account.get();
      if (!validateForm()) {
        Toast.show({
          type: 'error',
          text1: '⚠️ Validation Error',
          text2: 'Please fix the errors before saving.',
        });
        return;
      }

      // Create the medicine document
      const medicineDoc = await database.createDocument(
        config.db,
        config.col.medicines,
        ID.unique(),
        form,
        [
          Permission.read(Role.user(user.$id)),
          Permission.write(Role.user(user.$id)),
        ]
      );

      // Build times array based on frequency (filtering out any empty strings)
      const times = [form.time1];
      if (form.frequency === 'Twice a day' || form.frequency === 'Three times a day') {
        times.push(form.time2 || '');
      }
      if (form.frequency === 'Three times a day') {
        times.push(form.time3 || '');
      }
      const validTimes = times.filter(Boolean);

      // Schedule reminders
      await scheduleReminders(validTimes, form.medicineName, form.notes || '', medicineDoc.$id);

      Toast.show({
        type: 'success',
        text1: '✅ Success',
        text2: 'Medication saved successfully!',
      });
      navigation.goBack();
    } catch (err) {
      console.error(err);
      Toast.show({
        type: 'error',
        text1: '❌ Error',
        text2: 'Failed to save medication.',
      });
    }
  }, [form, navigation, validateForm]);

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>Add Medication</Text>

          {/* Medicine Name */}
          <Text style={styles.label}>Medicine Name</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter medicine name"
            value={form.medicineName}
            onChangeText={(text) => handleChange('medicineName', text)}
          />
          {errors.medicineName && <Text style={styles.error}>{errors.medicineName}</Text>}

          {/* Medicine Type */}
          <Text style={styles.label}>Medicine Type</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={form.medicineType}
              onValueChange={(value) => handleChange('medicineType', value)}
              style={styles.picker}
            >
              <Picker.Item label="Select Type" value="" />
              <Picker.Item label="Pill" value="Pill" />
              <Picker.Item label="Syrup" value="Syrup" />
              <Picker.Item label="Injection" value="Injection" />
            </Picker>
          </View>
          {errors.medicineType && <Text style={styles.error}>{errors.medicineType}</Text>}

          {/* Quantity */}
          <Text style={styles.label}>Quantity</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter quantity"
            keyboardType="numeric"
            value={form.quantity}
            onChangeText={(text) => handleChange('quantity', text)}
          />
          {errors.quantity && <Text style={styles.error}>{errors.quantity}</Text>}

          {/* Frequency */}
          <Text style={styles.label}>Frequency</Text>
          <View style={styles.buttonContainer}>
            {['Once a day', 'Twice a day', 'Three times a day', 'Everyday', 'Weekly'].map((freq) => (
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

          {/* Time Pickers */}
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
                  const formatted = formatTime(date);
                  handleChange('time1', formatted);
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
                  const formatted = formatTime(date);
                  handleChange('time2', formatted);
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
                  const formatted = formatTime(date);
                  handleChange('time3', formatted);
                  setTime3Visible(false);
                }}
                onCancel={() => setTime3Visible(false)}
              />
              {errors.time3 && <Text style={styles.error}>{errors.time3}</Text>}
            </>
          )}

          {/* Notes */}
          <Text style={styles.label}>Notes (Optional)</Text>
          <TextInput
            style={styles.input}
            placeholder="Additional instructions or notes"
            value={form.notes}
            onChangeText={(text) => handleChange('notes', text)}
            multiline
          />
        </ScrollView>
      </TouchableWithoutFeedback>

      <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
        <Text style={styles.buttonText}>Save</Text>
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  scrollContainer: {
    flexGrow: 1,
    padding: 20,
    backgroundColor: '#EDEDED',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 5,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    borderColor: '#ff66b2',
    backgroundColor: 'white',
    marginBottom: 10,
  },
  pickerContainer: {
    borderWidth: 1,
    borderRadius: 8,
    borderColor: '#ff66b2',
    marginBottom: 10,
    backgroundColor: 'white',
  },
  picker: {
    height: 50,
    width: '100%',
  },
  buttonContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 10,
  },
  frequencyButton: {
    padding: 10,
    margin: 5,
    borderWidth: 1,
    borderRadius: 8,
    borderColor: '#ff66b2',
  },
  selectedButton: {
    backgroundColor: '#f8c6d2',
  },
  buttonText: {
    fontSize: 17,
    textAlign: 'center',
  },
  saveButton: {
    backgroundColor: '#f8c6d2',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    margin: 10,
  },
  error: {
    color: 'red',
    fontSize: 13,
    marginBottom: 10,
  },
});

export default ManuallyAdd;

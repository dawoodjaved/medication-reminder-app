import React, { useState, useCallback } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  TouchableWithoutFeedback,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import { Text } from './_components/customizableFontElements';
import Toast from 'react-native-toast-message';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { database, config, account } from '../config/appwriteConfig';
import { colors, spacing } from './_theme/colors';
import { screen } from './_theme/styles';

const EditTimeScreen = () => {
  const params = useLocalSearchParams();
  const router = useRouter();
  const docId = Array.isArray(params.docId) ? params.docId[0] : params.docId;
  const time = Array.isArray(params.time) ? params.time[0] : params.time;

  const [selectedTime, setSelectedTime] = useState(time || '');
  const [isTimePickerVisible, setTimePickerVisibility] = useState(false);

  const handleConfirm = useCallback((date: Date) => {
    const formattedTime = date.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    setSelectedTime(formattedTime);
    setTimePickerVisibility(false);
  }, []);

  const handleSave = useCallback(async () => {
    try {
      await account.get();
      await database.updateDocument(config.db, config.col.reminders, docId as string, {
        time: selectedTime,
        notificationSend: false,
      });
      Toast.show({ type: 'success', text1: 'Updated', text2: 'Reminder time saved.' });
      router.back();
    } catch (error) {
      console.error(error);
      Toast.show({ type: 'error', text1: 'Error', text2: 'Failed to update time.' });
    }
  }, [selectedTime, docId, router]);

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <SafeAreaView style={styles.safe}>
          <TouchableOpacity style={styles.back} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={22} color={colors.white} />
          </TouchableOpacity>

          <View style={screen.sheetGrow}>
            <Text style={screen.brand}>MedRem</Text>
            <Text style={screen.title}>Edit time</Text>
            <Text style={screen.subtitle}>Change when this dose should remind you.</Text>

            <Text style={screen.label}>Reminder time</Text>
            <TouchableOpacity
              style={screen.input}
              onPress={() => setTimePickerVisibility(true)}
            >
              <Text style={{ color: selectedTime ? colors.text : colors.textMuted, fontSize: 16 }}>
                {selectedTime || 'Select time'}
              </Text>
            </TouchableOpacity>

            <DateTimePickerModal
              isVisible={isTimePickerVisible}
              mode="time"
              onConfirm={handleConfirm}
              onCancel={() => setTimePickerVisibility(false)}
            />

            <TouchableOpacity style={screen.primaryBtn} onPress={handleSave}>
              <Text style={screen.primaryBtnText}>Update</Text>
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
});

export default EditTimeScreen;

import React, { useState, useCallback } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  TouchableWithoutFeedback,
  ScrollView,
} from 'react-native';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import { Text } from './components/customizableFontElements';
import Toast from 'react-native-toast-message';
import { useLocalSearchParams, useNavigation } from 'expo-router';
import { database, config, account } from '../config/appwriteConfig';

const EditTimeScreen = () => {
  const params = useLocalSearchParams();
  const navigation = useNavigation();
  const { docId, time } = params;

  const [selectedTime, setSelectedTime] = useState(time || '');
  const [isTimePickerVisible, setTimePickerVisibility] = useState(false);

  const handleConfirm = useCallback((date: Date) => {
    const formattedTime = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    setSelectedTime(formattedTime);
    setTimePickerVisibility(false);
  }, []);

  const handleSave = useCallback(async () => {
    try {
      // Ensure the user is authenticated
      await account.get();
      // Update the document's time field in the database
      await database.updateDocument(config.db, config.col.reminders, docId, {
        time: selectedTime,
      });
      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: 'Time updated successfully!',
      });
      navigation.goBack();
    } catch (error) {
      console.error(error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to update time.',
      });
    }
  }, [selectedTime, docId, navigation]);

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <ScrollView contentContainerStyle={styles.container}>
          <Text style={styles.title}>Edit Time</Text>
          <TouchableOpacity style={styles.timeInput} onPress={() => setTimePickerVisibility(true)}>
            <Text style={styles.timeText}>{selectedTime || 'Select time'}</Text>
          </TouchableOpacity>
          <DateTimePickerModal
            isVisible={isTimePickerVisible}
            mode="time"
            onConfirm={handleConfirm}
            onCancel={() => setTimePickerVisibility(false)}
          />
          <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
            <Text style={styles.buttonText}>Update</Text>
          </TouchableOpacity>
        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 20,
    backgroundColor: '#EDEDED',
    justifyContent: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
  },
  timeInput: {
    borderWidth: 1,
    borderColor: '#ff66b2',
    borderRadius: 8,
    padding: 15,
    backgroundColor: 'white',
    marginBottom: 20,
    alignItems: 'center',
  },
  timeText: {
    fontSize: 18,
    color: '#4A235A',
  },
  saveButton: {
    backgroundColor: '#f8c6d2',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 18,
    color: '#4A235A',
  },
});

export default EditTimeScreen;

import React, { useCallback } from 'react';
import { View, Switch, TouchableOpacity, StyleSheet } from 'react-native';
import { useFontSize } from "./context/fontSizeContext";
import { Text, Link } from './components/customizableFontElements';
import Toast from 'react-native-toast-message';
import { account } from '../config/appwriteConfig';
import { useRouter } from "expo-router";
import { useNotificationSettings } from './context/notificationSettingsContext';

const SettingsScreen = () => {
  // Use global notification settings from context
  const { 
    reminderNotifications, 
    setReminderNotifications, 
    soundAlerts, 
    setSoundAlerts 
  } = useNotificationSettings();

  const { size, setSize } = useFontSize();
  const router = useRouter();

  const handleLogout = useCallback(
    async (e: { preventDefault: () => void; }) => {
      e.preventDefault();
      try {
        await account.deleteSession('current');
        Toast.show({
          type: 'success',
          text1: '✅ Logged Out',
          text2: 'You have been logged out successfully.',
        });
        router.push({ pathname: "/HomeScreen" });
      } catch (error) {
        console.error("Logout error:", error);
        Toast.show({
          type: 'error',
          text1: '❌ Logout Failed',
          text2: 'An error occurred while logging out. Please try again.',
        });
      }
    },
    [router]
  );

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Settings</Text>
      <Text style={styles.subHeader}>Customize your app</Text>

      <View style={styles.menuContainer}>
        {/* Notifications Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notifications</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Reminder Notifications</Text>
            <Switch 
              value={reminderNotifications} 
              onValueChange={setReminderNotifications} 
            />
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Sound Alerts</Text>
            <Switch 
              value={soundAlerts} 
              onValueChange={setSoundAlerts} 
            />
          </View>
        </View>
      
        {/* Caregiver Access Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Caregiver Access</Text>
          <TouchableOpacity style={styles.button}>
            <Link href={"/AddCaregiver"} style={styles.buttonText}>
              Add a Caregiver
            </Link>
          </TouchableOpacity>
          <Text style={styles.description}>
            Add a trusted person who can help monitor your medications
          </Text>
        </View>

        {/* Appearance Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Appearance</Text>
          <Text style={styles.label}>Text Size</Text>
          <View style={styles.buttonRow}>
            <TouchableOpacity 
              style={[styles.textSizeButton, size === 'small' && styles.selectedButton]} 
              onPress={() => setSize('small')}
            >
              <Text style={styles.buttonText}>Small</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.textSizeButton, size === 'medium' && styles.selectedButton]} 
              onPress={() => setSize('medium')}
            >
              <Text style={styles.buttonText}>Medium</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.textSizeButton, size === 'large' && styles.selectedButton]} 
              onPress={() => setSize('large')}
            >
              <Text style={styles.buttonText}>Large</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Logout Section */}
        <View style={styles.section}>
          <TouchableOpacity style={styles.button} onPress={handleLogout}>
            <Text style={styles.buttonText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 0.5,
    backgroundColor: '#faa7c0',
    padding: 10,
    paddingVertical: 23,
    height: '10%',
    borderTopRightRadius: 70,
  },
  header: {
    fontWeight: 'bold',
    color: '#3D2352',
    top: 30,
  },
  subHeader: {
    color: '#3D2352',
    marginBottom: 20,
    top: 30,
  },
  menuContainer: {
    marginTop: 80,
    width: '110%',
    backgroundColor: '#fff',
    right: 20,
    padding: 20,
    height: '100%',
  },
  section: {
    backgroundColor: '#f5f5f5',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  label: {
    fontSize: 16,
  },
  button: {
    backgroundColor: '#faa7c0',
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 5,
  },
  buttonText: {
    fontWeight: 'bold',
    color: '#3D2352',
  },
  description: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 10,
  },
  textSizeButton: {
    backgroundColor: '#e0e0e0',
    padding: 14,
    borderRadius: 5,
    width: 100,
    alignItems: 'center',
  },
  selectedButton: {
    backgroundColor: '#faa7c0',
  },
});

export default SettingsScreen;

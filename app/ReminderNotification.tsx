import React from "react";
import { View, Text, StyleSheet, Image, Pressable, BackHandler } from "react-native";
import Toast from 'react-native-toast-message';
import { router, useLocalSearchParams } from "expo-router";
import { database, config } from "../config/appwriteConfig";
import { addMinutesToTimeString } from "./utils/timeConversion";

const ReminderNotification = () => {
  const { time, medicineName, description, reminderId } = useLocalSearchParams<{
    time: string;
    medicineName: string;
    description?: string;
    reminderId?: string;
  }>();

  const handleTaken = async () => {
    if (reminderId) {
      Toast.show({
        type: 'success',
        text1: '✅ Medication Taken',
        text2: `You marked ${medicineName} as taken.`,
      });
      await database.updateDocument(config.db, config.col.reminders, reminderId, {
        taken: true,
      });
    }
    router.push("/MainScreen");
    BackHandler.exitApp();
  };

  const handleSnooze = async () => {

    if (reminderId) {
      Toast.show({
        type: 'info',
        text1: '🔔 Snoozed',
        text2: `Reminder for ${medicineName} will repeat in 5 minutes.`,
      });
      await database.updateDocument(config.db, config.col.reminders, reminderId, {
        snoozed: true,
        notificationSend: false,
        time: addMinutesToTimeString(time, 5)
        
      });
    }
    router.push("/MainScreen");
    BackHandler.exitApp();
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Image source={require("../assets/images/Alarm.png")} style={styles.icon} />
        <Text style={styles.title}>{medicineName || "Medication Reminder"}</Text>
        <Text style={styles.time}>Scheduled for: <Text style={styles.timeHighlight}>{time}</Text></Text>
        {description && <Text style={styles.description}>{description}</Text>}

        <View style={styles.buttons}>
          <Pressable
            onPress={handleSnooze}
            style={[styles.button, styles.snoozeBtn]}
          >
            <Text style={styles.buttonText}>Snooze</Text>
          </Pressable>

          <Pressable
            onPress={handleTaken}
            style={[styles.button, styles.takenBtn]}
          >
            <Text style={styles.buttonText}>Taken</Text>
          </Pressable>
        </View>

        <Text style={styles.footer}>Reminder Notification</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F2F2F2",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 30,
    alignItems: "center",
    elevation: 8,
    width: "100%",
    maxWidth: 380,
  },
  icon: {
    width: 90,
    height: 90,
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 8,
    textAlign: "center",
  },
  time: {
    fontSize: 16,
    color: "#666",
    marginBottom: 10,
  },
  timeHighlight: {
    color: "#5A67D8",
    fontWeight: "600",
  },
  description: {
    fontSize: 16,
    color: "#555",
    textAlign: "center",
    marginBottom: 25,
  },
  buttons: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    marginHorizontal: 10,
    alignItems: "center",
  },
  snoozeBtn: {
    backgroundColor: "#FBBF24",
  },
  takenBtn: {
    backgroundColor: "#34D399",
  },
  buttonActive: {
    opacity: 0.6,
  },
  buttonText: {
    fontSize: 18,
    color: "#fff",
    fontWeight: "bold",
  },
  footer: {
    marginTop: 20,
    fontSize: 13,
    color: "#999",
    fontWeight: "600",
  },
});

export default ReminderNotification;

import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  StyleSheet,
  Image,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
} from "react-native";
import Toast from "react-native-toast-message";
import { Text } from "./components/customizableFontElements";
import { database, account, config } from "../config/appwriteConfig";
import { Query } from "appwrite";
import { useFocusEffect, useRouter } from "expo-router";

export default function MedicationSchedule() {
  const [medicinesReminders, setMedicineReminders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const getTodayDateString = useCallback(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = (today.getMonth() + 1).toString().padStart(2, "0");
    const day = today.getDate().toString().padStart(2, "0");
    return `${year}-${month}-${day}`;
  }, []);

  const fetchTodayMedicines = useCallback(async () => {
    setLoading(true);
    try {
      const user = await account.get();
      const today = getTodayDateString();

      const res = await database.listDocuments(
        config.db,
        config.col.reminders,
        [
          Query.equal("userId", user.$id),
          Query.equal("date", today),
          Query.orderDesc("time"),
        ]
      );

      setMedicineReminders(res.documents);
      if (res.documents.length === 0) {
        Toast.show({
          type: "info",
          text1: "ℹ️ No Medications",
          text2: "No medicines scheduled for today!",
        });
      }
    } catch (err) {
      console.error("Fetch error:", err);
      Toast.show({
        type: "error",
        text1: "❌ Error",
        text2: "Could not fetch your medications.",
      });
    } finally {
      setLoading(false);
    }
  }, [getTodayDateString]);

  useEffect(() => {
    fetchTodayMedicines();
  }, [fetchTodayMedicines]);

  useFocusEffect(
    useCallback(() => {
      fetchTodayMedicines();
    }, [fetchTodayMedicines])
  );


  const handleDelete = useCallback(
    async (item: any) => {
      try {
        await database.deleteDocument(config.db, config.col.reminders, item.$id);
        Toast.show({
          type: "success",
          text1: "Medication Deleted",
          text2: "Successfully deleted the medication reminder.",
        });
        fetchTodayMedicines();
      } catch (err) {
        console.error("Delete error:", err);
        Toast.show({
          type: "error",
          text1: "❌ Error",
          text2: "Could not delete the medication.",
        });
      }
    },
    [fetchTodayMedicines]
  );

  const confirmDelete = useCallback(
    (item: any) => {
      Alert.alert(
        "Confirm Deletion",
        `Are you sure you want to delete "${item.medicineName}"?`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Delete",
            style: "destructive",
            onPress: () => handleDelete(item),
          },
        ]
      );
    },
    [handleDelete]
  );

  const handleEdit = useCallback((item: any) => {
    router.push({
      pathname: "/EditReminder",
      params: {
        docId: item.$id,
        time: item.time, // pass the current time value
      },
    });
  }, []);

  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#6e4b5e" />
        <Text>Loading your Today's Medications...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.homeText}></Text>
        <Image
          source={require("../assets/images/todaySchedule.png")}
          style={styles.logo}
        />
        <Text style={styles.headerTitle}>
          Today's Medication {"\n"} Schedule
        </Text>
      </View>

      <TouchableOpacity style={styles.dateCard}>
        <Text style={styles.dateText}>📅 Date: {getTodayDateString()}</Text>
      </TouchableOpacity>

      {medicinesReminders.length === 0 ? (
        <Text style={styles.noMedicineText}>
          No medicines scheduled for today!
        </Text>
      ) : (
        <FlatList
          data={medicinesReminders}
          keyExtractor={(item) => item.$id}
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingBottom: 80,
          }}
          renderItem={({ item }) => (
            <View style={styles.medicineCard}>
              <Text style={styles.medicineName}>{item.medicineName}</Text>
              {item.description && (
                <View style={styles.medicineInfo}>
                  <Text style={styles.label}>📝 Description:</Text>
                  <Text style={styles.value}>{item.medicines?.notes}</Text>
                </View>
              )}
              <View style={styles.medicineInfo}>
                <Text style={styles.label}>💊 Dose(s):</Text>
                <Text style={styles.value}>
                  {item.medicines?.frequency || "N/A"}
                </Text>
              </View>
              <View style={styles.medicineInfo}>
                <Text style={styles.label}>⏰ Time:</Text>
                <Text style={styles.value}>
                  {item.time || "No time set"}
                </Text>
              </View>
              <View style={styles.medicineInfo}>
                <Text style={styles.label}>✅ Taken:</Text>
                <Text
                  style={[
                    styles.value,
                    { color: item.taken ? "green" : "#E67E22" },
                  ]}
                >
                  {item.taken ? "Yes" : "No"}
                </Text>
              </View>
              <View style={styles.medicineInfo}>
                <Text style={styles.label}>⏳ Snoozed:</Text>
                <Text
                  style={[
                    styles.value,
                    { color: item.snoozed ? "#F39C12" : "#999" },
                  ]}
                >
                  {item.snoozed ? "Yes" : "No"}
                </Text>
              </View>

              {/* Action buttons */}
              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={[styles.actionButton, { backgroundColor: "#D7BDE2" }]}
                  onPress={() => handleEdit(item)}
                >
                  <Text style={styles.actionButtonText}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButton, { backgroundColor: "#F5B7B1" }]}
                  onPress={() => confirmDelete(item)}
                >
                  <Text style={styles.actionButtonText}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      )}

      <Text style={styles.reminderText}>
        Stay on track with your medication! ✅
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  loaderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fce4ec",
  },
  container: {
    flex: 1,
    backgroundColor: "#E5E5E5",
    paddingTop: 0,
  },
  header: {
    backgroundColor: "#F8C7D2",
    width: "100%",
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 70,
    borderTopLeftRadius: 130,
    alignItems: "center",
    paddingBottom: 40,
  },
  homeText: {
    alignSelf: "flex-start",
    marginLeft: 20,
    marginTop: 8,
    color: "#555",
    fontSize: 14,
    right: 9,
  },
  logo: {
    width: 60,
    height: 60,
    marginTop: 10,
    right: 100,
  },
  headerTitle: {
    fontWeight: "bold",
    textAlign: "center",
    marginTop: 10,
    color: "#4A235A",
    right: 50,
  },
  dateCard: {
    backgroundColor: "#F8C7D2",
    padding: 12,
    paddingHorizontal: 70,
    borderRadius: 20,
    marginVertical: 30,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 10,
  },
  dateText: {
    fontWeight: "bold",
    color: "#4A235A",
  },
  noMedicineText: {
    color: "#666",
    marginTop: 20,
    textAlign: "center",
  },
  reminderText: {
    textAlign: "center",
    color: "#4A235A",
    fontWeight: "600",
    fontSize: 14,
    marginBottom: 10,
  },
  medicineCard: {
    flexGrow: 1,
    backgroundColor: "#FFFFFF",
    width: "100%",
    padding: 15,
    borderRadius: 15,
    marginVertical: 10,
    alignSelf: "center",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 3,
  },
  medicineName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#4A235A",
    marginBottom: 10,
    textAlign: "center",
  },
  medicineInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 4,
    borderTopWidth: 1,
    borderTopColor: "#eee",
    marginTop: 6,
  },
  label: {
    fontSize: 14,
    color: "#666",
  },
  value: {
    fontSize: 14,
    color: "#4A235A",
    fontWeight: "600",
  },
  actionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
  },
  actionButton: {
    flex: 0.48,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
  },
  actionButtonText: {
    color: "#4A235A",
    fontWeight: "600",
  },
});

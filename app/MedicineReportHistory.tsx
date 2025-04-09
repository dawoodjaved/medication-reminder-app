import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Ionicons, MaterialIcons, FontAwesome5 } from "@expo/vector-icons";
import Toast from "react-native-toast-message";
import { Text } from "./components/customizableFontElements";
import * as Print from "expo-print";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import { database, account, config } from "../config/appwriteConfig";
import { Query } from "appwrite";

interface Medication {
  name: string;
  dose: number | string;
}

export default function MedicineReportHistory() {
  const [loading, setLoading] = useState(false);

  const [startDate, setStartDate] = useState<string>(getDefaultStartDate());
  const [endDate, setEndDate] = useState<string>(getDefaultEndDate());

  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  const [dateRangeLabel, setDateRangeLabel] = useState("");

  const [taken, setTaken] = useState<Medication[]>([]);
  const [missed, setMissed] = useState<Medication[]>([]);
  const [adherence, setAdherence] = useState(0);

  function getDefaultEndDate(): string {
    const today = new Date();
    return formatDateToISO(today);
  }
  function getDefaultStartDate(): string {
    const today = new Date();
    today.setDate(today.getDate() - 6); // 7-day range
    return formatDateToISO(today);
  }

  function formatDateToISO(dateObj: Date): string {
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, "0");
    const day = String(dateObj.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function formatDateForDisplay(dateStr: string): string {
    const [year, month, day] = dateStr.split("-");
    return `${day}/${month}/${year}`;
  }

  const onStartDatePress = useCallback(() => setShowStartPicker(true), []);
  const onEndDatePress = useCallback(() => setShowEndPicker(true), []);

  const onStartDateChange = useCallback((event: any, selectedDate?: Date) => {
    setShowStartPicker(false);
    if (selectedDate) {
      setStartDate(formatDateToISO(selectedDate));
    }
  }, []);

  const onEndDateChange = useCallback((event: any, selectedDate?: Date) => {
    setShowEndPicker(false);
    if (selectedDate) {
      setEndDate(formatDateToISO(selectedDate));
    }
  }, []);

  const fetchMedicationReport = useCallback(async () => {
    setLoading(true);
    const rangeLabel = `${formatDateForDisplay(startDate)} - ${formatDateForDisplay(endDate)}`;
    setDateRangeLabel(rangeLabel);

    try {
      const user = await account.get();

      const res = await database.listDocuments(
        config.db,
        config.col.reminders,
        [
          Query.equal("userId", user.$id),
          Query.greaterThanEqual("date", startDate),
          Query.lessThanEqual("date", endDate),
          Query.orderDesc("date"),
        ]
      );

      const docs = res.documents;
      const takenDocs = docs
        .filter((doc: any) => doc.taken === true)
        .map((doc: any) => ({
          name: doc.medicineName,
          dose: doc.medicines?.frequency || "N/A",
        }));
      const missedDocs = docs
        .filter((doc: any) => doc.taken === false)
        .map((doc: any) => ({
          name: doc.medicineName,
          dose: doc.medicines?.frequency || "N/A",
        }));

      const total = docs.length;
      const ratio = total > 0 ? (takenDocs.length / total) * 100 : 0;
      setAdherence(Math.round(ratio));

      setTaken(takenDocs);
      setMissed(missedDocs);

      if (docs.length === 0) {
        Toast.show({
          type: "info",
          text1: "ℹ️ No Data",
          text2: "No medication data available in the selected range.",
        });
      }
    } catch (err) {
      console.error("Fetch error:", err);
      Toast.show({
        type: "error",
        text1: "❌ Error",
        text2: "Failed to fetch medication report.",
      });
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    fetchMedicationReport();
  }, [fetchMedicationReport]);

  const generatePDF = useCallback(async () => {
    const html = `
      <html>
        <body style="font-family: Arial; padding: 20px;">
          <h1 style="color: #6e4b5e;">Medication Report</h1>
          <p><strong>Date Range:</strong> ${dateRangeLabel}</p>
          <h2 style="color: green;">Taken Medications</h2>
          <ul>
            ${taken.map((med) => `<li>${med.name} - ${med.dose} dose(s)</li>`).join("")}
          </ul>
          <h2 style="color: red;">Missed Medications</h2>
          <ul>
            ${missed.map((med) => `<li>${med.name} - ${med.dose} dose(s)</li>`).join("")}
          </ul>
          <h2>Adherence</h2>
          <p>${adherence}% adherence</p>
        </body>
      </html>
    `;

    try {
      const { uri } = await Print.printToFileAsync({ html });
      await Sharing.shareAsync(uri);
      await FileSystem.deleteAsync(uri, { idempotent: true });
      Toast.show({
        type: "success",
        text1: "✅ PDF Exported",
        text2: "Report has been exported successfully.",
      });
    } catch (error) {
      console.error("PDF generation error:", error);
      Toast.show({
        type: "error",
        text1: "❌ Error",
        text2: "Failed to export report as PDF.",
      });
    }
  }, [dateRangeLabel, taken, missed, adherence]);

  const renderMedication = useCallback(
    (name: string, dose: number | string, isTaken: boolean, key: number) => (
      <View style={styles.medicationRow} key={`${name}-${key}`}>
        <Text style={styles.medicationText}>
          {name} – {dose} dose(s)
        </Text>
        {isTaken ? (
          <MaterialIcons name="check-circle" size={20} color="green" />
        ) : (
          <MaterialIcons name="cancel" size={20} color="red" />
        )}
      </View>
    ),
    []
  );

  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#6e4b5e" />
        <Text>Loading your medication report...</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <View style={styles.iconCircle}>
          <Ionicons name="time-outline" size={24} color="#fff" />
        </View>
        <Text style={styles.headerText}>Medication History & Reports</Text>
      </View>

      <View style={styles.dateRangeCard}>
        <View style={styles.dateRangeRow}>
          <TouchableOpacity onPress={onStartDatePress} style={styles.dateButton}>
            <Text style={styles.dateButtonText}>
              {formatDateForDisplay(startDate)}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onEndDatePress} style={styles.dateButton}>
            <Text style={styles.dateButtonText}>
              {formatDateForDisplay(endDate)}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={fetchMedicationReport} style={styles.fetchButton}>
            <Text style={styles.fetchButtonText}>Generate</Text>
          </TouchableOpacity>
        </View>
        {showStartPicker && (
          <DateTimePicker
            value={new Date(startDate)}
            mode="date"
            display="default"
            onChange={onStartDateChange}
          />
        )}
        {showEndPicker && (
          <DateTimePicker
            value={new Date(endDate)}
            mode="date"
            display="default"
            onChange={onEndDateChange}
          />
        )}
      </View>

      <View style={styles.dateRangeBox}>
        <FontAwesome5 name="calendar-alt" size={18} color="#6e4b5e" />
        <Text style={styles.dateRangeText}> Range: {dateRangeLabel}</Text>
      </View>

      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Taken Medications</Text>
          <Text style={styles.statusTitle}>Taken</Text>
        </View>
        {taken.length > 0 ? (
          taken.map((med, index) => renderMedication(med.name, med.dose, true, index))
        ) : (
          <Text style={styles.medicationText}>No data available</Text>
        )}
      </View>

      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Missed Medications</Text>
          <Text style={styles.statusTitle}>Missed</Text>
        </View>
        {missed.length > 0 ? (
          missed.map((med, index) => renderMedication(med.name, med.dose, false, index))
        ) : (
          <Text style={styles.medicationText}>No data available</Text>
        )}
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Adherence Report</Text>
        <Text style={styles.reportText}>Adherence: {adherence}%</Text>
      </View>

      <TouchableOpacity style={styles.exportButton} onPress={generatePDF}>
        <Text style={styles.exportButtonText}>Export Report (PDF)</Text>
      </TouchableOpacity>
    </ScrollView>
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
    flexGrow: 1,
    backgroundColor: "#fce4ec",
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  header: {
    flexDirection: "row",
    backgroundColor: "#f8bbd0",
    borderRadius: 10,
    alignItems: "center",
    padding: 10,
    marginTop: 20,
    marginBottom: 20,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#d47fa6",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  headerText: {
    color: "#6e4b5e",
    fontWeight: "bold",
    fontSize: 16,
  },
  dateRangeCard: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 10,
    marginBottom: 15,
    elevation: 2,
  },
  dateRangeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  dateButton: {
    backgroundColor: "#fce4ec",
    borderRadius: 8,
    padding: 8,
    flex: 1,
    marginRight: 5,
  },
  dateButtonText: {
    color: "#6e4b5e",
    fontWeight: "bold",
  },
  fetchButton: {
    backgroundColor: "#d47fa6",
    borderRadius: 8,
    padding: 8,
  },
  fetchButtonText: {
    color: "#fff",
    fontWeight: "bold",
  },
  dateRangeBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 12,
    marginBottom: 15,
    elevation: 2,
  },
  dateRangeText: {
    marginLeft: 8,
    color: "#6e4b5e",
    fontWeight: "bold",
  },
  sectionCard: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  sectionTitle: {
    fontWeight: "bold",
    color: "#6e4b5e",
    fontSize: 15,
  },
  statusTitle: {
    fontWeight: "bold",
    color: "#6e4b5e",
  },
  medicationRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginVertical: 4,
  },
  medicationText: {
    color: "#333",
  },
  reportText: {
    marginTop: 5,
    color: "#555",
  },
  exportButton: {
    backgroundColor: "#f8bbd0",
    borderRadius: 10,
    padding: 15,
    alignItems: "center",
    elevation: 2,
  },
  exportButtonText: {
    color: "#6e4b5e",
    fontWeight: "bold",
  },
});

import React, { useState, useCallback } from "react";
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
} from "react-native";
import { Text } from "./components/customizableFontElements";
import { useRouter } from "expo-router";
import Toast from "react-native-toast-message";

import { ID, Permission, Query, Role } from "appwrite";
const { config, database, account } = require("../config/appwriteConfig");

export default function AddCaregiver() {
  const [phoneNumber, setPhoneNumber] = useState("");
  const router = useRouter();

  const handleSaveCaregiver = useCallback(async () => {
    if (!phoneNumber.trim()) {
      Toast.show({
        type: "error",
        text1: "❌ Error",
        text2: "Please enter a phone number before registration.",
      });
      return;
    }

    try {
      const user = await account.get();

      const caregiverList = await database.listDocuments(
        config.db,
        config.col.caregivers,
        [Query.equal("phoneNumber", phoneNumber.trim())]
      );

      if (caregiverList.total === 0) {
        Toast.show({
          type: "error",
          text1: "❌ Already Registered",
          text2: "This phone number is already registered as a caregiver.",
        });
        return;
      }
      const caregiverData = {
        phoneNumber,
        invitedAt: new Date().toISOString(),
      };

      await database.createDocument(
        config.db,
        config.col.caregivers,
        ID.unique(),
        caregiverData,
        [
          Permission.read(Role.user(user.$id)),
          Permission.write(Role.user(user.$id)),
        ]
      );

      Toast.show({
        type: "success",
        text1: "✅ Caregiver Registered",
        text2: `Caregiver registered successfully!`,
      });

      setPhoneNumber("");
      router.push("/MainScreen");
    } catch (error) {
      console.error("Error adding caregiver:", error);
      Toast.show({
        type: "error",
        text1: "❌ Error",
        text2: "Failed to send invitation. Please try again.",
      });
    }
  }, [phoneNumber]);

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.description}>
        Register a caregiver to assist with managing your medications.
      </Text>

      <TextInput
        style={styles.input}
        placeholder="+1 XXX XXXXXXX"
        keyboardType="phone-pad"
        value={phoneNumber}
        onChangeText={setPhoneNumber}
      />

      <View style={styles.infoBox}>
        <Text style={styles.infoText}>
          Caregivers will have access to add medication and view reports,
          but your personal details will remain private.
        </Text>
      </View>

      <TouchableOpacity
        style={[styles.button, { backgroundColor: phoneNumber ? "#E75480" : "#ccc" }]}
        onPress={handleSaveCaregiver}
        disabled={!phoneNumber}
      >
        <Text style={styles.buttonText}>Register</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 10,
    backgroundColor: "#fff",
    top: 100,
    borderTopRightRadius: 70,
  },
  description: {
    textAlign: "center",
    marginBottom: 20,
    top: 40,
    color: "#333",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 10,
    marginBottom: 20,
    top: 40,
  },
  button: {
    padding: 15,
    marginTop: 20,
    borderRadius: 8,
    alignItems: "center",
    top: 40,
  },
  buttonText: {
    fontWeight: "bold",
    color: "#fff",
  },
  infoBox: {
    backgroundColor: "#E8F5E9",
    padding: 15,
    borderRadius: 8,
    marginTop: 20,
    top: 40,
  },
  infoText: {
    textAlign: "center",
    color: "#000",
  }
});

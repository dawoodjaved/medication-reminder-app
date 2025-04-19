import React, { useState, useCallback } from "react";
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ImageBackground,
  Keyboard,
  TouchableWithoutFeedback,
} from "react-native";
import { Text } from "./components/customizableFontElements";
import Toast from "react-native-toast-message";
import { ID, Query } from "appwrite";
import { useRouter } from "expo-router";
const { config, database, account } = require("../config/appwriteConfig");

const localImage = require("../assets/images/loginImage.jpg");
const localLogo = require("../assets/images/logo2.png");

const CareGiverLoginScreen: React.FC = () => {
  const [phoneNumber, setPhoneNumber] = useState("");
  const router = useRouter();

  const sendVerificationCode = useCallback(
    async (e: { preventDefault: () => void }) => {
      e.preventDefault();

      if (!phoneNumber.trim()) {
        Toast.show({
          type: "error",
          text1: "❌ Error",
          text2: "Please enter a valid phone number.",
        });
        return;
      }

      try {
        const caregiverList = await database.listDocuments(
          config.db,
          config.col.caregivers,
          [Query.equal("phoneNumber", phoneNumber.trim())]
        );

        if (caregiverList.total === 0) {
          Toast.show({
            type: "error",
            text1: "❌ Not Found",
            text2: "This phone number is not registered as a caregiver.",
          });
          return;
        }

        const token = await account.createPhoneToken(ID.unique(), phoneNumber);
        Toast.show({
          type: "success",
          text1: "✅ OTP Sent",
          text2: `OTP has been sent to ${phoneNumber}.`,
        });
        router.push({
          pathname: "/OtpVerificationScreen",
          params: {
            caregiver: 'true',
            userId: token.userId,
          },
        });
      } catch (error) {
        console.error("Phone token error:", error);
        Toast.show({
          type: "error",
          text1: "❌ Error",
          text2:
            "Failed to send OTP. Please check your phone number and try again.",
        });
      }
    },
    [phoneNumber, router]
  );

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View style={styles.container}>
        <ImageBackground source={localImage} style={styles.background}>
          <ImageBackground source={localLogo} style={styles.logo} />
        </ImageBackground>

        <View style={styles.card}>
          <Text style={styles.title}>
          </Text>
          <Text style={styles.subtitle}>Login as a caregiver!</Text>

          <Text style={styles.label}>Phone Number</Text>
          <TextInput
            style={styles.input}
            placeholder="+1 XXX XXXXXXX"
            keyboardType="phone-pad"
            value={phoneNumber}
            onChangeText={setPhoneNumber}
          />
          <TouchableOpacity
            style={styles.signUpButton}
            onPress={sendVerificationCode}
          >
            <Text style={styles.buttonText}>Send OTP</Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableWithoutFeedback>
  );
};

// Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#EDEDED",
    alignItems: "center",
  },
  background: {
    width: "100%",
    height: 200,
    alignItems: "center",
    justifyContent: "center",
  },
  backButton: {
    position: "absolute",
    top: 10,
    left: 15,
  },
  backText: {
    color: "#35134F",
    fontSize: 16,
  },
  logo: {
    width: 80,
    height: 80,
    borderRadius: 50,
    marginTop: 20,
  },
  card: {
    width: "100%",
    height: "90%",
    backgroundColor: "#EBEBEB",
    borderRadius: 20,
    padding: 20,
    alignItems: "center",
    elevation: 5,
  },
  title: {
    fontWeight: "bold",
    color: "#35134F",
    marginBottom: 28,
    textAlign: "center",
  },
  subtitle: {
    color: "#777",
    marginBottom: 15,
    textAlign: "center",
  },
  label: {
    alignSelf: "flex-start",
    fontWeight: "bold",
    color: "#444",
    marginTop: 10,
  },
  input: {
    width: "100%",
    height: 50,
    backgroundColor: "#FDEFF4",
    padding: 12,
    borderRadius: 10,
    marginBottom: 10,
  },
  signUpButton: {
    backgroundColor: "#E75480",
    paddingVertical: 13,
    paddingHorizontal: 15,
    borderRadius: 10,
    marginTop: 15,
    top: -73,
    right: -120,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "bold",
  },
  loginText: {
    marginTop: 10,
  },
  loginLink: {
    color: "#E75480",
    fontWeight: "bold",
  },
});

export default CareGiverLoginScreen;

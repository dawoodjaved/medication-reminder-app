import React, { useEffect, useState } from "react";
import {
  View,
  TouchableOpacity,
  StyleSheet,
  ImageBackground,
  ActivityIndicator,
} from "react-native";
import { Text, Link } from "./components/customizableFontElements";
import { useRouter } from "expo-router";
import { config, database } from "@/config/appwriteConfig";
import { Query } from "react-native-appwrite";

const localImage = require("../assets/images/background.jpg");
const localLogo = require("../assets/images/logo.png");

const { account } = require("../config/appwriteConfig");

const HomeScreen = () => {
  const router = useRouter();
  const [isCheckingSession, setIsCheckingSession] = useState(true);

  useEffect(() => {
    const checkSession = async () => {
      try {
        const session = await account.get();
        console.log("User session found:", session);

        
        const caregiverList = await database.listDocuments(
        config.db,
        config.col.caregivers,
        [Query.equal("phoneNumber", session?.phoneNumber.trim())]
      );

      caregiverList.total === 0 ? router.replace("/CareGiverMainScreen") : router.replace("/MainScreen");
      } catch (error) {
        console.log("No active session found:", error.message);
        setIsCheckingSession(false);
      }
    };

    checkSession();
  }, []);

  if (isCheckingSession) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#E75480" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ImageBackground source={localImage} style={styles.background} />

      <View style={styles.card}>
        <ImageBackground source={localLogo} style={styles.logoPlaceholder} />

        <Text style={styles.title}>Welcome to </Text>
        <Text style={styles.subtitle}>MedRem</Text>
        <Text style={styles.description}>Never miss a Med Again</Text>

        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.signUpButton}>
            <Link href="/CareGiverLoginScreen" style={styles.buttonText}>
              Caregiver
            </Link>
          </TouchableOpacity>

          <TouchableOpacity style={styles.loginButton}>
            <Link href="/PhoneLoginScreen" style={styles.buttonText}>
              User
            </Link>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFF",
  },
  background: {
    position: "absolute",
    width: "100%",
    height: "100%",
    top: -50,
    resizeMode: "cover",
  },
  card: {
    width: "99%",
    height: "70%",
    backgroundColor: "#EBEBEB",
    borderRadius: 20,
    padding: 20,
    alignItems: "center",
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    top: 115,
  },
  logoPlaceholder: {
    width: 115,
    height: 117,
    backgroundColor: "#EBEBEB",
    borderRadius: 50,
    marginBottom: 10,
    top: 50,
  },
  title: {
    fontWeight: "bold",
    color: "#5A3E85",
    top: 50,
  },
  subtitle: {
    fontWeight: "bold",
    color: "#5A3E85",
    marginBottom: 5,
    top: 50,
  },
  description: {
    color: "#888",
    marginBottom: 20,
    top: 60,
  },
  buttonContainer: {
    flexDirection: "row",
    gap: 40,
    top: 155,
  },
  signUpButton: {
    backgroundColor: "#E75480",
    paddingVertical: 10,
    paddingHorizontal: 27,
    borderRadius: 20,
  },
  loginButton: {
    backgroundColor: "#E75480",
    paddingVertical: 10,
    paddingHorizontal: 27,
    borderRadius: 20,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "bold",
  },
});

export default HomeScreen;

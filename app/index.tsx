import React, { useEffect }  from "react";
import { SafeAreaView } from "react-native";
import HomeScreen from "./HomeScreen";
import Toast from "react-native-toast-message";
import ReminderNotification from "./ReminderNotification";

export default function App() {
  useEffect(() => {
    Toast.hide();
  }, []);

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <HomeScreen/>
    </SafeAreaView>
  );
}


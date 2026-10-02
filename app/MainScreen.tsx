import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { registerPushToken } from './_utils/registerPushToken';
import { useAuth } from './_context/authContext';
import { colors } from './_theme/colors';

/** Legacy hub — redirects into the new tab experience */
const MainScreen = () => {
  const router = useRouter();
  const { fromLogin } = useLocalSearchParams();
  const { refreshScope, onboardingDone } = useAuth();

  useEffect(() => {
    (async () => {
      if (fromLogin) {
        try {
          await registerPushToken();
        } catch (e) {
          console.error(e);
        }
      }
      await refreshScope();
      if (!onboardingDone) router.replace('/Onboarding');
      else router.replace('/(tabs)');
    })();
  }, [fromLogin, refreshScope, onboardingDone, router]);

  return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );
};

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bg },
});

export default MainScreen;

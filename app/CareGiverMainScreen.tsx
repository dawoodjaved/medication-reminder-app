import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from './_context/authContext';
import { colors } from './_theme/colors';

/** Legacy caregiver hub — redirects into tabs (patient-scoped) */
const CareGiverMainScreen = () => {
  const router = useRouter();
  const { refreshScope } = useAuth();

  useEffect(() => {
    (async () => {
      await refreshScope();
      router.replace('/(tabs)');
    })();
  }, [refreshScope, router]);

  return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );
};

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bg },
});

export default CareGiverMainScreen;

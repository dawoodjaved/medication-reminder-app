import React, { useEffect } from 'react';
import { StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import HomeScreen from './HomeScreen';
import Toast from 'react-native-toast-message';
import { colors } from './_theme/colors';

export default function App() {
  useEffect(() => {
    Toast.hide();
  }, []);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.primary }} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />
      <HomeScreen />
    </SafeAreaView>
  );
}

import React, { useRef, useState, useCallback } from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  Text,
  Keyboard,
  NativeSyntheticEvent,
  TextInputKeyPressEventData,
  TouchableOpacity,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { account } from '../config/appwriteConfig';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, radii, spacing } from './_theme/colors';
import { screen } from './_theme/styles';
import { useAuth } from './_context/authContext';

const localLogo = require('../assets/images/logo.png');

export default function OtpVerificationScreen() {
  const router = useRouter();
  const { refreshScope } = useAuth();
  const { caregiver, userId } = useLocalSearchParams<{ caregiver: string; userId: string }>();
  const [otp, setOtp] = useState<string[]>(['', '', '', '', '', '']);
  const inputRefs = useRef<Array<TextInput | null>>([]);

  const handleChange = useCallback(
    (text: string, index: number) => {
      if (/^\d$/.test(text)) {
        const next = [...otp];
        next[index] = text;
        setOtp(next);
        if (index < 5) inputRefs.current[index + 1]?.focus();
        else {
          Keyboard.dismiss();
          confirmVerificationCode(next.join(''));
        }
      } else if (text === '') {
        const next = [...otp];
        next[index] = '';
        setOtp(next);
      }
    },
    [otp]
  );

  const handleKeyPress = useCallback(
    (e: NativeSyntheticEvent<TextInputKeyPressEventData>, index: number) => {
      if (e.nativeEvent.key === 'Backspace' && otp[index] === '' && index > 0) {
        inputRefs.current[index - 1]?.focus();
      }
    },
    [otp]
  );

  const confirmVerificationCode = useCallback(
    async (verificationCode: string) => {
      if (!userId) {
        Toast.show({ type: 'error', text1: 'Error', text2: 'User ID is missing.' });
        return;
      }

      try {
        const activeSession = await account.getSession('current').catch(() => null);
        if (activeSession) {
          caregiver === 'true'
            ? router.replace('/CareGiverMainScreen')
            : router.replace({ pathname: '/MainScreen', params: { fromLogin: 'true' } });
          return;
        }

        await account.updatePhoneSession(userId, verificationCode);
        await refreshScope();

        caregiver === 'true'
          ? router.replace('/CareGiverMainScreen')
          : router.replace({ pathname: '/MainScreen', params: { fromLogin: 'true' } });

        Toast.show({ type: 'success', text1: 'Verified', text2: 'Welcome to MedRem.' });
      } catch (error) {
        console.error('Verification Error:', error);
        Toast.show({ type: 'error', text1: 'Invalid OTP', text2: 'Please enter the correct code.' });
      }
    },
    [userId, router, caregiver, refreshScope]
  );

  return (
    <SafeAreaView style={styles.safe}>
      <TouchableOpacity style={styles.back} onPress={() => router.back()}>
        <Ionicons name="arrow-back" size={22} color={colors.white} />
      </TouchableOpacity>

      <View style={styles.hero}>
        <Image source={localLogo} style={styles.logo} />
      </View>

      <View style={screen.sheetGrow}>
        <Text style={screen.brand}>MedRem</Text>
        <Text style={screen.title}>Enter OTP</Text>
        <Text style={screen.subtitle}>We sent a 6-digit code to your phone</Text>

        <View style={styles.otpRow}>
          {otp.map((digit, index) => (
            <TextInput
              key={index}
              ref={(ref) => {
                inputRefs.current[index] = ref;
              }}
              value={digit}
              onChangeText={(text) => handleChange(text, index)}
              onKeyPress={(e) => handleKeyPress(e, index)}
              style={styles.otpInput}
              keyboardType="number-pad"
              maxLength={1}
              returnKeyType="done"
            />
          ))}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.primary },
  back: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
  hero: { alignItems: 'center', paddingVertical: spacing.md },
  logo: { width: 72, height: 72, borderRadius: 36 },
  otpRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.md,
    gap: 6,
    maxWidth: '100%',
  },
  otpInput: {
    width: 48,
    height: 56,
    flexGrow: 0,
    flexShrink: 0,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    textAlign: 'center',
    fontSize: 20,
    fontWeight: '700',
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.primary,
  },
});

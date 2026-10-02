import React, { useState, useCallback } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  Keyboard,
  TouchableWithoutFeedback,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from './_components/customizableFontElements';
import Toast from 'react-native-toast-message';
import { ID, Query } from 'appwrite';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { config, database, account } from '../config/appwriteConfig';
import { colors, spacing } from './_theme/colors';
import { screen } from './_theme/styles';
import { useAuth } from './_context/authContext';

const localLogo = require('../assets/images/logo.png');

const CareGiverLoginScreen: React.FC = () => {
  const [mode, setMode] = useState<'email' | 'phone'>('email');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [sending, setSending] = useState(false);
  const router = useRouter();
  const { refreshScope } = useAuth();

  const sendVerificationCode = useCallback(async () => {
    if (!phoneNumber.trim()) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Please enter a valid phone number.',
      });
      return;
    }

    setSending(true);
    try {
      const caregiverList = await database.listDocuments(
        config.db,
        config.col.caregivers,
        [Query.equal('phoneNumber', phoneNumber.trim())]
      );

      if (caregiverList.total === 0) {
        Toast.show({
          type: 'error',
          text1: 'Not found',
          text2: 'This phone number is not registered as a caregiver.',
        });
        return;
      }

      const token = await account.createPhoneToken(ID.unique(), phoneNumber.trim());
      Toast.show({
        type: 'success',
        text1: 'OTP sent',
        text2: `Code sent to ${phoneNumber}.`,
      });
      router.push({
        pathname: '/OtpVerificationScreen',
        params: { caregiver: 'true', userId: token.userId },
      });
    } catch (error) {
      console.error('Phone token error:', error);
      Toast.show({
        type: 'error',
        text1: 'Phone OTP unavailable',
        text2: 'Free plan has no SMS. Use email login instead.',
      });
    } finally {
      setSending(false);
    }
  }, [phoneNumber, router]);

  const signInWithEmail = useCallback(async () => {
    if (!email.trim() || !password) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Enter email and password.',
      });
      return;
    }

    setSending(true);
    try {
      await account.createEmailPasswordSession(email.trim(), password);
      const scope = await refreshScope();
      if (scope?.role !== 'caregiver') {
        await account.deleteSession('current');
        Toast.show({
          type: 'error',
          text1: 'Not a caregiver',
          text2: 'This account is not linked as a caregiver.',
        });
        return;
      }
      Toast.show({ type: 'success', text1: 'Signed in' });
      router.replace('/(tabs)');
    } catch (error) {
      console.error('Caregiver email login error:', error);
      Toast.show({
        type: 'error',
        text1: 'Sign-in failed',
        text2: 'Check email/password and try again.',
      });
    } finally {
      setSending(false);
    }
  }, [email, password, refreshScope, router]);

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <SafeAreaView style={styles.safe}>
        <TouchableOpacity style={styles.back} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={colors.white} />
        </TouchableOpacity>

        <View style={styles.hero}>
          <Image source={localLogo} style={styles.logo} />
        </View>

        <View style={screen.sheetGrow}>
          <Text style={screen.brand}>MedRem</Text>
          <Text style={screen.title}>Caregiver sign in</Text>
          <Text style={screen.subtitle}>
            Free plan: use email. Phone OTP needs paid SMS.
          </Text>

          <View style={styles.modeRow}>
            <TouchableOpacity
              style={[styles.modeBtn, mode === 'email' && styles.modeActive]}
              onPress={() => setMode('email')}
            >
              <Text style={[styles.modeText, mode === 'email' && styles.modeTextActive]}>Email</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modeBtn, mode === 'phone' && styles.modeActive]}
              onPress={() => setMode('phone')}
            >
              <Text style={[styles.modeText, mode === 'phone' && styles.modeTextActive]}>Phone</Text>
            </TouchableOpacity>
          </View>

          {mode === 'email' ? (
            <>
              <Text style={screen.label}>Email</Text>
              <TextInput
                style={screen.input}
                placeholder="Email address"
                placeholderTextColor={colors.textMuted}
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
              />
              <Text style={screen.label}>Password</Text>
              <TextInput
                style={screen.input}
                placeholder="Password"
                placeholderTextColor={colors.textMuted}
                secureTextEntry
                value={password}
                onChangeText={setPassword}
              />
              <TouchableOpacity
                style={[screen.primaryBtn, sending && { opacity: 0.7 }]}
                onPress={signInWithEmail}
                disabled={sending}
              >
                <Text style={screen.primaryBtnText}>{sending ? 'Signing in…' : 'Sign in'}</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={screen.label}>Phone number</Text>
              <TextInput
                style={screen.input}
                placeholder="+1 XXX XXXXXXX"
                placeholderTextColor={colors.textMuted}
                keyboardType="phone-pad"
                value={phoneNumber}
                onChangeText={setPhoneNumber}
              />
              <TouchableOpacity
                style={[screen.primaryBtn, sending && { opacity: 0.7 }]}
                onPress={sendVerificationCode}
                disabled={sending}
              >
                <Text style={screen.primaryBtnText}>{sending ? 'Sending…' : 'Send OTP'}</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </SafeAreaView>
    </TouchableWithoutFeedback>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.primary },
  back: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
  hero: { alignItems: 'center', paddingVertical: spacing.lg },
  logo: { width: 88, height: 88, borderRadius: 44 },
  modeRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  modeBtn: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: 10,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
  },
  modeActive: { backgroundColor: colors.primary },
  modeText: { color: colors.textMuted, fontWeight: '600' },
  modeTextActive: { color: colors.white },
});

export default CareGiverLoginScreen;

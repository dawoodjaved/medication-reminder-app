import React, { useEffect, useState } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from './_components/customizableFontElements';
import { useRouter } from 'expo-router';
import { Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radii, spacing } from './_theme/colors';
import { SoftOrbs, PillGlyph, FadeBlock } from './_theme/visuals';
import { useAuth } from './_context/authContext';

async function authenticateBiometric(promptMessage: string) {
  if (Platform.OS === 'web') return { success: true };
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const LocalAuthentication = require('expo-local-authentication');
  return LocalAuthentication.authenticateAsync({ promptMessage, fallbackLabel: 'Use passcode' });
}

const HomeScreen = () => {
  const router = useRouter();
  const { scope, loading, refreshScope, onboardingDone, biometricEnabled } = useAuth();
  const [unlocking, setUnlocking] = useState(false);
  const [unlocked, setUnlocked] = useState(false);

  useEffect(() => {
    if (loading) return;

    const boot = async () => {
      if (!scope) return;

      if (biometricEnabled && !unlocked) {
        setUnlocking(true);
        const result = await authenticateBiometric('Unlock MedRem');
        setUnlocking(false);
        if (!result.success) return;
        setUnlocked(true);
      }

      if (!onboardingDone && scope.role === 'patient') {
        router.replace('/Onboarding');
      } else {
        router.replace('/(tabs)');
      }
    };

    boot();
  }, [loading, scope, biometricEnabled, onboardingDone, router, unlocked]);

  if (loading || unlocking) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (scope && biometricEnabled && !unlocked) {
    return (
      <SafeAreaView style={[styles.safe, { justifyContent: 'center', padding: spacing.lg }]}>
        <SoftOrbs />
        <Text style={styles.heroBrand}>MedRem</Text>
        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={async () => {
            setUnlocking(true);
            const result = await authenticateBiometric('Unlock MedRem');
            setUnlocking(false);
            if (result.success) setUnlocked(true);
          }}
        >
          <Ionicons name="finger-print" size={18} color={colors.white} />
          <Text style={styles.primaryBtnText}>Unlock</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  if (scope) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.heroPlane}>
        <SoftOrbs />
        <FadeBlock>
          <View style={styles.logoCircle}>
            <PillGlyph size={40} color={colors.white} />
          </View>
        </FadeBlock>
        <FadeBlock delay={80}>
          <Text style={styles.heroBrand}>MedRem</Text>
        </FadeBlock>
        <FadeBlock delay={140}>
          <View style={styles.heroDots}>
            <View style={[styles.heroDot, { backgroundColor: colors.accent }]} />
            <View style={[styles.heroDot, { backgroundColor: colors.accentSoft }]} />
            <View style={[styles.heroDot, { backgroundColor: colors.primarySoft }]} />
          </View>
        </FadeBlock>
      </View>

      <FadeBlock delay={180} style={styles.card}>
        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={() => router.push('/PhoneLoginScreen')}
        >
          <Ionicons name="person-outline" size={18} color={colors.white} />
          <Text style={styles.primaryBtnText}>Patient</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryBtn}
          onPress={() => router.push('/CareGiverLoginScreen')}
        >
          <Ionicons name="heart-outline" size={18} color={colors.primary} />
          <Text style={styles.secondaryBtnText}>Caregiver</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.inviteBtn} onPress={() => router.push('/AcceptInvite')}>
          <Ionicons name="link-outline" size={18} color={colors.accent} />
          <Text style={styles.inviteText}>Invite</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => refreshScope()}>
          <Text style={styles.refresh}>Refresh</Text>
        </TouchableOpacity>
      </FadeBlock>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.primary },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.bg,
  },
  heroPlane: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  logoCircle: {
    width: 92,
    height: 92,
    borderRadius: 46,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.accentSoft,
    marginBottom: spacing.md,
  },
  heroBrand: {
    fontSize: 42,
    fontWeight: '800',
    color: colors.white,
    letterSpacing: -1,
    textAlign: 'center',
  },
  heroDots: { flexDirection: 'row', gap: 8, marginTop: 14 },
  heroDot: { width: 8, height: 8, borderRadius: 4 },
  card: {
    backgroundColor: colors.bg,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    padding: spacing.lg,
    paddingBottom: spacing.xl,
    alignItems: 'center',
  },
  primaryBtn: {
    width: '100%',
    backgroundColor: colors.accent,
    paddingVertical: 16,
    borderRadius: radii.md,
    alignItems: 'center',
    marginBottom: spacing.sm,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  primaryBtnText: { color: colors.white, fontWeight: '700', fontSize: 16 },
  secondaryBtn: {
    width: '100%',
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.primary,
    paddingVertical: 16,
    borderRadius: radii.md,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  secondaryBtnText: { color: colors.primary, fontWeight: '700', fontSize: 16 },
  inviteBtn: {
    width: '100%',
    marginTop: spacing.sm,
    paddingVertical: 14,
    borderRadius: radii.md,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1.5,
    borderColor: colors.accent,
    backgroundColor: colors.surface,
  },
  inviteText: { color: colors.accent, fontWeight: '700', fontSize: 15 },
  refresh: { marginTop: spacing.md, color: colors.textMuted, fontSize: 13 },
});

export default HomeScreen;

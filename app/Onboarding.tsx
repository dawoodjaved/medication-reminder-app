import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text } from './_components/customizableFontElements';
import { colors, radii, spacing } from './_theme/colors';
import { SoftOrbs, ProgressRing, PillGlyph, FadeBlock } from './_theme/visuals';
import { useAuth } from './_context/authContext';

const STEPS = [
  { title: 'Doses on time', icon: 'sunny-outline' as const, progress: 33 },
  { title: 'Stock in sight', icon: 'cube-outline' as const, progress: 66 },
  { title: 'Care shared', icon: 'heart-outline' as const, progress: 100 },
];

export default function Onboarding() {
  const [step, setStep] = useState(0);
  const router = useRouter();
  const { setOnboardingDone } = useAuth();

  const finish = () => {
    setOnboardingDone(true);
    router.replace('/(tabs)');
  };

  const next = () => {
    if (step >= STEPS.length - 1) finish();
    else setStep((s) => s + 1);
  };

  const current = STEPS[step];

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.hero}>
        <SoftOrbs />
        <FadeBlock key={step}>
          <ProgressRing
            progress={current.progress}
            size={120}
            stroke={10}
            label={`${step + 1}/3`}
            trackColor="rgba(255,255,255,0.2)"
            fillColor={colors.accent}
            labelColor={colors.white}
          />
        </FadeBlock>
        <View style={styles.iconRow}>
          <View style={styles.iconOrb}>
            <Ionicons name={current.icon} size={26} color={colors.accentSoft} />
          </View>
          <View style={styles.iconOrb}>
            <PillGlyph size={24} color={colors.accentSoft} />
          </View>
        </View>
      </View>
      <View style={styles.card}>
        <Text style={styles.brand}>MEDREM</Text>
        <Text style={styles.title}>{current.title}</Text>
        <View style={styles.dots}>
          {STEPS.map((_, i) => (
            <View key={i} style={[styles.dot, i === step && styles.dotActive]} />
          ))}
        </View>
        <TouchableOpacity style={styles.btn} onPress={next}>
          <Text style={styles.btnText}>{step === STEPS.length - 1 ? 'Start' : 'Next'}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={finish}>
          <Text style={styles.skip}>Skip</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.primary },
  hero: { flex: 1, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  iconRow: { flexDirection: 'row', gap: 16, marginTop: spacing.lg },
  iconOrb: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.accentSoft,
  },
  card: {
    backgroundColor: colors.bg,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    padding: spacing.lg,
    paddingBottom: spacing.xl,
  },
  brand: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.accent,
    letterSpacing: 1.6,
    marginBottom: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.primary,
    marginBottom: spacing.lg,
    letterSpacing: -0.4,
  },
  dots: { flexDirection: 'row', gap: 8, marginBottom: spacing.lg },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.border },
  dotActive: { backgroundColor: colors.accent, width: 24 },
  btn: {
    backgroundColor: colors.accent,
    paddingVertical: 16,
    borderRadius: radii.md,
    alignItems: 'center',
  },
  btnText: { color: colors.white, fontWeight: '700', fontSize: 16 },
  skip: {
    textAlign: 'center',
    marginTop: spacing.md,
    color: colors.textMuted,
    fontWeight: '600',
  },
});

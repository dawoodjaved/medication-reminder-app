import React, { useEffect } from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import Svg, { Circle, Path, G } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  Easing,
  FadeInDown,
  FadeIn,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '../_components/customizableFontElements';
import { colors, radii, spacing } from './colors';

/** Animated SVG progress ring */
export function ProgressRing({
  progress,
  size = 80,
  stroke = 8,
  label,
  sublabel,
  trackColor = colors.ringTrack,
  fillColor = colors.accent,
  labelColor,
}: {
  progress: number;
  size?: number;
  stroke?: number;
  label?: string;
  sublabel?: string;
  trackColor?: string;
  fillColor?: string;
  labelColor?: string;
}) {
  const pct = Math.max(0, Math.min(100, progress || 0));
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - pct / 100);
  const scale = useSharedValue(0.85);
  const fg = labelColor || colors.primary;

  useEffect(() => {
    scale.value = withTiming(1, { duration: 500, easing: Easing.out(Easing.cubic) });
  }, [pct, scale]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={[{ width: size, height: size }, animStyle]}>
      <Svg width={size} height={size}>
        <G rotation="-90" origin={`${size / 2}, ${size / 2}`}>
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            stroke={trackColor}
            strokeWidth={stroke}
            fill="none"
          />
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            stroke={fillColor}
            strokeWidth={stroke}
            fill="none"
            strokeDasharray={`${c} ${c}`}
            strokeDashoffset={offset}
            strokeLinecap="round"
          />
        </G>
      </Svg>
      <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
        <View style={ringStyles.center}>
          {label != null ? <Text style={[ringStyles.label, { color: fg }]}>{label}</Text> : null}
          {sublabel ? (
            <Text style={[ringStyles.sub, labelColor ? { color: colors.accentSoft } : null]}>
              {sublabel}
            </Text>
          ) : null}
        </View>
      </View>
    </Animated.View>
  );
}

const ringStyles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  label: { fontWeight: '800', fontSize: 17, color: colors.primary },
  sub: { fontSize: 10, color: colors.textMuted, fontWeight: '600', marginTop: 1 },
});

/** Soft decorative orbs */
export function SoftOrbs({ style }: { style?: ViewStyle }) {
  return (
    <View style={[orbStyles.wrap, style]} pointerEvents="none">
      <View style={[orbStyles.orb, orbStyles.a]} />
      <View style={[orbStyles.orb, orbStyles.b]} />
      <View style={[orbStyles.orb, orbStyles.c]} />
    </View>
  );
}

const orbStyles = StyleSheet.create({
  wrap: { ...StyleSheet.absoluteFillObject, overflow: 'hidden' },
  orb: { position: 'absolute', borderRadius: 999 },
  a: {
    width: 180,
    height: 180,
    backgroundColor: colors.cobaltGlow,
    top: -48,
    right: -36,
  },
  b: {
    width: 110,
    height: 110,
    backgroundColor: colors.sandGlow,
    bottom: 12,
    left: -36,
  },
  c: {
    width: 48,
    height: 48,
    backgroundColor: colors.accentSoft,
    opacity: 0.5,
    top: 72,
    left: 36,
  },
});

export function PillGlyph({ size = 22, color = colors.primary }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M9 4.5C6.5 4.5 4.5 6.5 4.5 9v6c0 2.5 2 4.5 4.5 4.5s4.5-2 4.5-4.5V9c0-2.5-2-4.5-4.5-4.5z"
        stroke={color}
        strokeWidth={1.5}
        fill={colors.accentSoft}
      />
      <Path d="M4.5 12h9" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
    </Svg>
  );
}

export function CapsuleGlyph({ size = 22, color = colors.primary }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M8 7c0-2.2 1.8-4 4-4s4 1.8 4 4v10c0 2.2-1.8 4-4 4s-4-1.8-4-4V7z"
        stroke={color}
        strokeWidth={1.5}
        fill={colors.surfaceMuted}
      />
      <Path d="M8 12h8" stroke={colors.accent} strokeWidth={1.5} />
    </Svg>
  );
}

export function HeartPulseGlyph({ size = 22, color = colors.accent }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 20s-7-4.4-7-10a4 4 0 017-2.6A4 4 0 0119 10c0 5.6-7 10-7 10z"
        fill={color}
        opacity={0.85}
      />
      <Path d="M7 12h2.5l1.2-2.5L13 14l1.5-2H17" stroke={colors.white} strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

/** Leading icon hint for medicine / dose rows */
export function MedHintIcon({
  type,
  critical,
  size = 44,
}: {
  type?: string;
  critical?: boolean;
  size?: number;
}) {
  const t = (type || '').toLowerCase();
  let bg = colors.cobaltGlow;
  let child: React.ReactNode;

  if (t.includes('syrup') || t.includes('liquid')) {
    bg = colors.sandGlow;
    child = <Ionicons name="water-outline" size={size * 0.4} color={colors.primary} />;
  } else if (t.includes('inject')) {
    bg = 'rgba(196,92,92,0.12)';
    child = <Ionicons name="fitness-outline" size={size * 0.4} color={colors.danger} />;
  } else if (t.includes('drop') || t.includes('eye')) {
    child = <Ionicons name="eye-outline" size={size * 0.4} color={colors.primary} />;
  } else if (t.includes('cream') || t.includes('oint')) {
    child = <Ionicons name="color-palette-outline" size={size * 0.4} color={colors.primary} />;
  } else if (t.includes('capsule')) {
    child = <CapsuleGlyph size={size * 0.48} />;
  } else {
    child = <PillGlyph size={size * 0.48} />;
  }

  if (critical) bg = 'rgba(196,92,92,0.16)';

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: bg,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {child}
    </View>
  );
}

export function DoctorHintIcon({ specialty, size = 48 }: { specialty?: string; size?: number }) {
  const s = (specialty || '').toLowerCase();
  let name: keyof typeof Ionicons.glyphMap = 'person-outline';
  if (s.includes('cardio') || s.includes('heart')) name = 'heart-outline';
  else if (s.includes('derm') || s.includes('skin')) name = 'body-outline';
  else if (s.includes('pediatr') || s.includes('child')) name = 'happy-outline';
  else if (s.includes('neuro')) name = 'flash-outline';
  else if (s.includes('ortho') || s.includes('bone')) name = 'walk-outline';
  else if (s.includes('eye') || s.includes('ophthal')) name = 'eye-outline';
  else if (s.includes('pulmon') || s.includes('lung') || s.includes('asthma')) name = 'cloud-outline';
  else if (s.includes('endo') || s.includes('diabet')) name = 'water-outline';
  else if (s.includes('gyn') || s.includes('obstet')) name = 'female-outline';

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: colors.cobaltGlow,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Ionicons name={name} size={size * 0.4} color={colors.primary} />
    </View>
  );
}

export function FadeBlock({
  children,
  delay = 0,
  style,
}: {
  children: React.ReactNode;
  delay?: number;
  style?: ViewStyle;
}) {
  return (
    <Animated.View entering={FadeInDown.delay(delay).springify().damping(16)} style={style}>
      {children}
    </Animated.View>
  );
}

export function StatBubble({
  value,
  label,
  tone = 'primary',
  icon,
}: {
  value: string | number;
  label: string;
  tone?: 'primary' | 'accent' | 'warn' | 'ok';
  icon?: keyof typeof Ionicons.glyphMap;
}) {
  const bg =
    tone === 'accent'
      ? colors.sandGlow
      : tone === 'warn'
        ? 'rgba(212,160,23,0.15)'
        : colors.cobaltGlow;
  const fg =
    tone === 'accent'
      ? colors.accentDeep
      : tone === 'warn'
        ? colors.warning
        : tone === 'ok'
          ? colors.success
          : colors.primary;

  return (
    <View style={[statStyles.wrap, { backgroundColor: bg }]}>
      {icon ? <Ionicons name={icon} size={14} color={fg} style={{ marginBottom: 2 }} /> : null}
      <Text style={[statStyles.value, { color: fg }]}>{value}</Text>
      <Text style={statStyles.label}>{label}</Text>
    </View>
  );
}

const statStyles = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderRadius: radii.md,
    minWidth: 70,
  },
  value: { fontSize: 22, fontWeight: '800' },
  label: { fontSize: 11, color: colors.textMuted, marginTop: 2, fontWeight: '600' },
});

export function ProgressBar({
  progress,
  height = 8,
  color = colors.accent,
}: {
  progress: number;
  height?: number;
  color?: string;
}) {
  const pct = Math.max(0, Math.min(100, progress || 0));
  const w = useSharedValue(0);
  useEffect(() => {
    w.value = withTiming(pct, { duration: 650, easing: Easing.out(Easing.cubic) });
  }, [pct, w]);

  const fillStyle = useAnimatedStyle(() => ({
    width: `${w.value}%` as unknown as number,
  }));

  return (
    <View style={[barStyles.track, { height, borderRadius: height }]}>
      <Animated.View style={[barStyles.fill, { height, borderRadius: height, backgroundColor: color }, fillStyle]} />
    </View>
  );
}

const barStyles = StyleSheet.create({
  track: { backgroundColor: colors.ringTrack, overflow: 'hidden', width: '100%' },
  fill: {},
});

export function EmptyIllustration({
  kind = 'meds',
}: {
  kind?: 'meds' | 'docs' | 'calendar' | 'feed';
}) {
  const icon =
    kind === 'docs'
      ? 'people-outline'
      : kind === 'calendar'
        ? 'calendar-outline'
        : kind === 'feed'
          ? 'pulse-outline'
          : 'medical-outline';
  return (
    <Animated.View entering={FadeIn.duration(450)} style={emptyStyles.wrap}>
      <View style={emptyStyles.circle}>
        {kind === 'meds' ? (
          <PillGlyph size={36} color={colors.primarySoft} />
        ) : (
          <Ionicons name={icon as any} size={34} color={colors.primarySoft} />
        )}
      </View>
    </Animated.View>
  );
}

const emptyStyles = StyleSheet.create({
  wrap: { alignItems: 'center', paddingVertical: 28 },
  circle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.border,
  },
});

/** Pulsing attention orb for overdue / critical */
export function PulseDot({ color = colors.danger, size = 10 }: { color?: string; size?: number }) {
  const s = useSharedValue(1);
  useEffect(() => {
    s.value = withRepeat(
      withSequence(withTiming(1.35, { duration: 700 }), withTiming(1, { duration: 700 })),
      -1,
      false
    );
  }, [s]);
  const style = useAnimatedStyle(() => ({
    transform: [{ scale: s.value }],
    opacity: 2 - s.value,
  }));
  return (
    <View style={{ width: size * 1.6, height: size * 1.6, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View
        style={[
          {
            position: 'absolute',
            width: size * 1.6,
            height: size * 1.6,
            borderRadius: size,
            backgroundColor: color,
            opacity: 0.35,
          },
          style,
        ]}
      />
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
        }}
      />
    </View>
  );
}

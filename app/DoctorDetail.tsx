import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  Share,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { Text } from './_components/customizableFontElements';
import { colors, radii, spacing } from './_theme/colors';
import { screen } from './_theme/styles';
import { getDoctorById, mapsUrl, formatFee } from './_utils/doctorSearch';
import { Doctor, PAYMENT_OPTIONS } from './_data/pkDoctors';
import { DoctorAvatar } from './_components/DoctorAvatar';

export default function DoctorDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const doc = await getDoctorById(String(id || ''));
      if (!cancelled) {
        setDoctor(doc || null);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <ActivityIndicator color={colors.white} style={{ marginTop: 40 }} />
      </SafeAreaView>
    );
  }

  if (!doctor) {
    return (
      <SafeAreaView style={styles.safe}>
        <TouchableOpacity style={styles.back} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={colors.white} />
        </TouchableOpacity>
        <View style={screen.sheetGrow}>
          <Text style={screen.title}>Doctor not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const openMap = async () => {
    const url = mapsUrl(doctor);
    const can = await Linking.canOpenURL(url);
    if (can) Linking.openURL(url);
    else Toast.show({ type: 'error', text1: 'Could not open maps' });
  };

  const shareDoctor = async () => {
    await Share.share({
      message: `${doctor.name} · ${doctor.specialization}\n${doctor.hospital}, ${doctor.city}\nFee: ${formatFee(doctor.feePkr)}\n★ ${doctor.rating}`,
    });
  };

  const callDoctor = () => {
    if (!doctor.phone) {
      Toast.show({ type: 'info', text1: 'No phone on file' });
      return;
    }
    Linking.openURL(`tel:${doctor.phone}`);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <TouchableOpacity style={styles.back} onPress={() => router.back()}>
        <Ionicons name="arrow-back" size={22} color={colors.white} />
      </TouchableOpacity>

      <ScrollView style={styles.sheet} contentContainerStyle={{ padding: spacing.lg, paddingBottom: 48 }}>
        <View style={styles.heroRow}>
          <DoctorAvatar photoUrl={doctor.photoUrl} initials={doctor.photo} size={72} />
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{doctor.name}</Text>
            <Text style={styles.spec}>{doctor.specialization}</Text>
            <Text style={styles.rating}>
              ★ {doctor.rating.toFixed(1)} · {doctor.reviewCount} reviews · {doctor.experienceYears}y
            </Text>
          </View>
        </View>

        <View style={styles.badgeRow}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{formatFee(doctor.feePkr)}</Text>
          </View>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{doctor.city}</Text>
          </View>
          <View style={styles.badgeMuted}>
            <Text style={styles.badgeMutedText}>{doctor.pmdcHint}</Text>
          </View>
        </View>

        <Text style={styles.section}>Hospital & location</Text>
        <Text style={styles.body}>{doctor.hospital}</Text>
        <Text style={styles.muted}>
          {doctor.area}, {doctor.city}
        </Text>
        <Text style={styles.muted}>{doctor.address}</Text>
        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.mapBtn} onPress={openMap}>
            <Ionicons name="map-outline" size={18} color={colors.white} />
            <Text style={styles.mapBtnText}>Open in Maps</Text>
          </TouchableOpacity>
          {doctor.phone ? (
            <TouchableOpacity style={styles.callBtn} onPress={callDoctor}>
              <Ionicons name="call-outline" size={18} color={colors.primary} />
              <Text style={styles.callBtnText}>Call</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {doctor.diseases.length > 0 ? (
          <>
            <Text style={styles.section}>Treats</Text>
            <View style={styles.wrap}>
              {doctor.diseases.map((d) => (
                <View key={d} style={styles.tag}>
                  <Text style={styles.tagText}>{d}</Text>
                </View>
              ))}
            </View>
          </>
        ) : null}

        {doctor.qualifications ? (
          <>
            <Text style={styles.section}>Qualifications</Text>
            <Text style={styles.body}>{doctor.qualifications}</Text>
          </>
        ) : null}

        <Text style={styles.section}>About</Text>
        <Text style={styles.body}>{doctor.about}</Text>

        <Text style={styles.section}>Languages</Text>
        <Text style={styles.body}>{doctor.languages.join(', ')}</Text>

        <Text style={styles.section}>Payment methods</Text>
        <View style={styles.wrap}>
          {doctor.paymentMethods.map((p) => {
            const label = PAYMENT_OPTIONS.find((x) => x.id === p)?.label || p;
            return (
              <View key={p} style={styles.tag}>
                <Text style={styles.tagText}>{label}</Text>
              </View>
            );
          })}
        </View>

        <Text style={styles.section}>Availability</Text>
        <Text style={styles.body}>Days: {doctor.availableDays.join(', ')}</Text>
        <Text style={styles.muted}>Slots: {doctor.availableSlots.join(' · ')}</Text>

        <TouchableOpacity
          style={styles.primary}
          onPress={() =>
            router.push({
              pathname: '/BookAppointment',
              params: { doctorId: doctor.id },
            })
          }
        >
          <Text style={styles.primaryText}>Book appointment</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.secondary} onPress={shareDoctor}>
          <Text style={styles.secondaryText}>Share doctor</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.primary },
  back: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
  sheet: {
    flex: 1,
    backgroundColor: colors.bg,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
  },
  heroRow: { flexDirection: 'row', gap: 14, alignItems: 'center', marginBottom: spacing.md },
  name: { fontSize: 22, fontWeight: '800', color: colors.primary },
  spec: { color: colors.text, fontWeight: '600', marginTop: 2 },
  rating: { color: colors.textMuted, marginTop: 4 },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: spacing.md },
  badge: {
    backgroundColor: colors.accentSoft,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  badgeText: { color: colors.primary, fontWeight: '700', fontSize: 12 },
  badgeMuted: {
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  badgeMutedText: { color: colors.textMuted, fontSize: 11, fontWeight: '600' },
  section: {
    marginTop: spacing.md,
    marginBottom: 6,
    fontWeight: '700',
    color: colors.primary,
    fontSize: 16,
  },
  body: { color: colors.text, lineHeight: 20 },
  muted: { color: colors.textMuted, marginTop: 2 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tag: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
  },
  tagText: { color: colors.text, fontSize: 12, fontWeight: '600' },
  actionRow: { flexDirection: 'row', gap: 10, marginTop: 10, flexWrap: 'wrap' },
  mapBtn: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radii.sm,
    alignItems: 'center',
  },
  mapBtnText: { color: colors.white, fontWeight: '700' },
  callBtn: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radii.sm,
    alignItems: 'center',
  },
  callBtnText: { color: colors.primary, fontWeight: '700' },
  primary: {
    marginTop: spacing.lg,
    backgroundColor: colors.accent,
    padding: 16,
    borderRadius: radii.md,
    alignItems: 'center',
  },
  primaryText: { color: colors.white, fontWeight: '800', fontSize: 16 },
  secondary: {
    marginTop: 10,
    padding: 14,
    borderRadius: radii.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  secondaryText: { color: colors.primary, fontWeight: '700' },
});

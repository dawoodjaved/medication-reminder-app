import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { ID } from 'appwrite';
import { Text } from './_components/customizableFontElements';
import { colors, radii, spacing } from './_theme/colors';
import { screen } from './_theme/styles';
import { getDoctorById, formatFee } from './_utils/doctorSearch';
import { database, config } from '../config/appwriteConfig';
import { useAuth } from './_context/authContext';
import { sharedPermissions } from './_utils/patientScope';
import { todayISO, addDays, formatDateISO } from './_utils/dates';
import { Doctor, PAYMENT_OPTIONS, PaymentMethod } from './_data/pkDoctors';

export default function BookAppointment() {
  const { doctorId, disease } = useLocalSearchParams<{ doctorId: string; disease?: string }>();
  const { scope } = useAuth();
  const router = useRouter();

  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [loadingDoctor, setLoadingDoctor] = useState(true);

  const dateOptions = useMemo(() => {
    const start = new Date();
    return Array.from({ length: 14 }, (_, i) => formatDateISO(addDays(start, i)));
  }, []);

  const [date, setDate] = useState(dateOptions[0] || todayISO());
  const [time, setTime] = useState('10:00');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [notes, setNotes] = useState('');
  const [reason, setReason] = useState(String(disease || ''));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingDoctor(true);
      const doc = await getDoctorById(String(doctorId || ''));
      if (!cancelled) {
        setDoctor(doc || null);
        if (doc) {
          setTime(doc.availableSlots[0] || '10:00');
          setPaymentMethod(doc.paymentMethods[0] || 'cash');
        }
        setLoadingDoctor(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [doctorId]);

  const book = useCallback(async () => {
    if (!doctor) return;
    if (!scope?.patientId) {
      Toast.show({ type: 'error', text1: 'Sign in required' });
      return;
    }
    setSaving(true);
    try {
      await database.createDocument(
        config.db,
        config.col.appointments,
        ID.unique(),
        {
          patientId: scope.patientId,
          doctorId: doctor.id,
          doctorName: doctor.name,
          specialization: doctor.specialization,
          hospital: doctor.hospital,
          city: doctor.city,
          disease: reason.trim() || doctor.diseases[0] || '',
          date,
          time,
          feePkr: String(doctor.feePkr),
          status: 'scheduled',
          notes: notes.trim(),
          paymentMethod,
        },
        sharedPermissions(scope.patientId)
      );
      Toast.show({
        type: 'success',
        text1: 'Appointment booked',
        text2: `${doctor.name} · ${date} ${time}`,
      });
      router.replace('/MyAppointments');
    } catch (e) {
      console.error(e);
      Toast.show({
        type: 'error',
        text1: 'Booking failed',
        text2: 'Ensure appointments table exists in Appwrite.',
      });
    } finally {
      setSaving(false);
    }
  }, [doctor, scope, reason, date, time, notes, paymentMethod, router]);

  if (loadingDoctor) {
    return (
      <SafeAreaView style={styles.safe}>
        <ActivityIndicator color={colors.white} style={{ marginTop: 40 }} />
      </SafeAreaView>
    );
  }

  if (!doctor) {
    return (
      <SafeAreaView style={styles.safe}>
        <Text style={{ color: colors.white, padding: 20 }}>Doctor not found</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <TouchableOpacity style={styles.back} onPress={() => router.back()}>
        <Ionicons name="arrow-back" size={22} color={colors.white} />
      </TouchableOpacity>

      <ScrollView style={styles.sheet} contentContainerStyle={{ padding: spacing.lg, paddingBottom: 40 }}>
        <Text style={screen.brand}>MedRem</Text>
        <Text style={screen.title}>Book appointment</Text>
        <Text style={screen.subtitle}>
          {doctor.name} · {doctor.hospital} · {formatFee(doctor.feePkr)}
        </Text>

        <Text style={screen.label}>Reason / disease</Text>
        <TextInput
          style={screen.input}
          placeholder="e.g. diabetes follow-up"
          placeholderTextColor={colors.textMuted}
          value={reason}
          onChangeText={setReason}
        />

        <Text style={screen.label}>Date</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
          {dateOptions.map((d) => (
            <TouchableOpacity
              key={d}
              style={[styles.chip, date === d && styles.chipOn]}
              onPress={() => setDate(d)}
            >
              <Text style={[styles.chipText, date === d && styles.chipTextOn]}>{d.slice(5)}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <Text style={screen.label}>Time</Text>
        <View style={styles.wrap}>
          {doctor.availableSlots.map((t) => (
            <TouchableOpacity
              key={t}
              style={[styles.chip, time === t && styles.chipOn]}
              onPress={() => setTime(t)}
            >
              <Text style={[styles.chipText, time === t && styles.chipTextOn]}>{t}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={screen.label}>Payment at clinic</Text>
        <View style={styles.wrap}>
          {doctor.paymentMethods.map((p) => {
            const label = PAYMENT_OPTIONS.find((x) => x.id === p)?.label || p;
            return (
              <TouchableOpacity
                key={p}
                style={[styles.chip, paymentMethod === p && styles.chipOn]}
                onPress={() => setPaymentMethod(p)}
              >
                <Text style={[styles.chipText, paymentMethod === p && styles.chipTextOn]}>
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={screen.label}>Notes (optional)</Text>
        <TextInput
          style={[screen.input, { minHeight: 80, textAlignVertical: 'top' }]}
          placeholder="Symptoms, preferred floor, caregiver name…"
          placeholderTextColor={colors.textMuted}
          multiline
          value={notes}
          onChangeText={setNotes}
        />

        <TouchableOpacity
          style={[screen.primaryBtn, saving && { opacity: 0.7 }]}
          onPress={book}
          disabled={saving}
        >
          <Text style={screen.primaryBtnText}>{saving ? 'Booking…' : 'Confirm booking'}</Text>
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
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: 8,
  },
  chipOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { color: colors.text, fontWeight: '600', fontSize: 13 },
  chipTextOn: { color: colors.white },
});

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { Text } from './customizableFontElements';
import * as Print from 'expo-print';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { database, account, config } from '../../config/appwriteConfig';
import { Query } from 'appwrite';
import { resolvePatientScope } from '../_utils/patientScope';
import { colors, radii, spacing } from '../_theme/colors';
import { screen } from '../_theme/styles';
import { ProgressRing, MedHintIcon, SoftOrbs, FadeBlock } from '../_theme/visuals';

interface Medication {
  name: string;
  dose: number | string;
}

function formatDateToISO(dateObj: Date): string {
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDateForDisplay(dateStr: string): string {
  const [year, month, day] = dateStr.split('-');
  return `${day}/${month}/${year}`;
}

export default function MedicineReportHistory() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 6);
    return formatDateToISO(d);
  });
  const [endDate, setEndDate] = useState(() => formatDateToISO(new Date()));
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [dateRangeLabel, setDateRangeLabel] = useState('');
  const [taken, setTaken] = useState<Medication[]>([]);
  const [missed, setMissed] = useState<Medication[]>([]);
  const [adherence, setAdherence] = useState(0);
  const [symptoms, setSymptoms] = useState<
    { date: string; note: string; severity?: string; medicineName?: string }[]
  >([]);

  const fetchMedicationReport = useCallback(async () => {
    setLoading(true);
    const rangeLabel = `${formatDateForDisplay(startDate)} – ${formatDateForDisplay(endDate)}`;
    setDateRangeLabel(rangeLabel);

    try {
      let patientId: string | null = null;
      try {
        const user = await account.get();
        patientId = user.$id;
        const scope = await resolvePatientScope();
        if (scope?.patientId) patientId = scope.patientId;
      } catch {
        setTaken([]);
        setMissed([]);
        setAdherence(0);
        setSymptoms([]);
        Toast.show({
          type: 'info',
          text1: 'Sign in required',
          text2: 'Log in to view adherence reports.',
        });
        return;
      }

      const res = await database.listDocuments(config.db, config.col.reminders, [
        Query.equal('userId', patientId!),
        Query.greaterThanEqual('date', startDate),
        Query.lessThanEqual('date', endDate),
        Query.orderDesc('date'),
        Query.limit(200),
      ]);

      const docs = res.documents;
      const takenDocs = docs
        .filter((doc: any) => doc.taken === true)
        .map((doc: any) => ({
          name: doc.medicineName,
          dose: doc.medicines?.frequency || 'N/A',
        }));
      const missedDocs = docs
        .filter((doc: any) => doc.taken === false)
        .map((doc: any) => ({
          name: doc.medicineName,
          dose: doc.medicines?.frequency || 'N/A',
        }));

      const total = docs.length;
      setAdherence(total > 0 ? Math.round((takenDocs.length / total) * 100) : 0);
      setTaken(takenDocs);
      setMissed(missedDocs);

      try {
        const sym = await database.listDocuments(config.db, config.col.symptoms, [
          Query.equal('patientId', patientId!),
          Query.greaterThanEqual('date', startDate),
          Query.lessThanEqual('date', endDate),
          Query.orderDesc('date'),
          Query.limit(100),
        ]);
        setSymptoms(
          sym.documents.map((d: any) => ({
            date: d.date,
            note: d.note,
            severity: d.severity,
            medicineName: d.medicineName,
          }))
        );
      } catch {
        setSymptoms([]);
      }

      if (docs.length === 0) {
        Toast.show({
          type: 'info',
          text1: 'No data',
          text2: 'No medication data in this range.',
        });
      }
    } catch (err) {
      console.error(err);
      Toast.show({ type: 'error', text1: 'Error', text2: 'Failed to fetch report.' });
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    fetchMedicationReport();
  }, [fetchMedicationReport]);

  const generatePDF = useCallback(async () => {
    const symptomHtml = symptoms.length
      ? symptoms
          .map(
            (s) =>
              `<li><strong>${s.date}</strong>${s.medicineName ? ` · ${s.medicineName}` : ''} (${s.severity || 'n/a'}): ${s.note}</li>`
          )
          .join('')
      : '<li>None logged</li>';

    const html = `
      <html>
        <body style="font-family: Arial; padding: 20px; color: #1A2332;">
          <h1 style="color: #1E3A5F;">MedRem · Doctor export pack</h1>
          <p><strong>Date range:</strong> ${dateRangeLabel}</p>
          <h2 style="color: #3D7EA6;">Taken</h2>
          <ul>${taken.map((m) => `<li>${m.name} — ${m.dose}</li>`).join('') || '<li>None</li>'}</ul>
          <h2 style="color: #C45C5C;">Missed</h2>
          <ul>${missed.map((m) => `<li>${m.name} — ${m.dose}</li>`).join('') || '<li>None</li>'}</ul>
          <h2 style="color: #1E3A5F;">Adherence</h2>
          <p style="font-size: 24px; font-weight: bold;">${adherence}%</p>
          <h2 style="color: #1E3A5F;">Symptom log</h2>
          <ul>${symptomHtml}</ul>
          <p style="margin-top:24px;color:#6B7280;font-size:12px;">Generated by MedRem for clinical review. Not a medical diagnosis.</p>
        </body>
      </html>
    `;
    try {
      const { uri } = await Print.printToFileAsync({ html });
      await Sharing.shareAsync(uri);
      await FileSystem.deleteAsync(uri, { idempotent: true });
      Toast.show({ type: 'success', text1: 'Doctor pack exported' });
    } catch (error) {
      console.error(error);
      Toast.show({ type: 'error', text1: 'Export failed' });
    }
  }, [dateRangeLabel, taken, missed, adherence, symptoms]);

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ color: colors.textMuted, marginTop: 8 }}>Loading report…</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={screen.brand}>INSIGHTS</Text>
        <Text style={screen.title}>Reports</Text>

        <View style={styles.rangeCard}>
          <TouchableOpacity style={styles.dateChip} onPress={() => setShowStartPicker(true)}>
            <Text style={styles.dateChipText}>{formatDateForDisplay(startDate)}</Text>
          </TouchableOpacity>
          <Text style={{ color: colors.textMuted }}>—</Text>
          <TouchableOpacity style={styles.dateChip} onPress={() => setShowEndPicker(true)}>
            <Text style={styles.dateChipText}>{formatDateForDisplay(endDate)}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.genBtn} onPress={fetchMedicationReport}>
            <Ionicons name="refresh" size={16} color={colors.white} />
          </TouchableOpacity>
        </View>

        {showStartPicker && (
          <DateTimePicker
            value={new Date(startDate)}
            mode="date"
            display="default"
            onChange={(_, d) => {
              setShowStartPicker(false);
              if (d) setStartDate(formatDateToISO(d));
            }}
          />
        )}
        {showEndPicker && (
          <DateTimePicker
            value={new Date(endDate)}
            mode="date"
            display="default"
            onChange={(_, d) => {
              setShowEndPicker(false);
              if (d) setEndDate(formatDateToISO(d));
            }}
          />
        )}

        <FadeBlock style={styles.adherenceHero}>
          <SoftOrbs />
          <ProgressRing
            progress={adherence}
            size={110}
            stroke={10}
            label={`${adherence}%`}
            sublabel="done"
            trackColor="rgba(255,255,255,0.2)"
            fillColor={colors.accent}
            labelColor={colors.white}
          />
          <View style={styles.adherenceSide}>
            <View style={styles.miniStat}>
              <Text style={styles.miniStatNum}>{taken.length}</Text>
              <Ionicons name="checkmark-circle" size={16} color={colors.accentSoft} />
            </View>
            <View style={styles.miniStat}>
              <Text style={styles.miniStatNum}>{missed.length}</Text>
              <Ionicons name="close-circle" size={16} color={colors.accentSoft} />
            </View>
          </View>
        </FadeBlock>

        <View style={screen.card}>
          <Text style={styles.sectionTitle}>Taken</Text>
          {taken.length ? (
            taken.map((med, i) => (
              <View style={styles.row} key={`t-${i}`}>
                <MedHintIcon size={32} />
                <Text style={[styles.medText, { marginLeft: 10, flex: 1 }]} numberOfLines={1}>
                  {med.name}
                </Text>
                <View style={styles.doseTag}>
                  <Text style={styles.doseTagText}>{med.dose}</Text>
                </View>
              </View>
            ))
          ) : (
            <Text style={styles.empty}>—</Text>
          )}
        </View>

        <View style={screen.card}>
          <Text style={styles.sectionTitle}>Missed</Text>
          {missed.length ? (
            missed.map((med, i) => (
              <View style={styles.row} key={`m-${i}`}>
                <MedHintIcon size={32} critical />
                <Text style={[styles.medText, { marginLeft: 10, flex: 1 }]} numberOfLines={1}>
                  {med.name}
                </Text>
                <View style={styles.doseTag}>
                  <Text style={styles.doseTagText}>{med.dose}</Text>
                </View>
              </View>
            ))
          ) : (
            <Text style={styles.empty}>—</Text>
          )}
        </View>

        <View style={screen.card}>
          <Text style={styles.sectionTitle}>Symptoms</Text>
          {symptoms.length ? (
            symptoms.map((s, i) => (
              <View style={styles.row} key={`s-${i}`}>
                <View style={styles.symptomOrb}>
                  <Ionicons name="pulse" size={14} color={colors.accent} />
                </View>
                <Text style={[styles.medText, { marginLeft: 10 }]} numberOfLines={2}>
                  {s.date}
                  {s.medicineName ? ` · ${s.medicineName}` : ''}
                </Text>
              </View>
            ))
          ) : (
            <Text style={styles.empty}>—</Text>
          )}
        </View>

        <TouchableOpacity
          style={[screen.primaryBtn, { backgroundColor: colors.primarySoft, marginBottom: 10 }]}
          onPress={() => router.push('/LogSymptom')}
        >
          <Text style={screen.primaryBtnText}>Log symptom</Text>
        </TouchableOpacity>

        <TouchableOpacity style={screen.primaryBtn} onPress={generatePDF}>
          <Text style={screen.primaryBtnText}>Export PDF</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.bg,
  },
  content: { padding: spacing.lg, paddingBottom: 48 },
  rangeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: spacing.md,
  },
  dateChip: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.sm,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  dateChipText: { color: colors.primary, fontWeight: '700', fontSize: 13 },
  genBtn: {
    backgroundColor: colors.primary,
    borderRadius: radii.sm,
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  genBtnText: { color: colors.white, fontWeight: '700' },
  adherenceHero: {
    backgroundColor: colors.primary,
    borderRadius: radii.lg,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    marginBottom: spacing.md,
    overflow: 'hidden',
  },
  adherenceSide: { gap: 12, zIndex: 1 },
  miniStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radii.pill,
  },
  miniStatNum: { color: colors.white, fontWeight: '800', fontSize: 18 },
  adherencePct: { color: colors.white, fontSize: 40, fontWeight: '800' },
  adherenceLabel: { color: colors.accentSoft, marginTop: 4 },
  sectionTitle: {
    fontWeight: '800',
    color: colors.primary,
    marginBottom: 10,
    fontSize: 15,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  medText: { color: colors.text, fontWeight: '600' },
  doseTag: {
    backgroundColor: colors.cobaltGlow,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radii.pill,
  },
  doseTagText: { color: colors.primarySoft, fontWeight: '700', fontSize: 12 },
  symptomOrb: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.sandGlow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  empty: { color: colors.textMuted },
});

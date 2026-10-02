import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '../_components/customizableFontElements';
import { colors, radii, spacing } from '../_theme/colors';
import { MedHintIcon, FadeBlock, EmptyIllustration, ProgressRing } from '../_theme/visuals';
import { database, config } from '../../config/appwriteConfig';
import { Query } from 'appwrite';
import { useAuth } from '../_context/authContext';
import { getWeekDates, todayISO } from '../_utils/dates';

const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

export default function CalendarScreen() {
  const { scope } = useAuth();
  const week = useMemo(() => getWeekDates(), []);
  const [selected, setSelected] = useState(todayISO());
  const [loading, setLoading] = useState(true);
  const [reminders, setReminders] = useState<any[]>([]);
  const [dots, setDots] = useState<Record<string, number>>({});
  const [takenMap, setTakenMap] = useState<Record<string, number>>({});
  const patientId = scope?.patientId;

  const loadWeek = useCallback(async () => {
    if (!patientId) {
      setDots({});
      setTakenMap({});
      return;
    }
    try {
      const res = await database.listDocuments(config.db, config.col.reminders, [
        Query.equal('userId', patientId),
        Query.greaterThanEqual('date', week[0]),
        Query.lessThanEqual('date', week[6]),
        Query.limit(200),
      ]);
      const count: Record<string, number> = {};
      const taken: Record<string, number> = {};
      for (const d of week) {
        count[d] = 0;
        taken[d] = 0;
      }
      for (const r of res.documents) {
        count[r.date] = (count[r.date] || 0) + 1;
        if (r.taken) taken[r.date] = (taken[r.date] || 0) + 1;
      }
      setDots(count);
      setTakenMap(taken);
    } catch (e) {
      console.error(e);
    }
  }, [patientId, week]);

  const loadDay = useCallback(async () => {
    if (!patientId) {
      setReminders([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await database.listDocuments(config.db, config.col.reminders, [
        Query.equal('userId', patientId),
        Query.equal('date', selected),
        Query.orderAsc('time'),
        Query.limit(100),
      ]);
      setReminders(res.documents);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [patientId, selected]);

  useFocusEffect(
    useCallback(() => {
      loadWeek();
      loadDay();
    }, [loadWeek, loadDay])
  );

  const weekPct = useMemo(() => {
    let t = 0;
    let d = 0;
    for (const day of week) {
      t += dots[day] || 0;
      d += takenMap[day] || 0;
    }
    return t ? Math.round((d / t) * 100) : 0;
  }, [week, dots, takenMap]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.brand}>WEEK</Text>
          <Text style={styles.title}>Calendar</Text>
        </View>
        <ProgressRing progress={weekPct} size={64} stroke={6} label={`${weekPct}%`} />
      </View>

      <View style={styles.weekRow}>
        {week.map((date, i) => {
          const active = date === selected;
          const isToday = date === todayISO();
          const total = dots[date] || 0;
          const done = takenMap[date] || 0;
          const dayPct = total ? Math.round((done / total) * 100) : 0;
          return (
            <TouchableOpacity
              key={date}
              style={[styles.dayCell, active && styles.dayActive, isToday && !active && styles.dayToday]}
              onPress={() => setSelected(date)}
            >
              <Text style={[styles.dayLabel, active && styles.dayLabelActive]}>{DAY_LABELS[i]}</Text>
              <Text style={[styles.dayNum, active && styles.dayLabelActive]}>{date.slice(-2)}</Text>
              {!!total && (
                <View style={styles.miniBarTrack}>
                  <View
                    style={[
                      styles.miniBarFill,
                      {
                        width: `${Math.max(12, dayPct)}%`,
                        backgroundColor: active ? colors.accentSoft : colors.accent,
                      },
                    ]}
                  />
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={colors.primary} />
      ) : (
        <FlatList
          data={reminders}
          keyExtractor={(i) => i.$id}
          contentContainerStyle={{ padding: spacing.lg }}
          ListEmptyComponent={
            <View>
              <EmptyIllustration kind="calendar" />
              <Text style={styles.empty}>No doses</Text>
            </View>
          }
          renderItem={({ item, index }) => (
            <FadeBlock delay={Math.min(index * 35, 200)}>
              <View style={[styles.card, item.taken && styles.cardDone]}>
                <MedHintIcon
                  type={item.medicines?.medicineType}
                  critical={!!item.medicines?.isCritical}
                  size={42}
                />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.name} numberOfLines={1}>
                    {item.medicineName}
                  </Text>
                  <Text style={styles.meta}>{item.time}</Text>
                </View>
                <View
                  style={[
                    styles.statusOrb,
                    { backgroundColor: item.taken ? colors.success : colors.warning },
                  ]}
                >
                  <Ionicons
                    name={item.taken ? 'checkmark' : 'time-outline'}
                    size={14}
                    color={colors.white}
                  />
                </View>
              </View>
            </FadeBlock>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  brand: { color: colors.accent, fontSize: 11, fontWeight: '800', letterSpacing: 1.6 },
  title: {
    fontSize: 30,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: -0.4,
  },
  weekRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    gap: 4,
  },
  dayCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dayActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  dayToday: { borderColor: colors.accent, borderWidth: 1.5 },
  dayLabel: { fontSize: 11, color: colors.textMuted, fontWeight: '700' },
  dayNum: { fontSize: 15, fontWeight: '800', color: colors.text, marginTop: 4 },
  dayLabelActive: { color: colors.white },
  miniBarTrack: {
    width: '70%',
    height: 3,
    backgroundColor: colors.ringTrack,
    borderRadius: 2,
    marginTop: 6,
    overflow: 'hidden',
  },
  miniBarFill: { height: 3, borderRadius: 2 },
  empty: { textAlign: 'center', color: colors.textMuted },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardDone: { opacity: 0.52 },
  name: { fontWeight: '700', color: colors.text, fontSize: 15 },
  meta: { color: colors.textMuted, marginTop: 2, fontWeight: '600', fontSize: 13 },
  statusOrb: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

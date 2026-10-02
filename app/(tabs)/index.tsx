import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { Text } from '../_components/customizableFontElements';
import { colors, radii, spacing } from '../_theme/colors';
import {
  ProgressRing,
  SoftOrbs,
  MedHintIcon,
  FadeBlock,
  StatBubble,
  EmptyIllustration,
  PulseDot,
} from '../_theme/visuals';
import { database, config } from '../../config/appwriteConfig';
import { Query } from 'appwrite';
import { useAuth } from '../_context/authContext';
import { todayISO } from '../_utils/dates';
import { markTaken, flushOfflineQueue } from '../_utils/reminderActions';
import { predictRefill, formatRefillShareList, RefillInfo } from '../_utils/refillPrediction';
import { buildWidgetSnapshot, saveWidgetSnapshot } from '../_utils/widgetSnapshot';

type Reminder = {
  $id: string;
  medicineName: string;
  time: string;
  taken: boolean;
  snoozed: boolean;
  medicines?: {
    $id?: string;
    isCritical?: boolean;
    instructions?: string;
    medicineType?: string;
  };
};

export default function TodayScreen() {
  const { scope } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [refills, setRefills] = useState<RefillInfo[]>([]);
  const patientId = scope?.patientId;

  const load = useCallback(async () => {
    if (!patientId) {
      setLoading(false);
      setRefreshing(false);
      setReminders([]);
      return;
    }
    try {
      await flushOfflineQueue();
      const res = await database.listDocuments(config.db, config.col.reminders, [
        Query.equal('userId', patientId),
        Query.equal('date', todayISO()),
        Query.orderAsc('time'),
        Query.limit(100),
      ]);
      const docs = res.documents as unknown as Reminder[];
      setReminders(docs);

      let medDocs: any[] = [];
      try {
        const meds = await database.listDocuments(config.db, config.col.medicines, [
          Query.equal('patientId', patientId),
          Query.limit(50),
        ]);
        medDocs = meds.documents;
        setRefills(medDocs.map(predictRefill).filter((r) => r.isLow));
      } catch {
        setRefills([]);
      }
      await saveWidgetSnapshot(buildWidgetSnapshot({ reminders: docs, medicines: medDocs }));
    } catch (e) {
      console.error(e);
      Toast.show({ type: 'error', text1: 'Could not load today' });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [patientId]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load();
    }, [load])
  );

  const stats = useMemo(() => {
    const total = reminders.length;
    const taken = reminders.filter((r) => r.taken).length;
    const pending = reminders.filter((r) => !r.taken);
    const nowMins = new Date().getHours() * 60 + new Date().getMinutes();
    const overdue = pending.filter((r) => {
      const [h, m] = r.time.split(':').map(Number);
      return h * 60 + m < nowMins;
    });
    const upcoming = pending
      .filter((r) => {
        const [h, m] = r.time.split(':').map(Number);
        return h * 60 + m >= nowMins;
      })
      .sort((a, b) => a.time.localeCompare(b.time));
    return {
      total,
      taken,
      overdue,
      next: upcoming[0] || null,
      pct: total ? Math.round((taken / total) * 100) : 0,
    };
  }, [reminders]);

  const onTaken = async (item: Reminder) => {
    try {
      const result = await markTaken(item.$id, item.medicines?.$id);
      Toast.show({
        type: 'success',
        text1: result.queued ? 'Saved offline' : 'Taken',
        text2: item.medicineName,
      });
      load();
    } catch {
      Toast.show({ type: 'error', text1: 'Update failed' });
    }
  };

  const shareRefillList = async () => {
    if (!refills.length) {
      Toast.show({ type: 'info', text1: 'Stock looks fine' });
      return;
    }
    try {
      await Share.share({
        message: formatRefillShareList(refills, scope?.role === 'caregiver' ? 'Patient' : 'Me'),
      });
    } catch {
      /* cancelled */
    }
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <FlatList
        data={reminders}
        keyExtractor={(i) => i.$id}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              load();
            }}
            tintColor={colors.primary}
          />
        }
        ListHeaderComponent={
          <View style={styles.headerBlock}>
            <FadeBlock>
              <Text style={styles.brand}>MEDREM</Text>
              <Text style={styles.title}>Today</Text>
            </FadeBlock>

            <FadeBlock delay={50} style={styles.hero}>
              <SoftOrbs />
              <ProgressRing
                progress={stats.pct}
                size={92}
                stroke={9}
                label={`${stats.pct}%`}
                sublabel="done"
                trackColor="rgba(255,255,255,0.2)"
                fillColor={colors.accent}
                labelColor={colors.white}
              />
              <View style={styles.heroCopy}>
                {stats.next ? (
                  <>
                    <View style={styles.nextRow}>
                      <MedHintIcon
                        type={stats.next.medicines?.medicineType}
                        critical={!!stats.next.medicines?.isCritical}
                        size={38}
                      />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.heroTime}>{stats.next.time}</Text>
                        <Text style={styles.heroMed} numberOfLines={1}>
                          {stats.next.medicineName}
                        </Text>
                      </View>
                    </View>
                    <TouchableOpacity style={styles.takenBtn} onPress={() => onTaken(stats.next!)}>
                      <Ionicons name="checkmark" size={16} color={colors.white} />
                      <Text style={styles.takenBtnText}>Taken</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <>
                    <Text style={styles.heroTime}>All clear</Text>
                    <Text style={styles.heroMed}>{stats.total ? 'Complete' : 'No doses'}</Text>
                    <TouchableOpacity
                      style={styles.takenBtn}
                      onPress={() => router.push('/AddMedicine')}
                    >
                      <Ionicons name="add" size={16} color={colors.white} />
                      <Text style={styles.takenBtnText}>Add</Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            </FadeBlock>

            <FadeBlock delay={90} style={styles.statRow}>
              <StatBubble value={stats.taken} label="Taken" tone="ok" icon="checkmark" />
              <StatBubble value={stats.overdue.length} label="Late" tone="warn" icon="time" />
              <StatBubble value={refills.length} label="Refill" tone="accent" icon="cube" />
            </FadeBlock>

            <FadeBlock delay={120} style={styles.quickRow}>
              {scope?.role === 'caregiver' && (
                <TouchableOpacity style={styles.quickChip} onPress={() => router.push('/CaregiverFeed')}>
                  <Ionicons name="pulse" size={20} color={colors.primary} />
                </TouchableOpacity>
              )}
              <TouchableOpacity style={styles.quickChip} onPress={() => router.push('/LogSymptom')}>
                <Ionicons name="heart-outline" size={20} color={colors.accent} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.quickChip} onPress={shareRefillList}>
                <Ionicons name="share-outline" size={20} color={colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.quickChip} onPress={() => router.push('/(tabs)/doctors')}>
                <Ionicons name="people-outline" size={20} color={colors.primarySoft} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.quickChip, styles.quickChipAccent]}
                onPress={() => router.push('/AddMedicine')}
              >
                <Ionicons name="add" size={22} color={colors.white} />
              </TouchableOpacity>
            </FadeBlock>

            {stats.overdue.length > 0 && (
              <View style={styles.bannerDanger}>
                <PulseDot />
                <Text style={styles.bannerNum}>{stats.overdue.length}</Text>
              </View>
            )}

            {refills.length > 0 && (
              <TouchableOpacity style={styles.bannerWarn} onPress={shareRefillList}>
                <Ionicons name="cube-outline" size={18} color={colors.warning} />
                <Text style={styles.bannerText} numberOfLines={1}>
                  {refills.slice(0, 2).map((r) => r.medicineName).join(' · ')}
                </Text>
              </TouchableOpacity>
            )}

            <Text style={styles.sectionTitle}>Schedule</Text>
          </View>
        }
        ListEmptyComponent={
          <View>
            <EmptyIllustration kind="meds" />
            <Text style={styles.empty}>Nothing scheduled</Text>
          </View>
        }
        contentContainerStyle={{ paddingBottom: 40 }}
        renderItem={({ item, index }) => {
          const critical = !!item.medicines?.isCritical;
          return (
            <FadeBlock delay={Math.min(index * 40, 240)}>
              <View
                style={[
                  styles.card,
                  item.taken && styles.cardDone,
                  critical && !item.taken && styles.cardCritical,
                ]}
              >
                <MedHintIcon
                  type={item.medicines?.medicineType}
                  critical={critical && !item.taken}
                  size={46}
                />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.cardTitle} numberOfLines={1}>
                    {item.medicineName}
                  </Text>
                  <View style={styles.metaRow}>
                    <Text style={styles.cardMeta}>{item.time}</Text>
                    {critical && !item.taken ? <PulseDot size={8} /> : null}
                    {item.snoozed && !item.taken ? (
                      <Ionicons name="time-outline" size={14} color={colors.warning} />
                    ) : null}
                  </View>
                </View>
                {item.taken ? (
                  <View style={styles.badgeDone}>
                    <Ionicons name="checkmark" size={18} color={colors.white} />
                  </View>
                ) : (
                  <TouchableOpacity style={styles.quickTaken} onPress={() => onTaken(item)}>
                    <Ionicons name="checkmark" size={18} color={colors.white} />
                  </TouchableOpacity>
                )}
              </View>
            </FadeBlock>
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bg },
  headerBlock: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
  brand: { color: colors.accent, fontSize: 11, fontWeight: '800', letterSpacing: 1.6 },
  title: {
    color: colors.primary,
    fontSize: 34,
    fontWeight: '800',
    marginBottom: spacing.md,
    letterSpacing: -0.6,
  },
  hero: {
    backgroundColor: colors.primary,
    borderRadius: radii.lg,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    overflow: 'hidden',
  },
  heroCopy: { flex: 1, zIndex: 1 },
  nextRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  heroTime: { color: colors.accentSoft, fontSize: 12, fontWeight: '700' },
  heroMed: { color: colors.white, fontSize: 18, fontWeight: '800', marginTop: 2 },
  takenBtn: {
    alignSelf: 'flex-start',
    backgroundColor: colors.accent,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: radii.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  takenBtnText: { color: colors.white, fontWeight: '700' },
  statRow: { flexDirection: 'row', gap: 10, marginTop: spacing.md },
  quickRow: { flexDirection: 'row', gap: 10, marginTop: spacing.md },
  quickChip: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickChipAccent: { backgroundColor: colors.accent, borderColor: colors.accent },
  bannerDanger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(196,92,92,0.12)',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radii.pill,
    marginTop: spacing.md,
    alignSelf: 'flex-start',
  },
  bannerNum: { color: colors.danger, fontWeight: '800', fontSize: 16 },
  bannerWarn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(212,160,23,0.15)',
    padding: 12,
    borderRadius: radii.md,
    marginTop: spacing.sm,
  },
  bannerText: { color: colors.text, flex: 1, fontSize: 13, fontWeight: '600' },
  sectionTitle: {
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    fontWeight: '800',
    color: colors.primary,
    fontSize: 15,
  },
  empty: { textAlign: 'center', color: colors.textMuted, marginTop: 4 },
  card: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardDone: { opacity: 0.52 },
  cardCritical: { borderColor: colors.danger, borderWidth: 1.5 },
  cardTitle: { fontWeight: '700', color: colors.text, fontSize: 16 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 },
  cardMeta: { color: colors.textMuted, fontSize: 13, fontWeight: '600' },
  quickTaken: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeDone: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

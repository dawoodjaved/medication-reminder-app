import React, { useCallback, useState } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text } from './_components/customizableFontElements';
import { colors, radii, spacing } from './_theme/colors';
import {
  ProgressRing,
  MedHintIcon,
  FadeBlock,
  StatBubble,
  EmptyIllustration,
  PulseDot,
} from './_theme/visuals';
import { database, config } from '../config/appwriteConfig';
import { Query } from 'appwrite';
import { useAuth } from './_context/authContext';
import { todayISO } from './_utils/dates';

type FeedItem = {
  $id: string;
  medicineName: string;
  time: string;
  taken: boolean;
  snoozed: boolean;
  date: string;
  medicines?: { isCritical?: boolean; medicineType?: string };
};

export default function CaregiverFeed() {
  const { scope } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [items, setItems] = useState<FeedItem[]>([]);

  const load = useCallback(async () => {
    if (!scope?.patientId) {
      setLoading(false);
      setRefreshing(false);
      return;
    }
    try {
      const res = await database.listDocuments(config.db, config.col.reminders, [
        Query.equal('userId', scope.patientId),
        Query.equal('date', todayISO()),
        Query.orderAsc('time'),
        Query.limit(100),
      ]);
      setItems(res.documents as unknown as FeedItem[]);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [scope?.patientId]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load();
      const id = setInterval(load, 30000);
      return () => clearInterval(id);
    }, [load])
  );

  const taken = items.filter((i) => i.taken).length;
  const pending = items.filter((i) => !i.taken).length;
  const critical = items.filter((i) => !i.taken && i.medicines?.isCritical).length;
  const pct = items.length ? Math.round((taken / items.length) * 100) : 0;

  if (loading && !refreshing) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.top}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backOrb}>
          <Ionicons name="arrow-back" size={20} color={colors.primary} />
        </TouchableOpacity>
        <Text style={styles.title}>Live</Text>
        <View style={styles.liveOrb}>
          <PulseDot size={8} color={colors.success} />
        </View>
      </View>

      <FadeBlock style={styles.hero}>
        <ProgressRing progress={pct} size={88} stroke={8} label={`${pct}%`} sublabel="today" />
        <View style={styles.statRow}>
          <StatBubble value={taken} label="Taken" tone="ok" />
          <StatBubble value={pending} label="Wait" tone="warn" />
          <StatBubble value={critical} label="Crit" tone="accent" />
        </View>
      </FadeBlock>

      <FlatList
        data={items}
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
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: 40 }}
        ListEmptyComponent={
          <View>
            <EmptyIllustration kind="feed" />
            <Text style={styles.empty}>No doses</Text>
          </View>
        }
        renderItem={({ item, index }) => {
          const crit = !!item.medicines?.isCritical;
          return (
            <FadeBlock delay={Math.min(index * 35, 200)}>
              <View
                style={[
                  styles.card,
                  item.taken && styles.cardDone,
                  crit && !item.taken && styles.cardCritical,
                ]}
              >
                <MedHintIcon
                  type={item.medicines?.medicineType}
                  critical={crit && !item.taken}
                  size={44}
                />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.cardTitle} numberOfLines={1}>
                    {item.medicineName}
                  </Text>
                  <Text style={styles.cardMeta}>{item.time}</Text>
                </View>
                <View
                  style={[
                    styles.statusOrb,
                    {
                      backgroundColor: item.taken
                        ? colors.success
                        : item.snoozed
                          ? colors.warning
                          : colors.danger,
                    },
                  ]}
                >
                  <Ionicons
                    name={item.taken ? 'checkmark' : item.snoozed ? 'time' : 'alert'}
                    size={14}
                    color={colors.white}
                  />
                </View>
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
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  backOrb: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 22, fontWeight: '800', color: colors.primary },
  liveOrb: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.cobaltGlow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hero: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statRow: { flex: 1, flexDirection: 'row', gap: 6 },
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
  cardDone: { opacity: 0.55 },
  cardCritical: { borderColor: colors.danger, borderWidth: 1.5 },
  cardTitle: { fontWeight: '700', color: colors.text, fontSize: 15 },
  cardMeta: { color: colors.textMuted, marginTop: 2, fontWeight: '600', fontSize: 13 },
  statusOrb: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

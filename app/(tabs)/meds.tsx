import React, { memo, useCallback, useMemo, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { Text } from '../_components/customizableFontElements';
import { colors, radii, spacing } from '../_theme/colors';
import { LIST_PERF, useLayout } from '../_theme/layout';
import {
  MedHintIcon,
  ProgressBar,
  EmptyIllustration,
  StatBubble,
  PulseDot,
} from '../_theme/visuals';
import { database, config } from '../../config/appwriteConfig';
import { Query } from 'appwrite';
import { useAuth } from '../_context/authContext';
import { predictRefill, formatRefillShareList } from '../_utils/refillPrediction';

type MedItem = {
  $id: string;
  medicineName: string;
  medicineType?: string;
  frequency?: string;
  isCritical?: boolean;
  quantityRemaining?: number;
  quantity?: number;
  refillThreshold?: number;
  patientId?: string;
};

const MedRow = memo(function MedRow({
  item,
  onPress,
  onDelete,
}: {
  item: MedItem;
  onPress: (item: MedItem) => void;
  onDelete: (item: MedItem) => void;
}) {
  const info = predictRefill(item);
  const maxQ = Math.max(info.quantityRemaining, (item.refillThreshold || 10) * 3, 1);
  const stockPct = Math.min(100, Math.round((info.quantityRemaining / maxQ) * 100));

  return (
    <TouchableOpacity
      style={[styles.card, item.isCritical && styles.cardCritical]}
      onPress={() => onPress(item)}
      activeOpacity={0.85}
    >
      <MedHintIcon type={item.medicineType} critical={!!item.isCritical} size={50} />
      <View style={{ flex: 1, marginLeft: 12, minWidth: 0 }}>
        <View style={styles.nameRow}>
          <Text style={styles.name} numberOfLines={1}>
            {item.medicineName}
          </Text>
          {item.isCritical ? <PulseDot size={7} animated={false} /> : null}
        </View>
        <Text style={styles.meta} numberOfLines={1}>
          {item.medicineType || 'Tablet'}
          {item.frequency ? ` · ${item.frequency}` : ''}
        </Text>
        <View style={styles.stockRow}>
          <ProgressBar
            progress={Math.max(8, stockPct)}
            height={6}
            color={info.isLow ? colors.warning : colors.success}
            animated={false}
          />
        </View>
        <Text style={[styles.stock, info.isLow && { color: colors.warning }]}>
          {info.quantityRemaining}
          {info.daysLeft != null ? ` · ${info.daysLeft}d` : ''}
        </Text>
      </View>
      <TouchableOpacity onPress={() => onDelete(item)} hitSlop={12} style={styles.trash}>
        <Ionicons name="trash-outline" size={18} color={colors.danger} />
      </TouchableOpacity>
    </TouchableOpacity>
  );
});

export default function MedsScreen() {
  const { scope } = useAuth();
  const router = useRouter();
  const { contentPad, titleSize, listBottom } = useLayout();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [meds, setMeds] = useState<MedItem[]>([]);
  const patientId = scope?.patientId;
  const hasDataRef = useRef(false);

  const load = useCallback(async () => {
    if (!patientId) {
      setLoading(false);
      setRefreshing(false);
      setMeds([]);
      hasDataRef.current = false;
      return;
    }
    try {
      let res;
      try {
        res = await database.listDocuments(config.db, config.col.medicines, [
          Query.equal('patientId', patientId),
          Query.orderDesc('$createdAt'),
          Query.limit(100),
        ]);
      } catch {
        res = await database.listDocuments(config.db, config.col.medicines, [
          Query.orderDesc('$createdAt'),
          Query.limit(100),
        ]);
        res.documents = res.documents.filter(
          (m: any) => !m.patientId || m.patientId === patientId
        );
      }
      setMeds(res.documents as unknown as MedItem[]);
      hasDataRef.current = true;
    } catch (e) {
      console.error(e);
      Toast.show({ type: 'error', text1: 'Could not load medicines' });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [patientId]);

  useFocusEffect(
    useCallback(() => {
      if (!hasDataRef.current) setLoading(true);
      load();
    }, [load])
  );

  const summary = useMemo(() => {
    let low = 0;
    let critical = 0;
    for (const m of meds) {
      if (predictRefill(m).isLow) low++;
      if (m.isCritical) critical++;
    }
    return { total: meds.length, low, critical };
  }, [meds]);

  const confirmDelete = useCallback(
    (item: MedItem) => {
      Alert.alert('Delete', item.medicineName, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const reminders = await database.listDocuments(config.db, config.col.reminders, [
                Query.equal('medicines', item.$id),
                Query.limit(100),
              ]);
              await Promise.all(
                reminders.documents.map((r: any) =>
                  database.deleteDocument(config.db, config.col.reminders, r.$id)
                )
              );
              await database.deleteDocument(config.db, config.col.medicines, item.$id);
              Toast.show({ type: 'success', text1: 'Removed' });
              load();
            } catch {
              Toast.show({ type: 'error', text1: 'Delete failed' });
            }
          },
        },
      ]);
    },
    [load]
  );

  const shareRefills = useCallback(async () => {
    const low = meds.map(predictRefill).filter((r) => r.isLow);
    if (!low.length) {
      Toast.show({ type: 'info', text1: 'Nothing to refill' });
      return;
    }
    try {
      await Share.share({ message: formatRefillShareList(low) });
    } catch {
      /* cancelled */
    }
  }, [meds]);

  const onPressMed = useCallback(
    (item: MedItem) => {
      router.push({ pathname: '/EditMedicine', params: { id: item.$id } });
    },
    [router]
  );

  const renderItem = useCallback(
    ({ item }: { item: MedItem }) => (
      <MedRow item={item} onPress={onPressMed} onDelete={confirmDelete} />
    ),
    [onPressMed, confirmDelete]
  );

  const keyExtractor = useCallback((i: MedItem) => i.$id, []);

  if (loading && !refreshing && !hasDataRef.current) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={[styles.top, { paddingHorizontal: contentPad }]}>
        <View style={{ flexShrink: 1 }}>
          <Text style={styles.brand}>CABINET</Text>
          <Text style={[styles.title, { fontSize: titleSize }]} numberOfLines={1}>
            Medicines
          </Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity style={styles.iconBtn} onPress={shareRefills}>
            <Ionicons name="share-outline" size={18} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.addBtn} onPress={() => router.push('/AddMedicine')}>
            <Ionicons name="add" size={22} color={colors.white} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={[styles.statRow, { paddingHorizontal: contentPad }]}>
        <StatBubble value={summary.total} label="Total" tone="ok" icon="medical" />
        <StatBubble value={summary.critical} label="Critical" tone="warn" icon="alert" />
        <StatBubble value={summary.low} label="Low" tone="accent" icon="cube" />
      </View>

      <FlatList
        data={meds}
        keyExtractor={keyExtractor}
        {...LIST_PERF}
        contentContainerStyle={{
          paddingHorizontal: contentPad,
          paddingTop: spacing.sm,
          paddingBottom: listBottom,
        }}
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
        ListEmptyComponent={
          <View>
            <EmptyIllustration kind="meds" />
            <Text style={styles.empty}>Tap + to add</Text>
          </View>
        }
        renderItem={renderItem}
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
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    gap: 12,
  },
  brand: { color: colors.accent, fontSize: 11, fontWeight: '800', letterSpacing: 1.6 },
  title: { fontWeight: '800', color: colors.primary, letterSpacing: -0.4 },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  addBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: spacing.sm,
  },
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
  cardCritical: { borderColor: colors.danger, borderWidth: 1.5 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  name: { fontWeight: '800', color: colors.text, fontSize: 16, flexShrink: 1 },
  meta: { color: colors.textMuted, marginTop: 2, fontSize: 12, fontWeight: '600' },
  stockRow: { marginTop: 10, marginBottom: 4 },
  stock: { color: colors.success, fontWeight: '700', fontSize: 12 },
  trash: { padding: 6 },
});

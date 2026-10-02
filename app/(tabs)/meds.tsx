import React, { useCallback, useMemo, useState } from 'react';
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
import {
  MedHintIcon,
  FadeBlock,
  ProgressBar,
  SoftOrbs,
  EmptyIllustration,
  StatBubble,
  PulseDot,
} from '../_theme/visuals';
import { database, config } from '../../config/appwriteConfig';
import { Query } from 'appwrite';
import { useAuth } from '../_context/authContext';
import { predictRefill, formatRefillShareList } from '../_utils/refillPrediction';

export default function MedsScreen() {
  const { scope } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [meds, setMeds] = useState<any[]>([]);
  const patientId = scope?.patientId;

  const load = useCallback(async () => {
    if (!patientId) {
      setLoading(false);
      setRefreshing(false);
      setMeds([]);
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
      setMeds(res.documents);
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
      setLoading(true);
      load();
    }, [load])
  );

  const summary = useMemo(() => {
    const low = meds.filter((m) => predictRefill(m).isLow).length;
    const critical = meds.filter((m) => m.isCritical).length;
    return { total: meds.length, low, critical };
  }, [meds]);

  const confirmDelete = (item: any) => {
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
  };

  const shareRefills = async () => {
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
      <View style={styles.top}>
        <View>
          <Text style={styles.brand}>CABINET</Text>
          <Text style={styles.title}>Medicines</Text>
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

      <View style={styles.statRow}>
        <StatBubble value={summary.total} label="Total" tone="ok" icon="medical" />
        <StatBubble value={summary.critical} label="Critical" tone="warn" icon="alert" />
        <StatBubble value={summary.low} label="Low" tone="accent" icon="cube" />
      </View>

      <FlatList
        data={meds}
        keyExtractor={(i) => i.$id}
        contentContainerStyle={{ padding: spacing.lg, paddingTop: spacing.sm, paddingBottom: 40 }}
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
        renderItem={({ item, index }) => {
          const info = predictRefill(item);
          const maxQ = Math.max(info.quantityRemaining, (item.refillThreshold || 10) * 3, 1);
          const stockPct = Math.min(100, Math.round((info.quantityRemaining / maxQ) * 100));
          return (
            <FadeBlock delay={Math.min(index * 35, 220)}>
              <TouchableOpacity
                style={[styles.card, item.isCritical && styles.cardCritical]}
                onPress={() =>
                  router.push({ pathname: '/EditMedicine', params: { id: item.$id } })
                }
                activeOpacity={0.85}
              >
                <SoftOrbs style={{ opacity: 0.3 }} />
                <MedHintIcon type={item.medicineType} critical={!!item.isCritical} size={50} />
                <View style={{ flex: 1, marginLeft: 12, zIndex: 1 }}>
                  <View style={styles.nameRow}>
                    <Text style={styles.name} numberOfLines={1}>
                      {item.medicineName}
                    </Text>
                    {item.isCritical ? <PulseDot size={7} /> : null}
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
                    />
                  </View>
                  <Text style={[styles.stock, info.isLow && { color: colors.warning }]}>
                    {info.quantityRemaining}
                    {info.daysLeft != null ? ` · ${info.daysLeft}d` : ''}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => confirmDelete(item)} hitSlop={12} style={styles.trash}>
                  <Ionicons name="trash-outline" size={18} color={colors.danger} />
                </TouchableOpacity>
              </TouchableOpacity>
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
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  brand: { color: colors.accent, fontSize: 11, fontWeight: '800', letterSpacing: 1.6 },
  title: { fontSize: 30, fontWeight: '800', color: colors.primary, letterSpacing: -0.4 },
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
    paddingHorizontal: spacing.lg,
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
    overflow: 'hidden',
  },
  cardCritical: { borderColor: colors.danger, borderWidth: 1.5 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  name: { fontWeight: '800', color: colors.text, fontSize: 16, flexShrink: 1 },
  meta: { color: colors.textMuted, marginTop: 2, fontSize: 12, fontWeight: '600' },
  stockRow: { marginTop: 10, marginBottom: 4 },
  stock: { color: colors.success, fontWeight: '700', fontSize: 12 },
  trash: { padding: 6, zIndex: 1 },
});

import React, { useCallback, useState } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { Query } from 'appwrite';
import { Text } from './_components/customizableFontElements';
import { colors, radii, spacing } from './_theme/colors';
import { DoctorHintIcon, EmptyIllustration, FadeBlock } from './_theme/visuals';
import { database, config } from '../config/appwriteConfig';
import { useAuth } from './_context/authContext';

type Appt = {
  $id: string;
  doctorName: string;
  specialization?: string;
  hospital?: string;
  city?: string;
  disease?: string;
  date: string;
  time: string;
  feePkr?: string;
  status?: string;
  doctorId?: string;
};

export default function MyAppointments() {
  const { scope } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [items, setItems] = useState<Appt[]>([]);

  const load = useCallback(async () => {
    if (!scope?.patientId) {
      setLoading(false);
      setRefreshing(false);
      setItems([]);
      return;
    }
    try {
      const res = await database.listDocuments(config.db, config.col.appointments, [
        Query.equal('patientId', scope.patientId),
        Query.orderDesc('date'),
        Query.limit(100),
      ]);
      setItems(res.documents as unknown as Appt[]);
    } catch (e) {
      console.error(e);
      Toast.show({ type: 'error', text1: 'Could not load appointments' });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [scope?.patientId]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load();
    }, [load])
  );

  const cancel = (item: Appt) => {
    Alert.alert('Cancel appointment?', `${item.doctorName} on ${item.date} ${item.time}`, [
      { text: 'Keep', style: 'cancel' },
      {
        text: 'Cancel',
        style: 'destructive',
        onPress: async () => {
          try {
            await database.updateDocument(config.db, config.col.appointments, item.$id, {
              status: 'cancelled',
            });
            Toast.show({ type: 'success', text1: 'Cancelled' });
            load();
          } catch {
            Toast.show({ type: 'error', text1: 'Update failed' });
          }
        },
      },
    ]);
  };

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
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={colors.primary} />
        </TouchableOpacity>
        <Text style={styles.title}>Appointments</Text>
        <TouchableOpacity onPress={() => router.push('/(tabs)/doctors')}>
          <Ionicons name="add" size={24} color={colors.accent} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={items}
        keyExtractor={(i) => i.$id}
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: 40 }}
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
            <EmptyIllustration kind="docs" />
            <Text style={styles.empty}>No appointments</Text>
          </View>
        }
        renderItem={({ item, index }) => {
          const cancelled = item.status === 'cancelled';
          return (
            <FadeBlock delay={Math.min(index * 30, 180)}>
              <View style={[styles.card, cancelled && { opacity: 0.5 }]}>
                <DoctorHintIcon specialty={item.specialization} size={48} />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.name} numberOfLines={1}>
                    {item.doctorName}
                  </Text>
                  <Text style={styles.meta} numberOfLines={1}>
                    {item.specialization}
                  </Text>
                  <Text style={styles.when}>
                    {item.date} · {item.time}
                  </Text>
                </View>
                {!cancelled ? (
                  <TouchableOpacity style={styles.cancelOrb} onPress={() => cancel(item)}>
                    <Ionicons name="close" size={16} color={colors.danger} />
                  </TouchableOpacity>
                ) : (
                  <Ionicons name="ban-outline" size={18} color={colors.textMuted} />
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
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  title: { fontSize: 20, fontWeight: '800', color: colors.primary },
  empty: { textAlign: 'center', color: colors.textMuted },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
  },
  name: { fontWeight: '800', color: colors.text, fontSize: 15 },
  meta: { color: colors.textMuted, fontSize: 12, marginTop: 2, fontWeight: '600' },
  when: { color: colors.primary, fontWeight: '700', marginTop: 6, fontSize: 13 },
  status: { color: colors.success, fontSize: 12, marginTop: 4, fontWeight: '600' },
  cancel: { color: colors.danger, fontWeight: '700' },
  cancelOrb: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(196,92,92,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

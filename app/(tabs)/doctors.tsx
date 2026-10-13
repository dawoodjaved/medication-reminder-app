import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '../_components/customizableFontElements';
import { colors, radii, spacing } from '../_theme/colors';
import { LIST_PERF, useLayout } from '../_theme/layout';
import { EmptyIllustration } from '../_theme/visuals';
import { DoctorAvatar } from '../_components/DoctorAvatar';
import {
  ALL_DISEASES,
  ALL_SPECIALTIES,
  PK_CITIES,
  PK_HOSPITALS,
  PAYMENT_OPTIONS,
  PaymentMethod,
  Doctor,
} from '../_data/pkDoctors';
import { searchDoctorsRemote, formatFee, DoctorFilters } from '../_utils/doctorSearch';

const DoctorRow = memo(function DoctorRow({
  item,
  onPress,
}: {
  item: Doctor;
  onPress: (id: string) => void;
}) {
  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => onPress(item.id)}
      activeOpacity={0.85}
    >
      <DoctorAvatar photoUrl={item.photoUrl} initials={item.photo} size={48} />
      <View style={{ flex: 1, marginLeft: 12, minWidth: 0 }}>
        <Text style={styles.name} numberOfLines={1}>
          {item.name}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          {item.specialization}
        </Text>
        <View style={styles.rowMeta}>
          <Text style={styles.fee}>{formatFee(item.feePkr)}</Text>
          <View style={styles.ratingPill}>
            <Ionicons name="star" size={11} color={colors.warning} />
            <Text style={styles.rating}>{item.rating.toFixed(1)}</Text>
          </View>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
    </TouchableOpacity>
  );
});

const emptyFilters = (): DoctorFilters => ({
  query: '',
  disease: '',
  city: '',
  specialization: '',
  hospital: '',
  payment: '',
  maxFee: null,
  minRating: null,
  gender: '',
});

export default function DoctorsScreen() {
  const router = useRouter();
  const { contentPad, titleSize, listBottom, isCompact } = useLayout();
  const [filters, setFilters] = useState<DoctorFilters>(emptyFilters);
  const [queryDraft, setQueryDraft] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [diseaseSuggest, setDiseaseSuggest] = useState('');
  const [results, setResults] = useState<Doctor[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const hasResultsRef = useRef(false);
  const requestIdRef = useRef(0);

  // Debounce free-text search separately so chip taps stay snappy.
  useEffect(() => {
    const handle = setTimeout(() => {
      setFilters((f) => (f.query === queryDraft ? f : { ...f, query: queryDraft }));
    }, 350);
    return () => clearTimeout(handle);
  }, [queryDraft]);

  useEffect(() => {
    let cancelled = false;
    const id = ++requestIdRef.current;
    const delay = filters.query || filters.disease ? 220 : 0;
    const handle = setTimeout(async () => {
      if (!hasResultsRef.current) setLoading(true);
      setError('');
      try {
        const { doctors, total: t } = await searchDoctorsRemote(filters);
        if (cancelled || id !== requestIdRef.current) return;
        setResults(doctors);
        setTotal(t);
        hasResultsRef.current = true;
      } catch (e) {
        console.error(e);
        if (cancelled || id !== requestIdRef.current) return;
        setResults([]);
        setTotal(0);
        setError('Could not load doctors. Check Appwrite `doctors` collection.');
      } finally {
        if (!cancelled && id === requestIdRef.current) setLoading(false);
      }
    }, delay);
    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [filters]);

  const diseaseSuggestions = useMemo(() => {
    const q = diseaseSuggest.trim().toLowerCase();
    if (!q) return ALL_DISEASES.slice(0, 8);
    return ALL_DISEASES.filter((d) => d.includes(q)).slice(0, 10);
  }, [diseaseSuggest]);

  const set = useCallback((patch: Partial<DoctorFilters>) => {
    setFilters((f) => ({ ...f, ...patch }));
  }, []);

  const openDoctor = useCallback(
    (id: string) => {
      router.push({ pathname: '/DoctorDetail', params: { id } });
    },
    [router]
  );

  const renderItem = useCallback(
    ({ item }: { item: Doctor }) => <DoctorRow item={item} onPress={openDoctor} />,
    [openDoctor]
  );

  const keyExtractor = useCallback((i: Doctor) => i.id, []);

  const diseaseDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onDiseaseChange = useCallback((t: string) => {
    setDiseaseSuggest(t);
    if (diseaseDebounceRef.current) clearTimeout(diseaseDebounceRef.current);
    diseaseDebounceRef.current = setTimeout(() => {
      setFilters((f) => ({ ...f, disease: t }));
    }, 320);
  }, []);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={[styles.header, { paddingHorizontal: contentPad }]}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.brand}>PAKISTAN</Text>
          <Text style={[styles.title, { fontSize: titleSize }]} numberOfLines={1}>
            Doctors
          </Text>
        </View>
        <TouchableOpacity style={styles.apptBtn} onPress={() => router.push('/MyAppointments')}>
          <Ionicons name="calendar-outline" size={20} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <View style={[styles.searchRow, { marginHorizontal: contentPad }]}>
        <Ionicons name="search" size={18} color={colors.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder={isCompact ? 'Name, hospital…' : 'Search name, hospital, disease…'}
          placeholderTextColor={colors.textMuted}
          value={queryDraft}
          onChangeText={setQueryDraft}
          returnKeyType="search"
          autoCorrect={false}
          autoCapitalize="none"
        />
        <TouchableOpacity style={styles.filterBtn} onPress={() => setShowFilters(true)}>
          <Ionicons name="options-outline" size={20} color={colors.white} />
        </TouchableOpacity>
      </View>

      <Text style={[styles.label, { marginHorizontal: contentPad }]}>Search by disease</Text>
      <TextInput
        style={[styles.diseaseInput, { marginHorizontal: contentPad }]}
        placeholder="e.g. diabetes, asthma, pregnancy care"
        placeholderTextColor={colors.textMuted}
        value={diseaseSuggest || filters.disease}
        onChangeText={onDiseaseChange}
        autoCorrect={false}
      />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.chips}
        contentContainerStyle={{ paddingHorizontal: contentPad }}
      >
        {diseaseSuggestions.map((d) => (
          <TouchableOpacity
            key={d}
            style={[styles.chip, filters.disease === d && styles.chipActive]}
            onPress={() => {
              setDiseaseSuggest(d);
              set({ disease: d });
            }}
          >
            <Text style={[styles.chipText, filters.disease === d && styles.chipTextActive]}>
              {d}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.chips}
        contentContainerStyle={{ paddingHorizontal: contentPad }}
      >
        <TouchableOpacity
          style={[styles.chip, !filters.city && styles.chipActive]}
          onPress={() => set({ city: '' })}
        >
          <Text style={[styles.chipText, !filters.city && styles.chipTextActive]}>All cities</Text>
        </TouchableOpacity>
        {PK_CITIES.map((c) => (
          <TouchableOpacity
            key={c}
            style={[styles.chip, filters.city === c && styles.chipActive]}
            onPress={() => set({ city: c })}
          >
            <Text style={[styles.chipText, filters.city === c && styles.chipTextActive]}>{c}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={[styles.countRow, { marginHorizontal: contentPad }]}>
        <View style={styles.countOrb}>
          <Text style={styles.countNum}>{loading && !hasResultsRef.current ? '…' : results.length}</Text>
        </View>
        {!loading && total > results.length ? (
          <Text style={styles.countHint}>of {total}</Text>
        ) : null}
        {loading && hasResultsRef.current ? (
          <ActivityIndicator size="small" color={colors.primary} style={{ marginLeft: 8 }} />
        ) : null}
      </View>

      {error ? <Text style={[styles.error, { paddingHorizontal: contentPad }]}>{error}</Text> : null}

      <FlatList
        data={results}
        keyExtractor={keyExtractor}
        {...LIST_PERF}
        contentContainerStyle={{
          paddingHorizontal: contentPad,
          paddingBottom: listBottom,
        }}
        ListEmptyComponent={
          loading && !hasResultsRef.current ? (
            <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
          ) : (
            <View>
              <EmptyIllustration kind="docs" />
              <Text style={styles.empty}>No matches</Text>
            </View>
          )
        }
        renderItem={renderItem}
      />

      <Modal visible={showFilters} animationType="slide" transparent>
        <View style={styles.modalWrap}>
          <View style={[styles.modal, { maxHeight: isCompact ? '90%' : '85%' }]}>
            <Text style={styles.modalTitle}>Filters</Text>
            <ScrollView>
              <Text style={styles.labelInline}>Specialization</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <TouchableOpacity
                  style={[styles.chip, !filters.specialization && styles.chipActive]}
                  onPress={() => set({ specialization: '' })}
                >
                  <Text style={[styles.chipText, !filters.specialization && styles.chipTextActive]}>
                    Any
                  </Text>
                </TouchableOpacity>
                {ALL_SPECIALTIES.map((s) => (
                  <TouchableOpacity
                    key={s}
                    style={[styles.chip, filters.specialization === s && styles.chipActive]}
                    onPress={() => set({ specialization: s })}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        filters.specialization === s && styles.chipTextActive,
                      ]}
                    >
                      {s}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={styles.labelInline}>Hospital</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <TouchableOpacity
                  style={[styles.chip, !filters.hospital && styles.chipActive]}
                  onPress={() => set({ hospital: '' })}
                >
                  <Text style={[styles.chipText, !filters.hospital && styles.chipTextActive]}>
                    Any
                  </Text>
                </TouchableOpacity>
                {PK_HOSPITALS.map((h) => (
                  <TouchableOpacity
                    key={h}
                    style={[styles.chip, filters.hospital === h && styles.chipActive]}
                    onPress={() => set({ hospital: h })}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        filters.hospital === h && styles.chipTextActive,
                      ]}
                    >
                      {h}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={styles.labelInline}>Payment</Text>
              <View style={styles.wrapChips}>
                {PAYMENT_OPTIONS.map((p) => (
                  <TouchableOpacity
                    key={p.id}
                    style={[styles.chip, filters.payment === p.id && styles.chipActive]}
                    onPress={() =>
                      set({
                        payment: filters.payment === p.id ? '' : (p.id as PaymentMethod),
                      })
                    }
                  >
                    <Text
                      style={[
                        styles.chipText,
                        filters.payment === p.id && styles.chipTextActive,
                      ]}
                    >
                      {p.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.labelInline}>Max fee (PKR)</Text>
              <View style={styles.wrapChips}>
                {[null, 2000, 3000, 4000, 5000].map((fee) => (
                  <TouchableOpacity
                    key={String(fee)}
                    style={[styles.chip, filters.maxFee === fee && styles.chipActive]}
                    onPress={() => set({ maxFee: fee })}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        filters.maxFee === fee && styles.chipTextActive,
                      ]}
                    >
                      {fee == null ? 'Any' : `≤ ${fee}`}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.labelInline}>Min rating</Text>
              <View style={styles.wrapChips}>
                {[null, 4.0, 4.5, 4.7].map((r) => (
                  <TouchableOpacity
                    key={String(r)}
                    style={[styles.chip, filters.minRating === r && styles.chipActive]}
                    onPress={() => set({ minRating: r })}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        filters.minRating === r && styles.chipTextActive,
                      ]}
                    >
                      {r == null ? 'Any' : `★ ${r}+`}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.labelInline}>Gender</Text>
              <View style={styles.wrapChips}>
                {(
                  [
                    ['', 'Any'],
                    ['female', 'Female'],
                    ['male', 'Male'],
                  ] as const
                ).map(([g, label]) => (
                  <TouchableOpacity
                    key={label}
                    style={[styles.chip, filters.gender === g && styles.chipActive]}
                    onPress={() => set({ gender: g })}
                  >
                    <Text
                      style={[styles.chipText, filters.gender === g && styles.chipTextActive]}
                    >
                      {label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            <TouchableOpacity style={styles.applyBtn} onPress={() => setShowFilters(false)}>
              <Text style={styles.applyText}>
                Show {loading ? '…' : results.length} doctors
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                setFilters(emptyFilters());
                setQueryDraft('');
                setDiseaseSuggest('');
              }}
            >
              <Text style={styles.reset}>Reset filters</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: {
    paddingTop: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  brand: { color: colors.accent, fontSize: 11, fontWeight: '800', letterSpacing: 1.6 },
  title: { fontWeight: '800', color: colors.primary, letterSpacing: -0.4 },
  apptBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countRow: {
    marginTop: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
  },
  countOrb: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.cobaltGlow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countNum: { color: colors.primary, fontWeight: '800', fontSize: 13 },
  countHint: { color: colors.textMuted, fontSize: 12, marginLeft: 6 },
  error: {
    color: colors.danger,
    textAlign: 'center',
    marginBottom: 8,
    fontSize: 13,
  },
  ratingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(212,160,23,0.12)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radii.pill,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    gap: 8,
  },
  searchInput: { flex: 1, paddingVertical: 12, color: colors.text, minWidth: 0 },
  filterBtn: {
    backgroundColor: colors.primary,
    padding: 8,
    borderRadius: 8,
  },
  label: {
    marginTop: spacing.md,
    marginBottom: 6,
    fontWeight: '600',
    color: colors.text,
  },
  labelInline: {
    marginTop: spacing.md,
    marginBottom: 6,
    fontWeight: '600',
    color: colors.text,
  },
  diseaseInput: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.sm,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: colors.text,
  },
  chips: { marginTop: 8, maxHeight: 40 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: 8,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { color: colors.text, fontSize: 12, fontWeight: '600' },
  chipTextActive: { color: colors.white },
  empty: { textAlign: 'center', color: colors.textMuted, marginTop: 40 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  name: { fontWeight: '700', color: colors.text, fontSize: 16 },
  meta: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  rowMeta: { flexDirection: 'row', gap: 10, marginTop: 6, alignItems: 'center', flexWrap: 'wrap' },
  fee: { color: colors.accent, fontWeight: '700', fontSize: 13 },
  rating: { color: colors.warning, fontWeight: '700', fontSize: 13 },
  modalWrap: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modal: {
    backgroundColor: colors.bg,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: spacing.lg,
    paddingBottom: 32,
  },
  modalTitle: { fontSize: 20, fontWeight: '700', color: colors.primary, marginBottom: 8 },
  wrapChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  applyBtn: {
    backgroundColor: colors.accent,
    padding: 14,
    borderRadius: radii.md,
    alignItems: 'center',
    marginTop: 12,
  },
  applyText: { color: colors.white, fontWeight: '700' },
  reset: { textAlign: 'center', color: colors.textMuted, marginTop: 12, fontWeight: '600' },
});

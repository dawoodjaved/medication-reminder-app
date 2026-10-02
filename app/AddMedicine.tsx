import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text } from './_components/customizableFontElements';
import { colors, radii, spacing } from './_theme/colors';
import { screen } from './_theme/styles';

const AddMedicine = () => {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safe}>
      <TouchableOpacity style={styles.back} onPress={() => router.back()}>
        <Ionicons name="arrow-back" size={22} color={colors.white} />
      </TouchableOpacity>

      <View style={screen.sheetGrow}>
        <Text style={screen.brand}>MedRem</Text>
        <Text style={screen.title}>Add medicine</Text>
        <Text style={screen.subtitle}>Scan a label or enter details manually.</Text>

        <TouchableOpacity style={styles.card} onPress={() => router.push('/ScanMedicineScreen')}>
          <View style={styles.iconWrap}>
            <Ionicons name="camera-outline" size={28} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>Scan via camera</Text>
            <Text style={styles.cardMeta}>OCR from photo or gallery</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.card} onPress={() => router.push('/ManuallyAdd')}>
          <View style={styles.iconWrap}>
            <Ionicons name="create-outline" size={28} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>Add manually</Text>
            <Text style={styles.cardMeta}>Name, dose times, schedule</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.primary },
  back: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 12,
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: { fontWeight: '700', color: colors.text, fontSize: 16 },
  cardMeta: { color: colors.textMuted, marginTop: 2 },
});

export default AddMedicine;

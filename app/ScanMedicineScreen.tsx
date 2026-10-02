import React, { useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  Image,
  ActivityIndicator,
  ScrollView,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import Toast from 'react-native-toast-message';
import { parseMedicationText } from './_utils/extractMedicineInfo';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text } from './_components/customizableFontElements';
import { colors, radii, spacing } from './_theme/colors';
import { screen } from './_theme/styles';

export default function ScanMedicineScreen() {
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const extractDataAndRoute = useCallback(async (parsed: string) => {
    try {
      const extractedData = await parseMedicationText(parsed);
      setImageUri(null);
      setLoading(false);
      router.push({
        pathname: '/ManuallyAdd',
        params: {
          medicineType: extractedData.medicineType,
          medicineName: extractedData.medicineName,
          frequency: extractedData.frequency ?? '',
          quantity: String(extractedData.doseAmount ?? extractedData.quantity ?? ''),
        },
      });
      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: 'Medication info extracted.',
      });
    } catch (error) {
      console.error(error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to extract medication information.',
      });
      setLoading(false);
    }
  }, []);

  const pickImageFromGallery = useCallback(async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Toast.show({ type: 'error', text1: 'Permission required', text2: 'Allow media access.' });
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({ base64: true });
      if (!result.canceled && result.assets?.[0]?.base64) {
        setImageUri(result.assets[0].uri);
        setLoading(true);
        const formData = new FormData();
        formData.append('base64Image', `data:image/jpeg;base64,${result.assets[0].base64}`);
        formData.append('language', 'eng');
        const ocrKey = process.env.EXPO_PUBLIC_OCR_SPACE_KEY;
        if (!ocrKey) {
          Toast.show({
            type: 'error',
            text1: 'OCR not configured',
            text2: 'Set EXPO_PUBLIC_OCR_SPACE_KEY in your .env file.',
          });
          setLoading(false);
          return;
        }
        const res = await fetch('https://api.ocr.space/parse/image', {
          method: 'POST',
          headers: { apikey: ocrKey },
          body: formData,
        });
        const data = await res.json();
        const parsed = data?.ParsedResults?.[0]?.ParsedText || 'No text found';
        await extractDataAndRoute(parsed);
      }
    } catch (error) {
      console.error(error);
      Toast.show({ type: 'error', text1: 'Error', text2: 'Failed to read image.' });
      setLoading(false);
    }
  }, [extractDataAndRoute]);

  const takePhoto = useCallback(async () => {
    try {
      if (Platform.OS === 'web') {
        Toast.show({
          type: 'info',
          text1: 'Camera on web',
          text2: 'Use gallery on web, or open the native app for camera OCR.',
        });
        return;
      }
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Toast.show({ type: 'error', text1: 'Permission required', text2: 'Allow camera access.' });
        return;
      }
      const result = await ImagePicker.launchCameraAsync({ quality: 1 });
      if (!result.canceled && result.assets?.[0]?.uri) {
        const uri = result.assets[0].uri;
        setImageUri(uri);
        setLoading(true);
        try {
          const MLKitOcr = require('react-native-mlkit-ocr').default;
          const blocks = await MLKitOcr.detectFromFile(uri);
          const combinedText = blocks.map((b: { text: string }) => b.text).join('\n');
          await extractDataAndRoute(combinedText);
        } catch (err) {
          console.error(err);
          Toast.show({ type: 'error', text1: 'OCR failed', text2: 'Could not extract text.' });
          setLoading(false);
        }
      }
    } catch (error) {
      console.error(error);
      Toast.show({ type: 'error', text1: 'Error', text2: 'Failed to take photo.' });
      setLoading(false);
    }
  }, [extractDataAndRoute]);

  return (
    <SafeAreaView style={styles.safe}>
      <TouchableOpacity style={styles.back} onPress={() => router.back()}>
        <Ionicons name="arrow-back" size={22} color={colors.white} />
      </TouchableOpacity>

      <ScrollView contentContainerStyle={screen.sheetGrow}>
        <Text style={screen.brand}>MedRem</Text>
        <Text style={screen.title}>Scan medicine</Text>
        <Text style={screen.subtitle}>
          Take a photo of the label or pick one from your gallery.
        </Text>

        <TouchableOpacity style={styles.actionCard} onPress={takePhoto}>
          <View style={styles.iconWrap}>
            <Ionicons name="camera-outline" size={26} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>Take photo</Text>
            <Text style={styles.cardMeta}>On-device OCR (native)</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionCard} onPress={pickImageFromGallery}>
          <View style={styles.iconWrap}>
            <Ionicons name="images-outline" size={26} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>Pick from gallery</Text>
            <Text style={styles.cardMeta}>Cloud OCR</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
        </TouchableOpacity>

        {imageUri ? (
          <Image source={{ uri: imageUri }} style={styles.preview} />
        ) : null}
        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={{ color: colors.textMuted, marginTop: 8 }}>Reading label…</Text>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.primary },
  back: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.sm },
  actionCard: {
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
  preview: {
    width: '100%',
    height: 200,
    borderRadius: radii.md,
    marginTop: spacing.sm,
  },
  loadingBox: { alignItems: 'center', marginTop: spacing.lg },
});

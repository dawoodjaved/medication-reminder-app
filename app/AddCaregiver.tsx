import React, { useState, useCallback } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Share,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from './_components/customizableFontElements';
import { useRouter } from 'expo-router';
import Toast from 'react-native-toast-message';
import { ID, Query } from 'appwrite';
import { Ionicons } from '@expo/vector-icons';
import { config, database, account } from '../config/appwriteConfig';
import { colors, spacing } from './_theme/colors';
import { screen } from './_theme/styles';
import { sharedPermissions } from './_utils/patientScope';
import { createInviteToken, buildInviteShareMessage, buildInviteUrl } from './_utils/invites';

export default function AddCaregiver() {
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [name, setName] = useState('');
  const [lastInvite, setLastInvite] = useState<{ token: string; url: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  const handleCreateInvite = useCallback(async () => {
    const identity = email.trim() || phoneNumber.trim();
    if (!identity) {
      Toast.show({
        type: 'error',
        text1: 'Email or phone required',
        text2: 'Enter an email (recommended) or phone for the caregiver.',
      });
      return;
    }

    setSaving(true);
    try {
      const user = await account.get();
      const patientPhone =
        (user as any).phone || (user as any).phoneNumber || (user as any).email || '';
      const patientName = (user as any).name || 'Patient';

      const existing = await database.listDocuments(config.db, config.col.caregivers, [
        Query.equal('phoneNumber', identity),
        Query.limit(1),
      ]);
      if (existing.total > 0) {
        Toast.show({
          type: 'error',
          text1: 'Already invited',
          text2: 'This caregiver is already linked or invited.',
        });
        return;
      }

      const token = createInviteToken();
      const caregiverData: Record<string, string> = {
        phoneNumber: identity,
        invitedAt: new Date().toISOString(),
        patientId: user.$id,
        patientPhone,
        inviteToken: token,
        inviteStatus: 'pending',
      };
      if (email.trim()) caregiverData.email = email.trim().toLowerCase();
      if (name.trim()) caregiverData.name = name.trim();

      try {
        await database.createDocument(
          config.db,
          config.col.caregivers,
          ID.unique(),
          caregiverData,
          sharedPermissions(user.$id)
        );
      } catch {
        await database.createDocument(
          config.db,
          config.col.caregivers,
          ID.unique(),
          {
            phoneNumber: identity,
            invitedAt: new Date().toISOString(),
            inviteToken: token,
            inviteStatus: 'pending',
          },
          sharedPermissions(user.$id)
        );
      }

      const url = buildInviteUrl(token);
      setLastInvite({ token, url });

      const message = buildInviteShareMessage(token, patientName);
      try {
        await Share.share(
          Platform.OS === 'ios' ? { message, url } : { message, title: 'MedRem caregiver invite' }
        );
      } catch {
        /* user cancelled share */
      }

      Toast.show({
        type: 'success',
        text1: 'Invite created',
        text2: 'Share the link so they can accept.',
      });
    } catch (error) {
      console.error('Error inviting caregiver:', error);
      Toast.show({ type: 'error', text1: 'Failed to create invite' });
    } finally {
      setSaving(false);
    }
  }, [email, phoneNumber, name]);

  const copyLink = useCallback(async () => {
    if (!lastInvite) return;
    try {
      // expo-clipboard may not be installed — fall back to Share
      const ClipboardMod = await import('expo-clipboard').catch(() => null);
      if (ClipboardMod?.setStringAsync) {
        await ClipboardMod.setStringAsync(lastInvite.url);
        Toast.show({ type: 'success', text1: 'Link copied' });
      } else {
        await Share.share({ message: lastInvite.url });
      }
    } catch {
      await Share.share({ message: lastInvite.url });
    }
  }, [lastInvite]);

  return (
    <SafeAreaView style={styles.safe}>
      <TouchableOpacity style={styles.back} onPress={() => router.back()}>
        <Ionicons name="arrow-back" size={22} color={colors.white} />
      </TouchableOpacity>

      <View style={screen.sheetGrow}>
        <Text style={screen.brand}>MedRem</Text>
        <Text style={screen.title}>Invite caregiver</Text>
        <Text style={screen.subtitle}>
          Create a link they can open in MedRem. Email is recommended on the free plan (no SMS).
        </Text>

        <Text style={screen.label}>Name (optional)</Text>
        <TextInput
          style={screen.input}
          placeholder="Caregiver name"
          placeholderTextColor={colors.textMuted}
          value={name}
          onChangeText={setName}
        />

        <Text style={screen.label}>Email (recommended)</Text>
        <TextInput
          style={screen.input}
          placeholder="caregiver@email.com"
          placeholderTextColor={colors.textMuted}
          keyboardType="email-address"
          autoCapitalize="none"
          value={email}
          onChangeText={setEmail}
        />

        <Text style={screen.label}>Phone (optional)</Text>
        <TextInput
          style={screen.input}
          placeholder="+1 XXX XXXXXXX"
          placeholderTextColor={colors.textMuted}
          keyboardType="phone-pad"
          value={phoneNumber}
          onChangeText={setPhoneNumber}
        />

        <View style={styles.infoBox}>
          <Text style={styles.infoText}>
            They open the invite link, sign in with email, and are linked to your schedule automatically.
          </Text>
        </View>

        <TouchableOpacity
          style={[screen.primaryBtn, saving && { opacity: 0.7 }]}
          onPress={handleCreateInvite}
          disabled={saving}
        >
          <Text style={screen.primaryBtnText}>{saving ? 'Creating…' : 'Create & share invite'}</Text>
        </TouchableOpacity>

        {lastInvite && (
          <View style={styles.linkBox}>
            <Text style={styles.linkLabel}>Invite code: {lastInvite.token}</Text>
            <Text style={styles.linkUrl} numberOfLines={2}>
              {lastInvite.url}
            </Text>
            <TouchableOpacity style={styles.copyBtn} onPress={copyLink}>
              <Text style={styles.copyBtnText}>Copy link</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.primary },
  back: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
  infoBox: {
    backgroundColor: colors.surfaceMuted,
    padding: spacing.md,
    borderRadius: 12,
    marginBottom: spacing.md,
  },
  infoText: { textAlign: 'center', color: colors.text, lineHeight: 20 },
  linkBox: {
    marginTop: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.surfaceMuted,
    borderRadius: 12,
  },
  linkLabel: { fontWeight: '700', color: colors.primary, marginBottom: 6 },
  linkUrl: { color: colors.textMuted, fontSize: 13, marginBottom: 10 },
  copyBtn: {
    alignSelf: 'flex-start',
    backgroundColor: colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  copyBtnText: { color: colors.white, fontWeight: '700' },
});

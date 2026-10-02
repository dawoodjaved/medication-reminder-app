import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from './_components/customizableFontElements';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Toast from 'react-native-toast-message';
import { ID, Query } from 'appwrite';
import { Ionicons } from '@expo/vector-icons';
import { account, database, config } from '../config/appwriteConfig';
import { colors, spacing } from './_theme/colors';
import { screen } from './_theme/styles';
import { useAuth } from './_context/authContext';

/**
 * Accept caregiver invite via deep link `myapp://invite?token=…`
 * or manual code entry.
 */
export default function AcceptInvite() {
  const { token: paramToken } = useLocalSearchParams<{ token?: string }>();
  const [token, setToken] = useState(paramToken || '');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [mode, setMode] = useState<'signin' | 'signup'>('signup');
  const [busy, setBusy] = useState(false);
  const [inviteMeta, setInviteMeta] = useState<{ name?: string; email?: string } | null>(null);
  const router = useRouter();
  const { refreshScope } = useAuth();

  useEffect(() => {
    if (paramToken) setToken(String(paramToken));
  }, [paramToken]);

  useEffect(() => {
    (async () => {
      if (!token.trim()) return;
      try {
        const res = await database.listDocuments(config.db, config.col.caregivers, [
          Query.equal('inviteToken', token.trim()),
          Query.limit(1),
        ]);
        if (res.total > 0) {
          const doc = res.documents[0] as any;
          setInviteMeta({ name: doc.name, email: doc.email || doc.phoneNumber });
          if (doc.email) setEmail(doc.email);
          else if (doc.phoneNumber?.includes('@')) setEmail(doc.phoneNumber);
        }
      } catch {
        /* guests may lack read — accept still works after auth via server-side match */
      }
    })();
  }, [token]);

  const claimInvite = useCallback(
    async (userId: string, userEmail: string) => {
      const res = await database.listDocuments(config.db, config.col.caregivers, [
        Query.equal('inviteToken', token.trim()),
        Query.limit(1),
      ]);
      if (res.total === 0) {
        throw new Error('Invite not found. Check the code and try again.');
      }
      const doc = res.documents[0] as any;
      if (doc.inviteStatus === 'accepted' && doc.caregiverUserId && doc.caregiverUserId !== userId) {
        throw new Error('This invite was already accepted by someone else.');
      }
      await database.updateDocument(config.db, config.col.caregivers, doc.$id, {
        caregiverUserId: userId,
        inviteStatus: 'accepted',
        email: userEmail || doc.email || '',
        phoneNumber: userEmail || doc.phoneNumber,
      });
    },
    [token]
  );

  const handleAccept = useCallback(async () => {
    if (!token.trim()) {
      Toast.show({ type: 'error', text1: 'Enter invite code' });
      return;
    }
    if (!email.trim() || !password) {
      Toast.show({ type: 'error', text1: 'Email and password required' });
      return;
    }

    setBusy(true);
    try {
      if (mode === 'signup') {
        try {
          await account.create(ID.unique(), email.trim().toLowerCase(), password, name.trim() || undefined);
        } catch (e: any) {
          // If user exists, fall through to session
          if (!String(e?.message || e).toLowerCase().includes('already')) {
            throw e;
          }
        }
      }

      await account.createEmailPasswordSession(email.trim().toLowerCase(), password);
      const user = await account.get();
      await claimInvite(user.$id, (user as any).email || email.trim().toLowerCase());
      await refreshScope();

      Toast.show({ type: 'success', text1: 'Invite accepted', text2: 'You are now a caregiver.' });
      router.replace('/(tabs)');
    } catch (error: any) {
      console.error(error);
      Toast.show({
        type: 'error',
        text1: 'Could not accept invite',
        text2: error?.message || 'Check code and credentials.',
      });
    } finally {
      setBusy(false);
    }
  }, [token, email, password, name, mode, claimInvite, refreshScope, router]);

  return (
    <SafeAreaView style={styles.safe}>
      <TouchableOpacity style={styles.back} onPress={() => router.back()}>
        <Ionicons name="arrow-back" size={22} color={colors.white} />
      </TouchableOpacity>

      <View style={screen.sheetGrow}>
        <Text style={screen.brand}>MedRem</Text>
        <Text style={screen.title}>Accept invite</Text>
        <Text style={screen.subtitle}>
          {inviteMeta?.name
            ? `Join as caregiver${inviteMeta.email ? ` (${inviteMeta.email})` : ''}.`
            : 'Enter the invite code from your link, then sign in.'}
        </Text>

        <Text style={screen.label}>Invite code</Text>
        <TextInput
          style={screen.input}
          placeholder="Paste invite code"
          placeholderTextColor={colors.textMuted}
          autoCapitalize="none"
          value={token}
          onChangeText={setToken}
        />

        <View style={styles.modeRow}>
          <TouchableOpacity
            style={[styles.modeBtn, mode === 'signup' && styles.modeActive]}
            onPress={() => setMode('signup')}
          >
            <Text style={[styles.modeText, mode === 'signup' && styles.modeTextActive]}>Create account</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modeBtn, mode === 'signin' && styles.modeActive]}
            onPress={() => setMode('signin')}
          >
            <Text style={[styles.modeText, mode === 'signin' && styles.modeTextActive]}>Sign in</Text>
          </TouchableOpacity>
        </View>

        {mode === 'signup' && (
          <>
            <Text style={screen.label}>Your name</Text>
            <TextInput
              style={screen.input}
              placeholder="Name"
              placeholderTextColor={colors.textMuted}
              value={name}
              onChangeText={setName}
            />
          </>
        )}

        <Text style={screen.label}>Email</Text>
        <TextInput
          style={screen.input}
          placeholder="you@email.com"
          placeholderTextColor={colors.textMuted}
          keyboardType="email-address"
          autoCapitalize="none"
          value={email}
          onChangeText={setEmail}
        />
        <Text style={screen.label}>Password</Text>
        <TextInput
          style={screen.input}
          placeholder="Password"
          placeholderTextColor={colors.textMuted}
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        <TouchableOpacity
          style={[screen.primaryBtn, busy && { opacity: 0.7 }]}
          onPress={handleAccept}
          disabled={busy}
        >
          {busy ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <Text style={screen.primaryBtnText}>Accept & continue</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.primary },
  back: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
  modeRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  modeBtn: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: 10,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
  },
  modeActive: { backgroundColor: colors.primary },
  modeText: { color: colors.textMuted, fontWeight: '600', fontSize: 13 },
  modeTextActive: { color: colors.white },
});

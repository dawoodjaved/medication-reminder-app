import { Permission, Role, Query } from 'appwrite';
import { account, database, config } from '../../config/appwriteConfig';
import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_KEY = 'medrem_patient_scope';
const CAREGIVER_SYNC_KEY = 'medrem_caregiver_perm_sync';

export type UserRole = 'patient' | 'caregiver';

export type PatientScope = {
  role: UserRole;
  userId: string;
  /** Patient whose data we read/write */
  patientId: string;
  phone?: string;
  caregiverDocId?: string;
};

/**
 * Resolve whether the logged-in user is a caregiver linked to a patient,
 * or a patient acting on their own data.
 */
export async function resolvePatientScope(): Promise<PatientScope | null> {
  try {
    const user = await account.get();
    const phone = (user as any).phone || (user as any).phoneNumber || '';
    const email = ((user as any).email || '').trim();

    let caregiverList = { total: 0, documents: [] as any[] };
    // Match phone OTP caregivers, or free-plan email caregivers (email stored in phoneNumber)
    const identity = phone.trim() || email;
    if (identity) {
      caregiverList = await database.listDocuments(
        config.db,
        config.col.caregivers,
        [Query.equal('phoneNumber', identity)]
      );
    }
    if (caregiverList.total === 0) {
      try {
        caregiverList = await database.listDocuments(
          config.db,
          config.col.caregivers,
          [Query.equal('caregiverUserId', user.$id)]
        );
      } catch {
        /* index/attr may be missing */
      }
    }

    if (caregiverList.total > 0) {
      const doc = caregiverList.documents[0];
      if (!doc.caregiverUserId) {
        try {
          await database.updateDocument(config.db, config.col.caregivers, doc.$id, {
            caregiverUserId: user.$id,
          });
        } catch {
          /* attribute may not exist yet */
        }
      }

      const patientId = doc.patientId || user.$id;
      const scope: PatientScope = {
        role: 'caregiver',
        userId: user.$id,
        patientId,
        phone: phone || email,
        caregiverDocId: doc.$id,
      };
      await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(scope));
      return scope;
    }

    const scope: PatientScope = {
      role: 'patient',
      userId: user.$id,
      patientId: user.$id,
      phone,
    };
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(scope));
    // Tighten ACLs when linked caregivers change (closes Role.users() IDOR on older docs).
    void syncPatientDocumentAccess(user.$id);
    return scope;
  } catch {
    return null;
  }
}

export async function getCachedScope(): Promise<PatientScope | null> {
  const raw = await AsyncStorage.getItem(CACHE_KEY);
  return raw ? JSON.parse(raw) : null;
}

export async function clearPatientScope() {
  await AsyncStorage.multiRemove([CACHE_KEY, CAREGIVER_SYNC_KEY]);
}

export async function getLinkedCaregiverUserIds(patientId: string): Promise<string[]> {
  try {
    const res = await database.listDocuments(config.db, config.col.caregivers, [
      Query.equal('patientId', patientId),
      Query.limit(25),
    ]);
    return (res.documents || [])
      .filter((d: any) => d.inviteStatus === 'accepted' && d.caregiverUserId)
      .map((d: any) => String(d.caregiverUserId))
      .filter((id: string) => id && id !== patientId);
  } catch {
    return [];
  }
}

/**
 * Owner + linked caregivers only.
 * Never use Role.users() on health data — any signed-in account could IDOR every patient.
 */
export function documentPermissions(ownerId: string, extraUserIds: string[] = []) {
  const ids = Array.from(new Set([ownerId, ...extraUserIds.filter(Boolean)]));
  const perms: string[] = [];
  for (const id of ids) {
    perms.push(Permission.read(Role.user(id)));
    perms.push(Permission.update(Role.user(id)));
  }
  perms.push(Permission.delete(Role.user(ownerId)));
  return perms;
}

export async function patientDataPermissions(ownerId: string) {
  const caregivers = await getLinkedCaregiverUserIds(ownerId);
  return documentPermissions(ownerId, caregivers);
}

/**
 * Pending invites must be claimable after the invitee authenticates (token lookup).
 * Mitigated by long tokens, expiry, email binding, and clearing the token on accept.
 */
export function pendingInvitePermissions(ownerId: string) {
  return [
    Permission.read(Role.users()),
    Permission.update(Role.users()),
    Permission.delete(Role.user(ownerId)),
  ];
}

export function acceptedInvitePermissions(ownerId: string, caregiverUserId: string) {
  return documentPermissions(ownerId, [caregiverUserId]);
}

/** @deprecated Prefer patientDataPermissions for health documents */
export function sharedPermissions(ownerId: string, extraUserIds: string[] = []) {
  return documentPermissions(ownerId, extraUserIds);
}

export async function syncPatientDocumentAccess(patientId: string) {
  try {
    const caregiverIds = await getLinkedCaregiverUserIds(patientId);
    const fingerprint = caregiverIds.slice().sort().join(',');
    const prev = await AsyncStorage.getItem(CAREGIVER_SYNC_KEY);
    if (prev === fingerprint) return;

    const perms = documentPermissions(patientId, caregiverIds);
    const collections = [
      config.col.medicines,
      config.col.reminders,
      config.col.symptoms,
      config.col.appointments,
    ];

    for (const col of collections) {
      try {
        const patientField =
          col === config.col.reminders ? 'userId' : 'patientId';
        const res = await database.listDocuments(config.db, col, [
          Query.equal(patientField, patientId),
          Query.limit(40),
        ]);
        for (const doc of res.documents || []) {
          try {
            await database.updateDocument(config.db, col, doc.$id, {}, perms);
          } catch {
            /* permission-only update may fail on some docs */
          }
        }
      } catch {
        /* collection / attribute missing */
      }
    }

    await AsyncStorage.setItem(CAREGIVER_SYNC_KEY, fingerprint);
  } catch {
    /* non-fatal */
  }
}

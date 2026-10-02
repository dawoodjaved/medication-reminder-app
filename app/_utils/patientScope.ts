import { Permission, Role, Query } from 'appwrite';
import { account, database, config } from '../../config/appwriteConfig';
import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_KEY = 'medrem_patient_scope';

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
  await AsyncStorage.removeItem(CACHE_KEY);
}

/** Shared permissions so linked caregivers (authenticated) can help */
export function sharedPermissions(ownerId: string) {
  return [
    Permission.read(Role.users()),
    Permission.update(Role.users()),
    Permission.delete(Role.user(ownerId)),
    Permission.create(Role.users()),
  ];
}

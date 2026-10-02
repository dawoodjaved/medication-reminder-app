import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { resolvePatientScope, clearPatientScope, PatientScope } from '../_utils/patientScope';
import { account } from '../../config/appwriteConfig';

type AuthContextType = {
  scope: PatientScope | null;
  loading: boolean;
  refreshScope: () => Promise<PatientScope | null>;
  logout: () => Promise<void>;
  onboardingDone: boolean;
  setOnboardingDone: (v: boolean) => void;
  biometricEnabled: boolean;
  setBiometricEnabled: (v: boolean) => void;
};

const ONBOARDING_KEY = 'medrem_onboarding_done';
const BIOMETRIC_KEY = 'medrem_biometric';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [scope, setScope] = useState<PatientScope | null>(null);
  const [loading, setLoading] = useState(true);
  const [onboardingDone, setOnboardingDoneState] = useState(true);
  const [biometricEnabled, setBiometricEnabledState] = useState(false);

  const refreshScope = useCallback(async () => {
    const s = await resolvePatientScope();
    setScope(s);
    return s;
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [ob, bio] = await Promise.all([
        AsyncStorage.getItem(ONBOARDING_KEY),
        AsyncStorage.getItem(BIOMETRIC_KEY),
      ]);
      if (cancelled) return;
      setOnboardingDoneState(ob === 'true');
      setBiometricEnabledState(bio === 'true');

      const timeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), 4000));
      try {
        await Promise.race([account.get(), timeout.then(() => Promise.reject(new Error('auth timeout')))]);
        if (!cancelled) await refreshScope();
      } catch {
        if (!cancelled) setScope(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshScope]);

  const setOnboardingDone = (v: boolean) => {
    setOnboardingDoneState(v);
    AsyncStorage.setItem(ONBOARDING_KEY, v ? 'true' : 'false');
  };

  const setBiometricEnabled = (v: boolean) => {
    setBiometricEnabledState(v);
    AsyncStorage.setItem(BIOMETRIC_KEY, v ? 'true' : 'false');
  };

  const logout = async () => {
    try {
      await account.deleteSession('current');
    } catch {
      /* ignore */
    }
    await clearPatientScope();
    setScope(null);
  };

  return (
    <AuthContext.Provider
      value={{
        scope,
        loading,
        refreshScope,
        logout,
        onboardingDone,
        setOnboardingDone,
        biometricEnabled,
        setBiometricEnabled,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};

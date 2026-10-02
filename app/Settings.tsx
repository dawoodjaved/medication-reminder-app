import { Redirect } from 'expo-router';

/** Settings moved into Profile tab */
export default function SettingsRedirect() {
  return <Redirect href="/(tabs)/profile" />;
}

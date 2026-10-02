import { Redirect } from 'expo-router';

/** Today schedule lives on the Today tab */
export default function TodaySchedulerRedirect() {
  return <Redirect href="/(tabs)" />;
}

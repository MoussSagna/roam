import { Redirect } from 'expo-router';

/**
 * The questions are one pager on `/onboarding/mood`, and each needs the previous answers (D-88): this
 * route only brings back to its start.
 */
export default function InterestsRoute() {
  return <Redirect href="/onboarding/mood" />;
}

import { redirect } from 'next/navigation';

/**
 * Server component redirecting canonical /emergency root to /emergency/settings.
 */
export default function EmergencyPage() {
  redirect('/emergency/settings');
}

'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import EmergencyTokenGenerator from '@/components/EmergencyTokenGenerator';
import { Shield } from 'lucide-react';

export default function EmergencySettingsPage() {
  const supabase = createClient();
  const [sessionUser, setSessionUser] = useState<any>(null);
  const [status, setStatus] = useState<'loading' | 'authenticated' | 'unauthenticated'>('loading');
  const router = useRouter();
  const [profileId, setProfileId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setSessionUser(user);
        setStatus('authenticated');
      } else {
        setStatus('unauthenticated');
      }
    });
  }, []);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth?callbackUrl=/emergency/settings');
      return;
    }

    if (status === 'authenticated' && sessionUser) {
      // Fetch user's primary profile
      fetchUserProfile();
    }
  }, [status, sessionUser]);

  const fetchUserProfile = async () => {
    try {
      const response = await fetch('/api/profiles');
      const data = await response.json();

      if (data.profiles && data.profiles.length > 0) {
        // Get the primary (self) profile
        const primaryProfile = data.profiles.find((p: any) => p.type === 'self');
        if (primaryProfile) {
          setProfileId(primaryProfile.id);
        }
      }
    } catch (error) {
      console.error('Failed to fetch profile:', error);
    } finally {
      setLoading(false);
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading emergency settings...</p>
        </div>
      </div>
    );
  }

  if (!profileId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <Shield className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">No Profile Found</h1>
          <p className="text-gray-600 mb-6">
            You need to create a profile before setting up emergency access.
          </p>
          <button
            onClick={() => router.push('/profile/create')}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            Create Profile
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Emergency Access Settings</h1>
          <p className="text-gray-600">
            Manage permanent emergency access tokens and stored medical records visibility for first responders
          </p>
        </div>

        {/* Tabs Navigation */}
        <div className="flex gap-4 mb-8 border-b border-gray-200">
          <button className="px-4 py-3 font-semibold text-blue-600 border-b-2 border-blue-600">
            Permanent QR Code
          </button>
          <Link
            href="/emergency/nfc"
            scroll={false}
            className="px-4 py-3 font-semibold text-gray-600 hover:text-gray-900 transition"
          >
            NFC Card
          </Link>
        </div>

        {/* Emergency Token Generator */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <EmergencyTokenGenerator profileId={profileId} />
        </div>

        {/* Additional Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* When to Use */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">When to Use Emergency Access</h2>
            <ul className="space-y-3 text-gray-700">
              <li className="flex items-start gap-2">
                <span className="text-red-600 font-bold">•</span>
                <span>Medical emergencies where you are unconscious or cannot communicate</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-600 font-bold">•</span>
                <span>Hospital trauma admissions requiring instant blood group and allergy details</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-600 font-bold">•</span>
                <span>Paramedic or emergency ambulance responder situations</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-600 font-bold">•</span>
                <span>Travel emergencies in unfamiliar healthcare networks</span>
              </li>
            </ul>
          </div>

          {/* Security Best Practices */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Security Best Practices</h2>
            <ul className="space-y-3 text-gray-700">
              <li className="flex items-start gap-2">
                <span className="text-green-600 font-bold">✓</span>
                <span>Keep your printed QR code in your wallet, phone case, or wear a medical bracelet</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 font-bold">✓</span>
                <span>Emergency QR codes are permanent and persist indefinitely across sessions</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 font-bold">✓</span>
                <span>Use "Regenerate QR Code" anytime you wish to revoke previous physical QR cards</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 font-bold">✓</span>
                <span>Keep your designated emergency contacts and phone numbers up to date</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Emergency Data Preview */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h2 className="text-xl font-bold text-blue-900 mb-4">What Emergency Responders Will See</h2>
          <p className="text-blue-800 mb-4">
            When first responders scan your emergency QR code, they receive unauthenticated, read-only access to:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-2">Basic & Identity Information</h3>
              <ul className="text-sm text-gray-700 space-y-1">
                <li>• Your name and age / DOB</li>
                <li>• High-visibility blood group</li>
              </ul>
            </div>
            <div className="bg-white rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-2">Critical Medical Alerts</h3>
              <ul className="text-sm text-gray-700 space-y-1">
                <li>• Known drug & environmental allergies</li>
                <li>• Chronic medical conditions</li>
                <li>• Current medications & clinical notes</li>
              </ul>
            </div>
            <div className="bg-white rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-2">Emergency Contacts</h3>
              <p className="text-sm text-gray-700">
                Designated emergency contacts with direct-dial phone buttons for rapid notification
              </p>
            </div>
            <div className="bg-white rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-2">Stored Medical Documents & Vitals</h3>
              <p className="text-sm text-gray-700">
                Baseline vitals and previously uploaded medical documents (prescriptions, lab panels, radiology)
              </p>
            </div>
          </div>
          <div className="mt-4 bg-emerald-50 border border-emerald-300 rounded-lg p-3">
            <p className="text-sm text-emerald-900 font-semibold">
              ✓ Stored Medical Documents Included: First responders can view your critical medical profile and access stored medical documents (lab reports, prescriptions, clinical notes) to ensure accurate and timely emergency care.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

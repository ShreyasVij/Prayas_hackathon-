'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import {
  Phone,
  MapPin,
  Hospital,
  AlertTriangle,
  FileText,
  Activity,
  ExternalLink,
  Shield,
  ShieldAlert,
  Clock,
  Heart,
  RefreshCw,
} from 'lucide-react';

interface EmergencyContact {
  name: string;
  relationship: string;
  phone: string;
}

interface VitalItem {
  label: string;
  value: string | number;
}

interface EmergencyDocument {
  id: string;
  title: string;
  date: string;
  category: string;
  docType: string;
  viewUrl: string;
  fileSize?: number;
}

interface EmergencyProfile {
  displayName: string;
  age?: number;
  dob?: string;
  bloodGroup: string;
  allergies: string[];
  chronicConditions: string[];
  currentMedications: string[];
  emergencyNotes?: string;
  emergencyContacts: EmergencyContact[];
  vitals?: VitalItem[];
  insuranceId?: string;
}

interface EmergencyData {
  success: boolean;
  accessTimestamp: string;
  profile: EmergencyProfile;
  documents?: EmergencyDocument[];
  token: string;
}

interface ErrorResponse {
  error: string;
  locked?: boolean;
  revoked?: boolean;
  status?: number;
}

export default function EmergencyQRPage() {
  const params = useParams();
  const token = params.token as string;

  const [data, setData] = useState<EmergencyData | null>(null);
  const [error, setError] = useState<ErrorResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [notificationSent, setNotificationSent] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lon: number } | null>(null);
  const [locationResolved, setLocationResolved] = useState(false);

  // 1. Fetch emergency data IMMEDIATELY on mount without waiting for geolocation resolution
  useEffect(() => {
    if (token) {
      fetchEmergencyData();
    }
  }, [token]);

  // 2. Query geolocation in the background in parallel without blocking initial rendering
  useEffect(() => {
    if (typeof window !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const coords = {
            lat: position.coords.latitude,
            lon: position.coords.longitude,
          };
          setUserLocation(coords);
          setLocationResolved(true);
          // Optional non-blocking background ping to record GPS coordinates
          if (token) {
            fetch(`/api/emergency/${token}?lat=${coords.lat}&lon=${coords.lon}&loc=ResponderGPS`).catch(() => {});
          }
        },
        (err) => {
          console.log('Background geolocation note:', err?.message || err);
          setLocationResolved(true);
        },
        { timeout: 6000, enableHighAccuracy: false }
      );
    } else {
      setLocationResolved(true);
    }
  }, [token]);

  const fetchEmergencyData = async () => {
    try {
      setLoading(true);
      const url = `/api/emergency/${token}`;
      const response = await fetch(url);
      const result = await response.json();

      if (!response.ok) {
        setError({
          ...result,
          status: response.status,
        });
        setLoading(false);
        return;
      }

      setData(result);
      setError(null);
      setLoading(false);

      // Attempt emergency notification
      sendEmergencyNotification(result.token, result.accessTimestamp);
    } catch (err) {
      setError({
        error: 'Failed to load emergency data. Please check connection and try again.',
        locked: false,
        status: 500,
      });
      setLoading(false);
    }
  };

  const sendEmergencyNotification = async (tok: string, timestamp: string) => {
    try {
      const response = await fetch('/api/emergency/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: tok, accessTimestamp: timestamp }),
      });
      if (response.ok) {
        setNotificationSent(true);
      }
    } catch (err) {
      // Non-blocking notification failure
    }
  };

  const callEmergencyContact = (phone: string) => {
    window.location.href = `tel:${phone}`;
  };

  const callAmbulance = () => {
    window.location.href = 'tel:112';
  };

  const shareLocation = () => {
    if (userLocation && navigator.share) {
      navigator
        .share({
          title: 'Emergency Patient Location',
          text: `Emergency assistance needed at this location.`,
          url: `https://www.google.com/maps?q=${userLocation.lat},${userLocation.lon}`,
        })
        .catch(() => {});
    } else if (userLocation) {
      window.open(`https://www.google.com/maps?q=${userLocation.lat},${userLocation.lon}`, '_blank');
    }
  };

  const openNearestHospitals = () => {
    if (userLocation) {
      window.open(
        `https://www.google.com/maps/search/hospitals+near+me/@${userLocation.lat},${userLocation.lon},15z`,
        '_blank'
      );
    } else {
      window.open('https://www.google.com/maps/search/hospitals+near+me', '_blank');
    }
  };

  // ── Loading View ─────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-4">
        <div className="text-center bg-white p-8 rounded-2xl shadow-lg border border-neutral-200 max-w-sm w-full">
          <div className="w-12 h-12 border-4 border-red-200 border-t-red-600 rounded-full animate-spin mx-auto mb-4" />
          <h2 className="text-lg font-bold text-neutral-900">Accessing Emergency Record</h2>
          <p className="text-sm text-neutral-500 mt-1">Retrieving critical medical profile & documents...</p>
        </div>
      </div>
    );
  }

  // ── Error Views (403 Revoked, 404 Missing/Expired, 429 Rate Limited) ─────────
  if (error) {
    const isRevoked = error.revoked || error.status === 403;
    const isRateLimited = error.status === 429 || error.error?.toLowerCase().includes('rate limit');
    const isNotFound = error.status === 404 || error.error?.toLowerCase().includes('invalid or expired');

    return (
      <div className="min-h-screen bg-neutral-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border-2 border-neutral-300 overflow-hidden">
          {/* Header Banner */}
          <div
            className={`p-6 text-center text-white ${
              isRevoked
                ? 'bg-red-700'
                : isRateLimited
                ? 'bg-amber-600'
                : 'bg-neutral-800'
            }`}
          >
            {isRevoked ? (
              <ShieldAlert className="w-16 h-16 mx-auto mb-2 text-white" />
            ) : isRateLimited ? (
              <Clock className="w-16 h-16 mx-auto mb-2 text-white" />
            ) : (
              <AlertTriangle className="w-16 h-16 mx-auto mb-2 text-amber-300" />
            )}
            <h1 className="text-2xl font-black tracking-tight">
              {isRevoked
                ? 'Emergency Access Revoked'
                : isRateLimited
                ? 'Rate Limit Exceeded'
                : 'Access Unavailable'}
            </h1>
          </div>

          {/* Body */}
          <div className="p-6 text-center space-y-4">
            <p className="text-base text-neutral-700 font-medium">
              {error.error || 'The requested emergency QR code could not be verified.'}
            </p>

            {isRevoked && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-xs text-red-800 text-left">
                <strong>Owner Action Required:</strong> This emergency token was deactivated by the patient or account owner. If you are the patient, sign in to your MediLocker account and regenerate a new permanent QR code from Settings.
              </div>
            )}

            {isRateLimited && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-800 text-left">
                <strong>High Request Volume:</strong> Rate limit capacity (60 req/min) reached. Please wait a few moments before rescanning this QR code.
              </div>
            )}

            {isNotFound && !isRevoked && !isRateLimited && (
              <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-4 text-xs text-neutral-600 text-left">
                The scanned QR code is either invalid, corrupted, or has been replaced with a newer code.
              </div>
            )}

            <div className="pt-4 flex flex-col gap-2">
              <button
                onClick={() => fetchEmergencyData()}
                className="w-full py-3 bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition"
              >
                <RefreshCw className="w-4 h-4" />
                Retry Access
              </button>
              <button
                onClick={callAmbulance}
                className="w-full py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition"
              >
                <Phone className="w-4 h-4" />
                Call Ambulance (112)
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const profile = data.profile;
  const vitals = profile.vitals || [];
  const documents = data.documents || [];

  return (
    <div className="min-h-screen bg-neutral-100 text-neutral-900 pb-16">
      {/* Top Critical Header */}
      <header className="bg-red-700 text-white shadow-md">
        <div className="max-w-4xl mx-auto px-4 py-3 sm:py-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white text-red-700 flex items-center justify-center font-black text-xl shadow">
              ⚕
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-black tracking-wide uppercase">
                Emergency Medical Responder Information
              </h1>
              <p className="text-xs text-red-100 font-medium">
                Public Unauthenticated Responder View • Read-Only
              </p>
            </div>
          </div>

          <div className="text-xs text-red-100 bg-red-800 px-3 py-1.5 rounded-full flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            {notificationSent ? 'Emergency contacts notified' : 'Access logged'}
          </div>
        </div>
      </header>

      {/* Main Responsive Grid */}
      <main className="max-w-4xl mx-auto px-4 mt-6 space-y-6">
        {/* Patient Identity & Blood Group Hero */}
        <section className="bg-white rounded-2xl shadow-sm border border-neutral-200 p-5 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-200 pb-5">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-neutral-500">
                Patient Identity
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-neutral-950 mt-1">
                {profile.displayName}
              </h2>
              <div className="flex flex-wrap items-center gap-4 text-sm text-neutral-600 mt-2">
                {profile.age && (
                  <div>
                    <span className="font-semibold text-neutral-800">Age:</span> {profile.age} years
                  </div>
                )}
                {profile.dob && (
                  <div>
                    <span className="font-semibold text-neutral-800">DOB:</span> {profile.dob}
                  </div>
                )}
                {profile.insuranceId && (
                  <div>
                    <span className="font-semibold text-neutral-800">Insurance ID:</span>{' '}
                    <span className="font-mono">{profile.insuranceId}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Prominent Blood Group Badge */}
            <div className="flex-shrink-0 bg-red-50 border-2 border-red-500 rounded-2xl px-6 py-4 text-center">
              <span className="block text-xs font-black uppercase tracking-wider text-red-700">
                Blood Group
              </span>
              <span className="block text-3xl sm:text-4xl font-black text-red-600 mt-0.5">
                {profile.bloodGroup}
              </span>
            </div>
          </div>

          {/* Emergency Notes */}
          {profile.emergencyNotes && (
            <div className="mt-4 bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-xl">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-800 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                Emergency Clinical Notes
              </span>
              <p className="text-sm text-amber-950 font-medium mt-1 leading-relaxed">
                {profile.emergencyNotes}
              </p>
            </div>
          )}
        </section>

        {/* High-Risk Clinical Alerts: Allergies & Chronic Conditions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Allergies */}
          <section className="bg-white rounded-2xl shadow-sm border-2 border-amber-400 p-5">
            <h3 className="text-sm font-black uppercase tracking-wider text-amber-800 flex items-center gap-2 mb-3">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
              Known Allergies (High Priority)
            </h3>
            {profile.allergies && profile.allergies.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {profile.allergies.map((allergy, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1 bg-amber-100 text-amber-900 border border-amber-300 px-3 py-1.5 rounded-lg text-sm font-bold"
                  >
                    ⚠️ {allergy}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-neutral-500 italic">No allergies recorded in medical profile.</p>
            )}
          </section>

          {/* Chronic Conditions */}
          <section className="bg-white rounded-2xl shadow-sm border border-neutral-200 p-5">
            <h3 className="text-sm font-black uppercase tracking-wider text-neutral-700 flex items-center gap-2 mb-3">
              <Heart className="w-5 h-5 text-red-600" />
              Chronic Conditions
            </h3>
            {profile.chronicConditions && profile.chronicConditions.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {profile.chronicConditions.map((cond, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center bg-neutral-100 text-neutral-800 border border-neutral-200 px-3 py-1.5 rounded-lg text-sm font-semibold"
                  >
                    • {cond}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-neutral-500 italic">No chronic conditions listed.</p>
            )}
          </section>
        </div>

        {/* Current Medications */}
        <section className="bg-white rounded-2xl shadow-sm border border-neutral-200 p-5 sm:p-6">
          <h3 className="text-sm font-black uppercase tracking-wider text-neutral-700 flex items-center gap-2 mb-3">
            <Activity className="w-5 h-5 text-blue-600" />
            Current Active Medications
          </h3>
          {profile.currentMedications && profile.currentMedications.length > 0 ? (
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {profile.currentMedications.map((med, idx) => (
                <li
                  key={idx}
                  className="bg-blue-50 border border-blue-100 text-blue-950 px-3.5 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2"
                >
                  <span className="w-2 h-2 rounded-full bg-blue-600" />
                  {med}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-neutral-500 italic">No active medications recorded.</p>
          )}
        </section>

        {/* Baseline / Recorded Vitals Table */}
        {vitals.length > 0 && (
          <section className="bg-white rounded-2xl shadow-sm border border-neutral-200 p-5 sm:p-6">
            <h3 className="text-sm font-black uppercase tracking-wider text-neutral-700 flex items-center gap-2 mb-4">
              <Activity className="w-5 h-5 text-emerald-600" />
              Baseline & Recent Vitals
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-neutral-200 bg-neutral-50">
                    <th className="py-3 px-4 font-bold text-neutral-700">Vital Parameter</th>
                    <th className="py-3 px-4 font-bold text-neutral-700">Recorded Value / Reading</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {vitals.map((vital, idx) => (
                    <tr key={idx} className="hover:bg-neutral-50 transition">
                      <td className="py-3.5 px-4 font-semibold text-neutral-800">{vital.label}</td>
                      <td className="py-3.5 px-4 font-bold text-emerald-700">{vital.value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Emergency Contacts with Direct Call Actions */}
        <section className="bg-white rounded-2xl shadow-sm border border-neutral-200 p-5 sm:p-6">
          <h3 className="text-sm font-black uppercase tracking-wider text-neutral-700 flex items-center gap-2 mb-4">
            <Phone className="w-5 h-5 text-neutral-900" />
            Emergency Contacts (Direct Call)
          </h3>
          {profile.emergencyContacts && profile.emergencyContacts.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {profile.emergencyContacts.map((contact, idx) => (
                <div
                  key={idx}
                  className="bg-neutral-50 border border-neutral-200 rounded-xl p-4 flex flex-col justify-between"
                >
                  <div>
                    <h4 className="text-base font-bold text-neutral-900">{contact.name}</h4>
                    <p className="text-xs text-neutral-500 font-medium">{contact.relationship}</p>
                    <p className="text-sm font-mono font-semibold text-neutral-700 mt-1">
                      {contact.phone}
                    </p>
                  </div>
                  <a
                    href={`tel:${contact.phone}`}
                    className="mt-4 inline-flex items-center justify-center gap-2 w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-sm transition"
                  >
                    <Phone className="w-4 h-4" />
                    Call {contact.name.split(' ')[0]}
                  </a>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-neutral-500 italic">No emergency contacts designated.</p>
          )}
        </section>

        {/* Stored Medical Documents & Records Section */}
        <section className="bg-white rounded-2xl shadow-sm border border-neutral-200 p-5 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
            <div>
              <h3 className="text-base font-black uppercase tracking-wide text-neutral-900 flex items-center gap-2">
                <FileText className="w-5 h-5 text-red-600" />
                Stored Medical Documents & Records
              </h3>
              <p className="text-xs text-neutral-500 mt-0.5">
                Clinical history, laboratory investigations, prescriptions, and diagnostic scans
              </p>
            </div>
            <span className="text-xs font-semibold bg-neutral-100 text-neutral-700 px-3 py-1 rounded-full w-fit">
              {documents.length} records available
            </span>
          </div>

          {documents.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-neutral-200 bg-neutral-50">
                    <th className="py-3 px-4 font-bold text-neutral-700">Document Title</th>
                    <th className="py-3 px-4 font-bold text-neutral-700">Date</th>
                    <th className="py-3 px-4 font-bold text-neutral-700">Category</th>
                    <th className="py-3 px-4 font-bold text-neutral-700">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {documents.map((doc) => (
                    <tr key={doc.id} className="hover:bg-neutral-50 transition">
                      <td className="py-3.5 px-4 font-semibold text-neutral-900">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-neutral-400 flex-shrink-0" />
                          <span>{doc.title}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-neutral-600 whitespace-nowrap">{doc.date}</td>
                      <td className="py-3.5 px-4">
                        <span className="inline-block bg-neutral-100 text-neutral-800 text-xs font-semibold px-2.5 py-1 rounded-md">
                          {doc.category || doc.docType}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <a
                          href={doc.viewUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-neutral-900 hover:bg-neutral-800 text-white rounded-lg text-xs font-bold transition shadow-sm"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          View Record
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-8 text-center bg-neutral-50 rounded-xl border border-dashed border-neutral-200">
              <FileText className="w-8 h-8 text-neutral-400 mx-auto mb-2" />
              <p className="text-sm text-neutral-500 font-medium">
                No stored medical documents on record for this patient.
              </p>
            </div>
          )}
        </section>

        {/* Quick Emergency Dispatch Actions */}
        <section className="bg-neutral-900 text-white rounded-2xl p-5 sm:p-6 shadow-md">
          <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-400 mb-4">
            First Responder Emergency Dispatch Actions
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button
              onClick={callAmbulance}
              className="py-3.5 px-4 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition"
            >
              <Phone className="w-5 h-5" />
              Ambulance (112)
            </button>
            <button
              onClick={openNearestHospitals}
              className="py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition"
            >
              <Hospital className="w-5 h-5" />
              Nearby Hospitals
            </button>
            {userLocation ? (
              <button
                onClick={shareLocation}
                className="py-3.5 px-4 bg-neutral-700 hover:bg-neutral-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition"
              >
                <MapPin className="w-5 h-5" />
                Share GPS Location
              </button>
            ) : (
              <button
                disabled
                className="py-3.5 px-4 bg-neutral-800 text-neutral-500 rounded-xl font-bold flex items-center justify-center gap-2 cursor-not-allowed"
              >
                <MapPin className="w-5 h-5" />
                GPS Acquiring...
              </button>
            )}
          </div>
        </section>

        {/* Audit & Legal Footer */}
        <footer className="text-center text-xs text-neutral-400 py-6 border-t border-neutral-200 space-y-1">
          <p>MediLocker Public Emergency System • Access Scans Timestamped & Audited</p>
          <p>Unauthenticated emergency access granted under medical exception protocol.</p>
        </footer>
      </main>
    </div>
  );
}
/**
 * NFC Emergency Access System - Utility Index
 * Centralized exports for easy importing of NFC utilities
 */

// Token & OTP Generation
export * from '../server/nfcGenerator';

// Rate Limiting
export * from '../server/rateLimiter';

// Anomaly Detection
export { detectAnomalies, detectRapidSuccession, detectGeographicJump, detectOtpBruteForce, detectUnusualAccessTime, detectVpnUsage, detectDeviceSwitch, getAnomalyDescription } from '../server/anomalyDetector';

// Profile Filtering
export { filterToPublicProfile, filterToFullProfile, getAccessedFields } from '../server/emergencyNfcFilters';

// Geolocation
export { getGeolocationFromIp, getLocationString } from '../server/geolocation';

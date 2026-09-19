export * from './index';

export interface UserMedicalInfo {
  bloodGroup?: string | null;
  allergies?: string | string[] | null;
  conditions?: string | string[] | null;
  medications?: string | string[] | null;
}

export interface UserEmergencyInfo {
  name?: string | null;
  phone?: string | null;
  relationship?: string | null;
}

export interface UserLocationInfo {
  city?: string | null;
  state?: string | null;
  country?: string | null;
}

export interface UserProfile {
  phone?: string | null;
  dob?: Date | string | null;
  gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say';
  profileImageUrl?: string | null;
  profileImageName?: string | null;
  medical?: UserMedicalInfo;
  emergency?: UserEmergencyInfo;
  location?: UserLocationInfo;
}

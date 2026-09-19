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

export interface UserDietInfo {
  breakfast?: string[];
  lunch?: string[];
  dinner?: string[];
}

export interface UserCustomizationInfo {
  theme?: 'light' | 'dark' | null;
}

export interface UserProfile {
  phone?: string | null;
  dob?: Date | string | null;
  age?: number | string | null;
  gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say';
  profileImageUrl?: string | null;
  profileImageName?: string | null;
  medical?: UserMedicalInfo;
  emergency?: UserEmergencyInfo;
  location?: UserLocationInfo;
  diet?: UserDietInfo;
  dailyRoutine?: string | null;
  customization?: UserCustomizationInfo;
  onboardingCompleted?: boolean;
}

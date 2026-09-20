export interface DoctorLocation {
  hos?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

export interface DoctorProfile {
  phone?: string | null;
  dob?: Date | string | null;
  gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say';
  profileImageUrl?: string | null;
  profileImageName?: string | null;
  specialization?: string | null;
  experienceYears?: number | null;
  licenseNumber?: string | null;
  hospitalAffiliation?: string | null;
  bio?: string | null;
  location?: DoctorLocation;
}

export interface DoctorDocument {
  _id?: any;
  id?: string;
  doctorCode?: string;
  userId?: any;
  email: string;
  name: string;
  profile?: DoctorProfile;
  role?: string;
  status?: 'active' | 'inactive' | 'suspended';
  googleTokens?: any;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface AppointmentDocument {
  _id?: any;
  id?: string;
  doctorId: any;
  patientId: any;
  patientName: string;
  patientEmail?: string;
  patientAge?: number;
  patientGender?: 'Male' | 'Female' | 'Other' | string;
  appointmentTime: string;
  date: string;
  duration?: number;
  status: 'pending' | 'approved' | 'rejected' | 'completed' | 'cancelled' | 'upcoming' | string;
  reason?: string;
  notes?: string;
  diagnosis?: string;
  prescription?: string;
  googleEventId?: string;
  syncedToGoogle?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface DoctorFileDocument {
  _id?: any;
  id?: string;
  appointmentId: any;
  doctorId: any;
  patientId: any;
  originalFileId: any;
  fileName: string;
  fileType: string;
  mimeType?: string;
  storageUrl: string;
  fileSize?: number;
  uploadedAt?: Date;
  transferredAt?: Date;
  createdAt?: Date;
}

/**
 * User roles — determines access to admin/operator dashboards.
 * Safety features (SOS, check-in) are role-agnostic and always available.
 */
export enum UserRole {
  USER = 'USER',
  OPERATOR = 'OPERATOR', // verified trek operator (B2B tier)
  SENTINEL = 'SENTINEL', // volunteer responder (Shikhar Sentinel programme)
  ADMIN = 'ADMIN',
}

export interface UserProfile {
  id: string;
  phone: string;
  name: string;
  avatarUrl?: string;
  bio?: string;
  role: UserRole;
  isVerified: boolean; // IMF-certified guide or verified operator
  preferredLanguage: SupportedLanguage;
  proSubscription: boolean;
  proExpiresAt?: string; // ISO-8601
  createdAt: string;
}

/**
 * Languages supported at launch per PRD §5 Principle 3.
 * Hinglish is English with Hindi script mixing — handled at UI layer.
 */
export type SupportedLanguage =
  | 'en'
  | 'hi'
  | 'mr'
  | 'bn'
  | 'ta'
  | 'kn'
  | 'ml'
  | 'te';

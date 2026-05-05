export declare enum UserRole {
    USER = "USER",
    OPERATOR = "OPERATOR",
    SENTINEL = "SENTINEL",
    ADMIN = "ADMIN"
}
export interface UserProfile {
    id: string;
    phone: string;
    name: string;
    avatarUrl?: string;
    bio?: string;
    role: UserRole;
    isVerified: boolean;
    preferredLanguage: SupportedLanguage;
    proSubscription: boolean;
    proExpiresAt?: string;
    createdAt: string;
}
export type SupportedLanguage = 'en' | 'hi' | 'mr' | 'bn' | 'ta' | 'kn' | 'ml' | 'te';
//# sourceMappingURL=user.d.ts.map
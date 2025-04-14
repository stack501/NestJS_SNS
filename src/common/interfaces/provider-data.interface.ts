import { AuthProvider } from "../enums/auth-provider.enum";

export interface ProviderData {
    email: string;
    nickname?: string;
    providerId: string;
    providerKey: AuthProvider;
}
// User profile interface
export interface UserProfile {
    uid: string;
    email: string;
    username: string;
    phoneNumber: string;
    displayName: string;
    photoURL: string | null;
    defaultLocation: string | null;
    createdAt: Date;
    lastSeen: Date;
    isOnline: boolean;
    onboardingComplete: boolean;
}

// Message interface
export interface Message {
    id: string;
    chatId: string;
    senderId: string;
    content: string;
    timestamp: Date;
    status: 'sent' | 'delivered' | 'read';
    type: 'text' | 'image' | 'file';
}

// Chat interface
export interface Chat {
    id: string;
    participants: string[];
    lastMessage: Message | null;
    createdAt: Date;
    updatedAt: Date;
    isGroup: boolean;
    groupName?: string;
    groupPhoto?: string;
    admins?: string[];
}

// Auth context state
export interface AuthState {
    user: UserProfile | null;
    firebaseUser: import('firebase/auth').User | null;
    loading: boolean;
    error: string | null;
}

// Search result type
export interface SearchResult {
    uid: string;
    displayName: string;
    username: string;
    photoURL: string | null;
    email?: string;
}

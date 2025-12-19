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
    fileUrl?: string;
    fileName?: string;
    fileSize?: number;
    reactions?: Record<string, string[]>; // emoji -> userIds who reacted
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
    unreadCount?: Record<string, number>; // userId -> unread count
    favorites?: string[]; // userIds who favorited this chat
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

// Scheduled message interface
export interface ScheduledMessage {
    id: string;
    chatId: string;
    senderId: string;
    content: string;
    scheduledFor: Date;
    status: 'pending' | 'sent' | 'cancelled';
    createdAt: Date;
    recipientName?: string;
}

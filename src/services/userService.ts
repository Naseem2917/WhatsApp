import {
    doc,
    setDoc,
    getDoc,
    getDocs,
    query,
    where,
    collection,
    updateDoc,
    serverTimestamp,
    Timestamp
} from 'firebase/firestore';
import { db } from '../config/firebase';
import type { UserProfile } from '../types';

const USERS_COLLECTION = 'users';

/**
 * Create a new user document in Firestore
 */
export async function createUser(
    uid: string,
    email: string,
    username: string,
    phoneNumber: string,
    displayName: string
): Promise<void> {
    const userRef = doc(db, USERS_COLLECTION, uid);

    const userData: Omit<UserProfile, 'createdAt' | 'lastSeen'> & { createdAt: ReturnType<typeof serverTimestamp>, lastSeen: ReturnType<typeof serverTimestamp> } = {
        uid,
        email: email.toLowerCase(),
        username: username.toLowerCase(),
        phoneNumber,
        displayName,
        photoURL: null,
        defaultLocation: null,
        isOnline: true,
        onboardingComplete: true,
        createdAt: serverTimestamp(),
        lastSeen: serverTimestamp(),
    };

    await setDoc(userRef, userData);
}

/**
 * Get user by UID
 */
export async function getUserById(uid: string): Promise<UserProfile | null> {
    const userRef = doc(db, USERS_COLLECTION, uid);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
        const data = userSnap.data();
        return {
            ...data,
            createdAt: (data.createdAt as Timestamp)?.toDate() || new Date(),
            lastSeen: (data.lastSeen as Timestamp)?.toDate() || new Date(),
        } as UserProfile;
    }

    return null;
}

/**
 * Get user by email
 */
export async function getUserByEmail(email: string): Promise<UserProfile | null> {
    const usersRef = collection(db, USERS_COLLECTION);
    const q = query(usersRef, where('email', '==', email.toLowerCase()));
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
        const data = querySnapshot.docs[0].data();
        return {
            ...data,
            createdAt: (data.createdAt as Timestamp)?.toDate() || new Date(),
            lastSeen: (data.lastSeen as Timestamp)?.toDate() || new Date(),
        } as UserProfile;
    }

    return null;
}

/**
 * Get user by username
 */
export async function getUserByUsername(username: string): Promise<UserProfile | null> {
    const usersRef = collection(db, USERS_COLLECTION);
    const q = query(usersRef, where('username', '==', username.toLowerCase()));
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
        const data = querySnapshot.docs[0].data();
        return {
            ...data,
            createdAt: (data.createdAt as Timestamp)?.toDate() || new Date(),
            lastSeen: (data.lastSeen as Timestamp)?.toDate() || new Date(),
        } as UserProfile;
    }

    return null;
}

/**
 * Get user by phone number
 */
export async function getUserByPhone(phoneNumber: string): Promise<UserProfile | null> {
    const usersRef = collection(db, USERS_COLLECTION);
    const q = query(usersRef, where('phoneNumber', '==', phoneNumber));
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
        const data = querySnapshot.docs[0].data();
        return {
            ...data,
            createdAt: (data.createdAt as Timestamp)?.toDate() || new Date(),
            lastSeen: (data.lastSeen as Timestamp)?.toDate() || new Date(),
        } as UserProfile;
    }

    return null;
}

/**
 * Check if username is unique
 */
export async function isUsernameUnique(username: string): Promise<boolean> {
    const user = await getUserByUsername(username);
    return user === null;
}

/**
 * Check if phone number is unique
 */
export async function isPhoneUnique(phoneNumber: string): Promise<boolean> {
    const user = await getUserByPhone(phoneNumber);
    return user === null;
}

/**
 * Update user profile
 */
export async function updateUserProfile(
    uid: string,
    updates: Partial<Pick<UserProfile, 'username' | 'phoneNumber' | 'displayName' | 'photoURL' | 'defaultLocation'>>
): Promise<void> {
    const userRef = doc(db, USERS_COLLECTION, uid);
    await updateDoc(userRef, {
        ...updates,
        lastSeen: serverTimestamp(),
    });
}

/**
 * Update user online status
 */
export async function updateOnlineStatus(uid: string, isOnline: boolean): Promise<void> {
    const userRef = doc(db, USERS_COLLECTION, uid);
    await updateDoc(userRef, {
        isOnline,
        lastSeen: serverTimestamp(),
    });
}

/**
 * Search users by email, username, or phone with prefix matching
 */
export async function searchUsers(
    searchTerm: string,
    searchType: 'email' | 'username' | 'phone'
): Promise<UserProfile[]> {
    const usersRef = collection(db, USERS_COLLECTION);
    const searchLower = searchTerm.toLowerCase();
    const searchEnd = searchLower + '\uf8ff'; // Unicode high character for range query

    let q;

    switch (searchType) {
        case 'email':
            // Prefix search for email
            q = query(
                usersRef,
                where('email', '>=', searchLower),
                where('email', '<=', searchEnd)
            );
            break;
        case 'username':
            // Prefix search for username
            q = query(
                usersRef,
                where('username', '>=', searchLower),
                where('username', '<=', searchEnd)
            );
            break;
        case 'phone':
            // Prefix search for phone
            q = query(
                usersRef,
                where('phoneNumber', '>=', searchTerm),
                where('phoneNumber', '<=', searchTerm + '\uf8ff')
            );
            break;
    }

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
            ...data,
            createdAt: (data.createdAt as Timestamp)?.toDate() || new Date(),
            lastSeen: (data.lastSeen as Timestamp)?.toDate() || new Date(),
        } as UserProfile;
    });
}

/**
 * Search all users with general search term - uses client-side filtering for reliability
 */
export async function searchAllUsers(searchTerm: string): Promise<UserProfile[]> {
    if (!searchTerm || searchTerm.length < 2) return [];

    try {
        const searchLower = searchTerm.toLowerCase();
        const usersRef = collection(db, USERS_COLLECTION);

        // Fetch all users and filter client-side
        const querySnapshot = await getDocs(usersRef);
        const allUsers = querySnapshot.docs.map(doc => {
            const data = doc.data();
            return {
                ...data,
                createdAt: (data.createdAt as Timestamp)?.toDate() || new Date(),
                lastSeen: (data.lastSeen as Timestamp)?.toDate() || new Date(),
            } as UserProfile;
        });

        // Filter by username, email, or displayName
        return allUsers.filter(user =>
            user.username?.toLowerCase().includes(searchLower) ||
            user.email?.toLowerCase().includes(searchLower) ||
            user.displayName?.toLowerCase().includes(searchLower)
        );
    } catch (error) {
        console.error('Search error:', error);
        return [];
    }
}

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
    Timestamp,
    orderBy,
    limit,
    onSnapshot,
    addDoc
} from 'firebase/firestore';
import { db } from '../config/firebase';
import type { Chat, Message } from '../types';

const CHATS_COLLECTION = 'chats';
const MESSAGES_COLLECTION = 'messages';

/**
 * Create or get existing chat between two users
 */
export async function getOrCreateChat(
    currentUserId: string,
    otherUserId: string
): Promise<string> {
    // Check if a chat already exists between these users
    const chatsRef = collection(db, CHATS_COLLECTION);
    const q = query(
        chatsRef,
        where('participants', 'array-contains', currentUserId),
        where('isGroup', '==', false)
    );

    const querySnapshot = await getDocs(q);

    // Look for existing chat with the other user
    for (const chatDoc of querySnapshot.docs) {
        const chatData = chatDoc.data();
        if (chatData.participants.includes(otherUserId)) {
            return chatDoc.id;
        }
    }

    // Create new chat
    const newChatRef = await addDoc(chatsRef, {
        participants: [currentUserId, otherUserId],
        isGroup: false,
        lastMessage: null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    });

    return newChatRef.id;
}

/**
 * Get chat by ID
 */
export async function getChatById(chatId: string): Promise<Chat | null> {
    const chatRef = doc(db, CHATS_COLLECTION, chatId);
    const chatSnap = await getDoc(chatRef);

    if (chatSnap.exists()) {
        const data = chatSnap.data();
        return {
            id: chatSnap.id,
            ...data,
            createdAt: (data.createdAt as Timestamp)?.toDate() || new Date(),
            updatedAt: (data.updatedAt as Timestamp)?.toDate() || new Date(),
        } as Chat;
    }

    return null;
}

/**
 * Get all chats for a user
 */
export async function getUserChats(userId: string): Promise<Chat[]> {
    const chatsRef = collection(db, CHATS_COLLECTION);
    const q = query(
        chatsRef,
        where('participants', 'array-contains', userId),
        orderBy('updatedAt', 'desc')
    );

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
            id: doc.id,
            ...data,
            createdAt: (data.createdAt as Timestamp)?.toDate() || new Date(),
            updatedAt: (data.updatedAt as Timestamp)?.toDate() || new Date(),
        } as Chat;
    });
}

/**
 * Subscribe to user's chats (real-time)
 */
export function subscribeToUserChats(
    userId: string,
    callback: (chats: Chat[]) => void
): () => void {
    const chatsRef = collection(db, CHATS_COLLECTION);
    const q = query(
        chatsRef,
        where('participants', 'array-contains', userId),
        orderBy('updatedAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
        const chats = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                createdAt: (data.createdAt as Timestamp)?.toDate() || new Date(),
                updatedAt: (data.updatedAt as Timestamp)?.toDate() || new Date(),
            } as Chat;
        });
        callback(chats);
    });

    return unsubscribe;
}

/**
 * Send a message
 */
export async function sendMessage(
    chatId: string,
    senderId: string,
    content: string,
    type: 'text' | 'image' | 'file' = 'text'
): Promise<string> {
    const messagesRef = collection(db, CHATS_COLLECTION, chatId, MESSAGES_COLLECTION);

    const messageData = {
        chatId,
        senderId,
        content,
        type,
        status: 'sent',
        timestamp: serverTimestamp(),
    };

    const newMessageRef = await addDoc(messagesRef, messageData);

    // Update chat's last message and updatedAt
    const chatRef = doc(db, CHATS_COLLECTION, chatId);
    await updateDoc(chatRef, {
        lastMessage: {
            ...messageData,
            id: newMessageRef.id,
            timestamp: new Date(),
        },
        updatedAt: serverTimestamp(),
    });

    return newMessageRef.id;
}

/**
 * Get messages for a chat
 */
export async function getChatMessages(
    chatId: string,
    limitCount: number = 50
): Promise<Message[]> {
    const messagesRef = collection(db, CHATS_COLLECTION, chatId, MESSAGES_COLLECTION);
    const q = query(
        messagesRef,
        orderBy('timestamp', 'desc'),
        limit(limitCount)
    );

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs
        .map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                timestamp: (data.timestamp as Timestamp)?.toDate() || new Date(),
            } as Message;
        })
        .reverse(); // Reverse to show oldest first
}

/**
 * Subscribe to chat messages (real-time)
 */
export function subscribeToChatMessages(
    chatId: string,
    callback: (messages: Message[]) => void
): () => void {
    const messagesRef = collection(db, CHATS_COLLECTION, chatId, MESSAGES_COLLECTION);
    const q = query(messagesRef, orderBy('timestamp', 'asc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
        const messages = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                timestamp: (data.timestamp as Timestamp)?.toDate() || new Date(),
            } as Message;
        });
        callback(messages);
    });

    return unsubscribe;
}

/**
 * Update message status
 */
export async function updateMessageStatus(
    chatId: string,
    messageId: string,
    status: 'sent' | 'delivered' | 'read'
): Promise<void> {
    const messageRef = doc(db, CHATS_COLLECTION, chatId, MESSAGES_COLLECTION, messageId);
    await updateDoc(messageRef, { status });
}

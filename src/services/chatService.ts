import {
    doc,
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
    limitToLast,
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
    type: 'text' | 'image' | 'file' = 'text',
    fileUrl?: string,
    fileName?: string,
    fileSize?: number
): Promise<string> {
    const messagesRef = collection(db, CHATS_COLLECTION, chatId, MESSAGES_COLLECTION);

    const messageData: Record<string, unknown> = {
        chatId,
        senderId,
        content,
        type,
        status: 'sent',
        timestamp: serverTimestamp(),
    };

    // Add file fields if present
    if (fileUrl) messageData.fileUrl = fileUrl;
    if (fileName) messageData.fileName = fileName;
    if (fileSize !== undefined) messageData.fileSize = fileSize;

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
    const q = query(messagesRef, orderBy('timestamp', 'asc'), limitToLast(100));

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

/**
 * Mark all messages as read for a user in a chat
 */
export async function markMessagesAsRead(
    chatId: string,
    currentUserId: string
): Promise<void> {
    const messagesRef = collection(db, CHATS_COLLECTION, chatId, MESSAGES_COLLECTION);
    const q = query(
        messagesRef,
        where('senderId', '!=', currentUserId),
        where('status', 'in', ['sent', 'delivered'])
    );

    try {
        const querySnapshot = await getDocs(q);
        const updatePromises = querySnapshot.docs.map((msgDoc) =>
            updateDoc(doc(db, CHATS_COLLECTION, chatId, MESSAGES_COLLECTION, msgDoc.id), {
                status: 'read'
            })
        );
        await Promise.all(updatePromises);
    } catch (error) {
        console.error('Error marking messages as read:', error);
    }
}

/**
 * Set typing status for a user in a chat
 */
export async function setTypingStatus(
    chatId: string,
    userId: string,
    isTyping: boolean
): Promise<void> {
    const chatRef = doc(db, CHATS_COLLECTION, chatId);
    const typingField = `typing.${userId}`;

    await updateDoc(chatRef, {
        [typingField]: isTyping ? serverTimestamp() : null
    });
}

/**
 * Subscribe to typing status in a chat
 */
export function subscribeToTypingStatus(
    chatId: string,
    currentUserId: string,
    callback: (typingUsers: string[]) => void
): () => void {
    const chatRef = doc(db, CHATS_COLLECTION, chatId);

    const unsubscribe = onSnapshot(chatRef, (snapshot) => {
        if (snapshot.exists()) {
            const data = snapshot.data();
            const typing = data.typing || {};
            const now = Date.now();

            // Filter out users who stopped typing (more than 5 seconds ago)
            const typingUsers = Object.entries(typing)
                .filter(([id, timestamp]) => {
                    if (id === currentUserId) return false;
                    if (!timestamp) return false;
                    const ts = (timestamp as Timestamp).toDate().getTime();
                    return now - ts < 5000; // 5 second timeout
                })
                .map(([id]) => id);

            callback(typingUsers);
        }
    });

    return unsubscribe;
}

/**
 * Group chat functions
 */

/**
 * Create a new group chat
 */
export async function createGroupChat(
    creatorId: string,
    memberIds: string[],
    groupName: string,
    groupPhoto?: string
): Promise<string> {
    const chatsRef = collection(db, CHATS_COLLECTION);

    const allParticipants = [creatorId, ...memberIds.filter(id => id !== creatorId)];

    const newGroupRef = await addDoc(chatsRef, {
        participants: allParticipants,
        isGroup: true,
        groupName,
        groupPhoto: groupPhoto || null,
        admins: [creatorId],
        lastMessage: null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    });

    return newGroupRef.id;
}

/**
 * Add members to a group
 */
export async function addGroupMembers(
    chatId: string,
    memberIds: string[]
): Promise<void> {
    const chatRef = doc(db, CHATS_COLLECTION, chatId);
    const chatSnap = await getDoc(chatRef);

    if (chatSnap.exists()) {
        const currentParticipants = chatSnap.data().participants || [];
        const newParticipants = [...new Set([...currentParticipants, ...memberIds])];

        await updateDoc(chatRef, {
            participants: newParticipants,
            updatedAt: serverTimestamp()
        });
    }
}

/**
 * Remove a member from a group
 */
export async function removeGroupMember(
    chatId: string,
    memberId: string
): Promise<void> {
    const chatRef = doc(db, CHATS_COLLECTION, chatId);
    const chatSnap = await getDoc(chatRef);

    if (chatSnap.exists()) {
        const currentParticipants = chatSnap.data().participants || [];
        const newParticipants = currentParticipants.filter((id: string) => id !== memberId);

        // Also remove from admins if they were an admin
        const currentAdmins = chatSnap.data().admins || [];
        const newAdmins = currentAdmins.filter((id: string) => id !== memberId);

        await updateDoc(chatRef, {
            participants: newParticipants,
            admins: newAdmins,
            updatedAt: serverTimestamp()
        });
    }
}

/**
 * Update group info
 */
export async function updateGroupInfo(
    chatId: string,
    updates: { groupName?: string; groupPhoto?: string }
): Promise<void> {
    const chatRef = doc(db, CHATS_COLLECTION, chatId);
    await updateDoc(chatRef, {
        ...updates,
        updatedAt: serverTimestamp()
    });
}

/**
 * Make a member an admin
 */
export async function makeGroupAdmin(
    chatId: string,
    memberId: string
): Promise<void> {
    const chatRef = doc(db, CHATS_COLLECTION, chatId);
    const chatSnap = await getDoc(chatRef);

    if (chatSnap.exists()) {
        const currentAdmins = chatSnap.data().admins || [];
        if (!currentAdmins.includes(memberId)) {
            await updateDoc(chatRef, {
                admins: [...currentAdmins, memberId],
                updatedAt: serverTimestamp()
            });
        }
    }
}

/**
 * Leave a group
 */
export async function leaveGroup(
    chatId: string,
    userId: string
): Promise<void> {
    await removeGroupMember(chatId, userId);
}

/**
 * Toggle a reaction on a message
 * Only allows ONE reaction per user - removes user from other reactions when adding new one
 */
export async function toggleMessageReaction(
    chatId: string,
    messageId: string,
    userId: string,
    emoji: string
): Promise<void> {
    const messageRef = doc(db, CHATS_COLLECTION, chatId, MESSAGES_COLLECTION, messageId);
    const messageDoc = await getDoc(messageRef);

    if (!messageDoc.exists()) {
        throw new Error('Message not found');
    }

    const currentReactions: Record<string, string[]> = messageDoc.data().reactions || {};
    const usersWithReaction = currentReactions[emoji] || [];

    let newReactions: Record<string, string[]> = {};

    if (usersWithReaction.includes(userId)) {
        // User is removing their current reaction
        // Just remove user from this emoji
        Object.entries(currentReactions).forEach(([reactionEmoji, users]) => {
            const filtered = users.filter((id: string) => id !== userId);
            if (filtered.length > 0) {
                newReactions[reactionEmoji] = filtered;
            }
        });
    } else {
        // User is adding a new reaction
        // First, remove user from ALL other reactions (only 1 reaction per user)
        Object.entries(currentReactions).forEach(([reactionEmoji, users]) => {
            const filtered = users.filter((id: string) => id !== userId);
            if (filtered.length > 0) {
                newReactions[reactionEmoji] = filtered;
            }
        });

        // Then add user to the new reaction
        newReactions[emoji] = [...(newReactions[emoji] || []), userId];
    }

    await updateDoc(messageRef, { reactions: newReactions });
}

/**
 * Delete a message
 */
export async function deleteMessage(
    chatId: string,
    messageId: string,
    deleteForEveryone: boolean = false
): Promise<void> {
    const messageRef = doc(db, CHATS_COLLECTION, chatId, MESSAGES_COLLECTION, messageId);

    if (deleteForEveryone) {
        // Update message content to show it was deleted
        await updateDoc(messageRef, {
            content: 'This message was deleted',
            isDeleted: true,
            deletedAt: serverTimestamp()
        });
    } else {
        // Mark as deleted for current user (soft delete)
        await updateDoc(messageRef, {
            isDeleted: true,
            deletedAt: serverTimestamp()
        });
    }
}

/**
 * Star/unstar a message
 */
export async function toggleMessageStar(
    chatId: string,
    messageId: string,
    userId: string
): Promise<void> {
    const messageRef = doc(db, CHATS_COLLECTION, chatId, MESSAGES_COLLECTION, messageId);
    const messageSnap = await getDoc(messageRef);

    if (!messageSnap.exists()) return;

    const currentStarred: string[] = messageSnap.data().starredBy || [];

    if (currentStarred.includes(userId)) {
        // Remove star
        await updateDoc(messageRef, {
            starredBy: currentStarred.filter(id => id !== userId)
        });
    } else {
        // Add star
        await updateDoc(messageRef, {
            starredBy: [...currentStarred, userId]
        });
    }
}

/**
 * Pin a message in a chat
 */
export async function toggleMessagePin(
    chatId: string,
    messageId: string
): Promise<void> {
    const messageRef = doc(db, CHATS_COLLECTION, chatId, MESSAGES_COLLECTION, messageId);
    const messageSnap = await getDoc(messageRef);

    if (!messageSnap.exists()) return;

    const isPinned = messageSnap.data().isPinned || false;

    await updateDoc(messageRef, {
        isPinned: !isPinned,
        pinnedAt: !isPinned ? serverTimestamp() : null
    });
}

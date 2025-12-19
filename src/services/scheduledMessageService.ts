/**
 * Scheduled Message Service - Firestore CRUD operations for scheduled messages
 */

import {
    doc,
    setDoc,
    getDoc,
    getDocs,
    deleteDoc,
    query,
    where,
    collection,
    updateDoc,
    serverTimestamp,
    Timestamp,
    orderBy
} from 'firebase/firestore';
import { db } from '../config/firebase';
import type { ScheduledMessage } from '../types';

const SCHEDULED_MESSAGES_COLLECTION = 'scheduledMessages';

/**
 * Create a new scheduled message
 */
export async function createScheduledMessage(
    chatId: string,
    senderId: string,
    content: string,
    scheduledFor: Date,
    recipientName?: string
): Promise<string> {
    const scheduledRef = doc(collection(db, SCHEDULED_MESSAGES_COLLECTION));

    const scheduledData = {
        id: scheduledRef.id,
        chatId,
        senderId,
        content,
        scheduledFor: Timestamp.fromDate(scheduledFor),
        status: 'pending' as const,
        createdAt: serverTimestamp(),
        recipientName: recipientName || null,
    };

    await setDoc(scheduledRef, scheduledData);
    return scheduledRef.id;
}

/**
 * Get a scheduled message by ID
 */
export async function getScheduledMessageById(id: string): Promise<ScheduledMessage | null> {
    const scheduledRef = doc(db, SCHEDULED_MESSAGES_COLLECTION, id);
    const scheduledSnap = await getDoc(scheduledRef);

    if (scheduledSnap.exists()) {
        const data = scheduledSnap.data();
        return {
            ...data,
            id: scheduledSnap.id,
            scheduledFor: (data.scheduledFor as Timestamp)?.toDate() || new Date(),
            createdAt: (data.createdAt as Timestamp)?.toDate() || new Date(),
        } as ScheduledMessage;
    }

    return null;
}

/**
 * Get all scheduled messages for a user
 */
export async function getUserScheduledMessages(userId: string): Promise<ScheduledMessage[]> {
    const scheduledRef = collection(db, SCHEDULED_MESSAGES_COLLECTION);
    const q = query(
        scheduledRef,
        where('senderId', '==', userId),
        where('status', '==', 'pending'),
        orderBy('scheduledFor', 'asc')
    );

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
            ...data,
            id: doc.id,
            scheduledFor: (data.scheduledFor as Timestamp)?.toDate() || new Date(),
            createdAt: (data.createdAt as Timestamp)?.toDate() || new Date(),
        } as ScheduledMessage;
    });
}

/**
 * Get all scheduled messages for a specific chat
 */
export async function getChatScheduledMessages(chatId: string): Promise<ScheduledMessage[]> {
    const scheduledRef = collection(db, SCHEDULED_MESSAGES_COLLECTION);
    const q = query(
        scheduledRef,
        where('chatId', '==', chatId),
        where('status', '==', 'pending'),
        orderBy('scheduledFor', 'asc')
    );

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
            ...data,
            id: doc.id,
            scheduledFor: (data.scheduledFor as Timestamp)?.toDate() || new Date(),
            createdAt: (data.createdAt as Timestamp)?.toDate() || new Date(),
        } as ScheduledMessage;
    });
}

/**
 * Get upcoming scheduled messages that are due to be sent
 * Note: This may fail with permission error if Firestore rules don't allow
 * querying all messages. We handle this silently.
 */
export async function getUpcomingScheduledMessages(): Promise<ScheduledMessage[]> {
    try {
        const now = new Date();
        const scheduledRef = collection(db, SCHEDULED_MESSAGES_COLLECTION);
        const q = query(
            scheduledRef,
            where('status', '==', 'pending'),
            where('scheduledFor', '<=', Timestamp.fromDate(now)),
            orderBy('scheduledFor', 'asc')
        );

        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => {
            const data = doc.data();
            return {
                ...data,
                id: doc.id,
                scheduledFor: (data.scheduledFor as Timestamp)?.toDate() || new Date(),
                createdAt: (data.createdAt as Timestamp)?.toDate() || new Date(),
            } as ScheduledMessage;
        });
    } catch (error) {
        // Silently handle permission errors - this is expected when Firestore rules
        // don't allow querying all scheduled messages
        return [];
    }
}

/**
 * Cancel a scheduled message
 */
export async function cancelScheduledMessage(id: string): Promise<void> {
    const scheduledRef = doc(db, SCHEDULED_MESSAGES_COLLECTION, id);
    await updateDoc(scheduledRef, {
        status: 'cancelled',
    });
}

/**
 * Mark a scheduled message as sent
 */
export async function markScheduledMessageAsSent(id: string): Promise<void> {
    const scheduledRef = doc(db, SCHEDULED_MESSAGES_COLLECTION, id);
    await updateDoc(scheduledRef, {
        status: 'sent',
    });
}

/**
 * Delete a scheduled message
 */
export async function deleteScheduledMessage(id: string): Promise<void> {
    const scheduledRef = doc(db, SCHEDULED_MESSAGES_COLLECTION, id);
    await deleteDoc(scheduledRef);
}

/**
 * Process and send due scheduled messages
 * This function should be called periodically (e.g., on app load, or with an interval)
 */
export async function processScheduledMessages(
    sendMessageFn: (chatId: string, senderId: string, content: string) => Promise<void>
): Promise<number> {
    const dueMessages = await getUpcomingScheduledMessages();
    let sentCount = 0;

    for (const scheduledMsg of dueMessages) {
        try {
            await sendMessageFn(scheduledMsg.chatId, scheduledMsg.senderId, scheduledMsg.content);
            await markScheduledMessageAsSent(scheduledMsg.id);
            sentCount++;
        } catch (error) {
            console.error(`Failed to send scheduled message ${scheduledMsg.id}:`, error);
        }
    }

    return sentCount;
}

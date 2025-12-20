/**
 * Reminder Service - Firestore CRUD operations for message reminders
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
import type { Reminder } from '../types';

const REMINDERS_COLLECTION = 'reminders';

/**
 * Create a new reminder for a message
 */
export async function createReminder(
    userId: string,
    chatId: string,
    messageId: string,
    messageContent: string,
    reminderTime: Date,
    chatName?: string
): Promise<string> {
    const reminderRef = doc(collection(db, REMINDERS_COLLECTION));

    const reminderData = {
        id: reminderRef.id,
        userId,
        chatId,
        messageId,
        messageContent,
        reminderTime: Timestamp.fromDate(reminderTime),
        status: 'pending' as const,
        createdAt: serverTimestamp(),
        chatName: chatName || null,
    };

    await setDoc(reminderRef, reminderData);
    return reminderRef.id;
}

/**
 * Get a reminder by ID
 */
export async function getReminderById(id: string): Promise<Reminder | null> {
    const reminderRef = doc(db, REMINDERS_COLLECTION, id);
    const reminderSnap = await getDoc(reminderRef);

    if (reminderSnap.exists()) {
        const data = reminderSnap.data();
        return {
            ...data,
            id: reminderSnap.id,
            reminderTime: (data.reminderTime as Timestamp)?.toDate() || new Date(),
            createdAt: (data.createdAt as Timestamp)?.toDate() || new Date(),
        } as Reminder;
    }

    return null;
}

/**
 * Get all pending reminders for a user
 */
export async function getUserReminders(userId: string): Promise<Reminder[]> {
    const remindersRef = collection(db, REMINDERS_COLLECTION);
    const q = query(
        remindersRef,
        where('userId', '==', userId),
        where('status', '==', 'pending'),
        orderBy('reminderTime', 'asc')
    );

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
            ...data,
            id: doc.id,
            reminderTime: (data.reminderTime as Timestamp)?.toDate() || new Date(),
            createdAt: (data.createdAt as Timestamp)?.toDate() || new Date(),
        } as Reminder;
    });
}

/**
 * Get due reminders that need to be triggered
 */
export async function getDueReminders(userId: string): Promise<Reminder[]> {
    try {
        const now = new Date();
        const remindersRef = collection(db, REMINDERS_COLLECTION);
        const q = query(
            remindersRef,
            where('userId', '==', userId),
            where('status', '==', 'pending'),
            where('reminderTime', '<=', Timestamp.fromDate(now)),
            orderBy('reminderTime', 'asc')
        );

        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => {
            const data = doc.data();
            return {
                ...data,
                id: doc.id,
                reminderTime: (data.reminderTime as Timestamp)?.toDate() || new Date(),
                createdAt: (data.createdAt as Timestamp)?.toDate() || new Date(),
            } as Reminder;
        });
    } catch (error) {
        // Silently handle permission errors
        return [];
    }
}

/**
 * Mark a reminder as triggered
 */
export async function markReminderAsTriggered(id: string): Promise<void> {
    const reminderRef = doc(db, REMINDERS_COLLECTION, id);
    await updateDoc(reminderRef, {
        status: 'triggered',
    });
}

/**
 * Dismiss a reminder
 */
export async function dismissReminder(id: string): Promise<void> {
    const reminderRef = doc(db, REMINDERS_COLLECTION, id);
    await updateDoc(reminderRef, {
        status: 'dismissed',
    });
}

/**
 * Delete a reminder
 */
export async function deleteReminder(id: string): Promise<void> {
    const reminderRef = doc(db, REMINDERS_COLLECTION, id);
    await deleteDoc(reminderRef);
}

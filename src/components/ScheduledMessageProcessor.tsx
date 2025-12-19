/**
 * ScheduledMessageProcessor Component
 * 
 * Processes scheduled messages on the frontend (free tier alternative to Firebase Functions).
 * Runs only for authenticated users and handles Firestore permission errors silently.
 */

import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { processScheduledMessages } from '../services/scheduledMessageService';
import { sendMessage } from '../services/chatService';

export default function ScheduledMessageProcessor() {
    const { userProfile, loading: authLoading } = useAuth();
    const processingRef = useRef(false);
    const [hasInitialized, setHasInitialized] = useState(false);

    useEffect(() => {
        // Wait for auth to be fully loaded
        if (authLoading) return;

        // Only run for authenticated users
        if (!userProfile?.uid) {
            return;
        }

        // Prevent running on every re-render
        if (hasInitialized) return;
        setHasInitialized(true);

        const processMessages = async () => {
            // Prevent concurrent processing
            if (processingRef.current) return;
            processingRef.current = true;

            try {
                const sentCount = await processScheduledMessages(
                    async (chatId, senderId, content) => {
                        // Only process messages from the current user
                        if (senderId !== userProfile.uid) {
                            console.warn('[Scheduler] Skipping message from different user');
                            return;
                        }
                        await sendMessage(chatId, senderId, content);
                    }
                );

                if (sentCount > 0) {
                    console.log(`[Scheduler] Sent ${sentCount} scheduled message(s)`);
                }
            } catch (error) {
                // Handle Firestore permission errors silently
                const errorMessage = error instanceof Error ? error.message : String(error);

                if (errorMessage.includes('permission') ||
                    errorMessage.includes('PERMISSION_DENIED') ||
                    errorMessage.includes('Missing or insufficient permissions')) {
                    console.warn('[Scheduler] Firestore permission issue, skipping scheduled messages check');
                } else if (errorMessage.includes('index')) {
                    console.warn('[Scheduler] Missing Firestore index, skipping scheduled messages check');
                } else {
                    // Only log non-permission errors
                    console.warn('[Scheduler] Could not process scheduled messages:', errorMessage);
                }
            } finally {
                processingRef.current = false;
            }
        };

        // Delay initial processing to avoid blocking app load
        const initialTimeout = setTimeout(processMessages, 5000);

        // Check every 60 seconds
        const interval = setInterval(processMessages, 60000);

        return () => {
            clearTimeout(initialTimeout);
            clearInterval(interval);
        };
    }, [userProfile?.uid, authLoading, hasInitialized]);

    // This component renders nothing
    return null;
}

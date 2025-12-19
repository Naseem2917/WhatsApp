/**
 * ScheduledMessageProcessor Component
 * 
 * Processes scheduled messages on the frontend (free tier alternative to Firebase Functions).
 * Runs only for authenticated users and handles Firestore permission errors silently.
 */

import { useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { processScheduledMessages } from '../services/scheduledMessageService';
import { sendMessage } from '../services/chatService';

// Check interval in milliseconds (30 seconds for better responsiveness)
const CHECK_INTERVAL_MS = 30000;

export default function ScheduledMessageProcessor() {
    const { userProfile, loading: authLoading } = useAuth();
    const processingRef = useRef(false);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);

    const processMessages = useCallback(async () => {
        // Only run for authenticated users
        if (!userProfile?.uid) return;

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
            console.error('[Scheduler] Error processing scheduled messages:', error);
        } finally {
            processingRef.current = false;
        }
    }, [userProfile?.uid]);

    useEffect(() => {
        // Wait for auth to be fully loaded
        if (authLoading) return;

        // Only run for authenticated users
        if (!userProfile?.uid) {
            return;
        }

        // Process on mount after small delay
        const initialTimeout = setTimeout(processMessages, 3000);

        // Set up regular interval (every 30 seconds)
        intervalRef.current = setInterval(processMessages, CHECK_INTERVAL_MS);

        // Process when tab becomes visible
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                processMessages();
            }
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);

        // Process on focus (when window gains focus)
        const handleFocus = () => {
            processMessages();
        };
        window.addEventListener('focus', handleFocus);

        return () => {
            clearTimeout(initialTimeout);
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('focus', handleFocus);
        };
    }, [userProfile?.uid, authLoading, processMessages]);

    // This component renders nothing
    return null;
}

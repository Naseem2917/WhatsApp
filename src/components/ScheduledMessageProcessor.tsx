/**
 * ScheduledMessageProcessor Component
 * 
 * Processes scheduled messages on the frontend (free tier alternative to Firebase Functions).
 * Checks for due messages on mount and every 60 seconds.
 */

import { useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { processScheduledMessages } from '../services/scheduledMessageService';
import { sendMessage } from '../services/chatService';

export default function ScheduledMessageProcessor() {
    const { userProfile } = useAuth();
    const processingRef = useRef(false);

    useEffect(() => {
        if (!userProfile?.uid) return;

        const processMessages = async () => {
            // Prevent concurrent processing
            if (processingRef.current) return;
            processingRef.current = true;

            try {
                const sentCount = await processScheduledMessages(
                    async (chatId, senderId, content) => {
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
        };

        // Process immediately on mount
        processMessages();

        // Check every 60 seconds
        const interval = setInterval(processMessages, 60000);

        return () => clearInterval(interval);
    }, [userProfile?.uid]);

    // This component renders nothing
    return null;
}

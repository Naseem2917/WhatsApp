/**
 * ReminderProcessor Component
 * 
 * Processes reminders and shows notifications when they are due.
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getDueReminders, markReminderAsTriggered, dismissReminder } from '../services/reminderService';
import type { Reminder } from '../types';

// Check interval in milliseconds (15 seconds for responsiveness)
const CHECK_INTERVAL_MS = 15000;

export default function ReminderProcessor() {
    const { userProfile, loading: authLoading } = useAuth();
    const navigate = useNavigate();
    const processingRef = useRef(false);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);
    const [activeReminder, setActiveReminder] = useState<Reminder | null>(null);

    const processReminders = useCallback(async () => {
        if (!userProfile?.uid) return;
        if (processingRef.current) return;
        processingRef.current = true;

        try {
            const dueReminders = await getDueReminders(userProfile.uid);

            if (dueReminders.length > 0) {
                // Show the first due reminder
                setActiveReminder(dueReminders[0]);

                // Request notification permission and show browser notification
                if (Notification.permission === 'granted') {
                    new Notification('⏰ Reminder', {
                        body: dueReminders[0].messageContent.substring(0, 100),
                        icon: '/favicon.ico',
                        tag: dueReminders[0].id,
                    });
                } else if (Notification.permission !== 'denied') {
                    Notification.requestPermission();
                }
            }
        } catch (error) {
            console.error('[Reminder] Error processing reminders:', error);
        } finally {
            processingRef.current = false;
        }
    }, [userProfile?.uid]);

    useEffect(() => {
        if (authLoading) return;
        if (!userProfile?.uid) return;

        // Request notification permission on mount
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
        }

        // Process on mount after small delay
        const initialTimeout = setTimeout(processReminders, 2000);

        // Set up regular interval
        intervalRef.current = setInterval(processReminders, CHECK_INTERVAL_MS);

        // Process when tab becomes visible
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                processReminders();
            }
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            clearTimeout(initialTimeout);
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [userProfile?.uid, authLoading, processReminders]);

    const handleDismiss = async () => {
        if (activeReminder) {
            await dismissReminder(activeReminder.id);
            setActiveReminder(null);
        }
    };

    const handleViewMessage = async () => {
        if (activeReminder) {
            await markReminderAsTriggered(activeReminder.id);
            navigate(`/chat/${activeReminder.chatId}`);
            setActiveReminder(null);
        }
    };

    // Render notification popup when reminder is active
    if (!activeReminder) return null;

    return (
        <div className="fixed bottom-4 right-4 z-50 animate-fade-in">
            <div
                className="w-80 rounded-lg shadow-xl overflow-hidden"
                style={{ backgroundColor: 'var(--wa-bg-panel)', border: '1px solid var(--wa-border)' }}
            >
                {/* Header */}
                <div
                    className="flex items-center gap-2 px-4 py-3"
                    style={{ backgroundColor: '#f59e0b' }}
                >
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                    </svg>
                    <span className="text-white font-medium">⏰ Reminder</span>
                    {activeReminder.chatName && (
                        <span className="text-white/70 text-sm">• {activeReminder.chatName}</span>
                    )}
                </div>

                {/* Content */}
                <div className="p-4">
                    <p className="text-sm mb-4 line-clamp-3" style={{ color: 'var(--wa-text-primary)' }}>
                        {activeReminder.messageContent}
                    </p>

                    <div className="flex gap-2">
                        <button
                            onClick={handleDismiss}
                            className="flex-1 py-2 rounded-lg text-sm font-medium transition-colors"
                            style={{ backgroundColor: 'var(--wa-bg-input)', color: 'var(--wa-text-primary)', border: '1px solid var(--wa-border)' }}
                        >
                            Dismiss
                        </button>
                        <button
                            onClick={handleViewMessage}
                            className="flex-1 py-2 rounded-lg text-sm font-medium text-white transition-colors"
                            style={{ backgroundColor: 'var(--wa-green)' }}
                        >
                            View Chat
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

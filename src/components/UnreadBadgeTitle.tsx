import { useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { subscribeToUserChats } from '../services/chatService';

/**
 * UnreadBadgeTitle Component
 * 
 * Updates the browser tab title to show unread message count.
 * Example: "(3) WhatsApp Clone" when there are 3 unread messages.
 */
export default function UnreadBadgeTitle() {
    const { userProfile } = useAuth();
    const defaultTitle = useRef('WhatsApp Clone');

    useEffect(() => {
        if (!userProfile?.uid) return;

        const unsubscribe = subscribeToUserChats(userProfile.uid, (chats) => {
            // Sum up all unread counts for the current user
            const totalUnread = chats.reduce((total, chat) => {
                const unreadCount = chat.unreadCount?.[userProfile.uid] || 0;
                return total + unreadCount;
            }, 0);

            // Update document title
            if (totalUnread > 0) {
                document.title = `(${totalUnread}) ${defaultTitle.current}`;
            } else {
                document.title = defaultTitle.current;
            }
        });

        return () => {
            unsubscribe();
            document.title = defaultTitle.current;
        };
    }, [userProfile?.uid]);

    return null; // This component doesn't render anything
}

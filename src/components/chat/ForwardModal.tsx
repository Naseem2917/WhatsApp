/**
 * ForwardModal Component
 * 
 * Modal to select which chat to forward a message to.
 */

import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getUserChats } from '../../services/chatService';
import { getUserById } from '../../services/userService';
import type { Chat, UserProfile } from '../../types';

interface ForwardModalProps {
    isOpen: boolean;
    messageContent: string;
    onClose: () => void;
    onForward: (chatId: string) => void;
}

export default function ForwardModal({ isOpen, messageContent, onClose, onForward }: ForwardModalProps) {
    const { userProfile } = useAuth();
    const [chats, setChats] = useState<Chat[]>([]);
    const [chatUsers, setChatUsers] = useState<Map<string, UserProfile>>(new Map());
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        if (!isOpen || !userProfile?.uid) return;

        const loadChats = async () => {
            setIsLoading(true);
            try {
                const userChats = await getUserChats(userProfile.uid);
                setChats(userChats);

                // Load user profiles for each chat
                const userMap = new Map<string, UserProfile>();
                for (const chat of userChats) {
                    if (!chat.isGroup) {
                        const otherUserId = chat.participants.find(id => id !== userProfile.uid);
                        if (otherUserId && !userMap.has(otherUserId)) {
                            const user = await getUserById(otherUserId);
                            if (user) userMap.set(otherUserId, user);
                        }
                    }
                }
                setChatUsers(userMap);
            } catch (error) {
                console.error('Failed to load chats:', error);
            } finally {
                setIsLoading(false);
            }
        };

        loadChats();
    }, [isOpen, userProfile?.uid]);

    if (!isOpen) return null;

    const filteredChats = chats.filter(chat => {
        if (!searchQuery.trim()) return true;
        const query = searchQuery.toLowerCase();

        if (chat.isGroup) {
            return chat.groupName?.toLowerCase().includes(query);
        } else {
            const otherUserId = chat.participants.find(id => id !== userProfile?.uid);
            const user = otherUserId ? chatUsers.get(otherUserId) : null;
            return user?.displayName.toLowerCase().includes(query) ||
                user?.username.toLowerCase().includes(query);
        }
    });

    const getChatName = (chat: Chat) => {
        if (chat.isGroup) return chat.groupName || 'Group';
        const otherUserId = chat.participants.find(id => id !== userProfile?.uid);
        const user = otherUserId ? chatUsers.get(otherUserId) : null;
        return user?.displayName || 'Unknown';
    };

    const getChatPhoto = (chat: Chat) => {
        if (chat.isGroup) return chat.groupPhoto;
        const otherUserId = chat.participants.find(id => id !== userProfile?.uid);
        const user = otherUserId ? chatUsers.get(otherUserId) : null;
        return user?.photoURL;
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div
                className="w-full max-w-md rounded-lg shadow-xl overflow-hidden"
                style={{ backgroundColor: 'var(--wa-bg-panel)' }}
            >
                {/* Header */}
                <div className="flex items-center gap-3 px-4 py-3" style={{ backgroundColor: 'var(--wa-bg-deeper)' }}>
                    <button
                        onClick={onClose}
                        className="p-1 rounded-full hover:bg-black/10"
                        style={{ color: 'var(--wa-icon)' }}
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                    <h2 className="text-lg font-medium" style={{ color: 'var(--wa-text-primary)' }}>Forward message</h2>
                </div>

                {/* Message Preview */}
                <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--wa-border)' }}>
                    <p className="text-sm truncate" style={{ color: 'var(--wa-text-secondary)' }}>
                        {messageContent.length > 100 ? messageContent.substring(0, 100) + '...' : messageContent}
                    </p>
                </div>

                {/* Search */}
                <div className="px-4 py-2">
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search chats..."
                        className="w-full px-4 py-2 rounded-lg text-sm"
                        style={{
                            backgroundColor: 'var(--wa-bg-input)',
                            color: 'var(--wa-text-primary)',
                            border: '1px solid var(--wa-border)'
                        }}
                    />
                </div>

                {/* Chat list */}
                <div className="max-h-[300px] overflow-y-auto">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-8">
                            <div className="spinner w-8 h-8" />
                        </div>
                    ) : filteredChats.length === 0 ? (
                        <div className="text-center py-8" style={{ color: 'var(--wa-text-secondary)' }}>
                            No chats found
                        </div>
                    ) : (
                        filteredChats.map(chat => (
                            <button
                                key={chat.id}
                                onClick={() => {
                                    onForward(chat.id);
                                    onClose();
                                }}
                                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                            >
                                <div
                                    className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0"
                                    style={{ backgroundColor: 'var(--wa-green)' }}
                                >
                                    {getChatPhoto(chat) ? (
                                        <img
                                            src={getChatPhoto(chat)!}
                                            alt=""
                                            className="w-12 h-12 rounded-full object-cover"
                                        />
                                    ) : (
                                        <span className="text-white text-lg font-medium">
                                            {getChatName(chat).charAt(0).toUpperCase()}
                                        </span>
                                    )}
                                </div>
                                <div className="flex-1 text-left">
                                    <p className="font-medium" style={{ color: 'var(--wa-text-primary)' }}>
                                        {getChatName(chat)}
                                    </p>
                                    {chat.isGroup && (
                                        <p className="text-xs" style={{ color: 'var(--wa-text-secondary)' }}>
                                            {chat.participants.length} members
                                        </p>
                                    )}
                                </div>
                            </button>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}

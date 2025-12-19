import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { subscribeToUserChats } from '../../services/chatService';
import { getUserById } from '../../services/userService';
import { NewChatModal, CreateGroupModal } from '../chat';
import type { Chat, UserProfile } from '../../types';

interface SidebarProps {
    isOpen: boolean;
    onClose: () => void;
    selectedChatId?: string;
}

interface ChatWithUser extends Chat {
    otherUser?: UserProfile | null;
}

export function Sidebar({ isOpen, onClose, selectedChatId }: SidebarProps) {
    const { userProfile } = useAuth();
    const navigate = useNavigate();

    const [searchQuery, setSearchQuery] = useState('');
    const [chats, setChats] = useState<ChatWithUser[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showNewChatModal, setShowNewChatModal] = useState(false);
    const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
    const [filter, setFilter] = useState<'all' | 'unread' | 'groups'>('all');

    // Subscribe to user's chats
    useEffect(() => {
        if (!userProfile?.uid) return;

        setIsLoading(true);
        const unsubscribe = subscribeToUserChats(userProfile.uid, async (chatList) => {
            // Fetch other user details for each chat
            const chatsWithUsers = await Promise.all(
                chatList.map(async (chat) => {
                    if (chat.isGroup) {
                        return { ...chat, otherUser: null };
                    }
                    const otherUserId = chat.participants.find(
                        (id) => id !== userProfile.uid
                    );
                    if (otherUserId) {
                        const otherUser = await getUserById(otherUserId);
                        return { ...chat, otherUser };
                    }
                    return { ...chat, otherUser: null };
                })
            );
            setChats(chatsWithUsers);
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, [userProfile?.uid]);

    // Filter chats based on search and filter
    const filteredChats = chats.filter((chat) => {
        // Filter by type
        if (filter === 'groups' && !chat.isGroup) return false;
        // TODO: Add unread filter when we implement unread count

        // Filter by search
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            if (chat.isGroup) {
                return chat.groupName?.toLowerCase().includes(query);
            }
            return (
                chat.otherUser?.displayName?.toLowerCase().includes(query) ||
                chat.otherUser?.username?.toLowerCase().includes(query)
            );
        }
        return true;
    });

    const handleChatClick = (chatId: string) => {
        navigate(`/chat/${chatId}`);
        onClose(); // Close sidebar on mobile
    };

    const formatTime = (date: Date) => {
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));

        if (days === 0) {
            return date.toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: false,
            });
        } else if (days === 1) {
            return 'Yesterday';
        } else if (days < 7) {
            return date.toLocaleDateString('en-US', { weekday: 'short' });
        } else {
            return date.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
            });
        }
    };

    return (
        <>
            {/* Mobile overlay */}
            {isOpen && (
                <div
                    className="sm:hidden fixed inset-0 bg-black/50 z-40"
                    onClick={onClose}
                />
            )}

            {/* Sidebar */}
            <aside
                className={`
                    fixed sm:relative z-50 sm:z-0
                    w-full sm:w-[340px] md:w-[400px]
                    bg-dark-900 border-r border-dark-700
                    flex flex-col h-full
                    transition-transform duration-300
                    ${isOpen ? 'translate-x-0' : '-translate-x-full sm:translate-x-0'}
                `}
            >
                {/* Search bar */}
                <div className="p-3 bg-dark-900">
                    <div className="relative">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-dark-500">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </div>
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search or start new chat"
                            className="w-full bg-dark-800 border-none rounded-lg pl-12 pr-4 py-2.5 text-sm text-white placeholder-dark-500 focus:outline-none"
                        />
                    </div>
                </div>

                {/* Filter tabs */}
                <div className="flex gap-4 px-4 py-2 border-b border-dark-700 text-sm">
                    <button
                        onClick={() => setFilter('all')}
                        className={`pb-2 font-medium transition-colors ${filter === 'all'
                            ? 'text-primary-400 border-b-2 border-primary-400'
                            : 'text-dark-400 hover:text-white'
                            }`}
                    >
                        All
                    </button>
                    <button
                        onClick={() => setFilter('unread')}
                        className={`pb-2 transition-colors ${filter === 'unread'
                            ? 'text-primary-400 border-b-2 border-primary-400 font-medium'
                            : 'text-dark-400 hover:text-white'
                            }`}
                    >
                        Unread
                    </button>
                    <button
                        onClick={() => setFilter('groups')}
                        className={`pb-2 transition-colors ${filter === 'groups'
                            ? 'text-primary-400 border-b-2 border-primary-400 font-medium'
                            : 'text-dark-400 hover:text-white'
                            }`}
                    >
                        Groups
                    </button>
                </div>

                {/* Chat list */}
                <div className="flex-1 overflow-y-auto">
                    {isLoading ? (
                        <div className="flex items-center justify-center h-32">
                            <div className="spinner w-8 h-8" />
                        </div>
                    ) : filteredChats.length > 0 ? (
                        <div className="divide-y divide-dark-700/50">
                            {filteredChats.map((chat) => (
                                <button
                                    key={chat.id}
                                    onClick={() => handleChatClick(chat.id)}
                                    className={`w-full flex items-center gap-3 p-3 hover:bg-dark-800 transition-colors text-left ${selectedChatId === chat.id ? 'bg-dark-800' : ''
                                        }`}
                                >
                                    {/* Avatar */}
                                    <div className="relative flex-shrink-0">
                                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white font-semibold">
                                            {chat.isGroup ? (
                                                chat.groupPhoto ? (
                                                    <img
                                                        src={chat.groupPhoto}
                                                        alt={chat.groupName}
                                                        className="w-12 h-12 rounded-full object-cover"
                                                    />
                                                ) : (
                                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                                                    </svg>
                                                )
                                            ) : chat.otherUser?.photoURL ? (
                                                <img
                                                    src={chat.otherUser.photoURL}
                                                    alt={chat.otherUser.displayName}
                                                    className="w-12 h-12 rounded-full object-cover"
                                                />
                                            ) : (
                                                chat.otherUser?.displayName?.charAt(0).toUpperCase() || '?'
                                            )}
                                        </div>
                                        {/* Online indicator */}
                                        {!chat.isGroup && chat.otherUser?.isOnline && (
                                            <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-dark-900 rounded-full" />
                                        )}
                                    </div>

                                    {/* Chat info */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between">
                                            <p className="text-white font-medium truncate">
                                                {chat.isGroup
                                                    ? chat.groupName
                                                    : chat.otherUser?.displayName || 'Unknown User'}
                                            </p>
                                            {chat.lastMessage && (
                                                <span className="text-dark-400 text-xs flex-shrink-0 ml-2">
                                                    {formatTime(chat.updatedAt)}
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-dark-400 text-sm truncate">
                                            {chat.lastMessage?.content || 'No messages yet'}
                                        </p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    ) : (
                        /* Empty state */
                        <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-dark-800 flex items-center justify-center">
                                <svg className="w-10 h-10 text-dark-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                </svg>
                            </div>
                            <h3 className="text-base font-normal text-white mb-1">No chats</h3>
                            <p className="text-dark-400 text-sm mb-4">Start a conversation by searching for a contact</p>
                            <button
                                onClick={() => setShowNewChatModal(true)}
                                className="inline-flex items-center gap-2 bg-primary-500 hover:bg-primary-600 text-white font-medium px-4 py-2 rounded-full transition-colors text-sm"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                                New Chat
                            </button>
                        </div>
                    )}
                </div>

                {/* Floating Action Buttons (when chats exist) */}
                {filteredChats.length > 0 && (
                    <div className="absolute bottom-6 right-6 flex flex-col gap-3">
                        {/* Create Group Button */}
                        <button
                            onClick={() => setShowCreateGroupModal(true)}
                            className="w-12 h-12 bg-dark-700 hover:bg-dark-600 text-white rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-105"
                            title="Create Group"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                        </button>
                        {/* New Chat Button */}
                        <button
                            onClick={() => setShowNewChatModal(true)}
                            className="w-14 h-14 bg-primary-500 hover:bg-primary-600 text-white rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-105"
                            title="New Chat"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                        </button>
                    </div>
                )}
            </aside>

            {/* New Chat Modal */}
            <NewChatModal
                isOpen={showNewChatModal}
                onClose={() => setShowNewChatModal(false)}
            />

            {/* Create Group Modal */}
            <CreateGroupModal
                isOpen={showCreateGroupModal}
                onClose={() => setShowCreateGroupModal(false)}
            />
        </>
    );
}

import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { subscribeToUserChats } from '../../services/chatService';
import { getUserById, isUserOnline } from '../../services/userService';
import { NewChatModal, CreateGroupModal } from '../chat';
import { DropdownMenu } from '../common';
import type { Chat, UserProfile } from '../../types';

interface SidebarProps {
    isOpen: boolean;
    onClose: () => void;
    selectedChatId?: string;
}

interface ChatWithUser extends Chat {
    otherUser?: UserProfile | null;
}

type FilterType = 'all' | 'unread' | 'favorites' | 'groups';

export function Sidebar({ isOpen, onClose, selectedChatId }: SidebarProps) {
    const { userProfile } = useAuth();
    const { toggleTheme, effectiveTheme } = useTheme();
    const navigate = useNavigate();

    const [searchQuery, setSearchQuery] = useState('');
    const [chats, setChats] = useState<ChatWithUser[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showNewChatModal, setShowNewChatModal] = useState(false);
    const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
    const [filter, setFilter] = useState<FilterType>('all');
    const [showMenu, setShowMenu] = useState(false);
    const { logout } = useAuth();

    // Cache for user profiles to reduce Firestore reads (Firebase free tier optimization)
    const userProfileCache = useRef<Map<string, UserProfile>>(new Map());

    // Subscribe to user's chats
    useEffect(() => {
        if (!userProfile?.uid) {
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        const unsubscribe = subscribeToUserChats(userProfile.uid, async (chatList) => {
            const chatsWithUsers = await Promise.all(
                chatList.map(async (chat) => {
                    if (chat.isGroup) {
                        return { ...chat, otherUser: null };
                    }
                    const otherUserId = chat.participants.find(
                        (id) => id !== userProfile.uid
                    );
                    if (otherUserId) {
                        // Check cache first (Firebase optimization)
                        let otherUser: UserProfile | null | undefined = userProfileCache.current.get(otherUserId);
                        if (!otherUser) {
                            const fetchedUser = await getUserById(otherUserId);
                            if (fetchedUser) {
                                userProfileCache.current.set(otherUserId, fetchedUser);
                                otherUser = fetchedUser;
                            }
                        }
                        return { ...chat, otherUser: otherUser ?? null };
                    }
                    return { ...chat, otherUser: null };
                })
            );
            setChats(chatsWithUsers);
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, [userProfile?.uid]);

    // Zero-read presence ticker: re-evaluates isUserOnline timestamps every 30s with 0 database reads
    const [, setTick] = useState(0);
    useEffect(() => {
        const timer = setInterval(() => setTick((t) => t + 1), 30000);
        return () => clearInterval(timer);
    }, []);

    // Filter chats
    const filteredChats = chats.filter((chat) => {
        // Apply filter type
        if (filter === 'groups' && !chat.isGroup) return false;
        if (filter === 'unread') {
            const unreadCount = userProfile?.uid ? (chat.unreadCount?.[userProfile.uid] || 0) : 0;
            if (unreadCount === 0) return false;
        }
        if (filter === 'favorites') {
            if (!chat.favorites?.includes(userProfile?.uid || '')) return false;
        }

        // Apply search query
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
        onClose();
    };

    const formatTime = (date: Date) => {
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));

        if (days === 0) {
            return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
        } else if (days === 1) {
            return 'Yesterday';
        } else if (days < 7) {
            return date.toLocaleDateString('en-US', { weekday: 'short' });
        } else {
            return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        }
    };

    const filters: { key: FilterType; label: string }[] = [
        { key: 'all', label: 'All' },
        { key: 'unread', label: 'Unread' },
        { key: 'favorites', label: 'Favorites' },
        { key: 'groups', label: 'Groups' },
    ];

    return (
        <>
            <aside
                className={`
                    fixed inset-y-0 left-0 z-40 w-full sm:w-[420px] wa-panel h-screen
                    transform transition-transform duration-300 ease-in-out
                    ${isOpen ? 'translate-x-0' : '-translate-x-full'}
                    sm:relative sm:translate-x-0 flex flex-col
                `}
                style={{ borderRight: '1px solid var(--wa-border)' }}
            >
                {/* Header */}
                <div className="wa-header px-4 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid var(--wa-border)' }}>
                    <div className="flex items-center gap-3">
                        <Link to="/profile">
                            <div className="w-10 h-10 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--wa-icon)' }}>
                                {userProfile?.photoURL ? (
                                    <img src={userProfile.photoURL} alt="" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                        <svg className="w-6 h-6" fill="var(--wa-bg-panel)" viewBox="0 0 24 24">
                                            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                                        </svg>
                                    </div>
                                )}
                            </div>
                        </Link>
                    </div>
                    <div className="flex items-center gap-1">
                        {/* Theme toggle */}
                        <button onClick={toggleTheme} className="icon-btn" title="Toggle theme">
                            {effectiveTheme === 'dark' ? (
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                                </svg>
                            ) : (
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                                </svg>
                            )}
                        </button>
                        {/* New group */}
                        <button onClick={() => setShowCreateGroupModal(true)} className="icon-btn" title="New group">
                            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M19.005 3.175H4.674C3.642 3.175 3 3.789 3 4.821V21.02l3.544-3.514h12.461c1.033 0 2.064-1.06 2.064-2.093V4.821c-.001-1.032-1.032-1.646-2.064-1.646zm-4.989 9.869H7.041V11.1h6.975v1.944zm3-4H7.041V7.1h9.975v1.944z" />
                            </svg>
                        </button>
                        {/* New chat */}
                        <button onClick={() => setShowNewChatModal(true)} className="icon-btn" title="New chat">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                            </svg>
                        </button>
                        {/* Menu */}
                        <div className="relative">
                            <button
                                onClick={() => setShowMenu(!showMenu)}
                                className="icon-btn"
                                title="Menu"
                            >
                                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M12 7a2 2 0 1 0-.001-4.001A2 2 0 0 0 12 7zm0 2a2 2 0 1 0-.001 3.999A2 2 0 0 0 12 9zm0 6a2 2 0 1 0-.001 3.999A2 2 0 0 0 12 15z" />
                                </svg>
                            </button>
                            <DropdownMenu
                                isOpen={showMenu}
                                onClose={() => setShowMenu(false)}
                                items={[
                                    {
                                        label: 'New Group',
                                        icon: <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M19.005 3.175H4.674C3.642 3.175 3 3.789 3 4.821V21.02l3.544-3.514h12.461c1.033 0 2.064-1.06 2.064-2.093V4.821c-.001-1.032-1.032-1.646-2.064-1.646z" /></svg>,
                                        onClick: () => setShowCreateGroupModal(true)
                                    },
                                    {
                                        label: 'Settings',
                                        icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
                                        onClick: () => navigate('/settings')
                                    },
                                    {
                                        label: 'Profile',
                                        icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>,
                                        onClick: () => navigate('/profile')
                                    },
                                    {
                                        label: 'Logout',
                                        icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>,
                                        onClick: async () => { await logout(); navigate('/login'); },
                                        danger: true
                                    }
                                ]}
                            />
                        </div>
                    </div>
                </div>

                {/* Search bar */}
                <div className="px-3 py-2" style={{ backgroundColor: 'var(--wa-bg-panel)' }}>
                    <div className="relative">
                        <div className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--wa-text-light)' }}>
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </div>
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search or start new chat"
                            className="w-full rounded-lg py-2 pl-12 pr-4 text-sm focus:outline-none"
                            style={{
                                backgroundColor: 'var(--wa-bg-input)',
                                color: 'var(--wa-text-primary)',
                                border: '1px solid var(--wa-border)'
                            }}
                        />
                    </div>
                </div>

                {/* Filter tabs */}
                <div className="px-3 py-2 flex gap-2 items-center" style={{ backgroundColor: 'var(--wa-bg-panel)' }}>
                    {filters.map(({ key, label }) => (
                        <button
                            key={key}
                            onClick={() => setFilter(key)}
                            className={`filter-pill ${filter === key ? 'active' : ''}`}
                        >
                            {label}
                        </button>
                    ))}
                    {/* Add person to favorites button */}
                    {filter === 'favorites' && (
                        <button
                            onClick={() => setShowNewChatModal(true)}
                            className="ml-auto w-7 h-7 rounded-full flex items-center justify-center hover:bg-black/10 transition-colors"
                            style={{ color: 'var(--wa-green)' }}
                            title="Add person to favorites"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                        </button>
                    )}
                </div>

                {/* Chat list */}
                <div className="flex-1 overflow-y-auto" style={{ backgroundColor: 'var(--wa-bg-panel)' }}>
                    {isLoading ? (
                        <div className="flex items-center justify-center py-8">
                            <div className="spinner w-8 h-8" />
                        </div>
                    ) : filteredChats.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                            <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4" style={{ backgroundColor: 'var(--wa-bg-hover)' }}>
                                <svg className="w-8 h-8" style={{ color: 'var(--wa-text-light)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                </svg>
                            </div>
                            <p style={{ color: 'var(--wa-text-light)' }} className="text-sm">No chats yet</p>
                            <button
                                onClick={() => setShowNewChatModal(true)}
                                className="mt-4 text-sm link"
                            >
                                Start a new chat
                            </button>
                        </div>
                    ) : (
                        filteredChats.map((chat) => {
                            const isSelected = chat.id === selectedChatId;
                            const displayName = chat.isGroup ? chat.groupName : chat.otherUser?.displayName || 'Unknown';
                            const avatar = chat.isGroup ? null : chat.otherUser?.photoURL;
                            const lastMessage = chat.lastMessage?.content || 'No messages yet';
                            const time = chat.updatedAt ? formatTime(chat.updatedAt) : '';

                            return (
                                <div
                                    key={chat.id}
                                    onClick={() => handleChatClick(chat.id)}
                                    className={`chat-item flex items-center gap-3 px-3 py-3 ${isSelected ? 'active' : ''}`}
                                >
                                    {/* Avatar */}
                                    <div className="relative flex-shrink-0">
                                        <div className="w-12 h-12 rounded-full overflow-hidden flex items-center justify-center" style={{ backgroundColor: 'var(--wa-icon)' }}>
                                            {avatar ? (
                                                <img src={avatar} alt="" className="w-full h-full object-cover" />
                                            ) : chat.isGroup ? (
                                                <svg className="w-6 h-6" fill="var(--wa-bg-panel)" viewBox="0 0 24 24">
                                                    <path d="M12 12.75c1.63 0 3.07.39 4.24.9 1.08.48 1.76 1.56 1.76 2.73V18H6v-1.61c0-1.18.68-2.26 1.76-2.73 1.17-.52 2.61-.91 4.24-.91zM4 13c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm1.13 1.1c-.37-.06-.74-.1-1.13-.1-.99 0-1.93.21-2.78.58A2.01 2.01 0 0 0 0 16.43V18h4.5v-1.61c0-.83.23-1.61.63-2.29z" />
                                                </svg>
                                            ) : (
                                                <span className="text-lg font-medium" style={{ color: 'var(--wa-bg-panel)' }}>
                                                    {displayName?.charAt(0).toUpperCase()}
                                                </span>
                                            )}
                                        </div>
                                        {!chat.isGroup && isUserOnline(chat.otherUser) && (
                                            <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full" style={{ backgroundColor: 'var(--wa-green)', border: '2px solid var(--wa-bg-panel)' }} />
                                        )}
                                    </div>

                                    {/* Chat info */}
                                    <div className="flex-1 min-w-0 py-2" style={{ borderBottom: '1px solid var(--wa-border)' }}>
                                        <div className="flex items-center justify-between">
                                            <h3 className="font-normal truncate" style={{ color: 'var(--wa-text-primary)' }}>
                                                {displayName}
                                            </h3>
                                            <div className="flex items-center gap-2 ml-2 flex-shrink-0">
                                                <span className="text-xs" style={{ color: (chat.unreadCount?.[userProfile?.uid || ''] || 0) > 0 ? 'var(--wa-green)' : 'var(--wa-text-light)' }}>
                                                    {time}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between mt-0.5">
                                            <p className="text-sm truncate" style={{ color: 'var(--wa-text-secondary)' }}>
                                                {lastMessage}
                                            </p>
                                            {(chat.unreadCount?.[userProfile?.uid || ''] || 0) > 0 && (
                                                <span
                                                    className="ml-2 min-w-[20px] h-5 px-1.5 rounded-full flex items-center justify-center text-xs font-medium text-white flex-shrink-0"
                                                    style={{ backgroundColor: 'var(--wa-green)' }}
                                                >
                                                    {chat.unreadCount?.[userProfile?.uid || ''] || 0}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                {/* FAB - New Chat Button for Mobile */}
                <button
                    onClick={() => setShowNewChatModal(true)}
                    className="sm:hidden fixed bottom-6 right-6 w-14 h-14 rounded-full shadow-lg flex items-center justify-center z-50 transition-transform hover:scale-110 active:scale-95"
                    style={{ backgroundColor: 'var(--wa-green)' }}
                    title="New chat"
                >
                    <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                </button>
            </aside>

            {/* Modals */}
            <NewChatModal isOpen={showNewChatModal} onClose={() => setShowNewChatModal(false)} />
            <CreateGroupModal isOpen={showCreateGroupModal} onClose={() => setShowCreateGroupModal(false)} />
        </>
    );
}

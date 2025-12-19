import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { searchAllUsers } from '../../services/userService';
import { getOrCreateChat } from '../../services/chatService';
import type { UserProfile } from '../../types';

interface NewChatModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function NewChatModal({ isOpen, onClose }: NewChatModalProps) {
    const { userProfile } = useAuth();
    const navigate = useNavigate();

    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [isCreatingChat, setIsCreatingChat] = useState(false);

    // Debounced search
    const performSearch = useCallback(async (query: string) => {
        if (!query || query.length < 2) {
            setSearchResults([]);
            return;
        }

        setIsSearching(true);
        try {
            const results = await searchAllUsers(query.trim());
            // Filter out current user
            const filtered = results.filter(user => user.uid !== userProfile?.uid);
            setSearchResults(filtered);
        } catch (err) {
            console.error('Search error:', err);
        } finally {
            setIsSearching(false);
        }
    }, [userProfile?.uid]);

    // Auto-search as user types
    useEffect(() => {
        const timer = setTimeout(() => {
            performSearch(searchQuery);
        }, 300); // 300ms debounce

        return () => clearTimeout(timer);
    }, [searchQuery, performSearch]);

    // Reset state when modal closes
    useEffect(() => {
        if (!isOpen) {
            setSearchQuery('');
            setSearchResults([]);
        }
    }, [isOpen]);

    const handleStartChat = async (otherUser: UserProfile) => {
        if (!userProfile) return;

        setIsCreatingChat(true);
        try {
            const chatId = await getOrCreateChat(userProfile.uid, otherUser.uid);
            onClose();
            navigate(`/chat/${chatId}`);
        } catch (err) {
            console.error('Error creating chat:', err);
        } finally {
            setIsCreatingChat(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div
                className="relative w-full max-w-md rounded-lg shadow-xl animate-fade-in overflow-hidden"
                style={{ backgroundColor: 'var(--wa-bg-panel)', border: '1px solid var(--wa-border)' }}
            >
                {/* Header */}
                <div className="wa-header px-4 py-3 flex items-center gap-4" style={{ borderBottom: '1px solid var(--wa-border)' }}>
                    <button
                        onClick={onClose}
                        className="icon-btn"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                    <h2 className="text-lg font-medium" style={{ color: 'var(--wa-text-primary)' }}>New Chat</h2>
                </div>

                {/* Search Input */}
                <div className="p-3" style={{ backgroundColor: 'var(--wa-bg-panel)' }}>
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
                            placeholder="Search by username or email..."
                            autoFocus
                            className="w-full rounded-lg py-2.5 pl-12 pr-4 text-sm focus:outline-none"
                            style={{
                                backgroundColor: 'var(--wa-bg-input)',
                                color: 'var(--wa-text-primary)',
                                border: '1px solid var(--wa-border)'
                            }}
                        />
                        {isSearching && (
                            <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                <div className="spinner w-4 h-4" />
                            </div>
                        )}
                    </div>
                    <p className="text-xs mt-2" style={{ color: 'var(--wa-text-light)' }}>
                        Start typing to search (minimum 2 characters)
                    </p>
                </div>

                {/* Results */}
                <div className="max-h-80 overflow-y-auto" style={{ backgroundColor: 'var(--wa-bg-panel)' }}>
                    {searchQuery.length >= 2 && searchResults.length === 0 && !isSearching ? (
                        <div className="p-8 text-center" style={{ color: 'var(--wa-text-light)' }}>
                            <p className="text-sm">No users found</p>
                        </div>
                    ) : (
                        searchResults.map((user) => (
                            <button
                                key={user.uid}
                                onClick={() => handleStartChat(user)}
                                disabled={isCreatingChat}
                                className="w-full flex items-center gap-3 px-4 py-3 chat-item disabled:opacity-50"
                            >
                                {/* Avatar */}
                                <div className="w-12 h-12 rounded-full overflow-hidden flex items-center justify-center" style={{ backgroundColor: 'var(--wa-icon)' }}>
                                    {user.photoURL ? (
                                        <img src={user.photoURL} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                        <span className="text-lg font-medium" style={{ color: 'var(--wa-bg-panel)' }}>
                                            {user.displayName?.charAt(0).toUpperCase() || '?'}
                                        </span>
                                    )}
                                </div>

                                {/* User info */}
                                <div className="flex-1 min-w-0 text-left">
                                    <h3 className="font-medium truncate" style={{ color: 'var(--wa-text-primary)' }}>
                                        {user.displayName}
                                    </h3>
                                    <p className="text-sm truncate" style={{ color: 'var(--wa-text-secondary)' }}>
                                        @{user.username}
                                    </p>
                                </div>

                                {/* Online status */}
                                {user.isOnline && (
                                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: 'var(--wa-green)' }} />
                                )}
                            </button>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}

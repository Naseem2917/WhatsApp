import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { searchUsers } from '../../services/userService';
import { getOrCreateChat } from '../../services/chatService';
import type { UserProfile } from '../../types';

interface NewChatModalProps {
    isOpen: boolean;
    onClose: () => void;
}

type SearchType = 'email' | 'username' | 'phone';

export default function NewChatModal({ isOpen, onClose }: NewChatModalProps) {
    const { userProfile } = useAuth();
    const navigate = useNavigate();

    const [searchQuery, setSearchQuery] = useState('');
    const [searchType, setSearchType] = useState<SearchType>('username');
    const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isCreatingChat, setIsCreatingChat] = useState(false);

    // Reset state when modal closes
    useEffect(() => {
        if (!isOpen) {
            setSearchQuery('');
            setSearchResults([]);
            setError(null);
        }
    }, [isOpen]);

    const handleSearch = async () => {
        if (!searchQuery.trim()) {
            setError('Please enter a search term');
            return;
        }

        setIsSearching(true);
        setError(null);
        setSearchResults([]);

        try {
            const results = await searchUsers(searchQuery.trim(), searchType);

            // Filter out current user from results
            const filteredResults = results.filter(
                user => user.uid !== userProfile?.uid
            );

            if (filteredResults.length === 0) {
                setError('No users found. Try a different search term.');
            } else {
                setSearchResults(filteredResults);
            }
        } catch (err) {
            console.error('Search error:', err);
            setError('Failed to search. Please try again.');
        } finally {
            setIsSearching(false);
        }
    };

    const handleStartChat = async (otherUser: UserProfile) => {
        if (!userProfile) return;

        setIsCreatingChat(true);
        try {
            const chatId = await getOrCreateChat(userProfile.uid, otherUser.uid);
            onClose();
            navigate(`/chat/${chatId}`);
        } catch (err) {
            console.error('Error creating chat:', err);
            setError('Failed to start chat. Please try again.');
        } finally {
            setIsCreatingChat(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleSearch();
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
            <div className="relative w-full max-w-md bg-dark-900 rounded-2xl shadow-xl animate-fade-in border border-dark-700">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-dark-700">
                    <h2 className="text-xl font-semibold text-white">New Chat</h2>
                    <button
                        onClick={onClose}
                        className="p-2 text-dark-400 hover:text-white hover:bg-dark-700 rounded-lg transition-colors"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Content */}
                <div className="p-4">
                    {/* Search Type Tabs */}
                    <div className="flex gap-2 mb-4">
                        {(['username', 'email', 'phone'] as SearchType[]).map((type) => (
                            <button
                                key={type}
                                onClick={() => setSearchType(type)}
                                className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${searchType === type
                                        ? 'bg-primary-500/20 text-primary-400'
                                        : 'bg-dark-800 text-dark-300 hover:bg-dark-700'
                                    }`}
                            >
                                {type === 'username' && 'Username'}
                                {type === 'email' && 'Email'}
                                {type === 'phone' && 'Phone'}
                            </button>
                        ))}
                    </div>

                    {/* Search Input */}
                    <div className="relative mb-4">
                        <input
                            type={searchType === 'email' ? 'email' : 'text'}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder={
                                searchType === 'username'
                                    ? 'Enter username...'
                                    : searchType === 'email'
                                        ? 'Enter email address...'
                                        : 'Enter phone number...'
                            }
                            className="input-field pr-12"
                            autoFocus
                        />
                        <button
                            onClick={handleSearch}
                            disabled={isSearching}
                            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-dark-400 hover:text-primary-400 transition-colors"
                        >
                            {isSearching ? (
                                <div className="spinner w-5 h-5" />
                            ) : (
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                            )}
                        </button>
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
                            {error}
                        </div>
                    )}

                    {/* Search Results */}
                    <div className="max-h-64 overflow-y-auto">
                        {searchResults.length > 0 && (
                            <div className="space-y-2">
                                <p className="text-dark-400 text-sm mb-2">
                                    {searchResults.length} user{searchResults.length !== 1 ? 's' : ''} found
                                </p>
                                {searchResults.map((user) => (
                                    <button
                                        key={user.uid}
                                        onClick={() => handleStartChat(user)}
                                        disabled={isCreatingChat}
                                        className="w-full flex items-center gap-3 p-3 bg-dark-800 hover:bg-dark-700 rounded-xl transition-colors text-left"
                                    >
                                        {/* Avatar */}
                                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white font-semibold flex-shrink-0">
                                            {user.photoURL ? (
                                                <img
                                                    src={user.photoURL}
                                                    alt={user.displayName}
                                                    className="w-12 h-12 rounded-full object-cover"
                                                />
                                            ) : (
                                                user.displayName?.charAt(0).toUpperCase() || 'U'
                                            )}
                                        </div>

                                        {/* User info */}
                                        <div className="flex-1 min-w-0">
                                            <p className="text-white font-medium truncate">
                                                {user.displayName}
                                            </p>
                                            <p className="text-dark-400 text-sm truncate">
                                                @{user.username}
                                            </p>
                                        </div>

                                        {/* Arrow */}
                                        <svg className="w-5 h-5 text-dark-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                        </svg>
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* Empty state */}
                        {searchResults.length === 0 && !error && !isSearching && (
                            <div className="text-center py-8">
                                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-dark-800 flex items-center justify-center">
                                    <svg className="w-8 h-8 text-dark-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                    </svg>
                                </div>
                                <p className="text-dark-400 text-sm">
                                    Search for users to start a conversation
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

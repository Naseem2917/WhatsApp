import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { searchUsers } from '../../services/userService';
import { createGroupChat } from '../../services/chatService';
import type { UserProfile } from '../../types';

interface CreateGroupModalProps {
    isOpen: boolean;
    onClose: () => void;
}

type Step = 'members' | 'details';

export default function CreateGroupModal({ isOpen, onClose }: CreateGroupModalProps) {
    const { userProfile } = useAuth();
    const navigate = useNavigate();

    const [step, setStep] = useState<Step>('members');
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
    const [selectedMembers, setSelectedMembers] = useState<UserProfile[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [groupName, setGroupName] = useState('');
    const [isCreating, setIsCreating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Reset state when modal closes
    useEffect(() => {
        if (!isOpen) {
            setStep('members');
            setSearchQuery('');
            setSearchResults([]);
            setSelectedMembers([]);
            setGroupName('');
            setError(null);
        }
    }, [isOpen]);

    const handleSearch = async () => {
        if (!searchQuery.trim()) return;

        setIsSearching(true);
        setError(null);

        try {
            const results = await searchUsers(searchQuery.trim(), 'username');
            const filteredResults = results.filter(
                (user) =>
                    user.uid !== userProfile?.uid &&
                    !selectedMembers.find((m) => m.uid === user.uid)
            );
            setSearchResults(filteredResults);
        } catch (err) {
            console.error('Search error:', err);
            setError('Failed to search users');
        } finally {
            setIsSearching(false);
        }
    };

    const handleAddMember = (user: UserProfile) => {
        setSelectedMembers([...selectedMembers, user]);
        setSearchResults(searchResults.filter((u) => u.uid !== user.uid));
        setSearchQuery('');
    };

    const handleRemoveMember = (userId: string) => {
        setSelectedMembers(selectedMembers.filter((m) => m.uid !== userId));
    };

    const handleNext = () => {
        if (selectedMembers.length === 0) {
            setError('Please add at least one member');
            return;
        }
        setError(null);
        setStep('details');
    };

    const handleBack = () => {
        setStep('members');
        setError(null);
    };

    const handleCreateGroup = async () => {
        if (!groupName.trim()) {
            setError('Please enter a group name');
            return;
        }
        if (!userProfile) return;

        setIsCreating(true);
        setError(null);

        try {
            const memberIds = selectedMembers.map((m) => m.uid);
            const chatId = await createGroupChat(
                userProfile.uid,
                memberIds,
                groupName.trim()
            );
            onClose();
            navigate(`/chat/${chatId}`);
        } catch (err) {
            console.error('Error creating group:', err);
            setError('Failed to create group. Please try again.');
        } finally {
            setIsCreating(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            if (step === 'members') {
                handleSearch();
            } else {
                handleCreateGroup();
            }
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
                    <div className="flex items-center gap-3">
                        {step === 'details' && (
                            <button
                                onClick={handleBack}
                                className="p-1 text-dark-400 hover:text-white transition-colors"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                </svg>
                            </button>
                        )}
                        <h2 className="text-xl font-semibold text-white">
                            {step === 'members' ? 'Add Group Members' : 'Group Details'}
                        </h2>
                    </div>
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
                    {error && (
                        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
                            {error}
                        </div>
                    )}

                    {step === 'members' ? (
                        <>
                            {/* Selected members */}
                            {selectedMembers.length > 0 && (
                                <div className="mb-4">
                                    <p className="text-dark-400 text-sm mb-2">
                                        {selectedMembers.length} member{selectedMembers.length !== 1 ? 's' : ''} selected
                                    </p>
                                    <div className="flex flex-wrap gap-2">
                                        {selectedMembers.map((member) => (
                                            <div
                                                key={member.uid}
                                                className="flex items-center gap-2 bg-dark-800 rounded-full pl-1 pr-2 py-1"
                                            >
                                                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white text-xs font-semibold">
                                                    {member.displayName?.charAt(0).toUpperCase()}
                                                </div>
                                                <span className="text-white text-sm">{member.displayName}</span>
                                                <button
                                                    onClick={() => handleRemoveMember(member.uid)}
                                                    className="text-dark-400 hover:text-white"
                                                >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                    </svg>
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Search input */}
                            <div className="relative mb-4">
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    placeholder="Search by username..."
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

                            {/* Search results */}
                            <div className="max-h-48 overflow-y-auto">
                                {searchResults.length > 0 && (
                                    <div className="space-y-2">
                                        {searchResults.map((user) => (
                                            <button
                                                key={user.uid}
                                                onClick={() => handleAddMember(user)}
                                                className="w-full flex items-center gap-3 p-3 bg-dark-800 hover:bg-dark-700 rounded-xl transition-colors text-left"
                                            >
                                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white font-semibold flex-shrink-0">
                                                    {user.displayName?.charAt(0).toUpperCase()}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-white font-medium truncate">{user.displayName}</p>
                                                    <p className="text-dark-400 text-sm truncate">@{user.username}</p>
                                                </div>
                                                <svg className="w-5 h-5 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                                </svg>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Next button */}
                            <button
                                onClick={handleNext}
                                disabled={selectedMembers.length === 0}
                                className="btn-primary w-full mt-4"
                            >
                                Next
                            </button>
                        </>
                    ) : (
                        <>
                            {/* Group avatar preview */}
                            <div className="flex justify-center mb-6">
                                <div className="relative">
                                    <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white text-3xl font-bold">
                                        {groupName.trim() ? groupName.charAt(0).toUpperCase() : (
                                            <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                                            </svg>
                                        )}
                                    </div>
                                    <button className="absolute bottom-0 right-0 w-8 h-8 bg-primary-500 rounded-full flex items-center justify-center text-white hover:bg-primary-600 transition-colors shadow-lg">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                                        </svg>
                                    </button>
                                </div>
                            </div>

                            {/* Group name input */}
                            <div className="mb-6">
                                <label className="block text-dark-300 text-sm font-medium mb-2">
                                    Group Name
                                </label>
                                <input
                                    type="text"
                                    value={groupName}
                                    onChange={(e) => setGroupName(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    placeholder="Enter group name..."
                                    className="input-field"
                                    autoFocus
                                    maxLength={50}
                                />
                            </div>

                            {/* Members preview */}
                            <div className="mb-6">
                                <p className="text-dark-300 text-sm font-medium mb-2">
                                    Members ({selectedMembers.length + 1})
                                </p>
                                <div className="flex flex-wrap gap-2">
                                    {/* Current user (admin) */}
                                    <div className="flex items-center gap-2 bg-dark-800 rounded-full pl-1 pr-3 py-1">
                                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white text-xs font-semibold">
                                            {userProfile?.displayName?.charAt(0).toUpperCase()}
                                        </div>
                                        <span className="text-white text-sm">You</span>
                                        <span className="text-primary-400 text-xs">(Admin)</span>
                                    </div>
                                    {selectedMembers.map((member) => (
                                        <div
                                            key={member.uid}
                                            className="flex items-center gap-2 bg-dark-800 rounded-full pl-1 pr-3 py-1"
                                        >
                                            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-dark-600 to-dark-700 flex items-center justify-center text-white text-xs font-semibold">
                                                {member.displayName?.charAt(0).toUpperCase()}
                                            </div>
                                            <span className="text-white text-sm">{member.displayName}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Create button */}
                            <button
                                onClick={handleCreateGroup}
                                disabled={!groupName.trim() || isCreating}
                                className="btn-primary w-full flex items-center justify-center gap-2"
                            >
                                {isCreating ? (
                                    <>
                                        <div className="spinner" />
                                        Creating...
                                    </>
                                ) : (
                                    <>
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                        </svg>
                                        Create Group
                                    </>
                                )}
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { NewChatModal } from '../chat';

interface HeaderProps {
    showMenuButton?: boolean;
    onMenuClick?: () => void;
}

export function Header({ showMenuButton = false, onMenuClick }: HeaderProps) {
    const { userProfile } = useAuth();
    const [showNewChatModal, setShowNewChatModal] = useState(false);

    return (
        <>
            <header className="bg-dark-800 border-b border-dark-700 h-[60px] flex items-center px-4">
                <div className="w-full flex items-center justify-between gap-4">
                    {/* Left: Menu button (mobile) + Logo */}
                    <div className="flex items-center gap-3">
                        {showMenuButton && (
                            <button
                                onClick={onMenuClick}
                                className="sm:hidden p-2 text-dark-400 hover:text-white hover:bg-dark-700 rounded-lg transition-colors"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                                </svg>
                            </button>
                        )}

                        {/* User avatar and info */}
                        <Link to="/profile" className="flex items-center gap-3 hover:bg-dark-700 rounded-lg px-2 py-1.5 transition-colors">
                            <div className="avatar w-10 h-10">
                                {userProfile?.photoURL ? (
                                    <img src={userProfile.photoURL} alt={userProfile.displayName} className="w-10 h-10 rounded-full" />
                                ) : (
                                    userProfile?.displayName?.charAt(0).toUpperCase() || 'U'
                                )}
                            </div>
                            <div className="hidden sm:block">
                                <p className="text-white font-normal text-[15px]">{userProfile?.displayName}</p>
                            </div>
                        </Link>
                    </div>

                    {/* Right: Action buttons */}
                    <div className="flex items-center gap-2">
                        {/* New chat button */}
                        <button
                            onClick={() => setShowNewChatModal(true)}
                            className="p-2 text-dark-400 hover:text-white hover:bg-dark-700 rounded-full transition-colors"
                            title="New chat"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                            </svg>
                        </button>

                        {/* Menu */}
                        <Link
                            to="/settings"
                            className="p-2 text-dark-400 hover:text-white hover:bg-dark-700 rounded-full transition-colors"
                            title="Settings"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                            </svg>
                        </Link>
                    </div>
                </div>
            </header>

            {/* New Chat Modal */}
            <NewChatModal
                isOpen={showNewChatModal}
                onClose={() => setShowNewChatModal(false)}
            />
        </>
    );
}

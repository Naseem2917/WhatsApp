/**
 * UserProfilePanel - Display user profile info in a slide-in panel
 * Similar to WhatsApp's contact info screen
 */

import { UserProfile } from '../../types';
import { isUserOnline } from '../../services/userService';

interface UserProfilePanelProps {
    user: UserProfile | null;
    isOpen: boolean;
    onClose: () => void;
}

export default function UserProfilePanel({ user, isOpen, onClose }: UserProfilePanelProps) {
    if (!isOpen || !user) return null;

    const formatDate = (date: Date) => {
        return new Intl.DateTimeFormat('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        }).format(date);
    };

    return (
        <div
            className="fixed inset-0 z-50 flex justify-end"
            style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
        >
            {/* Backdrop */}
            <div className="absolute inset-0" onClick={onClose} />

            {/* Panel */}
            <aside
                className="relative w-full max-w-md flex flex-col animate-slide-in-right"
                style={{ backgroundColor: 'var(--wa-bg-panel)' }}
            >
                {/* Header */}
                <header
                    className="flex items-center gap-4 p-4"
                    style={{ backgroundColor: 'var(--wa-header-bg)', borderBottom: '1px solid var(--wa-border)' }}
                >
                    <button
                        onClick={onClose}
                        className="icon-btn"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                    <h2 className="font-semibold text-lg" style={{ color: 'var(--wa-text-primary)' }}>
                        Contact Info
                    </h2>
                </header>

                {/* Profile Content */}
                <div className="flex-1 overflow-y-auto">
                    {/* Profile Photo & Name */}
                    <div
                        className="flex flex-col items-center py-8 px-4"
                        style={{ backgroundColor: 'var(--wa-bg-deeper)' }}
                    >
                        <div className="w-32 h-32 rounded-full overflow-hidden mb-4" style={{ backgroundColor: 'var(--wa-icon)' }}>
                            {user.photoURL ? (
                                <img src={user.photoURL} alt="" className="w-full h-full object-cover" />
                            ) : (
                                <div
                                    className="w-full h-full flex items-center justify-center text-4xl font-bold"
                                    style={{ backgroundColor: 'var(--wa-green)', color: '#ffffff' }}
                                >
                                    {user.displayName?.charAt(0).toUpperCase() || 'U'}
                                </div>
                            )}
                        </div>
                        <h3 className="text-2xl font-semibold" style={{ color: 'var(--wa-text-primary)' }}>
                            {user.displayName}
                        </h3>
                        <p className="text-sm" style={{ color: 'var(--wa-text-light)' }}>
                            @{user.username}
                        </p>
                        {isUserOnline(user) ? (
                            <span className="flex items-center gap-2 mt-2 text-sm" style={{ color: 'var(--wa-green)' }}>
                                <span className="w-2 h-2 rounded-full bg-green-500" />
                                Online
                            </span>
                        ) : (
                            <span className="text-sm mt-2" style={{ color: 'var(--wa-text-light)' }}>
                                Last seen {formatDate(user.lastSeen)}
                            </span>
                        )}
                    </div>

                    {/* Info Sections */}
                    <div className="space-y-1">
                        {/* Phone */}
                        <div
                            className="p-4"
                            style={{ backgroundColor: 'var(--wa-bg-panel)' }}
                        >
                            <p className="text-xs uppercase tracking-wide mb-2" style={{ color: 'var(--wa-green)' }}>
                                Phone
                            </p>
                            <p style={{ color: 'var(--wa-text-primary)' }}>
                                {user.phoneNumber || 'Not available'}
                            </p>
                        </div>

                        {/* Email */}
                        <div
                            className="p-4"
                            style={{ backgroundColor: 'var(--wa-bg-panel)' }}
                        >
                            <p className="text-xs uppercase tracking-wide mb-2" style={{ color: 'var(--wa-green)' }}>
                                Email
                            </p>
                            <p style={{ color: 'var(--wa-text-primary)' }}>
                                {user.email}
                            </p>
                        </div>

                        {/* Location */}
                        {user.defaultLocation && (
                            <div
                                className="p-4"
                                style={{ backgroundColor: 'var(--wa-bg-panel)' }}
                            >
                                <p className="text-xs uppercase tracking-wide mb-2" style={{ color: 'var(--wa-green)' }}>
                                    Location
                                </p>
                                <p style={{ color: 'var(--wa-text-primary)' }}>
                                    {user.defaultLocation}
                                </p>
                            </div>
                        )}

                        {/* Member Since */}
                        <div
                            className="p-4"
                            style={{ backgroundColor: 'var(--wa-bg-panel)' }}
                        >
                            <p className="text-xs uppercase tracking-wide mb-2" style={{ color: 'var(--wa-green)' }}>
                                Member Since
                            </p>
                            <p style={{ color: 'var(--wa-text-primary)' }}>
                                {formatDate(user.createdAt)}
                            </p>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="p-4 space-y-2">
                        <button
                            className="w-full flex items-center gap-4 p-3 rounded-lg transition-colors"
                            style={{ backgroundColor: 'var(--wa-bg-hover)' }}
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--wa-text-light)' }}>
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                            </svg>
                            <span style={{ color: 'var(--wa-text-primary)' }}>Mute Notifications</span>
                        </button>

                        <button
                            className="w-full flex items-center gap-4 p-3 rounded-lg transition-colors text-red-500 hover:bg-red-500/10"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                            </svg>
                            <span>Block Contact</span>
                        </button>
                    </div>
                </div>
            </aside>

            <style>{`
                @keyframes slideInRight {
                    from { transform: translateX(100%); }
                    to { transform: translateX(0); }
                }
                .animate-slide-in-right {
                    animation: slideInRight 0.3s ease-out;
                }
            `}</style>
        </div>
    );
}

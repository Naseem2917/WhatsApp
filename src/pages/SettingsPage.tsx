import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Sidebar } from '../components/layout';

interface SettingItemProps {
    icon: React.ReactNode;
    title: string;
    description?: string;
    action?: React.ReactNode;
    onClick?: () => void;
    danger?: boolean;
}

function SettingItem({ icon, title, description, action, onClick, danger }: SettingItemProps) {
    return (
        <div
            className={`flex items-center gap-4 p-4 transition-colors ${onClick ? 'cursor-pointer' : ''}`}
            style={{
                backgroundColor: 'transparent',
            }}
            onClick={onClick}
            onMouseEnter={(e) => onClick && (e.currentTarget.style.backgroundColor = 'var(--wa-bg-hover)')}
            onMouseLeave={(e) => onClick && (e.currentTarget.style.backgroundColor = 'transparent')}
        >
            <div
                className="w-10 h-10 rounded-full flex items-center justify-center"
                style={{ backgroundColor: danger ? 'rgba(239, 68, 68, 0.1)' : 'var(--wa-bg-hover)', color: danger ? '#ef4444' : 'var(--wa-green)' }}
            >
                {icon}
            </div>
            <div className="flex-1 min-w-0">
                <p className="font-medium" style={{ color: danger ? '#ef4444' : 'var(--wa-text-primary)' }}>{title}</p>
                {description && <p className="text-sm truncate" style={{ color: 'var(--wa-text-secondary)' }}>{description}</p>}
            </div>
            {action}
        </div>
    );
}

function Toggle({ enabled, onChange }: { enabled: boolean; onChange: (value: boolean) => void }) {
    return (
        <button
            onClick={(e) => { e.stopPropagation(); onChange(!enabled); }}
            className="relative w-12 h-6 rounded-full transition-colors"
            style={{ backgroundColor: enabled ? 'var(--wa-green)' : 'var(--wa-bg-hover)' }}
        >
            <span
                className="absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform"
                style={{ transform: enabled ? 'translateX(24px)' : 'translateX(0)' }}
            />
        </button>
    );
}

export default function SettingsPage() {
    const { userProfile, logout } = useAuth();
    const navigate = useNavigate();
    const [sidebarOpen, setSidebarOpen] = useState(true);

    // Settings state
    const [notifications, setNotifications] = useState(true);
    const [soundEnabled, setSoundEnabled] = useState(true);
    const [readReceipts, setReadReceipts] = useState(true);
    const [lastSeen, setLastSeen] = useState<'everyone' | 'contacts' | 'nobody'>('everyone');
    const [profilePhotoPrivacy, setProfilePhotoPrivacy] = useState<'everyone' | 'contacts' | 'nobody'>('everyone');

    const handleLogout = async () => {
        try {
            await logout();
            navigate('/login');
        } catch (error) {
            console.error('Logout error:', error);
        }
    };

    return (
        <div className="flex h-screen" style={{ backgroundColor: 'var(--wa-bg-app)' }}>
            {/* Sidebar */}
            <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

            {/* Main Content */}
            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Header */}
                <div
                    className="flex items-center gap-4 px-6 py-3 shadow-sm"
                    style={{ backgroundColor: 'var(--wa-bg-panel)', borderBottom: '1px solid var(--wa-border)' }}
                >
                    <Link
                        to="/"
                        className="p-2 rounded-full hover:bg-black/10 dark:hover:bg-white/10"
                        style={{ color: 'var(--wa-icon)' }}
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                    </Link>
                    <h1 className="text-xl font-semibold" style={{ color: 'var(--wa-text-primary)' }}>Settings</h1>
                </div>

                {/* Settings Content */}
                <div className="flex-1 overflow-y-auto" style={{ backgroundColor: 'var(--wa-bg-chat)' }}>
                    <div className="max-w-2xl mx-auto py-4">

                        {/* User Profile Card */}
                        <Link to="/profile" className="block mb-4">
                            <div
                                className="flex items-center gap-4 p-4 mx-4 rounded-lg transition-colors"
                                style={{ backgroundColor: 'var(--wa-bg-panel)' }}
                            >
                                <div
                                    className="w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold overflow-hidden"
                                    style={{ backgroundColor: 'var(--wa-green)', color: 'white' }}
                                >
                                    {userProfile?.photoURL ? (
                                        <img src={userProfile.photoURL} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                        userProfile?.displayName?.charAt(0).toUpperCase() || 'U'
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-semibold text-lg" style={{ color: 'var(--wa-text-primary)' }}>
                                        {userProfile?.displayName || 'User'}
                                    </p>
                                    <p className="text-sm truncate" style={{ color: 'var(--wa-text-secondary)' }}>
                                        {userProfile?.about || 'Hey there! I am using WhatsApp.'}
                                    </p>
                                </div>
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--wa-green)' }}>
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                            </div>
                        </Link>

                        {/* Notifications Section */}
                        <div className="rounded-lg shadow-sm mb-4 mx-4 overflow-hidden" style={{ backgroundColor: 'var(--wa-bg-panel)' }}>
                            <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--wa-border)' }}>
                                <h2 className="text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--wa-green)' }}>Notifications</h2>
                            </div>
                            <div>
                                <SettingItem
                                    icon={
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                                        </svg>
                                    }
                                    title="Push Notifications"
                                    description="Get notified about new messages"
                                    action={<Toggle enabled={notifications} onChange={setNotifications} />}
                                    onClick={() => setNotifications(!notifications)}
                                />
                                <SettingItem
                                    icon={
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                                        </svg>
                                    }
                                    title="Message Sounds"
                                    description="Play sounds for incoming messages"
                                    action={<Toggle enabled={soundEnabled} onChange={setSoundEnabled} />}
                                    onClick={() => setSoundEnabled(!soundEnabled)}
                                />
                            </div>
                        </div>

                        {/* Privacy Section */}
                        <div className="rounded-lg shadow-sm mb-4 mx-4 overflow-hidden" style={{ backgroundColor: 'var(--wa-bg-panel)' }}>
                            <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--wa-border)' }}>
                                <h2 className="text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--wa-green)' }}>Privacy</h2>
                            </div>
                            <div>
                                <SettingItem
                                    icon={
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                        </svg>
                                    }
                                    title="Read Receipts"
                                    description="Let others know when you've read messages"
                                    action={<Toggle enabled={readReceipts} onChange={setReadReceipts} />}
                                    onClick={() => setReadReceipts(!readReceipts)}
                                />

                                {/* Last Seen */}
                                <div className="p-4">
                                    <div className="flex items-center gap-4 mb-3">
                                        <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--wa-bg-hover)', color: 'var(--wa-green)' }}>
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                        </div>
                                        <div>
                                            <p className="font-medium" style={{ color: 'var(--wa-text-primary)' }}>Last Seen</p>
                                            <p className="text-sm" style={{ color: 'var(--wa-text-secondary)' }}>Who can see your last seen</p>
                                        </div>
                                    </div>
                                    <div className="ml-14 flex gap-2 flex-wrap">
                                        {(['everyone', 'contacts', 'nobody'] as const).map((option) => (
                                            <button
                                                key={option}
                                                onClick={() => setLastSeen(option)}
                                                className="px-3 py-1.5 rounded-full text-sm font-medium transition-all"
                                                style={{
                                                    backgroundColor: lastSeen === option ? 'var(--wa-green)' : 'var(--wa-bg-hover)',
                                                    color: lastSeen === option ? 'white' : 'var(--wa-text-secondary)'
                                                }}
                                            >
                                                {option.charAt(0).toUpperCase() + option.slice(1)}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Profile Photo Privacy */}
                                <div className="p-4">
                                    <div className="flex items-center gap-4 mb-3">
                                        <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--wa-bg-hover)', color: 'var(--wa-green)' }}>
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                            </svg>
                                        </div>
                                        <div>
                                            <p className="font-medium" style={{ color: 'var(--wa-text-primary)' }}>Profile Photo</p>
                                            <p className="text-sm" style={{ color: 'var(--wa-text-secondary)' }}>Who can see your profile photo</p>
                                        </div>
                                    </div>
                                    <div className="ml-14 flex gap-2 flex-wrap">
                                        {(['everyone', 'contacts', 'nobody'] as const).map((option) => (
                                            <button
                                                key={option}
                                                onClick={() => setProfilePhotoPrivacy(option)}
                                                className="px-3 py-1.5 rounded-full text-sm font-medium transition-all"
                                                style={{
                                                    backgroundColor: profilePhotoPrivacy === option ? 'var(--wa-green)' : 'var(--wa-bg-hover)',
                                                    color: profilePhotoPrivacy === option ? 'white' : 'var(--wa-text-secondary)'
                                                }}
                                            >
                                                {option.charAt(0).toUpperCase() + option.slice(1)}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Help Section */}
                        <div className="rounded-lg shadow-sm mb-4 mx-4 overflow-hidden" style={{ backgroundColor: 'var(--wa-bg-panel)' }}>
                            <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--wa-border)' }}>
                                <h2 className="text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--wa-green)' }}>Help</h2>
                            </div>
                            <div>
                                <SettingItem
                                    icon={
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                    }
                                    title="Help Center"
                                    action={
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--wa-icon)' }}>
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                        </svg>
                                    }
                                    onClick={() => { }}
                                />
                                <SettingItem
                                    icon={
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                    }
                                    title="About"
                                    description="Version 1.0.0"
                                    action={
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--wa-icon)' }}>
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                        </svg>
                                    }
                                    onClick={() => { }}
                                />
                            </div>
                        </div>

                        {/* Logout Button */}
                        <div className="rounded-lg shadow-sm mb-4 mx-4 overflow-hidden" style={{ backgroundColor: 'var(--wa-bg-panel)' }}>
                            <SettingItem
                                icon={
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                    </svg>
                                }
                                title="Log Out"
                                onClick={handleLogout}
                                danger
                            />
                        </div>

                        {/* Footer */}
                        <div className="text-center py-6">
                            <p className="text-sm" style={{ color: 'var(--wa-text-light)' }}>WhatsApp Clone © 2024</p>
                            <p className="text-sm mt-1" style={{ color: 'var(--wa-text-light)' }}>Made with ❤️</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

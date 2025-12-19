import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '../components/layout';

interface SettingItemProps {
    icon: React.ReactNode;
    title: string;
    description?: string;
    action?: React.ReactNode;
    onClick?: () => void;
}

function SettingItem({ icon, title, description, action, onClick }: SettingItemProps) {
    return (
        <div
            className={`flex items-center gap-4 p-4 ${onClick ? 'hover:bg-dark-800/50 cursor-pointer' : ''} transition-colors`}
            onClick={onClick}
        >
            <div className="w-10 h-10 rounded-full bg-dark-700 flex items-center justify-center text-dark-300">
                {icon}
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-white font-medium">{title}</p>
                {description && <p className="text-dark-400 text-sm truncate">{description}</p>}
            </div>
            {action}
        </div>
    );
}

function Toggle({ enabled, onChange }: { enabled: boolean; onChange: (value: boolean) => void }) {
    return (
        <button
            onClick={() => onChange(!enabled)}
            className={`relative w-12 h-6 rounded-full transition-colors ${enabled ? 'bg-primary-500' : 'bg-dark-600'
                }`}
        >
            <span
                className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${enabled ? 'translate-x-6' : 'translate-x-0'
                    }`}
            />
        </button>
    );
}

export default function SettingsPage() {
    // Settings state
    const [notifications, setNotifications] = useState(true);
    const [soundEnabled, setSoundEnabled] = useState(true);
    const [readReceipts, setReadReceipts] = useState(true);
    const [lastSeen, setLastSeen] = useState<'everyone' | 'contacts' | 'nobody'>('everyone');
    const [profilePhoto, setProfilePhoto] = useState<'everyone' | 'contacts' | 'nobody'>('everyone');

    return (
        <div className="min-h-screen bg-dark-950">
            <Header />

            <main className="max-w-2xl mx-auto px-4 py-8">
                {/* Back button */}
                <Link
                    to="/"
                    className="inline-flex items-center gap-2 text-dark-400 hover:text-white mb-6 transition-colors"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Back to Chats
                </Link>

                <h1 className="text-2xl font-bold text-white mb-6">Settings</h1>

                {/* Notifications Section */}
                <div className="glass-card mb-6 overflow-hidden">
                    <div className="px-4 py-3 border-b border-dark-700">
                        <h2 className="text-lg font-semibold text-white">Notifications</h2>
                    </div>
                    <div className="divide-y divide-dark-700/50">
                        <SettingItem
                            icon={
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                                </svg>
                            }
                            title="Push Notifications"
                            description="Get notified about new messages"
                            action={<Toggle enabled={notifications} onChange={setNotifications} />}
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
                        />
                    </div>
                </div>

                {/* Privacy Section */}
                <div className="glass-card mb-6 overflow-hidden">
                    <div className="px-4 py-3 border-b border-dark-700">
                        <h2 className="text-lg font-semibold text-white">Privacy</h2>
                    </div>
                    <div className="divide-y divide-dark-700/50">
                        <SettingItem
                            icon={
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                </svg>
                            }
                            title="Read Receipts"
                            description="Let others know when you've read their messages"
                            action={<Toggle enabled={readReceipts} onChange={setReadReceipts} />}
                        />
                        <div className="p-4">
                            <div className="flex items-center gap-4 mb-3">
                                <div className="w-10 h-10 rounded-full bg-dark-700 flex items-center justify-center text-dark-300">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                                <div>
                                    <p className="text-white font-medium">Last Seen</p>
                                    <p className="text-dark-400 text-sm">Who can see your last seen</p>
                                </div>
                            </div>
                            <div className="ml-14 flex gap-2">
                                {(['everyone', 'contacts', 'nobody'] as const).map((option) => (
                                    <button
                                        key={option}
                                        onClick={() => setLastSeen(option)}
                                        className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${lastSeen === option
                                                ? 'bg-primary-500/20 text-primary-400'
                                                : 'bg-dark-700 text-dark-300 hover:bg-dark-600'
                                            }`}
                                    >
                                        {option.charAt(0).toUpperCase() + option.slice(1)}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="p-4">
                            <div className="flex items-center gap-4 mb-3">
                                <div className="w-10 h-10 rounded-full bg-dark-700 flex items-center justify-center text-dark-300">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                </div>
                                <div>
                                    <p className="text-white font-medium">Profile Photo</p>
                                    <p className="text-dark-400 text-sm">Who can see your profile photo</p>
                                </div>
                            </div>
                            <div className="ml-14 flex gap-2">
                                {(['everyone', 'contacts', 'nobody'] as const).map((option) => (
                                    <button
                                        key={option}
                                        onClick={() => setProfilePhoto(option)}
                                        className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${profilePhoto === option
                                                ? 'bg-primary-500/20 text-primary-400'
                                                : 'bg-dark-700 text-dark-300 hover:bg-dark-600'
                                            }`}
                                    >
                                        {option.charAt(0).toUpperCase() + option.slice(1)}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Appearance Section */}
                <div className="glass-card mb-6 overflow-hidden">
                    <div className="px-4 py-3 border-b border-dark-700">
                        <h2 className="text-lg font-semibold text-white">Appearance</h2>
                    </div>
                    <div className="divide-y divide-dark-700/50">
                        <SettingItem
                            icon={
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                                </svg>
                            }
                            title="Theme"
                            description="Dark mode"
                            action={
                                <span className="text-dark-400 text-sm">System default</span>
                            }
                            onClick={() => { }}
                        />
                        <SettingItem
                            icon={
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                            }
                            title="Chat Wallpaper"
                            description="Customize your chat background"
                            action={
                                <svg className="w-5 h-5 text-dark-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                            }
                            onClick={() => { }}
                        />
                    </div>
                </div>

                {/* Help Section */}
                <div className="glass-card mb-6 overflow-hidden">
                    <div className="px-4 py-3 border-b border-dark-700">
                        <h2 className="text-lg font-semibold text-white">Help</h2>
                    </div>
                    <div className="divide-y divide-dark-700/50">
                        <SettingItem
                            icon={
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            }
                            title="Help Center"
                            action={
                                <svg className="w-5 h-5 text-dark-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                                <svg className="w-5 h-5 text-dark-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                            }
                            onClick={() => { }}
                        />
                    </div>
                </div>

                {/* Footer */}
                <div className="text-center text-dark-500 text-sm py-4">
                    <p>WhatsApp Clone © 2024</p>
                    <p className="mt-1">Made with ❤️</p>
                </div>
            </main>
        </div>
    );
}

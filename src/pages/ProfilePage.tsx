import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { updateUserProfile, isUsernameUnique, isPhoneUnique } from '../services/userService';
import { Header } from '../components/layout';

export default function ProfilePage() {
    const { userProfile, refreshUserProfile } = useAuth();
    const [isEditing, setIsEditing] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    // Form state
    const [displayName, setDisplayName] = useState('');
    const [username, setUsername] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [defaultLocation, setDefaultLocation] = useState('');

    // Initialize form with user data
    useEffect(() => {
        if (userProfile) {
            setDisplayName(userProfile.displayName || '');
            setUsername(userProfile.username || '');
            setPhoneNumber(userProfile.phoneNumber || '');
            setDefaultLocation(userProfile.defaultLocation || '');
        }
    }, [userProfile]);

    const handleSave = async () => {
        if (!userProfile) return;

        setLoading(true);
        setError(null);
        setSuccess(null);

        try {
            // Validate username if changed
            if (username !== userProfile.username) {
                if (username.length < 3) {
                    throw new Error('Username must be at least 3 characters');
                }
                if (!/^[a-zA-Z0-9_]+$/.test(username)) {
                    throw new Error('Username can only contain letters, numbers, and underscores');
                }
                const isUnique = await isUsernameUnique(username);
                if (!isUnique) {
                    throw new Error('Username is already taken');
                }
            }

            // Validate phone if changed
            if (phoneNumber !== userProfile.phoneNumber) {
                if (!/^\+?[1-9]\d{9,14}$/.test(phoneNumber.replace(/\s/g, ''))) {
                    throw new Error('Please enter a valid phone number');
                }
                const isUnique = await isPhoneUnique(phoneNumber);
                if (!isUnique) {
                    throw new Error('Phone number is already registered');
                }
            }

            // Update profile
            await updateUserProfile(userProfile.uid, {
                displayName,
                username: username.toLowerCase(),
                phoneNumber,
                defaultLocation: defaultLocation || null,
            });

            await refreshUserProfile();
            setSuccess('Profile updated successfully!');
            setIsEditing(false);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to update profile');
        } finally {
            setLoading(false);
        }
    };

    const handleCancel = () => {
        if (userProfile) {
            setDisplayName(userProfile.displayName || '');
            setUsername(userProfile.username || '');
            setPhoneNumber(userProfile.phoneNumber || '');
            setDefaultLocation(userProfile.defaultLocation || '');
        }
        setIsEditing(false);
        setError(null);
    };

    const formatDate = (date: Date) => {
        return new Intl.DateTimeFormat('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        }).format(date);
    };

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

                {/* Profile card */}
                <div className="glass-card p-6 sm:p-8">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-8">
                        <div className="flex items-center gap-4">
                            {/* Avatar */}
                            <div className="relative">
                                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white text-2xl sm:text-3xl font-bold shadow-glow">
                                    {userProfile?.displayName?.charAt(0).toUpperCase() || 'U'}
                                </div>
                                <button className="absolute bottom-0 right-0 w-8 h-8 bg-primary-500 rounded-full flex items-center justify-center text-white hover:bg-primary-600 transition-colors shadow-lg">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                </button>
                            </div>

                            <div>
                                <h1 className="text-xl sm:text-2xl font-bold text-white">{userProfile?.displayName}</h1>
                                <p className="text-dark-400">@{userProfile?.username}</p>
                                <div className="flex items-center gap-2 mt-2">
                                    <span className="w-2 h-2 rounded-full bg-green-500"></span>
                                    <span className="text-green-400 text-sm">Online</span>
                                </div>
                            </div>
                        </div>

                        {!isEditing && (
                            <button
                                onClick={() => setIsEditing(true)}
                                className="btn-secondary text-sm py-2 px-4"
                            >
                                Edit Profile
                            </button>
                        )}
                    </div>

                    {/* Alerts */}
                    {error && (
                        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
                            {error}
                        </div>
                    )}
                    {success && (
                        <div className="mb-6 p-4 bg-green-500/10 border border-green-500/20 rounded-xl text-green-400 text-sm">
                            {success}
                        </div>
                    )}

                    {/* Profile form */}
                    <div className="space-y-6">
                        {/* Display Name */}
                        <div>
                            <label className="block text-dark-300 text-sm font-medium mb-2">
                                Display Name
                            </label>
                            {isEditing ? (
                                <input
                                    type="text"
                                    value={displayName}
                                    onChange={(e) => setDisplayName(e.target.value)}
                                    className="input-field"
                                    placeholder="Your display name"
                                />
                            ) : (
                                <p className="text-white py-3">{userProfile?.displayName}</p>
                            )}
                        </div>

                        {/* Username */}
                        <div>
                            <label className="block text-dark-300 text-sm font-medium mb-2">
                                Username
                            </label>
                            {isEditing ? (
                                <div className="input-with-icon">
                                    <span className="icon text-dark-400">@</span>
                                    <input
                                        type="text"
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value.toLowerCase())}
                                        className="input-field"
                                        placeholder="username"
                                    />
                                </div>
                            ) : (
                                <p className="text-white py-3">@{userProfile?.username}</p>
                            )}
                        </div>

                        {/* Phone Number */}
                        <div>
                            <label className="block text-dark-300 text-sm font-medium mb-2">
                                Phone Number
                            </label>
                            {isEditing ? (
                                <input
                                    type="tel"
                                    value={phoneNumber}
                                    onChange={(e) => setPhoneNumber(e.target.value)}
                                    className="input-field"
                                    placeholder="+1234567890"
                                />
                            ) : (
                                <p className="text-white py-3">{userProfile?.phoneNumber}</p>
                            )}
                        </div>

                        {/* Email (read-only) */}
                        <div>
                            <label className="block text-dark-300 text-sm font-medium mb-2">
                                Email
                            </label>
                            <p className="text-dark-400 py-3">{userProfile?.email}</p>
                            <p className="text-dark-500 text-xs mt-1">Email cannot be changed</p>
                        </div>

                        {/* Default Location */}
                        <div>
                            <label className="block text-dark-300 text-sm font-medium mb-2">
                                Default Location (Optional)
                            </label>
                            {isEditing ? (
                                <input
                                    type="text"
                                    value={defaultLocation}
                                    onChange={(e) => setDefaultLocation(e.target.value)}
                                    className="input-field"
                                    placeholder="City, Country"
                                />
                            ) : (
                                <p className="text-white py-3">
                                    {userProfile?.defaultLocation || <span className="text-dark-500">Not set</span>}
                                </p>
                            )}
                        </div>

                        {/* Member since */}
                        <div className="pt-4 border-t border-dark-700">
                            <p className="text-dark-400 text-sm">
                                Member since {userProfile?.createdAt ? formatDate(userProfile.createdAt) : 'Unknown'}
                            </p>
                        </div>

                        {/* Action buttons */}
                        {isEditing && (
                            <div className="flex gap-3 pt-4">
                                <button
                                    onClick={handleCancel}
                                    className="btn-secondary flex-1"
                                    disabled={loading}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSave}
                                    className="btn-primary flex-1"
                                    disabled={loading}
                                >
                                    {loading ? (
                                        <span className="flex items-center justify-center gap-2">
                                            <span className="spinner"></span>
                                            Saving...
                                        </span>
                                    ) : (
                                        'Save Changes'
                                    )}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { createUser, isUsernameUnique, isPhoneUnique } from '../services/userService';

export default function OnboardingPage() {
    const [username, setUsername] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');
    const [phoneStatus, setPhoneStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');

    const { firebaseUser, userProfile, refreshUserProfile } = useAuth();
    const navigate = useNavigate();

    // Redirect if already onboarded
    useEffect(() => {
        if (userProfile?.onboardingComplete) {
            navigate('/');
        }
    }, [userProfile, navigate]);

    // Redirect if not logged in
    useEffect(() => {
        if (!firebaseUser) {
            navigate('/login');
        }
    }, [firebaseUser, navigate]);

    // Debounced username check
    useEffect(() => {
        if (!username || username.length < 3) {
            setUsernameStatus('idle');
            return;
        }

        const timeoutId = setTimeout(async () => {
            setUsernameStatus('checking');
            try {
                const isUnique = await isUsernameUnique(username);
                setUsernameStatus(isUnique ? 'available' : 'taken');
            } catch {
                setUsernameStatus('idle');
            }
        }, 500);

        return () => clearTimeout(timeoutId);
    }, [username]);

    // Debounced phone check
    useEffect(() => {
        if (!phoneNumber || phoneNumber.length < 10) {
            setPhoneStatus('idle');
            return;
        }

        const timeoutId = setTimeout(async () => {
            setPhoneStatus('checking');
            try {
                const isUnique = await isPhoneUnique(phoneNumber);
                setPhoneStatus(isUnique ? 'available' : 'taken');
            } catch {
                setPhoneStatus('idle');
            }
        }, 500);

        return () => clearTimeout(timeoutId);
    }, [phoneNumber]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        // Validate username
        if (username.length < 3) {
            setError('Username must be at least 3 characters');
            return;
        }

        if (!/^[a-zA-Z0-9_]+$/.test(username)) {
            setError('Username can only contain letters, numbers, and underscores');
            return;
        }

        // Validate phone
        if (phoneNumber.length < 10) {
            setError('Please enter a valid phone number');
            return;
        }

        // Check if username is taken
        if (usernameStatus === 'taken') {
            setError('Username already exists');
            return;
        }

        // Check if phone is taken
        if (phoneStatus === 'taken') {
            setError('User already exists with this phone number');
            return;
        }

        if (!firebaseUser) {
            setError('Please log in first');
            return;
        }

        setIsLoading(true);

        try {
            // Final uniqueness check
            const [isUsernameAvailable, isPhoneAvailable] = await Promise.all([
                isUsernameUnique(username),
                isPhoneUnique(phoneNumber),
            ]);

            if (!isUsernameAvailable) {
                setError('Username already exists');
                setUsernameStatus('taken');
                setIsLoading(false);
                return;
            }

            if (!isPhoneAvailable) {
                setError('User already exists with this phone number');
                setPhoneStatus('taken');
                setIsLoading(false);
                return;
            }

            // Create user profile in Firestore (include Google photo if available)
            await createUser(
                firebaseUser.uid,
                firebaseUser.email || '',
                username,
                phoneNumber,
                firebaseUser.displayName || username,
                firebaseUser.photoURL // Import Google profile photo
            );

            // Refresh the user profile
            await refreshUserProfile();

            // Navigate to main app
            navigate('/');
        } catch (err) {
            console.error('Error during onboarding:', err);
            setError('Something went wrong. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const getStatusIcon = (status: 'idle' | 'checking' | 'available' | 'taken') => {
        switch (status) {
            case 'checking':
                return <div className="spinner" />;
            case 'available':
                return (
                    <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                );
            case 'taken':
                return (
                    <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                );
            default:
                return null;
        }
    };

    return (
        <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#fcf5eb' }}>
            {/* WhatsApp-style header bar with logo */}
            <div className="w-full py-4 px-6" style={{ backgroundColor: '#202c33' }}>
                <div className="flex items-center gap-2">
                    <svg className="w-10 h-10" fill="#00a884" viewBox="0 0 24 24">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                    </svg>
                    <span className="text-[#00a884] text-xl font-normal">WhatsApp</span>
                </div>
            </div>

            {/* Content centered */}
            <div className="flex-1 flex items-start justify-center pt-8 px-4 pb-8 overflow-y-auto">
                <div className="w-full max-w-[500px] shadow-lg rounded-md overflow-hidden" style={{ backgroundColor: '#ffffff' }}>
                    {/* Progress indicator */}
                    <div className="flex items-center justify-center gap-2 pt-8 pb-4">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-white font-semibold text-sm" style={{ backgroundColor: '#00a884' }}>
                            ✓
                        </div>
                        <div className="w-12 h-1 rounded-full" style={{ backgroundColor: '#00a884' }} />
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-white font-semibold text-sm" style={{ backgroundColor: '#00a884' }}>
                            2
                        </div>
                    </div>

                    {/* Title */}
                    <div className="text-center pb-6 px-8">
                        <h1 className="text-2xl font-normal mb-2 text-gray-800">Complete Your Profile</h1>
                        <p className="text-sm text-gray-500">Choose a unique username and add your phone number</p>
                    </div>

                    {/* Form Card Content */}
                    <div className="px-8 pb-8">
                        <form onSubmit={handleSubmit} className="space-y-6">
                            {/* Error Message */}
                            {error && (
                                <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-600 text-sm">
                                    <div className="flex items-center gap-2">
                                        <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        {error}
                                    </div>
                                </div>
                            )}

                            {/* Username Input */}
                            <div className="space-y-2">
                                <label htmlFor="username" className="block text-sm font-medium text-gray-700">
                                    Username
                                </label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">@</span>
                                    <input
                                        id="username"
                                        type="text"
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                                        className="w-full rounded-lg py-3 pl-10 pr-12 focus:outline-none transition-colors"
                                        style={{
                                            backgroundColor: '#f0f2f5',
                                            border: '1px solid #e0e0e0',
                                            color: '#111b21'
                                        }}
                                        placeholder="johndoe"
                                        required
                                        autoComplete="username"
                                    />
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2">
                                        {getStatusIcon(usernameStatus)}
                                    </div>
                                </div>
                                <p className="text-xs text-gray-500">
                                    Letters, numbers, and underscores only. Min 3 characters.
                                </p>
                                {usernameStatus === 'taken' && (
                                    <p className="text-xs text-red-500">Username already exists</p>
                                )}
                                {usernameStatus === 'available' && (
                                    <p className="text-xs text-green-500">Username is available!</p>
                                )}
                            </div>

                            {/* Phone Number Input */}
                            <div className="space-y-2">
                                <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                                    Phone Number
                                </label>
                                <div className="relative">
                                    <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                    </svg>
                                    <input
                                        id="phone"
                                        type="tel"
                                        value={phoneNumber}
                                        onChange={(e) => setPhoneNumber(e.target.value.replace(/[^0-9+]/g, ''))}
                                        className="w-full rounded-lg py-3 pl-12 pr-12 focus:outline-none transition-colors"
                                        style={{
                                            backgroundColor: '#f0f2f5',
                                            border: '1px solid #e0e0e0',
                                            color: '#111b21'
                                        }}
                                        placeholder="+91 98765 43210"
                                        required
                                    />
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2">
                                        {getStatusIcon(phoneStatus)}
                                    </div>
                                </div>
                                <p className="text-xs text-gray-500">
                                    Include country code (e.g., +91 for India)
                                </p>
                                {phoneStatus === 'taken' && (
                                    <p className="text-xs text-red-500">User already exists with this phone number</p>
                                )}
                                {phoneStatus === 'available' && (
                                    <p className="text-xs text-green-500">Phone number is available!</p>
                                )}
                            </div>

                            {/* Submit Button */}
                            <button
                                type="submit"
                                disabled={isLoading || usernameStatus === 'taken' || phoneStatus === 'taken'}
                                className="w-full py-3 rounded-lg text-white font-medium flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                style={{ backgroundColor: '#00a884' }}
                            >
                                {isLoading ? (
                                    <>
                                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                        Setting up...
                                    </>
                                ) : (
                                    <>
                                        Complete Setup
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                        </svg>
                                    </>
                                )}
                            </button>
                        </form>
                    </div>

                    {/* Info */}
                    <div className="mx-8 mb-8 p-4 rounded-lg" style={{ backgroundColor: '#f0f2f5', border: '1px solid #e0e0e0' }}>
                        <div className="flex gap-3">
                            <svg className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: '#00a884' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <div className="text-sm text-gray-600">
                                <p className="font-medium text-gray-700 mb-1">Why do we need this?</p>
                                <p>Your username and phone number allow others to find and message you on WhatsApp.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

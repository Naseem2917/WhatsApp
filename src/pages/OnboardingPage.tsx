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

            // Create user profile in Firestore
            await createUser(
                firebaseUser.uid,
                firebaseUser.email || '',
                username,
                phoneNumber,
                firebaseUser.displayName || username
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
        <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-dark-950 via-dark-900 to-dark-950">
            {/* Background decoration */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/4 -right-20 w-60 h-60 bg-primary-500/10 rounded-full blur-3xl" />
                <div className="absolute bottom-1/4 -left-20 w-60 h-60 bg-accent-teal/10 rounded-full blur-3xl" />
            </div>

            <div className="w-full max-w-md relative animate-fade-in">
                {/* Progress indicator */}
                <div className="flex items-center justify-center gap-2 mb-8">
                    <div className="w-8 h-8 rounded-full bg-primary-500 flex items-center justify-center text-white font-semibold text-sm">
                        ✓
                    </div>
                    <div className="w-12 h-1 bg-primary-500 rounded-full" />
                    <div className="w-8 h-8 rounded-full bg-primary-500 flex items-center justify-center text-white font-semibold text-sm">
                        2
                    </div>
                </div>

                {/* Title */}
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-white mb-2">Complete Your Profile</h1>
                    <p className="text-dark-400">Choose a unique username and add your phone number</p>
                </div>

                {/* Onboarding Card */}
                <div className="glass-card p-8">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Error Message */}
                        {error && (
                            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-400 text-sm animate-fade-in">
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
                            <label htmlFor="username" className="block text-sm font-medium text-dark-300">
                                Username
                            </label>
                            <div className="input-with-icon">
                                <span className="icon text-dark-400">@</span>
                                <input
                                    id="username"
                                    type="text"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                                    className="input-field pr-12"
                                    placeholder="johndoe"
                                    required
                                    autoComplete="username"
                                />
                                <div className="absolute right-4 top-1/2 -translate-y-1/2">
                                    {getStatusIcon(usernameStatus)}
                                </div>
                            </div>
                            <p className="text-xs text-dark-500">
                                Letters, numbers, and underscores only. Min 3 characters.
                            </p>
                            {usernameStatus === 'taken' && (
                                <p className="text-xs text-red-400">Username already exists</p>
                            )}
                            {usernameStatus === 'available' && (
                                <p className="text-xs text-green-400">Username is available!</p>
                            )}
                        </div>

                        {/* Phone Number Input */}
                        <div className="space-y-2">
                            <label htmlFor="phone" className="block text-sm font-medium text-dark-300">
                                Phone Number
                            </label>
                            <div className="input-with-icon">
                                <svg className="icon w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                </svg>
                                <input
                                    id="phone"
                                    type="tel"
                                    value={phoneNumber}
                                    onChange={(e) => setPhoneNumber(e.target.value.replace(/[^0-9+]/g, ''))}
                                    className="input-field pr-12"
                                    placeholder="+91 98765 43210"
                                    required
                                />
                                <div className="absolute right-4 top-1/2 -translate-y-1/2">
                                    {getStatusIcon(phoneStatus)}
                                </div>
                            </div>
                            <p className="text-xs text-dark-500">
                                Include country code (e.g., +91 for India)
                            </p>
                            {phoneStatus === 'taken' && (
                                <p className="text-xs text-red-400">User already exists with this phone number</p>
                            )}
                            {phoneStatus === 'available' && (
                                <p className="text-xs text-green-400">Phone number is available!</p>
                            )}
                        </div>

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={isLoading || usernameStatus === 'taken' || phoneStatus === 'taken'}
                            className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isLoading ? (
                                <>
                                    <div className="spinner" />
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
                <div className="mt-6 p-4 bg-dark-800/50 rounded-xl border border-dark-700">
                    <div className="flex gap-3">
                        <svg className="w-5 h-5 text-accent-blue flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <div className="text-sm text-dark-400">
                            <p className="font-medium text-dark-300 mb-1">Why do we need this?</p>
                            <p>Your username and phone number allow others to find and message you on WhatsApp.</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

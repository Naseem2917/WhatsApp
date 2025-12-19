import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import {
    User,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    updateProfile,
    GoogleAuthProvider,
    signInWithPopup,
    signInWithPhoneNumber,
    RecaptchaVerifier,
    ConfirmationResult
} from 'firebase/auth';
import { auth } from '../config/firebase';
import { getUserById, updateOnlineStatus, getUserByEmail, getUserByPhone } from '../services/userService';
import type { UserProfile } from '../types';

declare global {
    interface Window {
        recaptchaVerifier: RecaptchaVerifier;
    }
}

interface AuthContextType {
    firebaseUser: User | null;
    userProfile: UserProfile | null;
    loading: boolean;
    error: string | null;
    login: (email: string, password: string) => Promise<void>;
    signup: (email: string, password: string, displayName: string) => Promise<User>;
    loginWithGoogle: () => Promise<{ isNewUser: boolean }>;
    loginWithPhone: (phoneNumber: string) => Promise<void>;
    verifyOTP: (otp: string) => Promise<{ isNewUser: boolean }>;
    logout: () => Promise<void>;
    clearError: () => void;
    refreshUserProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Google Auth Provider
const googleProvider = new GoogleAuthProvider();

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);

    // Fetch user profile from Firestore
    const fetchUserProfile = useCallback(async (uid: string) => {
        try {
            const profile = await getUserById(uid);
            setUserProfile(profile);
            return profile;
        } catch (err) {
            console.error('Error fetching user profile:', err);
            return null;
        }
    }, []);

    // Refresh user profile
    const refreshUserProfile = useCallback(async () => {
        if (firebaseUser) {
            await fetchUserProfile(firebaseUser.uid);
        }
    }, [firebaseUser, fetchUserProfile]);

    // Listen for auth state changes
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            setFirebaseUser(user);

            if (user) {
                await fetchUserProfile(user.uid);
                // Update online status
                try {
                    await updateOnlineStatus(user.uid, true);
                } catch {
                    // User might not have completed onboarding yet
                }
            } else {
                setUserProfile(null);
            }

            setLoading(false);
        });

        return () => unsubscribe();
    }, [fetchUserProfile]);

    // Update online status when user leaves
    useEffect(() => {
        const handleBeforeUnload = async () => {
            if (firebaseUser) {
                try {
                    await updateOnlineStatus(firebaseUser.uid, false);
                } catch {
                    // Ignore errors on unload
                }
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [firebaseUser]);

    // Login function
    const login = async (email: string, password: string) => {
        try {
            setError(null);
            setLoading(true);
            await signInWithEmailAndPassword(auth, email, password);
        } catch (err) {
            const errorMessage = getAuthErrorMessage(err);
            setError(errorMessage);
            throw new Error(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    // Google Sign-in function
    const loginWithGoogle = async (): Promise<{ isNewUser: boolean }> => {
        try {
            setError(null);
            setLoading(true);
            const result = await signInWithPopup(auth, googleProvider);

            // Check if user already exists in Firestore
            const existingProfile = await getUserByEmail(result.user.email || '');

            if (existingProfile) {
                // Existing user - load their profile
                setUserProfile(existingProfile);
                return { isNewUser: false };
            } else {
                // New user - needs onboarding
                return { isNewUser: true };
            }
        } catch (err) {
            const errorMessage = getAuthErrorMessage(err);
            setError(errorMessage);
            throw new Error(errorMessage);
        } finally {
            setLoading(false);
        }
    };


    // ... existing code ...

    // Phone Sign-in function - Step 1: Send OTP
    const loginWithPhone = async (phoneNumber: string): Promise<void> => {
        try {
            setError(null);
            setLoading(true);

            // Clear any existing reCAPTCHA
            const recaptchaContainer = document.getElementById('recaptcha-container');
            if (recaptchaContainer) {
                recaptchaContainer.innerHTML = '';
            }

            if (window.recaptchaVerifier) {
                try {
                    window.recaptchaVerifier.clear();
                } catch (e) {
                    // Ignore clear errors
                }
            }

            // Create new reCAPTCHA verifier
            window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
                size: 'invisible',
                callback: () => {
                    console.log('reCAPTCHA verified');
                },
                'expired-callback': () => {
                    setError('reCAPTCHA expired. Please try again.');
                }
            });

            // Render the reCAPTCHA
            await window.recaptchaVerifier.render();

            const confirmation = await signInWithPhoneNumber(auth, phoneNumber, window.recaptchaVerifier);
            setConfirmationResult(confirmation);
        } catch (err) {
            console.error('Phone auth error:', err);
            const errorMessage = getAuthErrorMessage(err);
            setError(errorMessage);
            throw new Error(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    // Phone Sign-in function - Step 2: Verify OTP
    const verifyOTP = async (otp: string): Promise<{ isNewUser: boolean }> => {
        try {
            setError(null);
            setLoading(true);

            if (!confirmationResult) {
                throw new Error('Please request OTP first');
            }

            const result = await confirmationResult.confirm(otp);

            // Check if user already exists in Firestore by phone
            const existingProfile = await getUserByPhone(result.user.phoneNumber || '');

            if (existingProfile) {
                // Existing user - load their profile
                setUserProfile(existingProfile);
                return { isNewUser: false };
            } else {
                // New user - needs onboarding
                return { isNewUser: true };
            }
        } catch (err) {
            const errorMessage = getAuthErrorMessage(err);
            setError(errorMessage);
            throw new Error(errorMessage);
        } finally {
            setLoading(false);
            setConfirmationResult(null);
        }
    };

    // Signup function
    const signup = async (email: string, password: string, displayName: string) => {
        try {
            setError(null);
            setLoading(true);
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);

            // Update profile with display name
            await updateProfile(userCredential.user, { displayName });

            return userCredential.user;
        } catch (err) {
            const errorMessage = getAuthErrorMessage(err);
            setError(errorMessage);
            throw new Error(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    // Logout function
    const logout = async () => {
        try {
            if (firebaseUser) {
                await updateOnlineStatus(firebaseUser.uid, false);
            }
            await signOut(auth);
            setUserProfile(null);
        } catch (err) {
            console.error('Error logging out:', err);
            throw err;
        }
    };

    // Clear error
    const clearError = () => setError(null);

    const value: AuthContextType = {
        firebaseUser,
        userProfile,
        loading,
        error,
        login,
        signup,
        loginWithGoogle,
        loginWithPhone,
        verifyOTP,
        logout,
        clearError,
        refreshUserProfile,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

// Custom hook to use auth context
export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}

// Helper function to get user-friendly error messages
function getAuthErrorMessage(error: unknown): string {
    const firebaseError = error as { code?: string };

    switch (firebaseError.code) {
        case 'auth/email-already-in-use':
            return 'Account already exists with this email';
        case 'auth/invalid-email':
            return 'Invalid email address';
        case 'auth/operation-not-allowed':
            return 'Email/password accounts are not enabled';
        case 'auth/weak-password':
            return 'Password is too weak. Use at least 6 characters';
        case 'auth/user-disabled':
            return 'This account has been disabled';
        case 'auth/user-not-found':
            return 'No account found with this email';
        case 'auth/wrong-password':
            return 'Incorrect password';
        case 'auth/invalid-credential':
            return 'Invalid email or password';
        case 'auth/too-many-requests':
            return 'Too many failed attempts. Please try again later';
        case 'auth/popup-closed-by-user':
            return 'Sign in was cancelled';
        case 'auth/cancelled-popup-request':
            return 'Sign in was cancelled';
        case 'auth/popup-blocked':
            return 'Popup was blocked. Please allow popups for this site';
        default:
            return 'An error occurred. Please try again';
    }
}

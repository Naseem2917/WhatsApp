import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface ProtectedRouteProps {
    children: React.ReactNode;
    requireOnboarding?: boolean;
}

export default function ProtectedRoute({ children, requireOnboarding = true }: ProtectedRouteProps) {
    const { firebaseUser, userProfile, loading } = useAuth();
    const location = useLocation();

    // Show loading state
    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-dark-950">
                <div className="text-center">
                    <div className="w-12 h-12 border-3 border-dark-600 border-t-primary-500 rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-dark-400">Loading...</p>
                </div>
            </div>
        );
    }

    // Not logged in - redirect to login
    if (!firebaseUser) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    // Logged in but not onboarded - redirect to onboarding
    if (requireOnboarding && !userProfile?.onboardingComplete) {
        return <Navigate to="/onboarding" replace />;
    }

    return <>{children}</>;
}

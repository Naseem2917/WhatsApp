import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import ProtectedRoute from './components/ProtectedRoute';
import OnlineStatusHeartbeat from './components/OnlineStatusHeartbeat';
import ScheduledMessageProcessor from './components/ScheduledMessageProcessor';
import ReminderProcessor from './components/ReminderProcessor';
import UnreadBadgeTitle from './components/UnreadBadgeTitle';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import OnboardingPage from './pages/OnboardingPage';
import HomePage from './pages/HomePage';
import ChatPage from './pages/ChatPage';
import ProfilePage from './pages/ProfilePage';
import SettingsPage from './pages/SettingsPage';

function App() {
    return (
        <ThemeProvider>
            <Router>
                <AuthProvider>
                    {/* Process scheduled messages in background */}
                    <ScheduledMessageProcessor />
                    {/* Process reminders and show notifications */}
                    <ReminderProcessor />
                    {/* Update browser tab title with unread count */}
                    <UnreadBadgeTitle />
                    <OnlineStatusHeartbeat />
                    <Routes>
                        {/* Public routes */}
                        <Route path="/login" element={<LoginPage />} />
                        <Route path="/signup" element={<SignupPage />} />

                        {/* Onboarding - requires auth but not completed onboarding */}
                        <Route
                            path="/onboarding"
                            element={
                                <ProtectedRoute requireOnboarding={false}>
                                    <OnboardingPage />
                                </ProtectedRoute>
                            }
                        />

                        {/* Protected routes - require auth and completed onboarding */}
                        <Route
                            path="/"
                            element={
                                <ProtectedRoute>
                                    <HomePage />
                                </ProtectedRoute>
                            }
                        />

                        <Route
                            path="/chat/:chatId"
                            element={
                                <ProtectedRoute>
                                    <ChatPage />
                                </ProtectedRoute>
                            }
                        />

                        <Route
                            path="/profile"
                            element={
                                <ProtectedRoute>
                                    <ProfilePage />
                                </ProtectedRoute>
                            }
                        />

                        <Route
                            path="/settings"
                            element={
                                <ProtectedRoute>
                                    <SettingsPage />
                                </ProtectedRoute>
                            }
                        />

                        {/* Catch all - redirect to home */}
                        <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                </AuthProvider>
            </Router>
        </ThemeProvider>
    );
}

export default App;

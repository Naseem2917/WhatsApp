import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

type AuthMode = 'email' | 'phone';
type PhoneStep = 'input' | 'otp';

// Country codes for dropdown
const countryCodes = [
    { code: '+91', country: 'India', flag: '🇮🇳' },
    { code: '+1', country: 'USA', flag: '🇺🇸' },
    { code: '+44', country: 'UK', flag: '🇬🇧' },
    { code: '+971', country: 'UAE', flag: '🇦🇪' },
    { code: '+966', country: 'Saudi Arabia', flag: '🇸🇦' },
    { code: '+65', country: 'Singapore', flag: '🇸🇬' },
    { code: '+61', country: 'Australia', flag: '🇦🇺' },
    { code: '+49', country: 'Germany', flag: '🇩🇪' },
];

export default function LoginPage() {
    const [authMode, setAuthMode] = useState<AuthMode>('email');
    const [phoneStep, setPhoneStep] = useState<PhoneStep>('input');

    // Email state
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    // Phone state
    const [countryCode, setCountryCode] = useState('+91');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [otp, setOtp] = useState('');
    const [showCountryPicker, setShowCountryPicker] = useState(false);

    const [isLoading, setIsLoading] = useState(false);

    const { login, loginWithGoogle, loginWithPhone, verifyOTP, error, clearError } = useAuth();
    const navigate = useNavigate();

    // Email login handler
    const handleEmailSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        clearError();
        setIsLoading(true);

        try {
            await login(email, password);
            navigate('/');
        } catch {
            // Error is handled in context
        } finally {
            setIsLoading(false);
        }
    };

    // Phone login handler - Step 1: Request OTP
    const handlePhoneSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        clearError();
        setIsLoading(true);

        try {
            const fullPhoneNumber = `${countryCode}${phoneNumber}`;
            await loginWithPhone(fullPhoneNumber);
            setPhoneStep('otp');
        } catch {
            // Error is handled in context
        } finally {
            setIsLoading(false);
        }
    };

    // Phone login handler - Step 2: Verify OTP
    const handleOTPSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        clearError();
        setIsLoading(true);

        try {
            const result = await verifyOTP(otp);
            if (result.isNewUser) {
                navigate('/onboarding');
            } else {
                navigate('/');
            }
        } catch {
            // Error is handled in context
        } finally {
            setIsLoading(false);
        }
    };

    const handleGoogleSignIn = async () => {
        clearError();
        setIsLoading(true);

        try {
            const result = await loginWithGoogle();
            if (result.isNewUser) {
                navigate('/onboarding');
            } else {
                navigate('/');
            }
        } catch {
            // Error is handled in context
        } finally {
            setIsLoading(false);
        }
    };

    const handleBackFromOTP = () => {
        setPhoneStep('input');
        setOtp('');
        clearError();
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-dark-950 via-dark-900 to-dark-950">
            {/* reCAPTCHA container - required for phone auth */}
            <div id="recaptcha-container"></div>

            {/* Background decoration */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary-500/10 rounded-full blur-3xl" />
                <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-accent-teal/10 rounded-full blur-3xl" />
            </div>

            <div className="w-full max-w-md relative animate-fade-in">
                {/* Logo and Title */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 mb-4 shadow-glow">
                        <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                        </svg>
                    </div>
                    <h1 className="text-3xl font-bold text-white mb-2">
                        {phoneStep === 'otp' ? 'Verify OTP' : 'Welcome Back'}
                    </h1>
                    <p className="text-dark-400">
                        {phoneStep === 'otp'
                            ? `Enter the code sent to ${countryCode}${phoneNumber}`
                            : 'Sign in to continue to WhatsApp'}
                    </p>
                </div>

                {/* Login Card */}
                <div className="glass-card p-8">
                    {/* Auth Mode Tabs - Only show when not in OTP step */}
                    {phoneStep !== 'otp' && (
                        <div className="flex mb-6 rounded-xl overflow-hidden" style={{ backgroundColor: 'var(--dark-800, #1f2937)' }}>
                            <button
                                onClick={() => { setAuthMode('email'); clearError(); }}
                                className={`flex-1 py-3 text-sm font-medium transition-all ${authMode === 'email'
                                        ? 'bg-primary-500 text-white'
                                        : 'text-dark-400 hover:text-white'
                                    }`}
                            >
                                Email
                            </button>
                            <button
                                onClick={() => { setAuthMode('phone'); clearError(); }}
                                className={`flex-1 py-3 text-sm font-medium transition-all ${authMode === 'phone'
                                        ? 'bg-primary-500 text-white'
                                        : 'text-dark-400 hover:text-white'
                                    }`}
                            >
                                Phone
                            </button>
                        </div>
                    )}

                    {/* Error Message */}
                    {error && (
                        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-400 text-sm animate-fade-in mb-6">
                            <div className="flex items-center gap-2">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                {error}
                            </div>
                        </div>
                    )}

                    {/* Email Login Form */}
                    {authMode === 'email' && (
                        <form onSubmit={handleEmailSubmit} className="space-y-6">
                            {/* Email Input */}
                            <div className="space-y-2">
                                <label htmlFor="email" className="block text-sm font-medium text-dark-300">
                                    Email Address
                                </label>
                                <div className="input-with-icon">
                                    <svg className="icon w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                    </svg>
                                    <input
                                        id="email"
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="input-field"
                                        placeholder="you@example.com"
                                        required
                                        autoComplete="email"
                                    />
                                </div>
                            </div>

                            {/* Password Input */}
                            <div className="space-y-2">
                                <label htmlFor="password" className="block text-sm font-medium text-dark-300">
                                    Password
                                </label>
                                <div className="input-with-icon">
                                    <svg className="icon w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                    </svg>
                                    <input
                                        id="password"
                                        type={showPassword ? 'text' : 'password'}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="input-field pr-12"
                                        placeholder="••••••••"
                                        required
                                        autoComplete="current-password"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-dark-400 hover:text-white transition-colors"
                                    >
                                        {showPassword ? (
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                                            </svg>
                                        ) : (
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                            </svg>
                                        )}
                                    </button>
                                </div>
                            </div>

                            {/* Submit Button */}
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="btn-primary w-full flex items-center justify-center gap-2"
                            >
                                {isLoading ? (
                                    <>
                                        <div className="spinner" />
                                        Signing in...
                                    </>
                                ) : (
                                    'Sign In'
                                )}
                            </button>
                        </form>
                    )}

                    {/* Phone Login Form */}
                    {authMode === 'phone' && phoneStep === 'input' && (
                        <form onSubmit={handlePhoneSubmit} className="space-y-6">
                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-dark-300">
                                    Phone Number
                                </label>
                                <div className="flex gap-2">
                                    {/* Country Code Dropdown */}
                                    <div className="relative">
                                        <button
                                            type="button"
                                            onClick={() => setShowCountryPicker(!showCountryPicker)}
                                            className="flex items-center gap-2 px-4 py-3 rounded-xl bg-dark-800 border border-dark-700 text-white hover:border-primary-500 transition-colors"
                                        >
                                            <span>{countryCodes.find(c => c.code === countryCode)?.flag}</span>
                                            <span>{countryCode}</span>
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                            </svg>
                                        </button>

                                        {showCountryPicker && (
                                            <div className="absolute top-full left-0 mt-2 w-48 max-h-60 overflow-y-auto rounded-xl bg-dark-800 border border-dark-700 shadow-xl z-50">
                                                {countryCodes.map((c) => (
                                                    <button
                                                        key={c.code}
                                                        type="button"
                                                        onClick={() => { setCountryCode(c.code); setShowCountryPicker(false); }}
                                                        className="w-full flex items-center gap-3 px-4 py-3 text-left text-white hover:bg-dark-700 transition-colors"
                                                    >
                                                        <span>{c.flag}</span>
                                                        <span className="flex-1">{c.country}</span>
                                                        <span className="text-dark-400">{c.code}</span>
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* Phone Input */}
                                    <input
                                        type="tel"
                                        value={phoneNumber}
                                        onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
                                        className="flex-1 rounded-xl py-3 px-4 bg-dark-800 border border-dark-700 text-white placeholder-dark-500 focus:border-primary-500 focus:outline-none transition-colors"
                                        placeholder="Phone number"
                                        required
                                        maxLength={10}
                                    />
                                </div>
                                <p className="text-xs text-dark-500">
                                    Carrier charges may apply
                                </p>
                            </div>

                            <button
                                type="submit"
                                disabled={isLoading || phoneNumber.length < 10}
                                className="btn-primary w-full flex items-center justify-center gap-2"
                            >
                                {isLoading ? (
                                    <>
                                        <div className="spinner" />
                                        Sending OTP...
                                    </>
                                ) : (
                                    'Next'
                                )}
                            </button>
                        </form>
                    )}

                    {/* OTP Verification Form */}
                    {authMode === 'phone' && phoneStep === 'otp' && (
                        <form onSubmit={handleOTPSubmit} className="space-y-6">
                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-dark-300">
                                    Enter 6-digit code
                                </label>
                                <input
                                    type="text"
                                    value={otp}
                                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                    className="w-full rounded-xl py-4 px-4 bg-dark-800 border border-dark-700 text-white text-center text-2xl tracking-[0.5em] placeholder-dark-500 focus:border-primary-500 focus:outline-none transition-colors"
                                    placeholder="••••••"
                                    required
                                    maxLength={6}
                                    autoFocus
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={isLoading || otp.length !== 6}
                                className="btn-primary w-full flex items-center justify-center gap-2"
                            >
                                {isLoading ? (
                                    <>
                                        <div className="spinner" />
                                        Verifying...
                                    </>
                                ) : (
                                    'Verify'
                                )}
                            </button>

                            <button
                                type="button"
                                onClick={handleBackFromOTP}
                                className="w-full text-dark-400 hover:text-white text-sm transition-colors"
                            >
                                ← Back to phone number
                            </button>
                        </form>
                    )}

                    {/* Divider - Only show when not in OTP step */}
                    {phoneStep !== 'otp' && (
                        <>
                            <div className="relative my-6">
                                <div className="absolute inset-0 flex items-center">
                                    <div className="w-full border-t border-dark-700" />
                                </div>
                                <div className="relative flex justify-center text-sm">
                                    <span className="px-4 bg-dark-900 text-dark-400">or continue with</span>
                                </div>
                            </div>

                            {/* Google Sign-in Button */}
                            <button
                                type="button"
                                onClick={handleGoogleSignIn}
                                disabled={isLoading}
                                className="w-full flex items-center justify-center gap-3 bg-white hover:bg-gray-100 text-gray-800 font-medium py-3 px-6 rounded-xl transition-all duration-200 border border-gray-300 mb-6"
                            >
                                <svg className="w-5 h-5" viewBox="0 0 24 24">
                                    <path
                                        fill="#4285F4"
                                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                    />
                                    <path
                                        fill="#34A853"
                                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                    />
                                    <path
                                        fill="#FBBC05"
                                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                                    />
                                    <path
                                        fill="#EA4335"
                                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                    />
                                </svg>
                                Continue with Google
                            </button>

                            {/* Divider */}
                            <div className="relative my-6">
                                <div className="absolute inset-0 flex items-center">
                                    <div className="w-full border-t border-dark-700" />
                                </div>
                                <div className="relative flex justify-center text-sm">
                                    <span className="px-4 bg-dark-900 text-dark-400">New to WhatsApp?</span>
                                </div>
                            </div>

                            {/* Signup Link */}
                            <Link to="/signup" className="btn-secondary w-full block text-center">
                                Create Account
                            </Link>
                        </>
                    )}
                </div>

                {/* Footer */}
                <p className="text-center text-dark-500 text-sm mt-8">
                    By signing in, you agree to our Terms of Service and Privacy Policy
                </p>
            </div>
        </div>
    );
}

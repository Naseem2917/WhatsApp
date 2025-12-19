import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { updateUserProfile, isUsernameUnique, isPhoneUnique } from '../services/userService';
import { Sidebar } from '../components/layout';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../config/firebase';

export default function ProfilePage() {
    const { userProfile, refreshUserProfile } = useAuth();
    const [isEditing, setIsEditing] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [uploadingPhoto, setUploadingPhoto] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(true);

    const photoInputRef = useRef<HTMLInputElement>(null);

    // Form state
    const [displayName, setDisplayName] = useState('');
    const [username, setUsername] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [defaultLocation, setDefaultLocation] = useState('');
    const [about, setAbout] = useState('');

    // Initialize form with user data
    useEffect(() => {
        if (userProfile) {
            setDisplayName(userProfile.displayName || '');
            setUsername(userProfile.username || '');
            setPhoneNumber(userProfile.phoneNumber || '');
            setDefaultLocation(userProfile.defaultLocation || '');
        }
    }, [userProfile]);

    const handlePhotoUpload = async (file: File) => {
        if (!userProfile) return;

        if (file.size > 5 * 1024 * 1024) {
            setError('Image must be less than 5MB');
            return;
        }

        setUploadingPhoto(true);
        setError(null);

        try {
            // Create a unique filename
            const timestamp = Date.now();
            const extension = file.name.split('.').pop();
            const filePath = `profile-photos/${userProfile.uid}/${timestamp}.${extension}`;
            const storageRef = ref(storage, filePath);

            // Upload the file
            const snapshot = await uploadBytes(storageRef, file);
            console.log('Upload successful:', snapshot.metadata.fullPath);

            // Get the download URL
            const photoURL = await getDownloadURL(storageRef);
            console.log('Download URL:', photoURL);

            // Update user profile with new photo URL
            await updateUserProfile(userProfile.uid, { photoURL });
            await refreshUserProfile();
            setSuccess('Profile photo updated successfully!');
        } catch (err) {
            console.error('Upload error:', err);
            setError(err instanceof Error ? err.message : 'Failed to upload photo');
        } finally {
            setUploadingPhoto(false);
        }
    };

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
            if (phoneNumber !== userProfile.phoneNumber && phoneNumber) {
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
                    <h1 className="text-xl font-semibold" style={{ color: 'var(--wa-text-primary)' }}>Profile</h1>
                </div>

                {/* Profile Content */}
                <div className="flex-1 overflow-y-auto" style={{ backgroundColor: 'var(--wa-bg-chat)' }}>
                    <div className="max-w-2xl mx-auto py-8 px-4">
                        {/* Profile Photo Section */}
                        <div className="flex flex-col items-center mb-8">
                            <input
                                ref={photoInputRef}
                                type="file"
                                accept="image/jpeg,image/png,image/gif,image/webp"
                                className="hidden"
                                onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                        handlePhotoUpload(file);
                                    }
                                    e.target.value = '';
                                }}
                            />
                            <div className="relative">
                                <div
                                    className="w-40 h-40 rounded-full flex items-center justify-center text-4xl font-bold overflow-hidden"
                                    style={{ backgroundColor: 'var(--wa-green)', color: 'white' }}
                                >
                                    {userProfile?.photoURL ? (
                                        <img src={userProfile.photoURL} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                        userProfile?.displayName?.charAt(0).toUpperCase() || 'U'
                                    )}
                                </div>
                                <button
                                    onClick={() => photoInputRef.current?.click()}
                                    disabled={uploadingPhoto}
                                    className="absolute bottom-2 right-2 w-10 h-10 rounded-full flex items-center justify-center shadow-lg transition-all disabled:opacity-50"
                                    style={{ backgroundColor: 'var(--wa-green)', color: 'white' }}
                                >
                                    {uploadingPhoto ? (
                                        <div className="spinner w-5 h-5" />
                                    ) : (
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                                        </svg>
                                    )}
                                </button>
                            </div>
                            <p className="text-sm mt-3" style={{ color: 'var(--wa-text-secondary)' }}>
                                Tap to change profile photo
                            </p>
                        </div>

                        {/* Alerts */}
                        {error && (
                            <div
                                className="mb-4 p-4 rounded-lg text-sm"
                                style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)' }}
                            >
                                {error}
                            </div>
                        )}
                        {success && (
                            <div
                                className="mb-4 p-4 rounded-lg text-sm"
                                style={{ backgroundColor: 'rgba(34, 197, 94, 0.1)', color: '#22c55e', border: '1px solid rgba(34, 197, 94, 0.2)' }}
                            >
                                {success}
                            </div>
                        )}

                        {/* Profile Info Card */}
                        <div
                            className="rounded-lg shadow-sm mb-4"
                            style={{ backgroundColor: 'var(--wa-bg-panel)' }}
                        >
                            {/* Name Field */}
                            <div className="p-4 border-b" style={{ borderColor: 'var(--wa-border)' }}>
                                <div className="flex items-center justify-between">
                                    <div className="flex-1">
                                        <label className="text-xs mb-1 block" style={{ color: 'var(--wa-green)' }}>Your Name</label>
                                        {isEditing ? (
                                            <input
                                                type="text"
                                                value={displayName}
                                                onChange={(e) => setDisplayName(e.target.value)}
                                                className="w-full bg-transparent border-none outline-none text-base"
                                                style={{ color: 'var(--wa-text-primary)' }}
                                                placeholder="Enter your name"
                                            />
                                        ) : (
                                            <p style={{ color: 'var(--wa-text-primary)' }}>{userProfile?.displayName}</p>
                                        )}
                                    </div>
                                    {!isEditing && (
                                        <button onClick={() => setIsEditing(true)} style={{ color: 'var(--wa-green)' }}>
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                            </svg>
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* About Field */}
                            <div className="p-4 border-b" style={{ borderColor: 'var(--wa-border)' }}>
                                <label className="text-xs mb-1 block" style={{ color: 'var(--wa-green)' }}>About</label>
                                {isEditing ? (
                                    <input
                                        type="text"
                                        value={about}
                                        onChange={(e) => setAbout(e.target.value)}
                                        className="w-full bg-transparent border-none outline-none text-base"
                                        style={{ color: 'var(--wa-text-primary)' }}
                                        placeholder="Hey there! I am using WhatsApp."
                                    />
                                ) : (
                                    <p style={{ color: 'var(--wa-text-primary)' }}>{about || 'Hey there! I am using WhatsApp.'}</p>
                                )}
                            </div>

                            {/* Phone Field */}
                            <div className="p-4 border-b" style={{ borderColor: 'var(--wa-border)' }}>
                                <label className="text-xs mb-1 block" style={{ color: 'var(--wa-green)' }}>Phone</label>
                                {isEditing ? (
                                    <input
                                        type="tel"
                                        value={phoneNumber}
                                        onChange={(e) => setPhoneNumber(e.target.value)}
                                        className="w-full bg-transparent border-none outline-none text-base"
                                        style={{ color: 'var(--wa-text-primary)' }}
                                        placeholder="+1234567890"
                                    />
                                ) : (
                                    <p style={{ color: 'var(--wa-text-primary)' }}>{userProfile?.phoneNumber || 'Not set'}</p>
                                )}
                            </div>

                            {/* Username Field */}
                            <div className="p-4">
                                <label className="text-xs mb-1 block" style={{ color: 'var(--wa-green)' }}>Username</label>
                                {isEditing ? (
                                    <div className="flex items-center">
                                        <span style={{ color: 'var(--wa-text-secondary)' }}>@</span>
                                        <input
                                            type="text"
                                            value={username}
                                            onChange={(e) => setUsername(e.target.value.toLowerCase())}
                                            className="flex-1 bg-transparent border-none outline-none text-base ml-1"
                                            style={{ color: 'var(--wa-text-primary)' }}
                                            placeholder="username"
                                        />
                                    </div>
                                ) : (
                                    <p style={{ color: 'var(--wa-text-primary)' }}>@{userProfile?.username}</p>
                                )}
                            </div>
                        </div>

                        {/* Additional Info Card */}
                        <div
                            className="rounded-lg shadow-sm mb-4"
                            style={{ backgroundColor: 'var(--wa-bg-panel)' }}
                        >
                            {/* Email */}
                            <div className="p-4 border-b" style={{ borderColor: 'var(--wa-border)' }}>
                                <label className="text-xs mb-1 block" style={{ color: 'var(--wa-green)' }}>Email</label>
                                <p style={{ color: 'var(--wa-text-primary)' }}>{userProfile?.email}</p>
                                <p className="text-xs mt-1" style={{ color: 'var(--wa-text-secondary)' }}>Email cannot be changed</p>
                            </div>

                            {/* Location */}
                            <div className="p-4 border-b" style={{ borderColor: 'var(--wa-border)' }}>
                                <label className="text-xs mb-1 block" style={{ color: 'var(--wa-green)' }}>Default Location</label>
                                {isEditing ? (
                                    <input
                                        type="text"
                                        value={defaultLocation}
                                        onChange={(e) => setDefaultLocation(e.target.value)}
                                        className="w-full bg-transparent border-none outline-none text-base"
                                        style={{ color: 'var(--wa-text-primary)' }}
                                        placeholder="City, Country"
                                    />
                                ) : (
                                    <p style={{ color: 'var(--wa-text-primary)' }}>{userProfile?.defaultLocation || 'Not set'}</p>
                                )}
                            </div>

                            {/* Member Since */}
                            <div className="p-4">
                                <label className="text-xs mb-1 block" style={{ color: 'var(--wa-green)' }}>Member Since</label>
                                <p style={{ color: 'var(--wa-text-primary)' }}>
                                    {userProfile?.createdAt ? formatDate(userProfile.createdAt) : 'Unknown'}
                                </p>
                            </div>
                        </div>

                        {/* Edit Action Buttons */}
                        {isEditing && (
                            <div className="flex gap-3">
                                <button
                                    onClick={handleCancel}
                                    className="flex-1 py-3 rounded-lg font-medium transition-colors"
                                    style={{
                                        backgroundColor: 'var(--wa-bg-input)',
                                        color: 'var(--wa-text-primary)',
                                        border: '1px solid var(--wa-border)'
                                    }}
                                    disabled={loading}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSave}
                                    className="flex-1 py-3 rounded-lg font-medium transition-colors disabled:opacity-50"
                                    style={{ backgroundColor: 'var(--wa-green)', color: 'white' }}
                                    disabled={loading}
                                >
                                    {loading ? 'Saving...' : 'Save'}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

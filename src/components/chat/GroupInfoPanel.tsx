import { useState, useRef } from 'react';
import type { UserProfile, Chat } from '../../types';
import { compressImageToBase64, validateImageFile, formatBytes } from '../../utils/imageUtils';
import { updateGroupInfo } from '../../services/chatService';

interface GroupInfoPanelProps {
    chat: Chat;
    members: (UserProfile | null)[];
    currentUserId: string;
    onClose: () => void;
    onMakeAdmin?: (userId: string) => void;
    onRemoveMember?: (userId: string) => void;
    onGroupUpdated?: () => void; // Callback after photo update
}

export default function GroupInfoPanel({
    chat,
    members,
    currentUserId,
    onClose,
    onMakeAdmin,
    onRemoveMember,
    onGroupUpdated,
}: GroupInfoPanelProps) {
    const [showActions, setShowActions] = useState<string | null>(null);
    const [uploadingPhoto, setUploadingPhoto] = useState(false);
    const [compressionInfo, setCompressionInfo] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const photoInputRef = useRef<HTMLInputElement>(null);
    const isCurrentUserAdmin = chat.admins?.includes(currentUserId);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
            <div
                className="w-full max-w-md max-h-[80vh] flex flex-col rounded-xl shadow-2xl overflow-hidden"
                style={{ backgroundColor: 'var(--wa-bg-panel)' }}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: 'var(--wa-border)' }}>
                    <div className="flex items-center gap-3">
                        {/* Group Avatar - Clickable for admins */}
                        <input
                            ref={photoInputRef}
                            type="file"
                            accept="image/jpeg,image/png,image/gif,image/webp"
                            className="hidden"
                            onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                e.target.value = '';

                                const validation = validateImageFile(file);
                                if (!validation.valid) {
                                    setError(validation.error || 'Invalid file');
                                    return;
                                }

                                setUploadingPhoto(true);
                                setError(null);
                                setCompressionInfo(null);

                                try {
                                    // Compress image to Base64 for Firestore storage (FREE!)
                                    const compressed = await compressImageToBase64(file);

                                    if (compressed.wasCompressed) {
                                        setCompressionInfo(`Compressed from ${formatBytes(compressed.originalSize)} to ${formatBytes(compressed.compressedSize)}`);
                                        setTimeout(() => setCompressionInfo(null), 4000);
                                    }

                                    // Save Base64 directly to Firestore (no Firebase Storage needed!)
                                    await updateGroupInfo(chat.id, { groupPhoto: compressed.base64 });
                                    onGroupUpdated?.();
                                } catch (err) {
                                    console.error('Group photo upload error:', err);
                                    setError(err instanceof Error ? err.message : 'Failed to upload photo');
                                } finally {
                                    setUploadingPhoto(false);
                                }
                            }}
                        />
                        <div
                            className={`relative w-12 h-12 rounded-full flex items-center justify-center ${isCurrentUserAdmin ? 'cursor-pointer' : ''}`}
                            style={{ backgroundColor: 'var(--wa-green)' }}
                            onClick={() => isCurrentUserAdmin && photoInputRef.current?.click()}
                        >
                            {uploadingPhoto ? (
                                <div className="spinner w-6 h-6" />
                            ) : chat.groupPhoto ? (
                                <img src={chat.groupPhoto} alt={chat.groupName} className="w-full h-full rounded-full object-cover" />
                            ) : (
                                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M12 12.75c1.63 0 3.07.39 4.24.9 1.08.48 1.76 1.56 1.76 2.73V18H6v-1.61c0-1.18.68-2.26 1.76-2.73 1.17-.52 2.61-.91 4.24-.91zM4 13c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm1.13 1.1c-.37-.06-.74-.1-1.13-.1-.99 0-1.93.21-2.78.58A2.01 2.01 0 000 16.43V18h4.5v-1.61c0-.83.23-1.61.63-2.29zM20 13c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm4 3.43c0-.81-.48-1.53-1.22-1.85A6.95 6.95 0 0020 14c-.39 0-.76.04-1.13.1.4.68.63 1.46.63 2.29V18H24v-1.57zM12 6c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3z" />
                                </svg>
                            )}
                            {/* Camera overlay for admins */}
                            {isCurrentUserAdmin && !uploadingPhoto && (
                                <div className="absolute inset-0 rounded-full flex items-center justify-center bg-black/40 opacity-0 hover:opacity-100 transition-opacity">
                                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                </div>
                            )}
                        </div>
                        <div>
                            <h2 className="font-semibold" style={{ color: 'var(--wa-text-primary)' }}>
                                {chat.groupName}
                            </h2>
                            <p className="text-sm" style={{ color: 'var(--wa-text-secondary)' }}>
                                {members.length} members
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="icon-btn">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Error/Compression Toast */}
                {(error || compressionInfo) && (
                    <div
                        className="px-4 py-2 text-sm"
                        style={{
                            backgroundColor: error ? 'rgba(239, 68, 68, 0.1)' : 'rgba(34, 197, 94, 0.1)',
                            color: error ? '#ef4444' : '#22c55e'
                        }}
                    >
                        {error || compressionInfo}
                    </div>
                )}

                {/* Members List */}
                <div className="flex-1 overflow-y-auto p-2">
                    <h3 className="px-3 py-2 text-xs font-semibold uppercase" style={{ color: 'var(--wa-text-light)' }}>
                        Members
                    </h3>

                    {members.map((member) => {
                        if (!member) return null;
                        const isAdmin = chat.admins?.includes(member.uid);
                        const isSelf = member.uid === currentUserId;

                        return (
                            <div
                                key={member.uid}
                                className="flex items-center gap-3 px-3 py-2 rounded-lg transition-colors hover:bg-opacity-50"
                                style={{ backgroundColor: showActions === member.uid ? 'var(--wa-bg-hover)' : 'transparent' }}
                                onClick={() => !isSelf && isCurrentUserAdmin && setShowActions(showActions === member.uid ? null : member.uid)}
                            >
                                {/* Avatar */}
                                <div className="relative">
                                    <div
                                        className="w-10 h-10 rounded-full flex items-center justify-center"
                                        style={{ backgroundColor: 'var(--wa-bg-hover)' }}
                                    >
                                        {member.photoURL ? (
                                            <img src={member.photoURL} alt={member.displayName} className="w-full h-full rounded-full object-cover" />
                                        ) : (
                                            <svg className="w-5 h-5" fill="var(--wa-text-light)" viewBox="0 0 24 24">
                                                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                                            </svg>
                                        )}
                                    </div>
                                    {member.isOnline && (
                                        <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white"
                                            style={{ backgroundColor: 'var(--wa-green)' }} />
                                    )}
                                </div>

                                {/* Info */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <span className="font-medium truncate" style={{ color: 'var(--wa-text-primary)' }}>
                                            {member.displayName} {isSelf && '(You)'}
                                        </span>
                                        {isAdmin && (
                                            <span className="px-2 py-0.5 text-xs rounded-full"
                                                style={{ backgroundColor: 'var(--wa-green)', color: '#ffffff' }}>
                                                Admin
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-sm truncate" style={{ color: 'var(--wa-text-secondary)' }}>
                                        {member.defaultLocation || 'No location set'}
                                    </p>
                                </div>

                                {/* Action Menu */}
                                {showActions === member.uid && isCurrentUserAdmin && !isSelf && (
                                    <div className="flex gap-1">
                                        {!isAdmin && onMakeAdmin && (
                                            <button
                                                onClick={(e) => { e.stopPropagation(); onMakeAdmin(member.uid); setShowActions(null); }}
                                                className="px-2 py-1 text-xs rounded"
                                                style={{ backgroundColor: 'var(--wa-green)', color: '#ffffff' }}
                                            >
                                                Make Admin
                                            </button>
                                        )}
                                        {onRemoveMember && (
                                            <button
                                                onClick={(e) => { e.stopPropagation(); onRemoveMember(member.uid); setShowActions(null); }}
                                                className="px-2 py-1 text-xs rounded bg-red-500 text-white"
                                            >
                                                Remove
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* Footer */}
                <div className="p-4 border-t" style={{ borderColor: 'var(--wa-border)' }}>
                    <button
                        onClick={onClose}
                        className="w-full py-2 rounded-lg text-sm font-medium transition-colors"
                        style={{ backgroundColor: 'var(--wa-green)', color: '#ffffff' }}
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}

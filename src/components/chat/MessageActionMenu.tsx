/**
 * MessageActionMenu Component
 * 
 * WhatsApp-style message action menu with dropdown arrow.
 * Shows on hover (desktop) or via interaction (mobile).
 * Includes: Reply, Copy, Forward, Star, Pin, Delete, Select, Share + emoji reactions.
 */

import { useState, useRef, useEffect } from 'react';

interface MessageActionMenuProps {
    messageId: string;
    chatId: string;
    senderId: string;
    content: string;
    isOwn: boolean;
    isStarred?: boolean;
    isPinned?: boolean;
    onReply: () => void;
    onCopy: () => void;
    onForward: () => void;
    onStar: () => void;
    onPin: () => void;
    onDelete: () => void;
    onSelect: () => void;
    onReplyPrivately?: () => void; // For group chats only
    onReaction: (emoji: string) => void;
    onMoreEmojis?: () => void;
    onReminder?: () => void; // Set reminder for this message
    isGroupChat?: boolean;
}

const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

export default function MessageActionMenu({
    content,
    isOwn,
    isStarred = false,
    isPinned = false,
    onReply,
    onForward,
    onStar,
    onPin,
    onDelete,
    onSelect,
    onReplyPrivately,
    onReaction,
    onMoreEmojis,
    onReminder,
    isGroupChat = false
}: MessageActionMenuProps) {
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    // Close menu on outside click
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen]);

    const handleCopy = () => {
        navigator.clipboard.writeText(content);
        setIsOpen(false);
    };

    const menuItems = [
        { icon: 'reply', label: 'Reply', onClick: () => { onReply(); setIsOpen(false); } },
        { icon: 'copy', label: 'Copy', onClick: handleCopy },
        ...(isGroupChat && !isOwn ? [{ icon: 'reply-private', label: 'Reply privately', onClick: () => { onReplyPrivately?.(); setIsOpen(false); } }] : []),
        { icon: 'forward', label: 'Forward', onClick: () => { onForward(); setIsOpen(false); } },
        { icon: 'reminder', label: 'Set Reminder', onClick: () => { onReminder?.(); setIsOpen(false); } },
        { icon: 'star', label: isStarred ? 'Unstar' : 'Star', onClick: () => { onStar(); setIsOpen(false); } },
        { icon: 'pin', label: isPinned ? 'Unpin' : 'Pin', onClick: () => { onPin(); setIsOpen(false); } },
        { icon: 'delete', label: 'Delete', onClick: () => { onDelete(); setIsOpen(false); } },
        { icon: 'select', label: 'Select', onClick: () => { onSelect(); setIsOpen(false); } },
    ];

    const getIcon = (icon: string) => {
        switch (icon) {
            case 'reply':
                return (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                    </svg>
                );
            case 'copy':
                return (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                );
            case 'reply-private':
                return (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                );
            case 'forward':
                return (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                );
            case 'star':
                return (
                    <svg className="w-4 h-4" fill={isStarred ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                    </svg>
                );
            case 'pin':
                return (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                    </svg>
                );
            case 'delete':
                return (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                );
            case 'select':
                return (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                );
            case 'reminder':
                return (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                    </svg>
                );
            default:
                return null;
        }
    };

    return (
        <div ref={menuRef} className="absolute" style={{ [isOwn ? 'left' : 'right']: '-32px', top: '4px' }}>
            {/* Arrow dropdown button - shows on hover, positioned outside bubble */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`
                    opacity-0 group-hover:opacity-100 transition-opacity
                    w-7 h-7 flex items-center justify-center rounded-full
                    hover:bg-black/10 dark:hover:bg-white/10
                    z-20 shadow-sm
                `}
                style={{ backgroundColor: 'var(--wa-bg-panel)', color: 'var(--wa-icon)' }}
            >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </button>

            {/* Dropdown menu */}
            {isOpen && (
                <div
                    className={`
                        absolute ${isOwn ? 'right-0' : 'left-0'} top-8
                        min-w-[180px] py-2 rounded-lg shadow-xl z-50
                    `}
                    style={{
                        backgroundColor: 'var(--wa-bg-panel)',
                        border: '1px solid var(--wa-border)'
                    }}
                >
                    {/* Menu items */}
                    {menuItems.map((item, idx) => (
                        <button
                            key={idx}
                            onClick={item.onClick}
                            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                            style={{ color: item.label === 'Delete' ? '#f44336' : 'var(--wa-text-primary)' }}
                        >
                            {getIcon(item.icon)}
                            <span>{item.label}</span>
                        </button>
                    ))}

                    {/* Emoji reactions row */}
                    <div className="flex justify-center gap-2 px-3 py-2 border-t" style={{ borderColor: 'var(--wa-border)' }}>
                        {QUICK_REACTIONS.map(emoji => (
                            <button
                                key={emoji}
                                onClick={() => { onReaction(emoji); setIsOpen(false); }}
                                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-lg"
                            >
                                {emoji}
                            </button>
                        ))}
                        <button
                            onClick={() => { onMoreEmojis?.(); setIsOpen(false); }}
                            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                            style={{ color: 'var(--wa-icon)' }}
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                            </svg>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

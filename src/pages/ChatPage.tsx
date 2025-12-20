import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Sidebar } from '../components/layout';
import { DropdownMenu } from '../components/common';
import {
    getChatById,
    subscribeToChatMessages,
    sendMessage,
    markMessagesAsRead,
    markMessagesAsDelivered,
    setTypingStatus,
    subscribeToTypingStatus,
    makeGroupAdmin,
    removeGroupMember,
    deleteMessage,
    toggleMessageStar,
    toggleMessagePin
} from '../services/chatService';
import { uploadFile, validateFile } from '../services/fileService';
import { getUserById } from '../services/userService';
import EmojiPicker, { Theme } from 'emoji-picker-react';
import AIFeaturesPanel from '../components/chat/AIFeaturesPanel';
import ConversationSummaryModal from '../components/chat/ConversationSummaryModal';
import ScheduleMessageModal from '../components/chat/ScheduleMessageModal';
import SetReminderModal from '../components/chat/SetReminderModal';
import TripPlannerModal from '../components/chat/TripPlannerModal';
import TripPlannerFormModal from '../components/chat/TripPlannerFormModal';
import SmartRepliesPanel from '../components/chat/SmartRepliesPanel';
import GroupInfoPanel from '../components/chat/GroupInfoPanel';
import UserProfilePanel from '../components/chat/UserProfilePanel';
import MessageActionMenu from '../components/chat/MessageActionMenu';
import ForwardModal from '../components/chat/ForwardModal';
import AIRewriteModal from '../components/chat/AIRewriteModal';
import type { Chat, Message, UserProfile } from '../types';
import { formatFileSize } from '../services/fileService';

export default function ChatPage() {
    const { chatId } = useParams<{ chatId: string }>();
    const { userProfile } = useAuth();
    const navigate = useNavigate();

    const [chat, setChat] = useState<Chat | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [otherUser, setOtherUser] = useState<UserProfile | null>(null);
    const [newMessage, setNewMessage] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isSending, setIsSending] = useState(false);
    const [typingUsers, setTypingUsers] = useState<string[]>([]);
    const [isTyping, setIsTyping] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(true);

    // AI Features states
    const [showAIPanel, setShowAIPanel] = useState(false);
    const [showSummaryModal, setShowSummaryModal] = useState(false);
    const [showScheduleModal, setShowScheduleModal] = useState(false);
    const [showTripModal, setShowTripModal] = useState(false);
    const [conversationSummary, setConversationSummary] = useState('');
    const [tripPlan, setTripPlan] = useState('');
    const [importantMessageIds, setImportantMessageIds] = useState<string[]>([]);
    const [smartReplies, setSmartReplies] = useState<string[]>([]);
    const [groupParticipants, setGroupParticipants] = useState<Array<{ name: string; location: string }>>([]);
    const [groupMemberProfiles, setGroupMemberProfiles] = useState<Map<string, UserProfile>>(new Map());
    const [showGroupInfo, setShowGroupInfo] = useState(false);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [showTripForm, setShowTripForm] = useState(false);
    const [showChatMenu, setShowChatMenu] = useState(false);
    const [showUserProfile, setShowUserProfile] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [chatSearchQuery, setChatSearchQuery] = useState('');
    const [showSearch, setShowSearch] = useState(false);
    const [replyToMessage, setReplyToMessage] = useState<Message | null>(null);
    const [forwardMessage, setForwardMessage] = useState<Message | null>(null);
    const [showAIRewrite, setShowAIRewrite] = useState(false);
    const [showMoreEmojis, setShowMoreEmojis] = useState<{ messageId: string } | null>(null);
    const [showStarredOnly, setShowStarredOnly] = useState(false);
    const [compressionInfo, setCompressionInfo] = useState<string | null>(null);
    const [reminderMessage, setReminderMessage] = useState<Message | null>(null);

    // Filter messages based on search query and starred filter
    const filteredMessages = messages.filter(msg => {
        // Filter by starred
        if (showStarredOnly && !msg.starredBy?.includes(userProfile?.uid || '')) {
            return false;
        }
        // Filter by search query
        if (!chatSearchQuery.trim()) return true;
        return msg.content.toLowerCase().includes(chatSearchQuery.toLowerCase());
    });

    // Count starred messages for badge
    const starredCount = messages.filter(msg => msg.starredBy?.includes(userProfile?.uid || '')).length;

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const scrollToBottom = useCallback(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, []);

    useEffect(() => {
        scrollToBottom();
    }, [messages, scrollToBottom]);

    // Load chat data
    useEffect(() => {
        if (!chatId || !userProfile) return;

        const loadChat = async () => {
            setIsLoading(true);
            try {
                const chatData = await getChatById(chatId);
                if (!chatData) {
                    navigate('/');
                    return;
                }
                setChat(chatData);

                if (!chatData.isGroup) {
                    const otherUserId = chatData.participants.find(
                        (id) => id !== userProfile.uid
                    );
                    if (otherUserId) {
                        const userData = await getUserById(otherUserId);
                        setOtherUser(userData);
                    }
                } else {
                    // Load group participants for trip planner and sender names
                    const memberProfilesMap = new Map<string, UserProfile>();
                    const participantData: Array<{ name: string; location: string }> = [];

                    // Fetch all members in parallel
                    const memberPromises = chatData.participants.map(uid => getUserById(uid));
                    const members = await Promise.all(memberPromises);

                    members.forEach(user => {
                        if (user) {
                            memberProfilesMap.set(user.uid, user);
                            participantData.push({
                                name: user.displayName || 'Unknown',
                                location: user.defaultLocation || 'Location not set'
                            });
                        }
                    });

                    setGroupMemberProfiles(memberProfilesMap);
                    setGroupParticipants(participantData);
                }
            } catch (error) {
                console.error('Error loading chat:', error);
            } finally {
                setIsLoading(false);
            }
        };

        loadChat();
    }, [chatId, userProfile, navigate]);

    // Subscribe to messages
    useEffect(() => {
        if (!chatId) return;
        const unsubscribe = subscribeToChatMessages(chatId, (messageList) => {
            setMessages(messageList);
        });
        return () => unsubscribe();
    }, [chatId]);

    // Scroll to bottom when messages are loaded or new message arrives
    useEffect(() => {
        if (messages.length > 0 && messagesEndRef.current) {
            // Small delay to ensure DOM is updated
            const timeout = setTimeout(() => {
                messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
            }, 100);
            return () => clearTimeout(timeout);
        }
    }, [messages.length, chatId]);

    // Mark messages as delivered (double tick) then read (blue tick) when chat is opened
    useEffect(() => {
        if (!chatId || !userProfile?.uid) return;

        // First mark as delivered (for the sender's UI to show double tick)
        // Then mark as read (for the sender's UI to show blue tick, and reset our unread count)
        const markMessages = async () => {
            // Mark incoming messages as delivered first (shows double tick to sender)
            await markMessagesAsDelivered(chatId, userProfile.uid);
            // Then mark as read (shows blue tick to sender) and reset unread count
            await markMessagesAsRead(chatId, userProfile.uid);
        };

        const timeout = setTimeout(markMessages, 200);
        return () => clearTimeout(timeout);
    }, [chatId, userProfile?.uid, messages.length]);

    // Subscribe to typing status
    useEffect(() => {
        if (!chatId || !userProfile?.uid) return;
        const unsubscribe = subscribeToTypingStatus(chatId, userProfile.uid, (users) => {
            setTypingUsers(users);
        });
        return () => unsubscribe();
    }, [chatId, userProfile?.uid]);

    // Clear typing on unmount
    useEffect(() => {
        return () => {
            if (chatId && userProfile?.uid && isTyping) {
                setTypingStatus(chatId, userProfile.uid, false);
            }
        };
    }, [chatId, userProfile?.uid, isTyping]);

    const handleTyping = useCallback(() => {
        if (!chatId || !userProfile?.uid) return;
        if (!isTyping) {
            setIsTyping(true);
            setTypingStatus(chatId, userProfile.uid, true);
        }
        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
        }
        typingTimeoutRef.current = setTimeout(() => {
            setIsTyping(false);
            setTypingStatus(chatId, userProfile.uid, false);
        }, 2000);
    }, [chatId, userProfile?.uid, isTyping]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !chatId || !userProfile || isSending) return;

        if (isTyping && userProfile?.uid) {
            setIsTyping(false);
            setTypingStatus(chatId, userProfile.uid, false);
        }

        setIsSending(true);
        try {
            await sendMessage(chatId, userProfile.uid, newMessage.trim());
            setNewMessage('');
            inputRef.current?.focus();
        } catch (error) {
            console.error('Error sending message:', error);
        } finally {
            setIsSending(false);
        }
    };

    const formatTime = (date: Date) => {
        return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
    };

    const formatDate = (date: Date) => {
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        if (date.toDateString() === today.toDateString()) return 'Today';
        if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
        return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
    };

    // Group messages by date
    const groupedMessages: { date: string; messages: Message[] }[] = [];
    filteredMessages.forEach((message) => {
        const dateStr = message.timestamp.toDateString();
        const lastGroup = groupedMessages[groupedMessages.length - 1];
        if (lastGroup && lastGroup.date === dateStr) {
            lastGroup.messages.push(message);
        } else {
            groupedMessages.push({ date: dateStr, messages: [message] });
        }
    });

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--wa-bg-app)' }}>
                <div className="spinner w-10 h-10" />
            </div>
        );
    }

    return (
        <div className="h-screen flex overflow-hidden" style={{ backgroundColor: 'var(--wa-bg-chat)' }}>
            {/* Sidebar - visible on desktop, has its own scroll */}
            <div className="hidden sm:block h-full overflow-hidden">
                <Sidebar
                    isOpen={sidebarOpen}
                    onClose={() => setSidebarOpen(false)}
                    selectedChatId={chatId}
                />
            </div>

            {/* Chat Area - flex column with fixed header/footer */}
            <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
                {/* Chat Header */}
                <header className="wa-header h-[60px] flex items-center px-4 flex-shrink-0 relative z-20" style={{ borderBottom: '1px solid var(--wa-border)' }}>
                    {showSearch ? (
                        <div className="flex-1 flex items-center gap-4 animate-fade-in w-full">
                            <button onClick={() => { setShowSearch(false); setChatSearchQuery(''); }} className="icon-btn">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                                </svg>
                            </button>
                            <div className="flex-1 relative">
                                <input
                                    type="text"
                                    value={chatSearchQuery}
                                    onChange={(e) => setChatSearchQuery(e.target.value)}
                                    placeholder="Search in chat..."
                                    autoFocus
                                    className="w-full rounded-lg px-4 py-2 text-sm focus:outline-none"
                                    style={{ backgroundColor: 'var(--wa-bg-input)', color: 'var(--wa-text-primary)' }}
                                />
                            </div>
                            <span className="text-xs whitespace-nowrap" style={{ color: 'var(--wa-text-light)' }}>
                                {filteredMessages.length} matches
                            </span>
                        </div>
                    ) : (
                        <>
                            <div className="flex items-center gap-3 flex-1 overflow-hidden">
                                {/* Back button - mobile only */}
                                <Link to="/" className="sm:hidden icon-btn flex-shrink-0">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                    </svg>
                                </Link>

                                {/* User/Group Avatar */}
                                <div className="relative flex-shrink-0">
                                    <div className="w-10 h-10 rounded-full overflow-hidden flex items-center justify-center" style={{ backgroundColor: 'var(--wa-icon)' }}>
                                        {chat?.isGroup ? (
                                            chat.groupPhoto ? (
                                                <img src={chat.groupPhoto} alt="" className="w-full h-full object-cover" />
                                            ) : (
                                                <svg className="w-5 h-5" fill="var(--wa-bg-panel)" viewBox="0 0 24 24">
                                                    <path d="M12 12.75c1.63 0 3.07.39 4.24.9 1.08.48 1.76 1.56 1.76 2.73V18H6v-1.61c0-1.18.68-2.26 1.76-2.73 1.17-.52 2.61-.91 4.24-.91z" />
                                                </svg>
                                            )
                                        ) : otherUser?.photoURL ? (
                                            <img src={otherUser.photoURL} alt="" className="w-full h-full object-cover" />
                                        ) : (
                                            <span className="text-lg font-medium" style={{ color: 'var(--wa-bg-panel)' }}>
                                                {otherUser?.displayName?.charAt(0).toUpperCase() || '?'}
                                            </span>
                                        )}
                                    </div>
                                    {!chat?.isGroup && otherUser?.isOnline && (
                                        <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full" style={{ backgroundColor: 'var(--wa-green)', border: '2px solid var(--wa-bg-header)' }} />
                                    )}
                                </div>

                                {/* User Info - Clickable for group info */}
                                <div
                                    className={`flex-1 min-w-0 ${chat?.isGroup ? 'cursor-pointer' : ''}`}
                                    onClick={() => chat?.isGroup && setShowGroupInfo(true)}
                                >
                                    <h1 className="font-medium truncate" style={{ color: 'var(--wa-text-primary)' }}>
                                        {chat?.isGroup ? chat.groupName : otherUser?.displayName || 'Unknown User'}
                                    </h1>
                                    <p className="text-sm truncate" style={{ color: 'var(--wa-text-secondary)' }}>
                                        {typingUsers.length > 0 ? (
                                            <span style={{ color: 'var(--wa-green)' }}>typing...</span>
                                        ) : chat?.isGroup ? (
                                            `${chat.participants.length} members`
                                        ) : otherUser?.isOnline ? (
                                            <span style={{ color: 'var(--wa-green)' }}>Online</span>
                                        ) : (
                                            `Last seen ${otherUser?.lastSeen ? formatTime(otherUser.lastSeen) : 'recently'}`
                                        )}
                                    </p>
                                </div>
                            </div>

                            {/* Header actions */}
                            <div className="flex items-center gap-1 relative">
                                {/* AI Features Button */}
                                <button
                                    className="icon-btn"
                                    onClick={() => setShowAIPanel(!showAIPanel)}
                                    title="AI Features"
                                    style={{ color: showAIPanel ? 'var(--wa-green)' : undefined }}
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                    </svg>
                                </button>

                                {/* AI Features Panel */}
                                {showAIPanel && chatId && userProfile && (
                                    <AIFeaturesPanel
                                        chatId={chatId}
                                        messages={messages}
                                        isGroup={chat?.isGroup || false}
                                        currentUserId={userProfile.uid}
                                        participants={groupParticipants}
                                        onClose={() => setShowAIPanel(false)}
                                        onSummaryGenerated={(summary) => {
                                            setConversationSummary(summary);
                                            setShowSummaryModal(true);
                                        }}
                                        onImportantMessagesDetected={(ids) => {
                                            setImportantMessageIds(ids);
                                        }}
                                        onTripPlanGenerated={(plan) => {
                                            setTripPlan(plan);
                                            setShowTripModal(true);
                                        }}
                                        onSmartRepliesGenerated={(replies) => {
                                            setSmartReplies(replies);
                                        }}
                                        onScheduleMessage={() => {
                                            setShowAIPanel(false);
                                            setShowScheduleModal(true);
                                        }}
                                        onOpenTripForm={() => {
                                            setShowAIPanel(false);
                                            setShowTripForm(true);
                                        }}
                                    />
                                )}

                                {/* Call Button - Coming Soon */}
                                <button
                                    className="icon-btn opacity-50 cursor-not-allowed"
                                    title="Voice/Video Call (Coming Soon)"
                                    disabled
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                    </svg>
                                </button>

                                <button
                                    className="icon-btn"
                                    onClick={() => setShowSearch(true)}
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                    </svg>
                                </button>
                                <div className="relative">
                                    <button
                                        className="icon-btn"
                                        onClick={() => setShowChatMenu(!showChatMenu)}
                                    >
                                        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                                            <path d="M12 7a2 2 0 1 0-.001-4.001A2 2 0 0 0 12 7zm0 2a2 2 0 1 0-.001 3.999A2 2 0 0 0 12 9zm0 6a2 2 0 1 0-.001 3.999A2 2 0 0 0 12 15z" />
                                        </svg>
                                    </button>
                                    <DropdownMenu
                                        isOpen={showChatMenu}
                                        onClose={() => setShowChatMenu(false)}
                                        items={[
                                            {
                                                label: chat?.isGroup ? 'Group Info' : 'View Contact',
                                                icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>,
                                                onClick: () => {
                                                    setShowChatMenu(false);
                                                    chat?.isGroup ? setShowGroupInfo(true) : setShowUserProfile(true);
                                                }
                                            },
                                            {
                                                label: showStarredOnly ? 'Show All Messages' : `Starred Messages${starredCount > 0 ? ` (${starredCount})` : ''}`,
                                                icon: <svg className="w-5 h-5" fill={showStarredOnly ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" /></svg>,
                                                onClick: () => {
                                                    setShowChatMenu(false);
                                                    setShowStarredOnly(!showStarredOnly);
                                                }
                                            },
                                            {
                                                label: 'Search in Chat',
                                                icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>,
                                                onClick: () => {
                                                    setShowChatMenu(false);
                                                    setShowSearch(true);
                                                }
                                            },
                                            {
                                                label: 'Mute Notifications',
                                                icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" /></svg>,
                                                onClick: () => { setShowChatMenu(false); /* TODO: Implement mute */ }
                                            },
                                            {
                                                label: 'Clear Chat',
                                                icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>,
                                                onClick: () => { setShowChatMenu(false); /* TODO: Implement clear */ },
                                                danger: true
                                            }
                                        ]}
                                    />
                                </div>
                            </div>
                        </>
                    )}
                </header>

                {/* Messages Area */}
                <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2 chat-bg-pattern" style={{ backgroundColor: 'var(--wa-bg-chat)' }}>
                    {groupedMessages.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-center">
                            <p style={{ color: 'var(--wa-text-light)' }}>No messages yet. Say hello!</p>
                        </div>
                    ) : (
                        groupedMessages.map((group, groupIndex) => (
                            <div key={groupIndex}>
                                {/* Date separator */}
                                <div className="flex justify-center mb-4">
                                    <span className="px-3 py-1 rounded-lg text-xs" style={{ backgroundColor: 'var(--wa-bg-message-in)', color: 'var(--wa-text-secondary)' }}>
                                        {formatDate(new Date(group.date))}
                                    </span>
                                </div>

                                {/* Messages */}
                                {group.messages.map((message, messageIndex) => {
                                    const isOwn = message.senderId === userProfile?.uid;
                                    const isImportant = importantMessageIds.includes(message.id);
                                    const hasReactions = message.reactions && Object.keys(message.reactions).length > 0;

                                    // Check if previous message in this group was from same sender
                                    const isFirstInSequence = messageIndex === 0 || group.messages[messageIndex - 1].senderId !== message.senderId;
                                    // Check if next message is from same sender (for border radius adjustment)
                                    const isLastInSequence = messageIndex === group.messages.length - 1 || group.messages[messageIndex + 1].senderId !== message.senderId;

                                    return (
                                        <div key={message.id} className={`flex ${isLastInSequence ? 'mb-2' : 'mb-0.5'} ${isOwn ? 'justify-end' : 'justify-start'}`}>
                                            <div className="relative group max-w-[65%]">
                                                {/* Message Action Menu - shows arrow on hover */}
                                                <MessageActionMenu
                                                    messageId={message.id}
                                                    chatId={chatId ?? ''}
                                                    senderId={message.senderId}
                                                    content={message.content}
                                                    isOwn={isOwn}
                                                    isGroupChat={chat?.isGroup}
                                                    isStarred={message.starredBy?.includes(userProfile?.uid || '')}
                                                    isPinned={message.isPinned}
                                                    onReply={() => {
                                                        setReplyToMessage(message);
                                                        inputRef.current?.focus();
                                                    }}
                                                    onCopy={() => {
                                                        navigator.clipboard.writeText(message.content);
                                                        alert('Message copied to clipboard!');
                                                    }}
                                                    onForward={() => {
                                                        setForwardMessage(message);
                                                    }}
                                                    onStar={async () => {
                                                        if (chatId && userProfile?.uid) {
                                                            await toggleMessageStar(chatId, message.id, userProfile.uid);
                                                        }
                                                    }}
                                                    onPin={async () => {
                                                        if (chatId) {
                                                            await toggleMessagePin(chatId, message.id);
                                                        }
                                                    }}
                                                    onDelete={async () => {
                                                        if (chatId && confirm('Delete this message?')) {
                                                            await deleteMessage(chatId, message.id, isOwn);
                                                        }
                                                    }}
                                                    onSelect={() => {
                                                        // For now, just copy the message
                                                        navigator.clipboard.writeText(message.content);
                                                    }}
                                                    onReplyPrivately={async () => {
                                                        // Navigate to private chat with sender if in group
                                                        if (chat?.isGroup && message.senderId !== userProfile?.uid) {
                                                            const { getOrCreateChat } = await import('../services/chatService');
                                                            const privateChatId = await getOrCreateChat(userProfile?.uid || '', message.senderId);
                                                            navigate(`/chat/${privateChatId}`);
                                                        }
                                                    }}
                                                    onReaction={async (emoji) => {
                                                        if (chatId && userProfile?.uid) {
                                                            const { toggleMessageReaction } = await import('../services/chatService');
                                                            await toggleMessageReaction(chatId, message.id, userProfile.uid, emoji);
                                                        }
                                                    }}
                                                    onMoreEmojis={() => setShowMoreEmojis({ messageId: message.id })}
                                                    onReminder={() => setReminderMessage(message)}
                                                />

                                                <div
                                                    className={`
                                                        relative px-2 py-1 shadow-sm text-[14.2px] leading-[19px] break-words
                                                        ${isOwn
                                                            ? `bg-[#d9fdd3] dark:bg-[#005c4b] ml-auto rounded-lg ${isFirstInSequence ? 'rounded-tr-none' : ''}`
                                                            : `bg-white dark:bg-[#202c33] rounded-lg ${isFirstInSequence ? 'rounded-tl-none' : ''}`
                                                        }
                                                        ${isImportant ? 'ring-2 ring-yellow-500' : ''}
                                                    `}
                                                    style={{
                                                        boxShadow: '0 1px 0.5px rgba(11, 20, 26, 0.13)',
                                                        color: 'var(--wa-text-primary)'
                                                    }}
                                                >
                                                    {isImportant && (
                                                        <div className="flex items-center gap-1 mb-1 text-yellow-500 text-xs">
                                                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                                                                <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
                                                            </svg>
                                                            Important
                                                        </div>
                                                    )}
                                                    {/* Sender name for group chats - Only show on first message of sequence */}
                                                    {chat?.isGroup && !isOwn && isFirstInSequence && (
                                                        <p className="text-[12.8px] font-medium mb-1 leading-4" style={{ color: 'var(--wa-green)' }}>
                                                            {groupMemberProfiles.get(message.senderId)?.displayName || 'Unknown'}
                                                        </p>
                                                    )}

                                                    <span className="whitespace-pre-wrap">{message.content}</span>

                                                    {/* Time & Status - Float right bottom */}
                                                    <span className="float-right ml-2 mt-1 flex items-center gap-1 opacity-70" style={{ fontSize: '11px', height: '15px' }}>
                                                        {/* Star indicator */}
                                                        {message.starredBy?.includes(userProfile?.uid || '') && (
                                                            <svg className="w-3 h-3 text-yellow-500" fill="currentColor" viewBox="0 0 24 24">
                                                                <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
                                                            </svg>
                                                        )}
                                                        <span className="translate-y-px">
                                                            {formatTime(message.timestamp)}
                                                        </span>
                                                        {isOwn && (
                                                            <span style={{ color: message.status === 'read' ? '#53bdeb' : 'inherit' }}>
                                                                {message.status === 'read' || message.status === 'delivered' ? (
                                                                    <svg className="w-[16px] h-[16px]" viewBox="0 0 24 24" fill="currentColor">
                                                                        <path d="M18 7l-1.41-1.41-6.34 6.34 1.41 1.41L18 7zm4.24-1.41L11.66 16.17 7.48 12l-1.41 1.41L11.66 19l12-12-1.42-1.41zM.41 13.41L6 19l1.41-1.41L1.83 12 .41 13.41z" />
                                                                    </svg>
                                                                ) : (
                                                                    <svg className="w-[16px] h-[16px]" viewBox="0 0 24 24" fill="currentColor">
                                                                        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
                                                                    </svg>
                                                                )}
                                                            </span>
                                                        )}
                                                    </span>
                                                </div>

                                                {/* Display reactions */}
                                                {hasReactions && (
                                                    <div
                                                        className={`flex gap-1 mt-[-8px] relative z-10 ${isOwn ? 'justify-end' : 'justify-start'} px-2`}
                                                    >
                                                        {Object.entries(message.reactions || {}).map(([emoji, users]) => (
                                                            <span
                                                                key={emoji}
                                                                className="px-1.5 py-0.5 rounded-full text-xs flex items-center gap-0.5 shadow-sm cursor-pointer hover:bg-gray-50"
                                                                style={{ backgroundColor: 'var(--wa-bg-panel)', border: '1px solid var(--wa-border)' }}
                                                            >
                                                                {emoji} {users.length > 1 && users.length}
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ))
                    )}

                    {/* Typing indicator */}
                    {typingUsers.length > 0 && (
                        <div className="flex justify-start mb-2">
                            <div className="message-in px-4 py-3">
                                <div className="flex gap-1">
                                    <span className="w-2 h-2 rounded-full animate-bounce" style={{ backgroundColor: 'var(--wa-text-light)', animationDelay: '0ms' }} />
                                    <span className="w-2 h-2 rounded-full animate-bounce" style={{ backgroundColor: 'var(--wa-text-light)', animationDelay: '150ms' }} />
                                    <span className="w-2 h-2 rounded-full animate-bounce" style={{ backgroundColor: 'var(--wa-text-light)', animationDelay: '300ms' }} />
                                </div>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Compression Info Toast */}
                {compressionInfo && (
                    <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 px-4 py-2 rounded-lg text-sm text-white shadow-lg z-50" style={{ backgroundColor: 'var(--wa-green)' }}>
                        {compressionInfo}
                    </div>
                )}

                {/* Message Input */}
                <form onSubmit={handleSendMessage} className="wa-header p-3 flex-shrink-0 relative" style={{ borderTop: '1px solid var(--wa-border)' }}>
                    {/* Reply Preview Bar - WhatsApp style */}
                    {replyToMessage && (
                        <div
                            className="flex items-center gap-3 px-3 py-2 mb-2 rounded-lg"
                            style={{
                                backgroundColor: 'var(--wa-bg-input)',
                                borderLeft: '4px solid var(--wa-green)'
                            }}
                        >
                            <div className="flex-1 min-w-0">
                                <p className="text-xs font-medium" style={{ color: 'var(--wa-green)' }}>
                                    {replyToMessage.senderId === userProfile?.uid
                                        ? 'You'
                                        : (groupMemberProfiles.get(replyToMessage.senderId)?.displayName || otherUser?.displayName || 'Unknown')}
                                </p>
                                <p className="text-sm truncate" style={{ color: 'var(--wa-text-secondary)' }}>
                                    {replyToMessage.content}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setReplyToMessage(null)}
                                className="flex-shrink-0 p-1 rounded-full hover:bg-black/10"
                                style={{ color: 'var(--wa-icon)' }}
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                    )}

                    {/* Emoji Picker */}
                    {showEmojiPicker && (
                        <div className="absolute bottom-16 left-4 z-50">
                            <EmojiPicker
                                theme={Theme.DARK}
                                onEmojiClick={(emojiData) => {
                                    setNewMessage(prev => prev + emojiData.emoji);
                                    inputRef.current?.focus();
                                }}
                                width={300}
                                height={350}
                            />
                        </div>
                    )}

                    <div className="flex items-center gap-2">
                        {/* Emoji */}
                        <button
                            type="button"
                            className="icon-btn"
                            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                            style={{ color: showEmojiPicker ? 'var(--wa-green)' : undefined }}
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </button>

                        {/* Attachment */}
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*,.txt"
                            className="hidden"
                            onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (!file || !chatId || !userProfile) return;

                                const validationError = validateFile(file);
                                if (validationError) {
                                    alert(validationError.message);
                                    return;
                                }

                                setIsUploading(true);
                                setCompressionInfo(null);
                                try {
                                    const result = await uploadFile(file, chatId, userProfile.uid);

                                    // Show compression feedback for images
                                    if (result.fileType === 'image' && result.originalSize > result.fileSize) {
                                        const savings = formatFileSize(result.originalSize - result.fileSize);
                                        setCompressionInfo(`Compressed from ${formatFileSize(result.originalSize)} to ${formatFileSize(result.fileSize)} (saved ${savings})`);
                                        setTimeout(() => setCompressionInfo(null), 4000);
                                    }

                                    await sendMessage(
                                        chatId,
                                        userProfile.uid,
                                        result.fileType === 'image' ? '📷 Photo' : `📎 ${result.fileName}`,
                                        result.fileType,
                                        result.url,
                                        result.fileName,
                                        result.fileSize
                                    );
                                } catch (err) {
                                    console.error('Upload failed:', err);
                                    alert(err instanceof Error ? err.message : 'Upload failed');
                                } finally {
                                    setIsUploading(false);
                                    e.target.value = '';
                                }
                            }}
                        />
                        <button
                            type="button"
                            className="icon-btn"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isUploading}
                            title="Attach file (max 5MB)"
                        >
                            {isUploading ? (
                                <div className="spinner w-6 h-6" />
                            ) : (
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                                </svg>
                            )}
                        </button>

                        {/* AI Rewrite Button */}
                        <button
                            type="button"
                            className="icon-btn"
                            onClick={() => setShowAIRewrite(true)}
                            disabled={!newMessage.trim()}
                            title="Rewrite with AI"
                            style={{ opacity: newMessage.trim() ? 1 : 0.5 }}
                        >
                            <span className="text-lg">✨</span>
                        </button>

                        {/* Input */}
                        <input
                            ref={inputRef}
                            type="text"
                            value={newMessage}
                            onChange={(e) => { setNewMessage(e.target.value); handleTyping(); }}
                            placeholder="Type a message"
                            className="flex-1 rounded-lg px-4 py-2.5 focus:outline-none"
                            style={{ backgroundColor: 'var(--wa-bg-input)', color: 'var(--wa-text-primary)', border: '1px solid var(--wa-border)' }}
                        />

                        {/* Send */}
                        <button
                            type="submit"
                            disabled={!newMessage.trim() || isSending}
                            className="w-12 h-12 rounded-full flex items-center justify-center transition-all disabled:opacity-50 hover:opacity-90 active:scale-95"
                            style={{ backgroundColor: 'var(--wa-green)' }}
                        >
                            {isSending ? (
                                <div className="spinner w-5 h-5" />
                            ) : (
                                <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                                </svg>
                            )}
                        </button>
                    </div>
                </form>

                {/* Smart Replies Panel */}
                {smartReplies.length > 0 && (
                    <SmartRepliesPanel
                        replies={smartReplies}
                        onSelectReply={(reply) => {
                            setNewMessage(reply);
                            setSmartReplies([]);
                            inputRef.current?.focus();
                        }}
                        onClose={() => setSmartReplies([])}
                    />
                )}
            </div>

            {/* AI Modals */}
            {showSummaryModal && conversationSummary && (
                <ConversationSummaryModal
                    summary={conversationSummary}
                    onClose={() => {
                        setShowSummaryModal(false);
                        setConversationSummary('');
                    }}
                />
            )}

            <ScheduleMessageModal
                isOpen={showScheduleModal}
                onClose={() => setShowScheduleModal(false)}
                chatId={chatId}
                senderId={userProfile?.uid}
                recipientName={chat?.isGroup ? chat.groupName : otherUser?.displayName}
            />

            {showTripModal && tripPlan && (
                <TripPlannerModal
                    tripPlan={tripPlan}
                    onClose={() => {
                        setShowTripModal(false);
                        setTripPlan('');
                    }}
                />
            )}

            {/* Group Info Panel */}
            {showGroupInfo && chat && userProfile && (
                <GroupInfoPanel
                    chat={chat}
                    members={Array.from(groupMemberProfiles.values())}
                    currentUserId={userProfile.uid}
                    onClose={() => setShowGroupInfo(false)}
                    onMakeAdmin={async (userId) => {
                        if (chatId) {
                            await makeGroupAdmin(chatId, userId);
                            // Refresh chat to get updated admin list
                            const updatedChat = await getChatById(chatId);
                            if (updatedChat) setChat(updatedChat);
                        }
                    }}
                    onRemoveMember={async (userId) => {
                        if (chatId) {
                            await removeGroupMember(chatId, userId);
                            // Refresh chat and members
                            const updatedChat = await getChatById(chatId);
                            if (updatedChat) {
                                setChat(updatedChat);
                                setGroupMemberProfiles(prev => {
                                    const newMap = new Map(prev);
                                    newMap.delete(userId);
                                    return newMap;
                                });
                            }
                        }
                    }}
                />
            )}

            {/* Trip Planner Form Modal */}
            <TripPlannerFormModal
                isOpen={showTripForm}
                onClose={() => setShowTripForm(false)}
                participants={groupParticipants}
                onPlanGenerated={(plan) => {
                    setTripPlan(plan);
                    setShowTripModal(true);
                }}
            />

            {/* User Profile Panel */}
            <UserProfilePanel
                user={otherUser}
                isOpen={showUserProfile}
                onClose={() => setShowUserProfile(false)}
            />

            {/* Forward Modal */}
            <ForwardModal
                isOpen={!!forwardMessage}
                messageContent={forwardMessage?.content || ''}
                onClose={() => setForwardMessage(null)}
                onForward={async (toChatId) => {
                    if (forwardMessage && userProfile?.uid) {
                        await sendMessage(toChatId, userProfile.uid, forwardMessage.content);
                        setForwardMessage(null);
                        alert('Message forwarded!');
                    }
                }}
            />

            {/* AI Rewrite Modal */}
            <AIRewriteModal
                isOpen={showAIRewrite}
                originalMessage={newMessage}
                onClose={() => setShowAIRewrite(false)}
                onRewrite={(rewrittenMessage) => {
                    setNewMessage(rewrittenMessage);
                    inputRef.current?.focus();
                }}
            />

            {/* Set Reminder Modal */}
            <SetReminderModal
                isOpen={!!reminderMessage}
                onClose={() => setReminderMessage(null)}
                messageId={reminderMessage?.id || ''}
                messageContent={reminderMessage?.content || ''}
                chatId={chatId || ''}
                chatName={chat?.isGroup ? chat.groupName : otherUser?.displayName}
                userId={userProfile?.uid || ''}
            />

            {/* Full Emoji Picker for + button in reactions */}
            {showMoreEmojis && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowMoreEmojis(null)}>
                    <div onClick={(e) => e.stopPropagation()}>
                        <EmojiPicker
                            theme={Theme.DARK}
                            onEmojiClick={async (emojiData) => {
                                if (showMoreEmojis && chatId && userProfile?.uid) {
                                    const { toggleMessageReaction } = await import('../services/chatService');
                                    await toggleMessageReaction(chatId, showMoreEmojis.messageId, userProfile.uid, emojiData.emoji);
                                    setShowMoreEmojis(null);
                                }
                            }}
                            width={350}
                            height={400}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}

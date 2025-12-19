import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Sidebar } from '../components/layout';
import {
    getChatById,
    subscribeToChatMessages,
    sendMessage,
    markMessagesAsRead,
    setTypingStatus,
    subscribeToTypingStatus,
    makeGroupAdmin,
    removeGroupMember
} from '../services/chatService';
import { getUserById } from '../services/userService';
import EmojiPicker, { Theme } from 'emoji-picker-react';
import AIFeaturesPanel from '../components/chat/AIFeaturesPanel';
import ConversationSummaryModal from '../components/chat/ConversationSummaryModal';
import ScheduleMessageModal from '../components/chat/ScheduleMessageModal';
import TripPlannerModal from '../components/chat/TripPlannerModal';
import TripPlannerFormModal from '../components/chat/TripPlannerFormModal';
import SmartRepliesPanel from '../components/chat/SmartRepliesPanel';
import GroupInfoPanel from '../components/chat/GroupInfoPanel';
import type { Chat, Message, UserProfile } from '../types';

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

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
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

                    for (const uid of chatData.participants) {
                        const user = await getUserById(uid);
                        if (user) {
                            memberProfilesMap.set(uid, user);
                            participantData.push({
                                name: user.displayName || 'Unknown',
                                location: user.defaultLocation || 'Location not set'
                            });
                        }
                    }
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

    // Mark messages as read
    useEffect(() => {
        if (!chatId || !userProfile?.uid || messages.length === 0) return;
        const timeout = setTimeout(() => {
            markMessagesAsRead(chatId, userProfile.uid);
        }, 500);
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
    messages.forEach((message) => {
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
                <header className="wa-header h-[60px] flex items-center px-4 flex-shrink-0" style={{ borderBottom: '1px solid var(--wa-border)' }}>
                    <div className="flex items-center gap-3 flex-1">
                        {/* Back button - mobile only */}
                        <Link to="/" className="sm:hidden icon-btn">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                        </Link>

                        {/* User/Group Avatar */}
                        <div className="relative">
                            <div className="w-10 h-10 rounded-full overflow-hidden flex items-center justify-center" style={{ backgroundColor: 'var(--wa-icon)' }}>
                                {chat?.isGroup ? (
                                    <svg className="w-5 h-5" fill="var(--wa-bg-panel)" viewBox="0 0 24 24">
                                        <path d="M12 12.75c1.63 0 3.07.39 4.24.9 1.08.48 1.76 1.56 1.76 2.73V18H6v-1.61c0-1.18.68-2.26 1.76-2.73 1.17-.52 2.61-.91 4.24-.91z" />
                                    </svg>
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

                        <button className="icon-btn">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </button>
                        <button className="icon-btn">
                            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 7a2 2 0 1 0-.001-4.001A2 2 0 0 0 12 7zm0 2a2 2 0 1 0-.001 3.999A2 2 0 0 0 12 9zm0 6a2 2 0 1 0-.001 3.999A2 2 0 0 0 12 15z" />
                            </svg>
                        </button>
                    </div>
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
                                {group.messages.map((message) => {
                                    const isOwn = message.senderId === userProfile?.uid;
                                    const isImportant = importantMessageIds.includes(message.id);
                                    return (
                                        <div key={message.id} className={`flex mb-1 ${isOwn ? 'justify-end' : 'justify-start'}`}>
                                            <div
                                                className={`${isOwn ? 'message-out' : 'message-in'} ${isImportant ? 'ring-2 ring-yellow-500' : ''}`}
                                            >
                                                {isImportant && (
                                                    <div className="flex items-center gap-1 mb-1 text-yellow-500 text-xs">
                                                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                                                            <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
                                                        </svg>
                                                        Important
                                                    </div>
                                                )}
                                                {/* Sender name for group chats */}
                                                {chat?.isGroup && !isOwn && (
                                                    <p className="text-xs font-semibold mb-1" style={{ color: 'var(--wa-green)' }}>
                                                        {groupMemberProfiles.get(message.senderId)?.displayName || 'Unknown'}
                                                    </p>
                                                )}
                                                <p className="break-words">{message.content}</p>
                                                <div className={`flex items-center gap-1 mt-1 ${isOwn ? 'justify-end' : 'justify-start'}`}>
                                                    <span className="text-xs" style={{ color: 'var(--wa-text-light)' }}>
                                                        {formatTime(message.timestamp)}
                                                    </span>
                                                    {isOwn && (
                                                        <span style={{ color: message.status === 'read' ? '#53bdeb' : 'var(--wa-text-light)' }}>
                                                            {message.status === 'read' || message.status === 'delivered' ? (
                                                                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                                                                    <path d="M18 7l-1.41-1.41-6.34 6.34 1.41 1.41L18 7zm4.24-1.41L11.66 16.17 7.48 12l-1.41 1.41L11.66 19l12-12-1.42-1.41zM.41 13.41L6 19l1.41-1.41L1.83 12 .41 13.41z" />
                                                                </svg>
                                                            ) : (
                                                                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                                                                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
                                                                </svg>
                                                            )}
                                                        </span>
                                                    )}
                                                </div>
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

                {/* Message Input */}
                <form onSubmit={handleSendMessage} className="wa-header p-3 flex-shrink-0 relative" style={{ borderTop: '1px solid var(--wa-border)' }}>
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
                        <button type="button" className="icon-btn">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                            </svg>
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
                            className="p-2 rounded-full transition-colors disabled:opacity-50"
                            style={{ backgroundColor: 'var(--wa-green)', color: '#ffffff' }}
                        >
                            {isSending ? (
                                <div className="spinner w-6 h-6" />
                            ) : (
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
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
        </div>
    );
}

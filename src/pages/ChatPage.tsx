import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
    getChatById,
    subscribeToChatMessages,
    sendMessage,
    markMessagesAsRead,
    setTypingStatus,
    subscribeToTypingStatus
} from '../services/chatService';
import { getUserById } from '../services/userService';
import { AIPanel, ScheduleMessageModal } from '../components/chat';
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
    const [showAIPanel, setShowAIPanel] = useState(false);
    const [showScheduleModal, setShowScheduleModal] = useState(false);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Scroll to bottom when messages change
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

                // Get other user info for 1:1 chats
                if (!chatData.isGroup) {
                    const otherUserId = chatData.participants.find(
                        (id) => id !== userProfile.uid
                    );
                    if (otherUserId) {
                        const userData = await getUserById(otherUserId);
                        setOtherUser(userData);
                    }
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

    // Mark messages as read when viewing chat
    useEffect(() => {
        if (!chatId || !userProfile?.uid || messages.length === 0) return;

        // Mark as read after a short delay to ensure visibility
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

    // Clear typing status when leaving the page
    useEffect(() => {
        return () => {
            if (chatId && userProfile?.uid && isTyping) {
                setTypingStatus(chatId, userProfile.uid, false);
            }
        };
    }, [chatId, userProfile?.uid, isTyping]);

    // Handle typing status
    const handleTyping = useCallback(() => {
        if (!chatId || !userProfile?.uid) return;

        // Set typing to true
        if (!isTyping) {
            setIsTyping(true);
            setTypingStatus(chatId, userProfile.uid, true);
        }

        // Clear existing timeout
        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
        }

        // Set new timeout to clear typing after 2 seconds of inactivity
        typingTimeoutRef.current = setTimeout(() => {
            setIsTyping(false);
            setTypingStatus(chatId, userProfile.uid, false);
        }, 2000);
    }, [chatId, userProfile?.uid, isTyping]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !chatId || !userProfile || isSending) return;

        // Clear typing status immediately on send
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

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setNewMessage(e.target.value);
        handleTyping();
    };

    const formatMessageTime = (date: Date) => {
        return date.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
        });
    };

    const formatMessageDate = (date: Date) => {
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        if (date.toDateString() === today.toDateString()) {
            return 'Today';
        } else if (date.toDateString() === yesterday.toDateString()) {
            return 'Yesterday';
        } else {
            return date.toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
            });
        }
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

    // Get typing indicator text
    const getTypingText = () => {
        if (typingUsers.length === 0) return null;
        return 'typing...';
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-dark-950 flex items-center justify-center">
                <div className="spinner w-10 h-10" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-dark-950 flex flex-col">
            {/* Chat Header */}
            <header className="bg-dark-800 border-b border-dark-700 h-[60px] flex items-center px-4 flex-shrink-0">
                <div className="flex items-center gap-3 flex-1">
                    {/* Back button */}
                    <Link
                        to="/"
                        className="p-2 text-dark-400 hover:text-white hover:bg-dark-700 rounded-lg transition-colors"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                    </Link>

                    {/* User/Group Info */}
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="relative">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white font-semibold">
                                {chat?.isGroup ? (
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                ) : otherUser?.photoURL ? (
                                    <img
                                        src={otherUser.photoURL}
                                        alt={otherUser.displayName}
                                        className="w-10 h-10 rounded-full object-cover"
                                    />
                                ) : (
                                    otherUser?.displayName?.charAt(0).toUpperCase() || '?'
                                )}
                            </div>
                            {!chat?.isGroup && otherUser?.isOnline && (
                                <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-dark-800 rounded-full" />
                            )}
                        </div>

                        <div className="flex-1 min-w-0">
                            <h1 className="text-white font-medium truncate">
                                {chat?.isGroup ? chat.groupName : otherUser?.displayName || 'Unknown User'}
                            </h1>
                            <p className="text-dark-400 text-sm truncate">
                                {typingUsers.length > 0 ? (
                                    <span className="text-primary-400 animate-pulse">{getTypingText()}</span>
                                ) : chat?.isGroup ? (
                                    `${chat.participants.length} members`
                                ) : otherUser?.isOnline ? (
                                    <span className="text-green-400">Online</span>
                                ) : (
                                    `Last seen ${otherUser?.lastSeen ? formatMessageTime(otherUser.lastSeen) : 'recently'}`
                                )}
                            </p>
                        </div>
                    </div>

                    {/* Header actions */}
                    <div className="flex items-center gap-1">
                        {/* AI Assistant button */}
                        <button
                            onClick={() => setShowAIPanel(true)}
                            className="p-2 text-dark-400 hover:text-purple-400 hover:bg-dark-700 rounded-full transition-colors"
                            title="AI Assistant"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                        </button>
                        {/* Schedule message button */}
                        <button
                            onClick={() => setShowScheduleModal(true)}
                            className="p-2 text-dark-400 hover:text-orange-400 hover:bg-dark-700 rounded-full transition-colors"
                            title="Schedule Message"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </button>
                        <button className="p-2 text-dark-400 hover:text-white hover:bg-dark-700 rounded-full transition-colors">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </button>
                        <button className="p-2 text-dark-400 hover:text-white hover:bg-dark-700 rounded-full transition-colors">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                            </svg>
                        </button>
                    </div>
                </div>
            </header>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23374151\' fill-opacity=\'0.1\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")' }}>
                {groupedMessages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center">
                        <div className="w-16 h-16 rounded-full bg-dark-800 flex items-center justify-center mb-4">
                            <svg className="w-8 h-8 text-dark-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                            </svg>
                        </div>
                        <p className="text-dark-400">No messages yet. Say hello!</p>
                    </div>
                ) : (
                    groupedMessages.map((group, groupIndex) => (
                        <div key={groupIndex}>
                            {/* Date separator */}
                            <div className="flex justify-center mb-4">
                                <span className="bg-dark-800/80 text-dark-300 text-xs px-3 py-1 rounded-full">
                                    {formatMessageDate(new Date(group.date))}
                                </span>
                            </div>

                            {/* Messages */}
                            {group.messages.map((message) => {
                                const isOwnMessage = message.senderId === userProfile?.uid;
                                return (
                                    <div
                                        key={message.id}
                                        className={`flex mb-2 ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                                    >
                                        <div
                                            className={`max-w-[75%] rounded-2xl px-4 py-2 ${isOwnMessage
                                                ? 'bg-primary-600 text-white rounded-br-md'
                                                : 'bg-dark-800 text-white rounded-bl-md'
                                                }`}
                                        >
                                            <p className="break-words">{message.content}</p>
                                            <div className={`flex items-center gap-1 mt-1 ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
                                                <span className="text-xs opacity-70">
                                                    {formatMessageTime(message.timestamp)}
                                                </span>
                                                {isOwnMessage && (
                                                    <span className="text-xs opacity-70">
                                                        {message.status === 'read' ? (
                                                            <svg className="w-4 h-4 text-blue-300" viewBox="0 0 24 24" fill="currentColor">
                                                                <path d="M18 7l-1.41-1.41-6.34 6.34 1.41 1.41L18 7zm4.24-1.41L11.66 16.17 7.48 12l-1.41 1.41L11.66 19l12-12-1.42-1.41zM.41 13.41L6 19l1.41-1.41L1.83 12 .41 13.41z" />
                                                            </svg>
                                                        ) : message.status === 'delivered' ? (
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

                {/* Typing indicator bubble */}
                {typingUsers.length > 0 && (
                    <div className="flex justify-start mb-2">
                        <div className="bg-dark-800 text-white rounded-2xl rounded-bl-md px-4 py-3">
                            <div className="flex gap-1">
                                <span className="w-2 h-2 bg-dark-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                <span className="w-2 h-2 bg-dark-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                <span className="w-2 h-2 bg-dark-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                            </div>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <form onSubmit={handleSendMessage} className="bg-dark-800 border-t border-dark-700 p-3 flex-shrink-0">
                <div className="flex items-center gap-3">
                    {/* Emoji button */}
                    <button
                        type="button"
                        className="p-2 text-dark-400 hover:text-white hover:bg-dark-700 rounded-full transition-colors"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </button>

                    {/* Attachment button */}
                    <button
                        type="button"
                        className="p-2 text-dark-400 hover:text-white hover:bg-dark-700 rounded-full transition-colors"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                        </svg>
                    </button>

                    {/* Input */}
                    <input
                        ref={inputRef}
                        type="text"
                        value={newMessage}
                        onChange={handleInputChange}
                        placeholder="Type a message"
                        className="flex-1 bg-dark-900 border-none rounded-full px-4 py-2.5 text-white placeholder-dark-500 focus:outline-none"
                    />

                    {/* Send button */}
                    <button
                        type="submit"
                        disabled={!newMessage.trim() || isSending}
                        className="p-2 bg-primary-500 hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-full transition-colors"
                    >
                        {isSending ? (
                            <div className="spinner w-6 h-6 border-2" />
                        ) : (
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                            </svg>
                        )}
                    </button>
                </div>
            </form>

            {/* AI Panel */}
            <AIPanel
                isOpen={showAIPanel}
                onClose={() => setShowAIPanel(false)}
                messages={messages}
                currentUserId={userProfile?.uid || ''}
                isGroup={chat?.isGroup}
            />

            {/* Schedule Message Modal */}
            <ScheduleMessageModal
                isOpen={showScheduleModal}
                onClose={() => setShowScheduleModal(false)}
                recipientName={chat?.isGroup ? chat.groupName : otherUser?.displayName}
            />
        </div>
    );
}

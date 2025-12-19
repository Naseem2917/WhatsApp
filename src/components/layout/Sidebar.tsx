import { useState } from 'react';

interface SidebarProps {
    isOpen: boolean;
    onClose: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
    const [searchQuery, setSearchQuery] = useState('');

    return (
        <>
            {/* Mobile overlay */}
            {isOpen && (
                <div
                    className="sm:hidden fixed inset-0 bg-black/50 z-40"
                    onClick={onClose}
                />
            )}

            {/* Sidebar */}
            <aside
                className={`
          fixed sm:relative z-50 sm:z-0
          w-full sm:w-[340px] md:w-[400px]
          bg-dark-900 border-r border-dark-700
          flex flex-col h-full
          transition-transform duration-300
          ${isOpen ? 'translate-x-0' : '-translate-x-full sm:translate-x-0'}
        `}
            >
                {/* Search bar */}
                <div className="p-3 bg-dark-900">
                    <div className="relative">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-dark-500">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </div>
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search or start new chat"
                            className="w-full bg-dark-800 border-none rounded-lg pl-12 pr-4 py-2.5 text-sm text-white placeholder-dark-500 focus:outline-none"
                        />
                    </div>
                </div>

                {/* Filter tabs */}
                <div className="flex gap-4 px-4 py-2 border-b border-dark-700 text-sm">
                    <button className="text-primary-400 pb-2 border-b-2 border-primary-400 font-medium">
                        All
                    </button>
                    <button className="text-dark-400 pb-2 hover:text-white transition-colors">
                        Unread
                    </button>
                    <button className="text-dark-400 pb-2 hover:text-white transition-colors">
                        Groups
                    </button>
                </div>

                {/* Chat list */}
                <div className="flex-1 overflow-y-auto">
                    {/* Empty state */}
                    <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                        <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-dark-800 flex items-center justify-center">
                            <svg className="w-10 h-10 text-dark-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                            </svg>
                        </div>
                        <h3 className="text-base font-normal text-white mb-1">No chats</h3>
                        <p className="text-dark-400 text-sm mb-4">Start a conversation by searching for a contact</p>
                        <button className="inline-flex items-center gap-2 bg-primary-500 hover:bg-primary-600 text-white font-medium px-4 py-2 rounded-full transition-colors text-sm">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            New Chat
                        </button>
                    </div>
                </div>
            </aside>
        </>
    );
}

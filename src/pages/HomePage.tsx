import { useState } from 'react';
import { Header, Sidebar } from '../components/layout';

export default function HomePage() {
    const [sidebarOpen, setSidebarOpen] = useState(false);

    return (
        <div className="min-h-screen bg-dark-950 flex flex-col">
            {/* Header */}
            <Header
                showMenuButton={true}
                onMenuClick={() => setSidebarOpen(!sidebarOpen)}
            />

            {/* Main Content */}
            <main className="flex flex-1 overflow-hidden">
                {/* Sidebar - Chat List */}
                <Sidebar
                    isOpen={sidebarOpen}
                    onClose={() => setSidebarOpen(false)}
                />

                {/* Chat Area - Placeholder */}
                <div className="hidden sm:flex flex-1 items-center justify-center bg-dark-950">
                    <div className="text-center max-w-md p-8">
                        <div className="w-32 h-32 mx-auto mb-6 rounded-full bg-gradient-to-br from-dark-800 to-dark-900 flex items-center justify-center animate-pulse-soft">
                            <svg className="w-16 h-16 text-dark-600" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                            </svg>
                        </div>
                        <h2 className="text-2xl font-bold text-white mb-3">WhatsApp Web</h2>
                        <p className="text-dark-400 mb-6">
                            Send and receive messages without keeping your phone online.
                            Use WhatsApp on up to 4 linked devices and 1 phone at the same time.
                        </p>
                        <div className="flex items-center justify-center gap-2 text-dark-500 text-sm">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                            End-to-end encrypted
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}

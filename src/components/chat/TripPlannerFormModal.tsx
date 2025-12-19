import { useState } from 'react';
import { generateTripPlan } from '../../services/aiService';

interface TripPlannerFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    participants: Array<{ name: string; location: string }>;
    onPlanGenerated: (plan: string) => void;
}

export default function TripPlannerFormModal({
    isOpen,
    onClose,
    participants,
    onPlanGenerated,
}: TripPlannerFormModalProps) {
    const [destination, setDestination] = useState('');
    const [travelDate, setTravelDate] = useState('');
    const [returnDate, setReturnDate] = useState('');
    const [myLocation, setMyLocation] = useState('');
    const [budget, setBudget] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!destination.trim()) {
            setError('Please enter a destination');
            return;
        }

        if (!travelDate) {
            setError('Please select a travel date');
            return;
        }

        if (!myLocation.trim()) {
            setError('Please enter your location');
            return;
        }

        setIsGenerating(true);

        try {
            // Build a mock conversation based on user inputs for AI
            const mockConversation = [
                { sender: 'User', content: `I want to plan a trip to ${destination}` },
                { sender: 'User', content: `Travel date: ${travelDate}${returnDate ? `, Return: ${returnDate}` : ''}` },
                { sender: 'User', content: `My location is: ${myLocation}` },
                ...(budget ? [{ sender: 'User', content: `Budget: ${budget}` }] : []),
            ];

            // Add participant locations
            const updatedParticipants = [
                { name: 'You', location: myLocation },
                ...participants.filter(p => p.name !== 'You'),
            ];

            const plan = await generateTripPlan(mockConversation, updatedParticipants);
            onPlanGenerated(plan);
            onClose();
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to generate trip plan';
            if (errorMessage.includes('API') || errorMessage.includes('fetch') || errorMessage.includes('network')) {
                setError('AI temporarily unavailable. Try again.');
            } else {
                setError(errorMessage);
            }
        } finally {
            setIsGenerating(false);
        }
    };

    const getMinDate = () => {
        const now = new Date();
        return now.toISOString().split('T')[0];
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative w-full max-w-md rounded-2xl shadow-xl overflow-hidden animate-fade-in bg-dark-900 border border-dark-700">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-dark-700">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-500 to-teal-500 flex items-center justify-center">
                            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-white">Plan Your Trip</h2>
                            <p className="text-dark-400 text-sm">AI-powered travel planning</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-dark-400 hover:text-white hover:bg-dark-700 rounded-lg transition-colors"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-4 space-y-4">
                    {error && (
                        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
                            {error}
                        </div>
                    )}

                    {/* Destination */}
                    <div>
                        <label className="block text-dark-300 text-sm font-medium mb-2">
                            📍 Where do you want to go?
                        </label>
                        <input
                            type="text"
                            value={destination}
                            onChange={(e) => setDestination(e.target.value)}
                            placeholder="e.g., Goa, Manali, Dubai..."
                            className="input-field"
                        />
                    </div>

                    {/* Your Location */}
                    <div>
                        <label className="block text-dark-300 text-sm font-medium mb-2">
                            🏠 Your current location
                        </label>
                        <input
                            type="text"
                            value={myLocation}
                            onChange={(e) => setMyLocation(e.target.value)}
                            placeholder="e.g., Delhi, Mumbai, Bangalore..."
                            className="input-field"
                        />
                    </div>

                    {/* Date */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-dark-300 text-sm font-medium mb-2">
                                📅 Travel Date
                            </label>
                            <input
                                type="date"
                                value={travelDate}
                                onChange={(e) => setTravelDate(e.target.value)}
                                min={getMinDate()}
                                className="input-field"
                            />
                        </div>
                        <div>
                            <label className="block text-dark-300 text-sm font-medium mb-2">
                                📅 Return Date
                            </label>
                            <input
                                type="date"
                                value={returnDate}
                                onChange={(e) => setReturnDate(e.target.value)}
                                min={travelDate || getMinDate()}
                                className="input-field"
                            />
                        </div>
                    </div>

                    {/* Budget (Optional) */}
                    <div>
                        <label className="block text-dark-300 text-sm font-medium mb-2">
                            💰 Budget (optional)
                        </label>
                        <input
                            type="text"
                            value={budget}
                            onChange={(e) => setBudget(e.target.value)}
                            placeholder="e.g., ₹20,000 per person"
                            className="input-field"
                        />
                    </div>

                    {/* Group Members Info */}
                    {participants.length > 0 && (
                        <div className="p-3 rounded-xl bg-dark-700">
                            <p className="text-dark-300 text-sm font-medium mb-2">
                                👥 Group Members ({participants.length})
                            </p>
                            <div className="flex flex-wrap gap-2">
                                {participants.map((p, idx) => (
                                    <span
                                        key={idx}
                                        className="px-2 py-1 text-xs rounded-full bg-dark-900 text-dark-300"
                                    >
                                        {p.name}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Submit Button */}
                    <button
                        type="submit"
                        disabled={isGenerating}
                        className="btn-primary w-full flex items-center justify-center gap-2"
                    >
                        {isGenerating ? (
                            <>
                                <div className="spinner" />
                                Generating Plan...
                            </>
                        ) : (
                            <>
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                </svg>
                                Generate Trip Plan
                            </>
                        )}
                    </button>

                    <p className="text-dark-500 text-xs text-center">
                        AI will create a personalized trip plan based on your inputs
                    </p>
                </form>
            </div>
        </div>
    );
}

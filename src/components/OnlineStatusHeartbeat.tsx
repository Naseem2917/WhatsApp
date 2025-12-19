import { useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { updateOnlineStatus } from '../services/userService';

const HEARTBEAT_INTERVAL = 300000; // 5 minutes (optimized for Firebase free tier)

export default function OnlineStatusHeartbeat() {
    const { userProfile } = useAuth();

    useEffect(() => {
        if (!userProfile?.uid) return;

        // Set online status on mount
        updateOnlineStatus(userProfile.uid, true).catch(console.error);

        // Heartbeat interval
        const interval = setInterval(() => {
            updateOnlineStatus(userProfile.uid, true).catch(console.error);
        }, HEARTBEAT_INTERVAL);

        // Handle visibility change
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                updateOnlineStatus(userProfile.uid, true).catch(console.error);
            }
        };

        // Handle window close/unload - attempt to set offline
        const handleUnload = () => {
            // Use beacon API for reliability
            // Note: Firestore doesn't support sendBeacon directly for doc updates easily without Cloud Functions
            // But we can try to trigger a quick cleanup or rely on 'lastSeen'
            // Ideally we'd use onDisconnect() from Realtime Database, but for Firestore presence, 
            // we rely on short 'lastSeen' windows or Cloud Functions.
            // For now, we just try our best.
            updateOnlineStatus(userProfile.uid, false).catch(() => { });
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('beforeunload', handleUnload);

        return () => {
            clearInterval(interval);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('beforeunload', handleUnload);
            // Set offline on unmount
            updateOnlineStatus(userProfile.uid, false).catch(console.error);
        };
    }, [userProfile?.uid]);

    return null;
}

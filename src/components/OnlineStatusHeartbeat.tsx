import { useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { updateOnlineStatus } from '../services/userService';

// Free-tier optimized: 2 minutes interval (only 30 writes per active hour)
const HEARTBEAT_INTERVAL = 120000; // 2 minutes

export default function OnlineStatusHeartbeat() {
    const { userProfile } = useAuth();
    const lastWriteRef = useRef<number>(0);

    useEffect(() => {
        if (!userProfile?.uid) return;

        const uid = userProfile.uid;

        // Function to update status with a minimum throttle of 30 seconds
        const safeSetStatus = (isOnline: boolean, force = false) => {
            const now = Date.now();
            if (!force && isOnline && now - lastWriteRef.current < 30000) {
                return; // Prevent write spamming on quick tab switches
            }
            lastWriteRef.current = now;
            updateOnlineStatus(uid, isOnline).catch(() => {});
        };

        // Set online status on initial load
        safeSetStatus(true, true);

        // Heartbeat interval - ONLY runs when tab is active and visible
        const interval = setInterval(() => {
            if (document.visibilityState === 'visible') {
                safeSetStatus(true, true);
            }
        }, HEARTBEAT_INTERVAL);

        // Handle tab visibility changes (Reliable in modern browsers)
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                safeSetStatus(true);
            } else {
                safeSetStatus(false, true);
            }
        };

        // Attempt offline update when window closes
        const handleUnload = () => {
            updateOnlineStatus(uid, false).catch(() => {});
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('beforeunload', handleUnload);

        return () => {
            clearInterval(interval);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('beforeunload', handleUnload);
            // Note: Do not fire offline on React unmount to prevent React.StrictMode flicker
        };
    }, [userProfile?.uid]);

    return null;
}

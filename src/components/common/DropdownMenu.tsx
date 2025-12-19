import { useEffect, useRef, ReactNode } from 'react';

interface DropdownMenuItem {
    label: string;
    icon?: ReactNode;
    onClick: () => void;
    danger?: boolean;
}

interface DropdownMenuProps {
    isOpen: boolean;
    onClose: () => void;
    items: DropdownMenuItem[];
    position?: 'left' | 'right';
}

export default function DropdownMenu({ isOpen, onClose, items, position = 'right' }: DropdownMenuProps) {
    const menuRef = useRef<HTMLDivElement>(null);

    // Close on click outside
    useEffect(() => {
        if (!isOpen) return;

        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                onClose();
            }
        };

        // Small delay to prevent immediate close on the same click that opened it
        const timer = setTimeout(() => {
            document.addEventListener('mousedown', handleClickOutside);
        }, 0);

        return () => {
            clearTimeout(timer);
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen, onClose]);

    // Close on Escape key
    useEffect(() => {
        if (!isOpen) return;

        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };

        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div
            ref={menuRef}
            className={`absolute top-full mt-2 ${position === 'right' ? 'right-0' : 'left-0'} 
                z-50 min-w-[180px] py-2 rounded-lg shadow-xl animate-fade-in`}
            style={{
                backgroundColor: 'var(--wa-bg-panel)',
                border: '1px solid var(--wa-border)'
            }}
        >
            {items.map((item, index) => (
                <button
                    key={index}
                    onClick={() => {
                        item.onClick();
                        onClose();
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors
                        ${item.danger
                            ? 'text-red-400 hover:bg-red-500/10'
                            : 'hover:bg-[var(--wa-bg-hover)]'
                        }`}
                    style={{ color: item.danger ? undefined : 'var(--wa-text-primary)' }}
                >
                    {item.icon && (
                        <span className="w-5 h-5" style={{ color: item.danger ? undefined : 'var(--wa-text-light)' }}>
                            {item.icon}
                        </span>
                    )}
                    {item.label}
                </button>
            ))}
        </div>
    );
}

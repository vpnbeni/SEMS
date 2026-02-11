import { ReactNode, useEffect } from 'react';
import { createPortal } from 'react-dom';

interface DialogProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: ReactNode;
}

export function Dialog({ isOpen, onClose, title, children }: DialogProps) {
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };

        if (isOpen) {
            document.body.style.overflow = 'hidden';
            window.addEventListener('keydown', handleEscape);
        }

        return () => {
            document.body.style.overflow = 'unset';
            window.removeEventListener('keydown', handleEscape);
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return createPortal(
        <div className="dialog-overlay" onClick={onClose}>
            <div className="dialog-content" onClick={(e) => e.stopPropagation()}>
                <div className="dialog-header">
                    <h2 className="dialog-title">{title}</h2>
                    <button className="dialog-close" onClick={onClose} aria-label="Close dialog">
                        &times;
                    </button>
                </div>
                <div className="dialog-body">
                    {children}
                </div>
            </div>
        </div>,
        document.body
    );
}

import React, { ReactNode } from 'react';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: ReactNode;
    children: ReactNode;
    footer?: ReactNode;
    size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, footer, size = 'md' }) => {
    if (!isOpen) return null;

    const sizeClasses = { sm: 'max-w-sm', md: 'max-w-md', lg: 'max-w-lg', xl: 'max-w-xl', '2xl': 'max-w-2xl' };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4" onClick={onClose}>
            <div className={`bg-surface rounded-lg shadow-xl w-full ${sizeClasses[size]} flex flex-col max-h-[90vh]`} onClick={e => e.stopPropagation()}>
                <header className="p-5 border-b border-border-color flex justify-between items-center">
                    <h3 className="text-xl font-semibold text-on-surface">{title}</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 rounded-full">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </header>
                <div className="flex-grow p-6 overflow-y-auto">{children}</div>
                {footer && <footer className="p-4 bg-gray-50 border-t flex justify-end items-center space-x-3 rounded-b-lg">{footer}</footer>}
            </div>
        </div>
    );
};

export default Modal;
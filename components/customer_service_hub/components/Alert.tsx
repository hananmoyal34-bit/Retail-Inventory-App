import React from 'react';

interface AlertProps {
    message: string;
    type: 'success' | 'error';
    onClose: () => void;
}

const Alert: React.FC<AlertProps> = ({ message, type, onClose }) => {
    const baseClasses = "flex items-center justify-between p-4 mb-4 text-sm rounded-lg border";
    const typeClasses = {
        success: "bg-green-50 text-green-800 border-green-300",
        error: "bg-red-50 text-red-800 border-red-300",
    };

    const closeButtonClasses = {
        success: "text-green-800 hover:bg-green-100 focus:ring-green-400",
        error: "text-red-800 hover:bg-red-100 focus:ring-red-400",
    }

    return (
        <div className={`${baseClasses} ${typeClasses[type]}`} role="alert">
            <span className="font-medium">{message}</span>
            <button
                onClick={onClose}
                className={`ml-4 -mr-1 p-1.5 rounded-lg focus:ring-2 inline-flex h-8 w-8 ${closeButtonClasses[type]}`}
                aria-label="Close"
            >
                <span className="sr-only">Close</span>
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"></path></svg>
            </button>
        </div>
    );
};

export default Alert;

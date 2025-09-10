
import React, { useState } from 'react';
import { ClipboardIcon, CheckIcon } from '../../icons';

interface ClipboardCopyButtonProps { textToCopy: string; }

const ClipboardCopyButton: React.FC<ClipboardCopyButtonProps> = ({ textToCopy }) => {
    const [isCopied, setIsCopied] = useState(false);
    const handleCopy = async (e: React.MouseEvent) => {
        e.stopPropagation();
        await navigator.clipboard.writeText(textToCopy);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
    };
    return (
        <button onClick={handleCopy} className="ml-2 p-1 rounded-md text-gray-500 hover:bg-gray-200" aria-label="Copy">
            {isCopied ? <CheckIcon className="h-4 w-4 text-green-500" /> : <ClipboardIcon className="h-4 w-4" />}
        </button>
    );
};
export default ClipboardCopyButton;

export const formatCurrency = (amount: number | string | undefined | null) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (typeof num !== 'number' || isNaN(num)) {
        return '$0.00';
    }
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(num);
};

// Converts 'MM/DD/YYYY' or other date strings to 'YYYY-MM-DD' for input[type=date]
export const formatDateToYMD = (dateString: string | undefined | null): string | null => {
    if (!dateString) return null;
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return null;
        // Adjust for timezone offset to prevent off-by-one day errors
        const tzOffset = date.getTimezoneOffset() * 60000;
        const localDate = new Date(date.getTime() - tzOffset);
        return localDate.toISOString().split('T')[0];
    } catch (e) {
        return null;
    }
};

// Converts 'YYYY-MM-DD' or other date strings to 'MM/DD/YYYY' for display
export const formatDateToMDY = (dateString: string | undefined | null): string | null => {
    if (!dateString) return null;
    try {
        // Create date assuming UTC to avoid timezone shifts from YYYY-MM-DD
        const date = new Date(dateString + 'T00:00:00Z');
        if (isNaN(date.getTime())) {
            // Try parsing as a more general date string if the first attempt fails
            const fallbackDate = new Date(dateString);
            if(isNaN(fallbackDate.getTime())) return null;
            return fallbackDate.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric', timeZone: 'UTC' });
        }
        return date.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric', timeZone: 'UTC' });
    } catch (e) {
        return null;
    }
};

export const getExpirationHighlightClass = (expirationDate: string | undefined): string => {
    if (!expirationDate) return 'bg-gray-100 text-gray-800'; // Neutral for no date

    try {
        const expDateStr = formatDateToYMD(expirationDate);
        if (!expDateStr) return 'bg-gray-100 text-gray-800';
        
        const expDate = new Date(expDateStr + "T00:00:00");
        if (isNaN(expDate.getTime())) {
            return 'bg-gray-100 text-gray-800';
        }
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const diffTime = expDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays < 0) return 'bg-red-100 text-red-800 font-semibold';
        if (diffDays <= 30) return 'bg-orange-100 text-orange-800 font-semibold';
        if (diffDays <= 60) return 'bg-yellow-100 text-yellow-800 font-semibold';
        return 'bg-green-100 text-green-800 font-semibold';
    } catch (e) {
        return 'bg-gray-100 text-gray-800';
    }
};

export const getDueDateHighlightClass = (dueDateString: string | undefined | null): string => {
    if (!dueDateString) return '';

    try {
        const ymdDate = formatDateToYMD(dueDateString);
        if (!ymdDate) return '';

        // Using UTC to avoid timezone issues with date comparisons
        const dueDate = new Date(ymdDate + 'T00:00:00Z');
        const today = new Date();
        const todayUTC = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
        
        if (isNaN(dueDate.getTime())) return '';
        
        const diffTime = dueDate.getTime() - todayUTC.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        const baseClass = 'px-2 py-1 rounded-full text-xs font-medium inline-block';

        if (diffDays <= 3) return `${baseClass} bg-red-100 text-red-800`;
        if (diffDays <= 15) return `${baseClass} bg-orange-100 text-orange-800`;
        if (diffDays <= 30) return `${baseClass} bg-green-100 text-green-800`;
        
        return ''; // No highlight if more than 30 days away
    } catch (e) {
        return '';
    }
};

export const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = error => reject(error);
    });
};
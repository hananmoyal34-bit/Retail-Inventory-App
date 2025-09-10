
export const formatCurrency = (amount: number | string | null | undefined): string => {
    const num = Number(amount);
    if (isNaN(num) || num === null) {
        return '$0.00';
    }
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
    }).format(num);
};

// These date functions use the browser's local timezone.
export const formatDateToYMD = (dateString: string | Date | null | undefined): string | null => {
    if (!dateString) return null;
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return null;
        // Adjust for timezone offset to prevent off-by-one day error when parsing YYYY-MM-DD
        date.setMinutes(date.getMinutes() + date.getTimezoneOffset());
        const year = date.getFullYear();
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        return `${year}-${month}-${day}`;
    } catch (e) {
        return null;
    }
};

export const formatDateToMDY = (dateString: string | Date | null | undefined): string | null => {
    if (!dateString) return null;
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return null;
        // Adjust for timezone offset
        date.setMinutes(date.getMinutes() + date.getTimezoneOffset());
        const year = date.getFullYear();
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        return `${month}/${day}/${year}`;
    } catch (e) {
        return null;
    }
};

export const getExpirationHighlightClass = (expirationDate: string | null | undefined): string => {
    if (!expirationDate) return 'bg-gray-100 text-gray-800';
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Normalize today to the start of the day
        const expDate = new Date(expirationDate);
        if (isNaN(expDate.getTime())) return 'bg-gray-100 text-gray-800';
        expDate.setMinutes(expDate.getMinutes() + expDate.getTimezoneOffset());


        const diffTime = expDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays < 0) return 'bg-red-200 text-red-800 font-bold'; // Expired
        if (diffDays <= 30) return 'bg-red-100 text-red-700'; // Expires in <= 30 days
        if (diffDays <= 60) return 'bg-yellow-100 text-yellow-800'; // Expires in <= 60 days
        return 'bg-green-100 text-green-800'; // Good standing
    } catch (e) {
        return 'bg-gray-100 text-gray-800';
    }
};

export const getDueDateHighlightClass = (dueDate: string | null | undefined): string => {
    if (!dueDate) return '';
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const due = new Date(dueDate);
        if (isNaN(due.getTime())) return '';
        due.setMinutes(due.getMinutes() + due.getTimezoneOffset());

        const diffTime = due.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays < 0) return 'px-2 py-1 rounded-full text-xs bg-red-200 text-red-800 font-bold'; // Overdue
        if (diffDays <= 2) return 'px-2 py-1 rounded-full text-xs bg-red-100 text-red-700'; // Due in <= 2 days
        if (diffDays <= 7) return 'px-2 py-1 rounded-full text-xs bg-yellow-100 text-yellow-800'; // Due in <= 7 days
        return '';
    } catch (e) {
        return '';
    }
};

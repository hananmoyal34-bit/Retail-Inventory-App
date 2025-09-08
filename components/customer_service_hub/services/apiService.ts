import { WEB_APP_URL } from '../constants';
import type { CustomerRecord, FileForUpload, FormState } from '../types';

async function handleResponse<T,>(response: Response): Promise<T> {
    const json = await response.json();
    if (json.status === "success") {
        return json.data;
    }
    throw new Error(json.message || 'An API error occurred.');
}

export const getAllRecords = async (): Promise<CustomerRecord[]> => {
    const response = await fetch(WEB_APP_URL);
    if (!response.ok) {
        throw new Error('Network response was not ok.');
    }
    return handleResponse<CustomerRecord[]>(response);
};

export const createRecord = async (formData: FormState, files: FileForUpload[]): Promise<any> => {
    const body = {
        formType: 'create',
        formData: formData,
        files: files,
    };

    const response = await fetch(WEB_APP_URL, {
        method: 'POST',
        body: JSON.stringify(body),
        headers: {
            'Content-Type': 'text/plain;charset=utf-8', // Required by Google Apps Script web apps
        },
    });
    return handleResponse(response);
};

export const updateRecord = async (formData: FormState, files: FileForUpload[]): Promise<any> => {
     const body = {
        formType: 'update',
        formData: formData,
        files: files,
    };
    const response = await fetch(WEB_APP_URL, {
        method: 'POST',
        body: JSON.stringify(body),
        headers: {
            'Content-Type': 'text/plain;charset=utf-8',
        },
    });
    return handleResponse(response);
}

export const deleteRecord = async (ticketId: string): Promise<any> => {
    const url = new URL(WEB_APP_URL);
    url.searchParams.append('action', 'delete');
    url.searchParams.append('ticketId', ticketId);
    
    const response = await fetch(url.toString());
    if (!response.ok) {
        throw new Error('Network response was not ok.');
    }
    return handleResponse(response);
}

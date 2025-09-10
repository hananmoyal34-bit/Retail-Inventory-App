import { WEB_APP_URL } from '../constants';
import type { CustomerRecord, Account, Task, Contact, FinancingRecord } from '../types';

async function handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
        const errorText = await response.text();
        try {
            const jsonError = JSON.parse(errorText);
            throw new Error(jsonError.message || `HTTP error! status: ${response.status}`);
        } catch(e) {
            throw new Error(errorText || `HTTP error! status: ${response.status}`);
        }
    }
    const json = await response.json();
    if (json.status === "success") {
        return json.data || json;
    }
    throw new Error(json.message || 'An API error occurred.');
}

// --- Generic Row Parser ---
function parseRows<T>(data: { headers: string[], rows: any[][] }, keys: (keyof T)[]): T[] {
    const { headers, rows } = data;
    if (!rows || rows.length === 0 || !headers || headers.length === 0) return [];
    
    // Create a map of the keys we want to their index in the sheet
    const keyIndexMap = new Map<keyof T, number>();
    keys.forEach(key => {
        // This finds the index of the header that matches the key (case-insensitive for robustness)
        // e.g. key 'ContactID' should match header 'ContactID'
        // This is a simplified mapping; a more robust one might handle different header names.
        const headerName = String(key);
        const index = headers.findIndex(h => h.replace(/\s/g, '').toLowerCase() === headerName.replace(/\s/g, '').toLowerCase());
        if(index > -1) {
            keyIndexMap.set(key, index);
        }
    });

    return rows.map(row => {
        const obj: Partial<T> = {};
        keyIndexMap.forEach((index, key) => {
            // @ts-ignore
            obj[key] = row[index];
        });
        return obj as T;
    }).filter(obj => obj && obj[keys[0]]); // Filter out rows where the ID is missing
}


// --- CS Hub API ---
export const getAllRecords = async (): Promise<CustomerRecord[]> => {
    const response = await fetch(WEB_APP_URL);
    return handleResponse<CustomerRecord[]>(response);
};

// --- Accounts API ---
export const getAccounts = async (): Promise<Account[]> => {
    const url = new URL(WEB_APP_URL);
    url.searchParams.append('action', 'getAccounts');
    const response = await fetch(url.toString());
    const result = await handleResponse<{headers: string[], rows: any[][]}>(response);

    const accountKeys: (keyof Account)[] = ["accountID", "Location Name", "Account Type", "Contact Person", "Phone", "Email", "Address", "Status", "Notes", "File Upload", "Timestamp"].map(k => k.replace(/\s/g, '').replace(/^./, c => c.toLowerCase()) as keyof Account);
     // This mapping is simplified. The provided script seems to have a different structure.
    // The provided script for viewer has:
    const keys: (keyof Account)[] = ['accountID', 'accountType', 'subCategory', 'company', 'locationName', 'locationAddress', 'expiration', 'amountDue', 'billingType', 'billingAmount', 'paymentMethod', 'licenseNumber', 'insuranceCarrier', 'insuranceBroker', 'notes', 'status', 'timestamp', 'fileUpload'];

    const parsed = parseRows<Account>(result, keys);
    return parsed.map(acc => ({ ...acc, amountDue: parseFloat(String(acc.amountDue)) || 0, billingAmount: parseFloat(String(acc.billingAmount)) || 0 }));
};

// --- Directory API ---
export const getDirectory = async (): Promise<Contact[]> => {
    const url = new URL(WEB_APP_URL);
    url.searchParams.append('action', 'getDirectory');
    const response = await fetch(url.toString());
    const result = await handleResponse<{headers: string[], rows: any[][]}>(response);
    const contactKeys: (keyof Contact)[] = ['ContactID', 'First Name', 'Last Name', 'Phone Number', 'Email Address', 'Address', 'Company/Organization', 'Job Title', 'Department', 'Status', 'Notes', 'Created On'];
    return parseRows<Contact>(result, contactKeys);
};

// --- Tasks API ---
export const getTasks = async (): Promise<Task[]> => {
    const url = new URL(WEB_APP_URL);
    url.searchParams.append('action', 'getTasks');
    const response = await fetch(url.toString());
    const result = await handleResponse<{headers: string[], rows: any[][]}>(response);
    const taskKeys: (keyof Task)[] = ['TaskID', 'Task Name', 'Due Date', 'Task Description', 'Contact', 'Account', 'Status', 'Priority', 'Notes', 'Completed On'];
    return parseRows<Task>(result, taskKeys);
};

// --- Financing Ledger API ---
export const getFinancingLedger = async (): Promise<FinancingRecord[]> => {
    const url = new URL(WEB_APP_URL);
    url.searchParams.append('action', 'getFinancingLedger');
    const response = await fetch(url.toString());
    const result = await handleResponse<{ headers: string[], rows: any[][] }>(response);
    const financingKeys: (keyof FinancingRecord)[] = [
        'finance_id', 'customer_name', 'customer_email', 'customer_phone', 'product_description',
        'receipt_number', 'sale_date', 'sales_rep', 'store_name', 'total_sale_amount',
        'down_payment_amount', 'financed_amount', 'installment_count', 'installment_amount',
        'payment_method', 'payment_due_day', 'total_amount_paid', 'current_balance_due',
        'agreement_status', 'notes_log', 'agreement_file', 'id_card_file_url', 'receipt_file',
        'created_on', 'last_updated'
    ];
    const parsed = parseRows<FinancingRecord>(result, financingKeys);
    // Convert numeric fields from string to number
    return parsed.map(rec => ({
        ...rec,
        total_sale_amount: parseFloat(String(rec.total_sale_amount)) || 0,
        down_payment_amount: parseFloat(String(rec.down_payment_amount)) || 0,
        financed_amount: parseFloat(String(rec.financed_amount)) || 0,
        installment_count: parseInt(String(rec.installment_count), 10) || 0,
        installment_amount: parseFloat(String(rec.installment_amount)) || 0,
        total_amount_paid: parseFloat(String(rec.total_amount_paid)) || 0,
        current_balance_due: parseFloat(String(rec.current_balance_due)) || 0,
    }));
};
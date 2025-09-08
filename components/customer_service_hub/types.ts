export type Status = 'New' | 'In Progress' | 'Resolved' | 'Closed';

export interface CustomerRecord {
    TicketID: string;
    'Ticket Category': string;
    'Ticket Notes': string;
    'First Name': string;
    'Last Name': string;
    'Email Address': string;
    'Phone Number': string;
    'Date of Transaction': string;
    'Receipt Number': string;
    'Purchase Amount': string;
    'Last 4 Digits of Card': string;
    'Product': string;
    'Store Name': string;
    'Receipt File': string;
    Status: Status | string;
    'Office Notes': string;
    'File 1': string;
    'File 2': string;
    'File 3': string;
    'File 4': string;
    Timestamp: string;
    [key: string]: string;
}

export interface FileForUpload {
    key: string;
    filename: string;
    mimeType: string;
    data: string; // base64 encoded string without the data URL prefix
}

export interface FormState {
    ticketId?: string;
    fullName: string;
    email: string;
    phoneNumber: string;
    formType: string; // Maps to 'Ticket Category'
    issueDescription: string; // Maps to 'Ticket Notes'
    purchaseDate: string;
    invoiceNumber: string;
    purchaseAmount: string;
    last4Digits: string;
    product: string;
    storeOfPurchase: string;
    status: string;
    officeNotes: string;
    // For tracking existing file URLs during update.
    // Keys match backend expectations for preservation.
    receipt?: string;
    file1?: string;
    file2?: string;
    file3?: string;
    file4?: string;
}

export interface SortConfig {
    key: keyof CustomerRecord | 'Customer';
    direction: 'ascending' | 'descending';
}

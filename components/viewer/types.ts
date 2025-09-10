export type Status = 'New' | 'In Progress' | 'Closed';

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

export interface SortConfig {
    key: keyof CustomerRecord | 'Customer';
    direction: 'ascending' | 'descending';
}

export type AccountStatus = 'Active' | 'Inactive' | 'Pending';

export interface Account {
  accountID: string;
  accountType: string;
  subCategory: string;
  company: string;
  locationName: string;
  locationAddress: string;
  expiration: string;
  amountDue: number;
  billingType: string;
  billingAmount: number;
  paymentMethod: string;
  licenseNumber?: string;
  insuranceCarrier?: string;
  insuranceBroker?: string;
  notes?: string;
  status: AccountStatus | string;
  timestamp: string;
  fileUpload?: string;
}

export type TaskStatus = 'To Do' | 'In Progress' | 'Pending Review' | 'Completed' | 'Canceled';
export type TaskPriority = 'Low' | 'Medium' | 'High' | 'Critical';

export interface Task {
  TaskID: string;
  'Task Name': string;
  'Due Date': string;
  'Task Description': string;
  Contact: string; // ContactID
  Account: string; // AccountID
  Status: TaskStatus | string;
  Priority: TaskPriority | string;
  Notes: string;
  'Completed On': string;
}

export interface Contact {
  ContactID: string;
  'First Name': string;
  'Last Name': string;
  'Phone Number': string;
  'Email Address': string;
  Address: string;
  'Company/Organization': string;
  'Job Title': string;
  Department: string;
  Status: string;
  Notes: string;
  'Created On': string;
}

export type AgreementStatus = 'Active' | 'Paid Off' | 'On Hold' | 'Default';

export interface FinancingRecord {
  finance_id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  product_description: string;
  receipt_number: string;
  sale_date: string;
  sales_rep: string;
  store_name: string;
  total_sale_amount: number;
  down_payment_amount: number;
  financed_amount: number;
  installment_count: number;
  installment_amount: number;
  payment_method: string;
  payment_due_day: string;
  total_amount_paid: number;
  current_balance_due: number;
  agreement_status: AgreementStatus | string;
  notes_log: string;
  agreement_file: string;
  id_card_file_url: string;
  receipt_file: string;
  created_on: string;
  last_updated: string;
}

// User type might not be needed but kept for structural consistency
export interface User {
  UserID: string;
  Name: string;
  Email: string;
  Phone: string;
  AccessCode: string;
  Role: 'Office' | 'Accounting' | string;
  Location: string;
}

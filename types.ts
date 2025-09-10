export enum Page {
  DASHBOARD = 'DASHBOARD',
  PRODUCTS = 'PRODUCTS',
  COUNT = 'COUNT',
  WAREHOUSE_INVENTORY = 'WAREHOUSE_INVENTORY',
  INVENTORY_LOG = 'INVENTORY_LOG',
  COUNT_LOG = 'COUNT_LOG',
  TRANSACTION_LOGS = 'TRANSACTION_LOGS',
  USERS = 'USERS',
  ORDERS = 'ORDERS',
  LOCATIONS = 'LOCATIONS',
  MANAGER_PORTAL = 'MANAGER_PORTAL',
  // New Viewer Pages
  VIEWER_CS_HUB = 'VIEWER_CS_HUB',
  VIEWER_FINANCING = 'VIEWER_FINANCING',
  VIEWER_ACCOUNTS = 'VIEWER_ACCOUNTS',
  VIEWER_TASKS = 'VIEWER_TASKS',
  VIEWER_DIRECTORY = 'VIEWER_DIRECTORY',
}

export interface Product {
  productID: string;
  productName: string;
  createDate: string;
  imageUrl: string;
}

export interface AppSheetProduct {
  name: string;
  colors: string[];
  category: string;
  subCategory: string;
  lowStockThreshold: number;
}

export interface ProductCategory {
  categoryID: string;
  category: string;
  subCategory: string;
}

export interface User {
  userID: string;
  name: string;
  email: string;
  phone: string;
  accessCode: string;
  role: 'Admin' | 'Manager' | 'Logistics' | string;
  location: string;
}

export interface Location {
  id: string;
  name: string;
  locationFullName: string;
}

export interface CountEntry {
  productID: string;
  productName: string;
  openingStock: number;
  calculatedOpeningStock: number;
  stockIn: number;
  inStoreSales: number;
  warehouseShipping: number;
  physicalEndCount: number;
  isOpeningStockManual?: boolean;
}

export interface DraftCount {
  draftID: string;
  location: string;
  date: string;
  productName: string;
  openingStock: number;
  stockIn: number;
  inStoreSales: number;
  warehouseShipping: number;
  physicalEndCount: number;
  isOpeningStockManual: boolean;
  lastUpdatedBy: string;
  timestamp: string;
}

export interface SaveDraftPayload {
  date: string;
  location: string;
  userName: string;
  entries: CountEntry[];
}


export interface WarehouseCountEntry {
  productID: string;
  productName: string;
  quantity: number;
  color: string;
  notes: string;
}

export interface SubmitWarehouseCountPayload {
  date: string;
  userName: string;
  entries: WarehouseCountEntry[];
}


export interface InventoryLog {
  logID: string;
  date: string;
  location: string;
  productName: string;
  transactionType: 'Stock In' | 'In-Store Sale' | 'Warehouse Shipping' | 'Adjustment-Damage' | 'Initial Stock' | 'Adjustment-Variance' | 'Adjustment-Manual' | 'Warehouse-Out-Sys' | 'System Deduction';
  quantity: number;
}

export interface CountLog {
  logID: string;
  date: string;
  location: string;
  productName: string;
  openingStock: number;
  stockIn: number;
  inStoreSales: number;
  warehouseShipping: number;
  physicalEndCount: number;
  calculatedEndCount: number;
  variance: number;
}

export interface LocationOrder {
  orderID: string;
  item: string;
  quantity: number;
  colors: string;
  notes: string;
  location: string;
  createdBy: string;
  timestamp: string;
  userName: string;
  status: 'Pending' | 'Pickup' | 'Delivered' | string;
  officeNotes: string;
}

// For the new Manager Portal Order Form
export interface OrderItem {
  type: 'product' | 'custom';
  id: string; // productID or a generated ID for custom items
  name: string;
  quantity: number;
  color: string;
  notes: string;
}

export interface OrderPayload {
  userId: string;
  userName: string;
  locations: string[];
  items: OrderItem[];
}

export interface WarehouseCountLog {
  countID: string;
  productName: string;
  color: string;
  quantity: number;
  notes: string;
  timestamp: string;
  user: string;
}

export interface ShippingData {
  timestamp: string;
  storeName: string;
  orderNo: string;
  storeRepName: string;
  firstName: string;
  lastName: string;
  ackReceiptUrl: string;
}


// --- Office Modules Types ---

// CSHub
export type Status = 'New' | 'In Progress' | 'Closed';
export interface CustomerRecord {
    TicketID: string; 'Ticket Category': string; 'Ticket Notes': string;
    'First Name': string; 'Last Name': string; 'Email Address': string;
    'Phone Number': string; 'Date of Transaction': string; 'Receipt Number': string;
    'Purchase Amount': string; 'Last 4 Digits of Card': string; Product: string;
    'Store Name': string; 'Receipt File': string; Status: Status | string;
    'Office Notes': string; 'File 1': string; 'File 2': string; 'File 3': string;
    'File 4': string; Timestamp: string; [key: string]: string;
}
export interface FileForUpload { key: string; filename: string; mimeType: string; data: string; }
export interface FormState {
    ticketId?: string; fullName: string; email: string; phoneNumber: string;
    formType: string; issueDescription: string; purchaseDate: string; invoiceNumber: string;
    purchaseAmount: string; last4Digits: string; product: string; storeOfPurchase: string;
    status: string; officeNotes: string; receipt?: string; file1?: string; file2?: string;
    file3?: string; file4?: string;
}
export interface SortConfig { key: keyof CustomerRecord | 'Customer'; direction: 'ascending' | 'descending'; }


// Accounts
export type AccountStatus = 'Active' | 'Inactive' | 'Pending';
export interface Account {
  accountID: string; timestamp: string; accountType: string;
  subCategory: string; company: string; locationName: string;
  locationAddress: string; expiration: string; amountDue: number;
  billingType: string; billingAmount: number; paymentMethod: string;
  licenseNumber: string; insuranceCarrier: string; insuranceBroker: string;
  notes: string; status: AccountStatus | string; fileUpload?: string;
}


// Tasks
export interface Task {
  TaskID: string; 'Task Name': string; 'Due Date': string;
  'Task Description': string; Contact: string; // ContactID
  Account: string; // AccountID
  Status: 'To Do' | 'In Progress' | 'Pending Review' | 'Completed' | 'Canceled';
  Priority: 'Critical' | 'High' | 'Medium' | 'Low';
  Notes: string; 'Completed On': string;
}
export type TaskFormState = Omit<Task, 'TaskID'>;


// Directory
export interface Contact {
  ContactID: string; 'First Name': string; 'Last Name': string;
  'Phone Number': string; 'Email Address': string; Address: string;
  'Company/Organization': string; 'Job Title': string; Department: string;
  Status: 'Active' | 'Inactive' | 'Lead' | 'Do Not Contact';
  Notes: string; 'Created On': string;
}
export type ContactFormState = Omit<Contact, 'ContactID' | 'Created On'>;
export enum Page {
  DASHBOARD = 'DASHBOARD',
  PRODUCTS = 'PRODUCTS',
  COUNT = 'COUNT',
  WAREHOUSE_INVENTORY = 'WAREHOUSE_INVENTORY',
  INVENTORY_LOG = 'INVENTORY_LOG',
  USERS = 'USERS',
  ORDERS = 'ORDERS',
  LOCATIONS = 'LOCATIONS',
  ACCOUNTS = 'ACCOUNTS',
  MANAGER_PORTAL = 'MANAGER_PORTAL',
  CUSTOMER_SERVICE = 'CUSTOMER_SERVICE',
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
  role: 'Admin' | 'Manager' | 'Office' | 'Accounting' | string;
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
  transactionType: 'Stock In' | 'In-Store Sale' | 'Warehouse Shipping' | 'Adjustment-Damage' | 'Initial Stock' | 'Adjustment-Variance' | 'Adjustment-Manual';
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

export interface Account {
  accountID: string;
  accountType: string;
  subCategory: string;
  company: string;
  location: string;
  locationNumber: string;
  expiration: string;
  amountDue: number;
  billingType: string;
  billingAmount: number;
  paymentMethod: string;
  licenseNumber?: string;
  insuranceCarrier?: string;
  insuranceBroker?: string;
  notes?: string;
  status: string;
  timestamp: string;
}
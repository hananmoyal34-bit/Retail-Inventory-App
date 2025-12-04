
import { readSheet } from './googleSheetService';
import { Product, User, Location, InventoryLog, LocationOrder, CountLog, ShippingData, AppSheetProduct, WarehouseCountLog, ProductCategory, DraftCount, Account, CustomerRecord, Task, Contact } from '../types';
// FIX: Import getUsers from writeService to re-export it from dataService for consistent API.
import { fetchProductCategories, fetchAppSheetProducts, getUsers as fetchUsers } from './writeService';

export let TIMEZONE = 'America/Los_Angeles'; // Default timezone, will be overwritten by config.

/**
 * Initializes app-wide configuration by fetching it from the 'Config' sheet.
 * This should be called once when the application starts.
 */
export const initializeAppConfig = async (): Promise<void> => {
  try {
    const data = await readSheet(SHEET_NAMES.config);
    if (data.length > 0) {
      const configMap = new Map<string, string>();
      // Assumes key-value pairs in the first two columns
      data.forEach(row => {
        if (row[0] && row[1]) {
          configMap.set(row[0].trim(), row[1].trim());
        }
      });
      
      const sheetTimezone = configMap.get('Timezone');
      if (sheetTimezone) {
        // Test if the timezone is valid before setting it
        try {
          new Intl.DateTimeFormat('en-US', { timeZone: sheetTimezone }).format();
          TIMEZONE = sheetTimezone;
          console.log(`Timezone successfully set to: ${TIMEZONE}`);
        } catch (e) {
          console.error(`Invalid timezone specified in Config sheet: "${sheetTimezone}". Falling back to default.`);
        }
      }
    }
  } catch (error) {
    console.error("Could not fetch or apply app configuration from Google Sheet. Using default settings.", error);
  }
};


/**
 * Gets the current date as a 'YYYY-MM-DD' string in the specified timezone.
 */
export const getCurrentDateInTimezone = (): string => {
  try {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: TIMEZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    return formatter.format(new Date());
  } catch (e) {
    console.error(`Failed to format date for ${TIMEZONE} timezone, falling back to local date.`, e);
    const d = new Date();
    const year = d.getFullYear();
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const day = d.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
};

/**
 * Formats a given date string or object into a 'YYYY-MM-DD' string in the specified timezone.
 * @param date - The date to format.
 * @returns {string | null} A date string in YYYY-MM-DD format, or null if the date is invalid.
 */
export const formatDateToYMD = (date: string | Date): string | null => {
    if (!date) return null;
    try {
        const d = new Date(date);
        if (isNaN(d.getTime())) return null;
        const formatter = new Intl.DateTimeFormat('en-CA', {
            timeZone: TIMEZONE,
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
        });
        return formatter.format(d);
    } catch (e) {
        console.warn(`Could not parse or format date: ${date}`);
        return null;
    }
};

/**
 * Formats a given date string or object into a 'MM/DD/YYYY' string in the specified timezone.
 * @param date - The date to format.
 * @returns {string | null} A date string in MM/DD/YYYY format, or null if the date is invalid.
 */
export const formatDateToMDY = (date: string | Date): string | null => {
    if (!date) return null;
    try {
        const d = new Date(date);
        // Check if the date is valid. new Date('invalid') results in an Invalid Date object.
        if (isNaN(d.getTime())) return null;

        const formatter = new Intl.DateTimeFormat('en-US', {
            timeZone: TIMEZONE,
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
        });
        return formatter.format(d);
    } catch (e) {
        console.warn(`Could not parse or format date: ${date}`);
        return null;
    }
};


/**
 * Formats a given date string or object into a locale string with time (AM/PM) in the specified timezone.
 * e.g., "6/5/2024, 5:30:45 PM"
 * @param date - The date to format.
 */
export const formatToLocaleString = (date: string | Date): string => {
    if (!date) return 'Invalid Date';
    try {
        const options: Intl.DateTimeFormatOptions = { 
            timeZone: TIMEZONE,
            year: 'numeric',
            month: 'numeric',
            day: 'numeric',
            hour: 'numeric',
            minute: 'numeric',
            second: 'numeric',
            hour12: true,
        };
        return new Date(date).toLocaleString('en-US', options);
    } catch (e) {
        console.warn(`Could not parse or format date: ${date}`);
        return 'Invalid Date';
    }
};

const SHEET_NAMES = {
  products: 'Products',
  users: 'Users',
  locations: 'Locations',
  inventoryLogs: 'Inventory Log',
  locationOrders: 'Location Orders',
  count: 'Count',
  config: 'Config',
  shipping: 'Shipping',
  productsListAppsheet: 'PRODUCTS_LIST_APPSHEET',
  warehouseCount: 'Warehouse Count',
  productsCategories: 'PRODUCTS_CATEGORIES',
  draftCounts: 'Draft Counts',
  accounts: 'Accounts',
  customerService: "Customer Service Hub",
  tasks: "Tasks",
  directory: "Directory",
};

// Helper to parse data safely.
const safeParseInt = (val: string) => val ? parseInt(val.trim(), 10) : 0;
const safeParseFloat = (val: string) => val ? parseFloat(val.trim().replace(/[^0-9.-]+/g,"")) : 0;
const safeParseString = (val: any) => val ? String(val) : '';

export const getProducts = async (): Promise<Product[]> => {
  const data = await readSheet(SHEET_NAMES.products);
  if (data.length <= 1) return []; // No data beyond header
  const rows = data.slice(1);
  return rows.map(row => ({
    // Column Structure based on user info:
    // 0: ProductID
    // 1: Product Name
    // 2: Category (Unused in Product type but present in sheet)
    // 3: Image
    // 4: Locations (Unused in Product type)
    // 5: CreateDate
    productID: safeParseString(row[0]),
    productName: safeParseString(row[1]),
    imageUrl: safeParseString(row[3]),
    createDate: formatDateToYMD(safeParseString(row[5])) || '',
  })).filter(p => p.productID); // Filter out empty rows
};

export const getAppSheetProducts = async (): Promise<AppSheetProduct[]> => {
  // Use the direct script fetch to avoid gviz caching issues.
  return await fetchAppSheetProducts();
};

export const getProductCategories = async (): Promise<ProductCategory[]> => {
  // Use the direct script fetch to avoid gviz caching issues.
  return await fetchProductCategories();
};

export const getLocations = async (): Promise<Location[]> => {
  const data = await readSheet(SHEET_NAMES.locations);
  if (data.length <= 1) return [];

  const headers = data[0].map(h => h.trim());
  const rows = data.slice(1);

  const colMap = {
    id: headers.indexOf('LocationID'),
    name: headers.indexOf('Location Name'),
  };

  if (colMap.id === -1 || colMap.name === -1) {
    console.error("One or more required columns are missing in the 'Locations' sheet: 'LocationID', 'Location Name'");
    return [];
  }

  return rows.map(row => ({
    id: safeParseString(row[colMap.id]),
    name: safeParseString(row[colMap.name]),
  })).filter(l => l.id);
};

export const getInventoryLogs = async (): Promise<InventoryLog[]> => {
  const data = await readSheet(SHEET_NAMES.inventoryLogs);
  if (data.length <= 1) return [];
  const rows = data.slice(1);
  return rows.map(row => ({
    logID: safeParseString(row[0]),
    date: safeParseString(row[1]),
    location: safeParseString(row[2]),
    productName: safeParseString(row[3]),
    transactionType: safeParseString(row[4]) as any,
    quantity: safeParseInt(row[5]),
  })).filter(log => log.logID);
};

export const getCountLogs = async (): Promise<CountLog[]> => {
  const data = await readSheet(SHEET_NAMES.count);
  if (data.length <= 1) return [];
  const rows = data.slice(1);
  return rows.map(row => ({
    logID: safeParseString(row[0]),
    date: safeParseString(row[1]),
    location: safeParseString(row[2]),
    productName: safeParseString(row[3]),
    openingStock: safeParseInt(row[4]),
    stockIn: safeParseInt(row[5]),
    inStoreSales: safeParseInt(row[6]),
    warehouseShipping: safeParseInt(row[7]),
    physicalEndCount: safeParseInt(row[8]),
    calculatedEndCount: safeParseInt(row[9]),
    variance: safeParseInt(row[10]),
  })).filter(log => log.logID);
};

export const getDraftCounts = async (): Promise<DraftCount[]> => {
  const data = await readSheet(SHEET_NAMES.draftCounts);
  if (data.length <= 1) return [];
  const rows = data.slice(1);
  return rows.map(row => ({
    draftID: safeParseString(row[0]),
    location: safeParseString(row[1]),
    date: safeParseString(row[2]),
    productName: safeParseString(row[3]),
    openingStock: safeParseInt(row[4]),
    stockIn: safeParseInt(row[5]),
    inStoreSales: safeParseInt(row[6]),
    warehouseShipping: safeParseInt(row[7]),
    physicalEndCount: safeParseInt(row[8]),
    isOpeningStockManual: safeParseString(row[9]).toLowerCase() === 'true',
    lastUpdatedBy: safeParseString(row[10]),
    timestamp: safeParseString(row[11]),
  })).filter(d => d.draftID);
};

export const getWarehouseCountLogs = async (): Promise<WarehouseCountLog[]> => {
  const data = await readSheet(SHEET_NAMES.warehouseCount);
  if (data.length <= 1) return [];
  const rows = data.slice(1);
  return rows.map(row => ({
    countID: safeParseString(row[0]),
    productName: safeParseString(row[1]),
    color: safeParseString(row[2]),
    quantity: safeParseInt(row[3]),
    notes: safeParseString(row[4]),
    timestamp: safeParseString(row[5]),
    user: safeParseString(row[6]),
  })).filter(log => log.countID && log.productName);
};

export const getLocationOrders = async (): Promise<LocationOrder[]> => {
    const data = await readSheet(SHEET_NAMES.locationOrders);
    if (data.length <= 1) return [];
    const rows = data.slice(1);
    return rows.map(row => ({
        orderID: safeParseString(row[0]),
        item: safeParseString(row[1]),
        colors: safeParseString(row[2]),
        quantity: safeParseInt(row[3]),
        notes: safeParseString(row[4]),
        location: safeParseString(row[5]),
        createdBy: safeParseString(row[6]),
        timestamp: safeParseString(row[7]),
        userName: safeParseString(row[8]),
        officeNotes: safeParseString(row[9]),
        status: (safeParseString(row[10]) as any) || 'Pending',
    })).filter(o => o.orderID);
};

export const getShippingData = async (): Promise<ShippingData[]> => {
    const data = await readSheet(SHEET_NAMES.shipping);
    if (data.length <= 1) return [];

    // Get headers and trim them to prevent whitespace issues
    const headers = data[0].map(h => h.trim());
    const rows = data.slice(1);

    // --- This is the fix ---
    // Find column indices dynamically by their names
    const colMap = {
        timestamp: headers.indexOf('Timestamp'),
        storeName: headers.indexOf('Store Name'),
        orderNo: headers.indexOf('Order No.'),
        storeRepName: headers.indexOf('Store Rep Name'),
        firstName: headers.indexOf('First Name'),
        lastName: headers.indexOf('Last Name'),
        ackReceiptUrl: headers.indexOf('Acknowledgment Receipt') // <-- Finds the right column
    };

    // Error check: What if the column name changed?
    if (colMap.ackReceiptUrl === -1) {
        console.error("CRITICAL: Could not find 'Acknowledgment Receipt' column! Check sheet header names.");
    }
    // --- End of fix ---

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    // Now, we map using the safe colMap object
    return rows.map(row => ({
        timestamp: colMap.timestamp !== -1 ? safeParseString(row[colMap.timestamp]) : '',
        storeName: colMap.storeName !== -1 ? safeParseString(row[colMap.storeName]) : '',
        orderNo: colMap.orderNo !== -1 ? safeParseString(row[colMap.orderNo]) : '',
        storeRepName: colMap.storeRepName !== -1 ? safeParseString(row[colMap.storeRepName]) : '',
        firstName: colMap.firstName !== -1 ? safeParseString(row[colMap.firstName]) : '',
        lastName: colMap.lastName !== -1 ? safeParseString(row[colMap.lastName]) : '',
        
        //  ↓↓↓ THE FIX IN ACTION ↓↓↓
        ackReceiptUrl: colMap.ackReceiptUrl !== -1 ? safeParseString(row[colMap.ackReceiptUrl]) : '',
    
    })).filter(s => {
        if (!s.timestamp || !s.storeName) return false;
        try {
            const shipmentDate = new Date(s.timestamp);
            return !isNaN(shipmentDate.getTime()) && shipmentDate >= sevenDaysAgo;
        } catch (e) {
            return false;
        }
    });
};

// FIX: Add getUsers function to resolve import errors in other components.
export const getUsers = async (): Promise<User[]> => {
  return fetchUsers();
};

const mapRowToHeaders = <T,>(row: string[], headers: string[]): T => {
    const obj: any = {};
    headers.forEach((header, index) => {
        obj[header] = row[index];
    });
    return obj as T;
};

export const getCustomerRecords = async (): Promise<CustomerRecord[]> => {
  const data = await readSheet(SHEET_NAMES.customerService);
  if (data.length <= 1) return [];
  const headers = data[0];
  const rows = data.slice(1);
  return rows.map(row => mapRowToHeaders<CustomerRecord>(row, headers)).filter(r => r.TicketID);
};

export const getAccounts = async (): Promise<Account[]> => {
  const data = await readSheet(SHEET_NAMES.accounts);
  if (data.length <= 1) return [];
  const headers = data[0];
  const rows = data.slice(1);
  const accounts = rows.map(row => mapRowToHeaders<Account>(row, headers)).filter(acc => acc.accountID);
  return accounts.map(acc => ({
      ...acc,
      amountDue: safeParseFloat(String(acc.amountDue)),
      billingAmount: safeParseFloat(String(acc.billingAmount)),
  }));
};

export const getTasks = async (): Promise<Task[]> => {
  const data = await readSheet(SHEET_NAMES.tasks);
  if (data.length <= 1) return [];
  const headers = data[0];
  const rows = data.slice(1);
  return rows.map(row => mapRowToHeaders<Task>(row, headers)).filter(t => t.TaskID);
};

export const getContacts = async (): Promise<Contact[]> => {
  const data = await readSheet(SHEET_NAMES.directory);
  if (data.length <= 1) return [];
  const headers = data[0];
  const rows = data.slice(1);
  return rows.map(row => mapRowToHeaders<Contact>(row, headers)).filter(c => c.ContactID);
};

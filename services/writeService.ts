/**
 * ===============================================================================================
 * GOOGLE APPS SCRIPT INSTRUCTIONS
 * ===============================================================================================
 * To enable writing data to your Google Sheet, you must deploy the companion Apps Script.
 * 
 * 1. Open the file named `google-apps-script.js` in the file explorer.
 * 2. Copy the ENTIRE content of that file.
 * 3. Go to your Google Sheet -> Extensions -> Apps Script.
 * 4. Delete all existing code in the `Code.gs` file and paste the code you just copied.
 * 5. Click "Deploy" > "New Deployment", set "Who has access" to "Anyone", and deploy.
 * 6. Copy the final Web App URL and paste it into the `APPS_SCRIPT_URL` constant below.
 * ===============================================================================================
 */
import { CountEntry, Location, OrderPayload, ProductCategory, Product, SubmitWarehouseCountPayload, User, AppSheetProduct } from '../types';

// IMPORTANT: Replace this placeholder with your own Google Apps Script Web App URL.
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzmOdNeBoevXAQGD762kxFnr87GvVAxjVq5WT8p7N4SJZRwvZ2BoI645V1PuIOWkwrjsQ/exec';

export interface SubmitCountPayload {
  date: string;
  location: string;
  entries: CountEntry[];
}

/**
 * Centralized function to handle all POST requests to the Apps Script.
 * Includes more robust error handling to help diagnose issues.
 */
const postToAppsScript = async (payload: object): Promise<{ success: boolean; message: string }> => {
    try {
        const response = await fetch(APPS_SCRIPT_URL, {
            method: 'POST',
            mode: 'cors',
            redirect: 'follow',
            body: JSON.stringify(payload),
            headers: {
                "Content-Type": "text/plain;charset=utf-8",
            },
        });

        // Check for non-JSON responses which can happen with script errors or incorrect URLs
        const contentType = response.headers.get("content-type");
        if (!response.ok || !contentType || !contentType.includes("application/json")) {
            const text = await response.text();
            // Try to find a title in an HTML error page for a more helpful message
            const titleMatch = text.match(/<title>(.*?)<\/title>/);
            const detail = titleMatch ? titleMatch[1] : text.slice(0, 100);
            throw new Error(`Server returned a non-JSON response. Status: ${response.status}. Detail: ${detail}`);
        }
        
        const result = await response.json();

        if (result.status !== 'success') {
            throw new Error(result.message || 'An unknown error occurred in the Apps Script.');
        }

        return { success: true, message: result.message || 'Operation successful!' };

    } catch (error) {
        console.error('Error posting to Apps Script:', error);
        const message = error instanceof Error ? error.message : 'Failed to submit. Check network connection or script configuration.';
        return { success: false, message };
    }
};


export const submitInventoryCount = async (payload: SubmitCountPayload): Promise<{ success: boolean; message: string }> => {
  const scriptPayload = {
    action: 'submitInventoryCount',
    ...payload
  };
  return postToAppsScript(scriptPayload);
};

export const submitWarehouseCount = async (payload: SubmitWarehouseCountPayload): Promise<{ success: boolean; message: string }> => {
  const scriptPayload = {
    action: 'submitWarehouseCount',
    ...payload,
  };
  return postToAppsScript(scriptPayload);
};


const manageLocation = async (action: 'addLocation' | 'updateLocation' | 'deleteLocation', data: Partial<Location>): Promise<{ success: boolean; message:string }> => {
  const payload = {
    action,
    ...data,
  };
  return postToAppsScript(payload);
};

export const addLocation = async (location: { name: string, locationFullName: string }): Promise<{ success: boolean; message: string }> => {
  return manageLocation('addLocation', location);
};

export const updateLocation = async (location: Location): Promise<{ success: boolean; message: string }> => {
  return manageLocation('updateLocation', location);
};

export const deleteLocation = async (locationId: string): Promise<{ success: boolean; message: string }> => {
  return manageLocation('deleteLocation', { id: locationId });
};

export const submitOrder = async (payload: OrderPayload): Promise<{ success: boolean; message: string }> => {
  const scriptPayload = {
    action: 'submitOrder',
    ...payload,
  };
  return postToAppsScript(scriptPayload);
};

export const updateOrderStatus = async (payload: { orderID: string; status: string; officeNotes: string; quantity?: number }): Promise<{ success: boolean; message: string }> => {
    const scriptPayload = {
        action: 'updateOrderStatus',
        ...payload,
    };
    return postToAppsScript(scriptPayload);
};

export const addCategory = async (category: { category: string, subCategory: string }): Promise<{ success: boolean; message: string }> => {
  return postToAppsScript({ action: 'addCategory', ...category });
};

export const updateCategory = async (category: ProductCategory): Promise<{ success: boolean; message: string }> => {
  return postToAppsScript({ action: 'updateCategory', ...category });
};

// --- User Management Functions ---

export const addUser = async (user: Omit<User, 'userID'>): Promise<{ success: boolean; message: string }> => {
  return postToAppsScript({ action: 'addUser', ...user });
};

export const updateUser = async (user: User): Promise<{ success: boolean; message: string }> => {
  return postToAppsScript({ action: 'updateUser', ...user });
};

// --- Product Management Functions ---

export const addProduct = async (product: { productName: string; imageUrl: string }): Promise<{ success: boolean; message: string }> => {
  return postToAppsScript({ action: 'addProduct', ...product });
};

export const updateProduct = async (product: Product): Promise<{ success: boolean; message: string }> => {
  return postToAppsScript({ action: 'updateProduct', ...product });
};

// --- AppSheet Product Management Functions ---

export const addAppSheetProduct = async (product: AppSheetProduct): Promise<{ success: boolean; message: string }> => {
  const payload = {
    ...product,
    colors: product.colors.join(', '), // Convert array to comma-separated string
  };
  return postToAppsScript({ action: 'addAppSheetProduct', ...payload });
};

export const updateAppSheetProduct = async (product: Pick<AppSheetProduct, 'name' | 'category' | 'subCategory' | 'lowStockThreshold'>): Promise<{ success: boolean; message: string }> => {
  return postToAppsScript({ action: 'updateAppSheetProduct', ...product });
};
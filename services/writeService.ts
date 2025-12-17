
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
import { CountEntry, Location, OrderPayload, ProductCategory, Product, SubmitWarehouseCountPayload, User, AppSheetProduct, SaveDraftPayload, Account, Task, TaskFormState, Contact, ContactFormState, FormState, FileForUpload, UpdateOrderPayload } from '../types';

// IMPORTANT: Replace this placeholder with your own Google Apps Script Web App URL.
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzmOdNeBoevXAQGD762kxFnr87GvVAxjVq5WT8p7N4SJZRwvZ2BoI645V1PuIOWkwrjsQ/exec';

export interface SubmitCountPayload {
  date: string;
  location: string;
  entries: CountEntry[];
}

/**
 * Centralized function to handle all POST requests to the Apps Script.
 * Automatically injects the session token and handles authorization errors.
 */
const postToAppsScript = async (payload: { action: string, [key: string]: any }): Promise<{ success: boolean; message: string; data?: any }> => {
    try {
        // Changed to localStorage to persist sessions better
        const token = localStorage.getItem('inventory_system_token');
        const fullPayload: any = { ...payload };

        if (payload.action !== 'login' && payload.action !== 'verifySession') {
            if (!token) {
                 // If no token, force a reload to go back to the login screen.
                window.location.reload();
                throw new Error("Authorization failed: No session token found.");
            }
            fullPayload.token = token;
        }

        const response = await fetch(APPS_SCRIPT_URL, {
            method: 'POST',
            mode: 'cors',
            redirect: 'follow',
            body: JSON.stringify(fullPayload),
            headers: {
                "Content-Type": "text/plain;charset=utf-8",
            },
        });

        const contentType = response.headers.get("content-type");
        if (!response.ok || !contentType || !contentType.includes("application/json")) {
            const text = await response.text();
            const titleMatch = text.match(/<title>(.*?)<\/title>/);
            const detail = titleMatch ? titleMatch[1] : text.slice(0, 100);
            throw new Error(`Server returned a non-JSON response. Status: ${response.status}. Detail: ${detail}`);
        }
        
        const result = await response.json();

        // Handle authorization errors specifically by logging the user out.
        if (result.status === 'error' && (result.message.includes('Authorization failed') || result.message.includes('Invalid token'))) {
            localStorage.removeItem('inventory_system_token');
            window.location.reload(); 
            throw new Error(result.message);
        }

        if (result.status !== 'success') {
            throw new Error(result.message || 'An unknown error occurred in the Apps Script.');
        }

        return { success: true, message: result.message || 'Operation successful!', data: result.data };

    } catch (error) {
        console.error('Error posting to Apps Script:', error);
        const message = error instanceof Error ? error.message : 'Failed to submit. Check network connection or script configuration.';
        // Don't return success:false here, let the error propagate to be caught by the caller.
        throw new Error(message);
    }
};

// --- Auth Functions ---

export const login = async (accessCode: string, role: string): Promise<{ success: boolean; token?: string; message: string }> => {
    try {
        const result = await postToAppsScript({ action: 'login', accessCode, role });
        return { success: true, token: result.data.token, message: 'Login successful' };
    } catch(error) {
        return { success: false, message: error instanceof Error ? error.message : 'Login failed' };
    }
};

export const verifySession = async (token: string): Promise<{ success: boolean; user?: User; message: string }> => {
    try {
         const result = await postToAppsScript({ action: 'verifySession', token });
         return { success: true, user: result.data.user, message: 'Session verified' };
    } catch(error) {
        return { success: false, message: error instanceof Error ? error.message : 'Session invalid' };
    }
};


// --- Data Write/Read Functions ---

export const submitInventoryCount = async (payload: SubmitCountPayload): Promise<{ success: boolean; message: string }> => {
  const scriptPayload = {
    action: 'submitInventoryCount',
    ...payload
  };
  return postToAppsScript(scriptPayload);
};

export const saveDraftCount = async (payload: SaveDraftPayload): Promise<{ success: boolean; message: string; timestamp?: string }> => {
  const scriptPayload = {
    action: 'saveDraftCount',
    ...payload
  };
  const result = await postToAppsScript(scriptPayload);
  return { ...result, timestamp: result.data?.timestamp };
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

export const addLocation = async (location: { name: string }): Promise<{ success: boolean; message: string }> => {
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

export const updateOrder = async (payload: UpdateOrderPayload): Promise<{ success: boolean; message: string }> => {
    return postToAppsScript({ action: 'updateOrder', ...payload });
};

export const updateOrderStatus = async (payload: { orderID: string; status: string; officeNotes: string; quantity?: number }): Promise<{ success: boolean; message: string }> => {
    const scriptPayload = {
        action: 'updateOrderStatus',
        ...payload,
    };
    return postToAppsScript(scriptPayload);
};

export const deleteOrder = async (orderID: string): Promise<{ success: boolean; message: string }> => {
    return postToAppsScript({ action: 'deleteOrder', orderID });
};

export const addCategory = async (category: { category: string, subCategory: string }): Promise<{ success: boolean; message: string }> => {
  return postToAppsScript({ action: 'addCategory', ...category });
};

export const updateCategory = async (category: ProductCategory): Promise<{ success: boolean; message: string }> => {
  return postToAppsScript({ action: 'updateCategory', ...category });
};

export const deleteCategory = async (categoryId: string): Promise<{ success: boolean; message: string }> => {
  return postToAppsScript({ action: 'deleteCategory', categoryID: categoryId });
};

export const fetchProductCategories = async (): Promise<ProductCategory[]> => {
  const result = await postToAppsScript({ action: 'getProductCategories' });
  if (result.success && Array.isArray(result.data)) {
    return result.data;
  }
  console.error("Failed to fetch product categories from script:", result.message);
  return [];
};

export const fetchAppSheetProducts = async (): Promise<AppSheetProduct[]> => {
  const result = await postToAppsScript({ action: 'getAppSheetProducts' });
  if (result.success && Array.isArray(result.data)) {
    return result.data.map((p: any) => ({
      ...p,
      lowStockThreshold: Number(p.lowStockThreshold) || 10,
      isActive: p.isActive !== false // ensure boolean
    }));
  }
  console.error("Failed to fetch AppSheet products from script:", result.message);
  return [];
};


// --- User Management Functions ---
export const getUsers = async (): Promise<User[]> => {
  const result = await postToAppsScript({ action: 'getUsers' });
  if(result.success && Array.isArray(result.data)) {
    return result.data;
  }
  return [];
};

export const addUser = async (user: Omit<User, 'userID'>): Promise<{ success: boolean; message: string }> => {
  return postToAppsScript({ action: 'addUser', ...user });
};

export const updateUser = async (user: User): Promise<{ success: boolean; message: string }> => {
  return postToAppsScript({ action: 'updateUser', ...user });
};

export const deleteUser = async (userId: string): Promise<{ success: boolean; message: string }> => {
  return postToAppsScript({ action: 'deleteUser', userID: userId });
};

// --- Product Management Functions ---

export const addProduct = async (product: { productName: string; imageUrl: string }): Promise<{ success: boolean; message: string }> => {
  return postToAppsScript({ action: 'addProduct', ...product });
};

export const updateProduct = async (product: Product): Promise<{ success: boolean; message: string }> => {
  return postToAppsScript({ action: 'updateProduct', ...product });
};

export const updateDailyCountStatus = async (productName: string, isOnDailyCount: boolean): Promise<{ success: boolean; message: string }> => {
    return postToAppsScript({ action: 'updateDailyCountStatus', productName, isOnDailyCount });
};


// --- AppSheet Product Management Functions ---

export const addAppSheetProduct = async (product: AppSheetProduct): Promise<{ success: boolean; message: string }> => {
  const payload = {
    ...product,
    colors: product.colors.join(', '), // Convert array to comma-separated string
  };
  return postToAppsScript({ action: 'addAppSheetProduct', ...payload });
};

export const updateAppSheetProduct = async (product: { oldName: string, name: string, colors: string, category: string, subCategory: string, lowStockThreshold: number, isActive: boolean }): Promise<{ success: boolean; message: string }> => {
  return postToAppsScript({ action: 'updateAppSheetProduct', ...product });
};

export const updateProductStatus = async (productName: string, isActive: boolean): Promise<{ success: boolean; message: string }> => {
    return postToAppsScript({ action: 'updateProductStatus', productName, isActive });
};

export const deleteAppSheetProduct = async (productName: string): Promise<{ success: boolean; message: string }> => {
  return postToAppsScript({ action: 'deleteAppSheetProduct', productName });
};


// --- Office Modules Write Functions ---

// CSHub
export const createRecord = async (formData: FormState, files: FileForUpload[]): Promise<any> => {
    return postToAppsScript({ action: 'createCSHubRecord', payload: { formData, files } });
};
export const updateRecord = async (formData: FormState, files: FileForUpload[]): Promise<any> => {
    return postToAppsScript({ action: 'updateCSHubRecord', payload: { formData, files } });
}
export const deleteRecord = async (ticketId: string): Promise<any> => {
    return postToAppsScript({ action: 'deleteCSHubRecord', payload: { ticketId } });
}

// Accounts
export const addAccount = async (account: Omit<Account, 'accountID' | 'timestamp'>, file: FileForUpload | null): Promise<{ success: boolean; message: string }> => {
  return postToAppsScript({ action: 'addAccount', payload: { ...account, file } });
};
export const updateAccount = async (account: Account, file: FileForUpload | null): Promise<{ success: boolean; message: string }> => {
  return postToAppsScript({ action: 'updateAccount', payload: { ...account, file } });
};
export const deleteAccount = async (accountId: string): Promise<{ success: boolean; message: string }> => {
  return postToAppsScript({ action: 'deleteAccount', payload: { accountID: accountId } });
};

// Tasks
export const addTask = async (task: TaskFormState): Promise<{ success: boolean; message: string }> => {
  return postToAppsScript({ action: 'addTask', payload: task });
};
export const updateTask = async (task: Task): Promise<{ success: boolean; message: string }> => {
  return postToAppsScript({ action: 'updateTask', payload: task });
};
export const deleteTask = async (taskId: string): Promise<{ success: boolean; message: string }> => {
  return postToAppsScript({ action: 'deleteTask', payload: { TaskID: taskId } });
};

// Directory
export const addContact = async (contact: ContactFormState): Promise<{ success: boolean; message: string }> => {
  return postToAppsScript({ action: 'addContact', payload: contact });
};
export const updateContact = async (contact: Contact): Promise<{ success: boolean; message: string }> => {
  return postToAppsScript({ action: 'updateContact', payload: contact });
};
export const deleteContact = async (contactId: string): Promise<{ success: boolean; message: string }> => {
  return postToAppsScript({ action: 'deleteContact', payload: { ContactID: contactId } });
};

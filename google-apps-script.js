
/**
 * ======================================================================================
 *  Retail Inventory System - Google Apps Script Backend (v2 - Secured)
 *  ======================================================================================
 *  This script includes token-based authentication and Role-Based Access Control (RBAC).
 * ======================================================================================
 */

// --- Configuration ---
const SHEET_NAMES = {
  inventoryLog: 'Inventory Log', count: 'Count', locations: 'Locations',
  locationOrders: 'Location Orders', warehouseCount: 'Warehouse Count',
  productsCategories: 'PRODUCTS_CATEGORIES', users: 'Users', products: 'Products',
  productsListAppsheet: 'PRODUCTS_LIST_APPSHEET', draftCounts: 'Draft Counts',
  accounts: 'Accounts'
};

const LOCK_TIMEOUT_SECONDS = 30;
const TOKEN_EXPIRATION_SECONDS = 8 * 60 * 60; // 8 hours

// --- Role-Based Access Control (RBAC) ---
const PERMISSIONS = {
  'Admin': ['*'], // Wildcard for all actions
  'Manager': [
    'submitOrder',
    'updateOrder',
    'deleteOrder',
    'getAppSheetProducts'
    ],
  'Logistics': [
    'submitInventoryCount', 'saveDraftCount', 'submitWarehouseCount',
    'updateOrderStatus', 'deleteOrder', 'getUsers', 'getProductCategories',
    'getAppSheetProducts',
    // Added Product Management Permissions
    'addAppSheetProduct', 'updateAppSheetProduct', 'deleteAppSheetProduct',
    // Added Category Management & Daily Count Permissions
    'addCategory', 'updateCategory', 'deleteCategory', 'updateDailyCountStatus',
    'addProduct', 'updateProduct'
  ],
  'Office': [
    'getUsers', 'getProductCategories', 'getAppSheetProducts' // Example read-only access
  ]
};


// --- Main Entry Point ---
function doPost(e) {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(LOCK_TIMEOUT_SECONDS * 1000)) {
    return createJsonResponse({ status: 'error', message: 'Server is busy, please try again.' });
  }
  
  try {
    const payload = JSON.parse(e.postData.contents);
    const action = payload.action;

    if (!action) throw new Error("No action specified in the payload.");

    // Public actions that don't require a token
    if (action === 'login') {
      return createJsonResponse(handleLogin(payload));
    }
    
    // All other actions are protected
    if (!payload.token) throw new Error("Authorization failed: Missing token.");

    const userData = verifyToken(payload.token); // This will throw on failure
    
    // Re-verify action for verifySession
    if (action === 'verifySession') {
      return createJsonResponse({ status: 'success', data: { user: userData }});
    }

    // Check permissions for all other actions
    const userRole = userData.role;
    const allowedActions = PERMISSIONS[userRole] || [];
    if (!allowedActions.includes('*') && !allowedActions.includes(action)) {
      throw new Error('Authorization failed: User does not have permission for action: ' + action);
    }
    
    // Add user context to the payload for handlers that might need it
    payload.currentUser = userData;

    const response = routeAction(action, payload);
    return createJsonResponse(response);

  } catch (error) {
    Logger.log(`Error: ${error.toString()}\nStack: ${error.stack}`);
    return createJsonResponse({ status: 'error', message: error.message });
  } finally {
    lock.releaseLock();
  }
}

function createJsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function routeAction(action, payload) {
    switch (action) {
      // Data Read Actions (Protected)
      case 'getUsers': return handleGetUsers();
      case 'getProductCategories': return handleGetProductCategories();
      case 'getAppSheetProducts': return handleGetAppSheetProducts();
      // Write Actions
      case 'submitInventoryCount': return handleSubmitInventoryCount(payload);
      case 'saveDraftCount': return handleSaveDraftCount(payload);
      case 'submitWarehouseCount': return handleSubmitWarehouseCount(payload);
      case 'submitOrder': return handleSubmitOrder(payload);
      case 'updateOrder': return handleUpdateOrder(payload);
      case 'addLocation': return handleAddLocation(payload);
      case 'updateLocation': return handleUpdateLocation(payload);
      case 'deleteLocation': return handleDeleteLocation(payload);
      case 'updateOrderStatus': return handleUpdateOrderStatus(payload);
      case 'deleteOrder': return handleDeleteOrder(payload);
      case 'addCategory': return handleAddCategory(payload);
      case 'updateCategory': return handleUpdateCategory(payload);
      case 'deleteCategory': return handleDeleteCategory(payload);
      case 'addUser': return handleAddUser(payload);
      case 'updateUser': return handleUpdateUser(payload);
      case 'deleteUser': return handleDeleteUser(payload);
      case 'addProduct': return handleAddProduct(payload);
      case 'updateProduct': return handleUpdateProduct(payload);
      case 'updateDailyCountStatus': return handleUpdateDailyCountStatus(payload);
      case 'addAppSheetProduct': return handleAddAppSheetProduct(payload);
      case 'updateAppSheetProduct': return handleUpdateAppSheetProduct(payload);
      case 'deleteAppSheetProduct': return handleDeleteAppSheetProduct(payload);
      case 'addAccount': return handleAddAccount(payload);
      case 'updateAccount': return handleUpdateAccount(payload);
      case 'deleteAccount': return handleDeleteAccount(payload);
      default: throw new Error(`Unknown action: ${action}`);
    }
}


// --- JWT-like Token Authentication ---

function getSecretKey() {
  const properties = PropertiesService.getScriptProperties();
  let secret = properties.getProperty('JWT_SECRET');
  if (!secret) {
    secret = Utilities.getUuid() + Utilities.getUuid();
    properties.setProperty('JWT_SECRET', secret);
  }
  return secret;
}

function base64UrlEncode(data) {
  return Utilities.base64EncodeWebSafe(data).replace(/=/g, '');
}

function createToken(payload) {
  const secret = getSecretKey();
  const header = { alg: 'HS256', typ: 'JWT' };
  
  payload.exp = Math.floor(Date.now() / 1000) + TOKEN_EXPIRATION_SECONDS;

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  
  const signatureInput = `${encodedHeader}.${encodedPayload}`;
  const signature = Utilities.computeHmacSha256Signature(signatureInput, secret);
  const encodedSignature = base64UrlEncode(signature);

  return `${signatureInput}.${encodedSignature}`;
}

function verifyToken(token) {
  const parts = token.split('.');
  if (parts.length !== 3) throw new Error("Invalid token format.");

  const [encodedHeader, encodedPayload, encodedSignature] = parts;
  const secret = getSecretKey();
  
  const signatureInput = `${encodedHeader}.${encodedPayload}`;
  const expectedSignature = base64UrlEncode(Utilities.computeHmacSha256Signature(signatureInput, secret));

  if (expectedSignature !== encodedSignature) {
    throw new Error("Authorization failed: Invalid signature.");
  }
  
  const payload = JSON.parse(Utilities.newBlob(Utilities.base64DecodeWebSafe(encodedPayload)).getDataAsString());

  if (payload.exp < Math.floor(Date.now() / 1000)) {
    throw new Error("Authorization failed: Token expired.");
  }

  // Return the user data from the payload
  return {
    userID: payload.userID,
    name: payload.name,
    role: payload.role,
    location: payload.location,
  };
}


// --- Authentication Actions ---
function handleLogin(payload) {
  const { accessCode, role } = payload;
  if (!accessCode || !role) throw new Error("Access code and role are required.");

  const sheet = getSheet(SHEET_NAMES.users);
  const data = sheet.getDataRange().getValues();
  const headers = data[0].map(h => String(h).trim());
  const codeCol = headers.indexOf('AccessCode');
  const roleCol = headers.indexOf('Role');
  
  let foundUser = null;
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][codeCol]).trim() === String(accessCode).trim() && String(data[i][roleCol]).trim() === String(role).trim()) {
      foundUser = data[i];
      break;
    }
  }

  if (foundUser) {
    const userPayload = {
      userID: foundUser[headers.indexOf('UserID')],
      name: foundUser[headers.indexOf('Name')],
      role: foundUser[headers.indexOf('Role')],
      location: foundUser[headers.indexOf('Location')],
    };
    const token = createToken(userPayload);
    return { status: 'success', data: { token: token }};
  } else {
    throw new Error("Invalid credentials.");
  }
}

function handleGetUsers() {
  const sheet = getSheet(SHEET_NAMES.users);
  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return { status: 'success', data: [] };
  
  const headers = data[0];
  const users = data.slice(1).map(row => {
    const userObj = {};
    headers.forEach((header, i) => {
      // Simple camelCase conversion
      const key = header.charAt(0).toLowerCase() + header.slice(1).replace(/\s/g, '');
      userObj[key] = row[i];
    });
    return userObj;
  }).filter(u => u.userID);

  return { status: 'success', data: users };
}

// --- Utility Functions ---
function getSheet(name) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(name);
  if (!sheet) throw new Error(`Sheet not found: "${name}".`);
  return sheet;
}
function generateUniqueId() { return Utilities.getUuid(); }
function findRowById(sheet, id, idColumnName) {
  const data = sheet.getDataRange().getValues();
  if (data.length < 1) return null;
  const headers = data[0].map(h => String(h || '').trim());
  const idCol = headers.indexOf(idColumnName);
  if (idCol === -1) throw new Error(`Column '${idColumnName}' not in sheet '${sheet.getName()}'.`);
  const idValue = String(id || '').trim();
  if (!idValue) return null;
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][idCol] || '').trim().toLowerCase() === idValue.toLowerCase()) {
      return { rowIndex: i + 1, rowData: data[i], headers: headers };
    }
  }
  return null;
}

// Helper to find a column index case-insensitively, given list of candidates
function findColumnName(sheet, candidates) {
  const data = sheet.getDataRange().getValues();
  if (data.length < 1) return null;
  const headers = data[0].map(h => String(h || '').trim().toLowerCase());
  
  for (const candidate of candidates) {
    const candidateLower = candidate.toLowerCase();
    for (let i = 0; i < headers.length; i++) {
      if (headers[i] === candidateLower) {
        // Return the actual header string from the sheet
        return data[0][i];
      }
    }
  }
  return null; 
}

function deleteDraftCounts(location, date) {
  const sheet = getSheet(SHEET_NAMES.draftCounts);
  if (sheet.getLastRow() < 2) return;
  const data = sheet.getDataRange().getValues();
  const dateYMD = new Date(date).toISOString().slice(0, 10);
  for (var i = data.length - 1; i >= 1; i--) {
    const row = data[i];
    const rowDateObj = new Date(row[2]);
    if (isNaN(rowDateObj.getTime())) continue;
    const rowDate = rowDateObj.toISOString().slice(0, 10);
    if (row[1] === location && rowDate === dateYMD) {
      sheet.deleteRow(i + 1);
    }
  }
}

// --- Action Handlers ---

function handleSubmitInventoryCount(payload) {
  const countSheet = getSheet(SHEET_NAMES.count);
  const logSheet = getSheet(SHEET_NAMES.inventoryLog);
  const location = payload.location;
  const date = new Date(payload.date);

  const countRows = [];
  const logRows = [];

  payload.entries.forEach(function(entry) {
    const calculatedEndCount = (entry.openingStock || 0) + (entry.stockIn || 0) - (entry.inStoreSales || 0) + (entry.warehouseShipping || 0);
    const variance = (entry.physicalEndCount || 0) - calculatedEndCount;

    countRows.push([
      generateUniqueId(), date, location, entry.productName,
      entry.openingStock, entry.stockIn, entry.inStoreSales, entry.warehouseShipping,
      entry.physicalEndCount, calculatedEndCount, variance
    ]);
    
    if (entry.stockIn > 0) logRows.push([generateUniqueId(), date, location, entry.productName, 'Stock In', entry.stockIn]);
    if (entry.inStoreSales > 0) logRows.push([generateUniqueId(), date, location, entry.productName, 'In-Store Sale', -entry.inStoreSales]);
    if (entry.warehouseShipping > 0) logRows.push([generateUniqueId(), date, location, entry.productName, 'Warehouse Shipping', entry.warehouseShipping]);
    if (variance !== 0) logRows.push([generateUniqueId(), date, location, entry.productName, 'Adjustment-Variance', variance]);
    if (entry.isOpeningStockManual) {
      const adjustment = entry.openingStock - entry.calculatedOpeningStock;
      if (adjustment !== 0) logRows.push([generateUniqueId(), date, location, entry.productName, 'Adjustment-Manual', adjustment]);
    }
  });

  if (countRows.length > 0) countSheet.getRange(countSheet.getLastRow() + 1, 1, countRows.length, countRows[0].length).setValues(countRows);
  if (logRows.length > 0) logSheet.getRange(logSheet.getLastRow() + 1, 1, logRows.length, logRows[0].length).setValues(logRows);

  deleteDraftCounts(location, date);

  return { status: 'success', message: 'Inventory count submitted successfully.' };
}

function handleSaveDraftCount(payload) {
  const sheet = getSheet(SHEET_NAMES.draftCounts);
  const { location, date, entries, userName } = payload;
  
  if (!location || !date || !entries || !userName) throw new Error("Missing data for saving draft.");

  deleteDraftCounts(location, date);
  
  const timestamp = new Date();
  const draftRows = entries.map(entry => [
    `${location}-${new Date(date).toISOString().slice(0, 10)}-${entry.productName}`,
    location, new Date(date), entry.productName,
    entry.openingStock, entry.stockIn, entry.inStoreSales, entry.warehouseShipping, entry.physicalEndCount,
    entry.isOpeningStockManual || false, userName, timestamp
  ]);
  
  if (draftRows.length > 0) sheet.getRange(sheet.getLastRow() + 1, 1, draftRows.length, draftRows[0].length).setValues(draftRows);
  
  return { status: 'success', message: 'Draft saved successfully.', data: { timestamp: timestamp.toISOString() } };
}

function handleSubmitWarehouseCount(payload) {
  const sheet = getSheet(SHEET_NAMES.warehouseCount);
  const serverTimestamp = new Date();
  const submissionMap = new Map(payload.entries.map(e => [`${e.productName}|${e.color}`, e]));
  
  const data = sheet.getDataRange().getValues();
  const headers = data.shift();
  const productCol = headers.indexOf('Product');
  const colorCol = headers.indexOf('Color');

  const rowsToDelete = data.map((row, index) => submissionMap.has(`${row[productCol]}|${row[colorCol]}`) ? index + 2 : -1).filter(i => i > -1);
  for(let i = rowsToDelete.length - 1; i >= 0; i--) sheet.deleteRow(rowsToDelete[i]);

  const newRows = payload.entries.map(e => [generateUniqueId(), e.productName, e.color, e.quantity, e.notes, serverTimestamp, payload.userName || '']);
  if (newRows.length > 0) sheet.getRange(sheet.getLastRow() + 1, 1, newRows.length, newRows[0].length).setValues(newRows);
  
  return { status: 'success', message: 'Warehouse count submitted successfully.' };
}

function handleSubmitOrder(payload) {
  const sheet = getSheet(SHEET_NAMES.locationOrders);
  const { userId, userName, locations, items } = payload;
  const date = new Date();
  const orderRows = locations.flatMap(location => items.map(item => [
    generateUniqueId(), item.name, item.color, item.quantity, item.notes,
    location, userId, date, userName, '', 'Pending'
  ]));
  if (orderRows.length > 0) sheet.getRange(sheet.getLastRow() + 1, 1, orderRows.length, orderRows[0].length).setValues(orderRows);
  return { status: 'success', message: 'Order submitted successfully!' };
}

function updateDraftCountStockIn(location, productName, quantityToAdd) {
  const sheet = getSheet(SHEET_NAMES.draftCounts);
  const data = sheet.getDataRange().getValues();
  const todayYMD = new Date().toISOString().slice(0, 10);
  
  for (let i = 1; i < data.length; i++) {
    const row = data[i], rowDate = new Date(row[2]).toISOString().slice(0, 10);
    if (rowDate === todayYMD && row[1] === location && row[3] === productName) {
      const stockInCol = 5;
      const current = Number(row[stockInCol]) || 0;
      sheet.getRange(i + 1, stockInCol + 1).setValue(current + Number(quantityToAdd));
      return;
    }
  }
  sheet.appendRow([`${location}-${todayYMD}-${productName}`, location, new Date(), productName, 0, quantityToAdd, 0, 0, 0, false, 'System-Auto', new Date()]);
}

function handleUpdateOrderStatus(payload) {
  const sheet = getSheet(SHEET_NAMES.locationOrders);
  const { orderID, status, officeNotes, quantity } = payload;
  const rowInfo = findRowById(sheet, orderID, 'OrderID');
  if (!rowInfo) throw new Error(`Order ID ${orderID} not found.`);
  
  const h = rowInfo.headers;
  const originalStatus = String(rowInfo.rowData[h.indexOf('Status')] || 'Pending').trim();
  
  if ((status === 'Pickup' || status === 'Partial') && originalStatus === 'Pending') {
    const productsSheet = getSheet(SHEET_NAMES.products);
    // Dynamically find product name column
    const productNameCol = findColumnName(productsSheet, ['ProductName', 'Product Name', 'Item', 'Name']);
    
    if (productNameCol) {
      const headerRow = productsSheet.getRange(1, 1, 1, productsSheet.getLastColumn()).getValues()[0];
      const colIndex = headerRow.indexOf(productNameCol);
      // Fetch only the product name column
      const productNames = productsSheet.getRange(2, colIndex + 1, productsSheet.getLastRow() - 1, 1).getValues().flat();
      
      const productName = rowInfo.rowData[h.indexOf('Item')];
      if (productNames.includes(productName)) {
        const orderQuantity = (status === 'Partial' && quantity != null) ? quantity : rowInfo.rowData[h.indexOf('Quantity')];
        updateDraftCountStockIn(rowInfo.rowData[h.indexOf('Location')], productName, orderQuantity);
      }
    }
  }
  
  sheet.getRange(rowInfo.rowIndex, h.indexOf('Status') + 1).setValue(status);
  sheet.getRange(rowInfo.rowIndex, h.indexOf('Office Notes') + 1).setValue(officeNotes);
  if (quantity != null) sheet.getRange(rowInfo.rowIndex, h.indexOf('Quantity') + 1).setValue(quantity);

  return { status: 'success', message: 'Order status updated.' };
}

function handleDeleteOrder(payload) {
  const sheet = getSheet(SHEET_NAMES.locationOrders);
  const rowInfo = findRowById(sheet, payload.orderID, 'OrderID');
  if (!rowInfo) throw new Error(`Order ID ${payload.orderID} not found.`);
  
  // Managers can only delete pending orders
  if (payload.currentUser.role === 'Manager') {
    const status = String(rowInfo.rowData[rowInfo.headers.indexOf('Status')] || '').trim();
    if (status !== 'Pending') {
       throw new Error('Authorization failed: Managers can only delete orders with "Pending" status.');
    }
  }
  
  sheet.deleteRow(rowInfo.rowIndex);
  return { status: 'success', message: 'Order deleted.' };
}

function handleAddLocation(payload) { getSheet(SHEET_NAMES.locations).appendRow([generateUniqueId(), payload.name]); return { status: 'success', message: 'Location added.' }; }
function handleUpdateLocation(payload) {
    const sheet = getSheet(SHEET_NAMES.locations);
    const rowInfo = findRowById(sheet, payload.id, 'LocationID');
    if (!rowInfo) throw new Error("Location ID not found.");
    sheet.getRange(rowInfo.rowIndex, rowInfo.headers.indexOf('Location Name') + 1).setValue(payload.name);
    return { status: 'success', message: 'Location updated.' };
}
function handleDeleteLocation(payload) {
    const sheet = getSheet(SHEET_NAMES.locations);
    const rowInfo = findRowById(sheet, payload.id, 'LocationID');
    if (!rowInfo) throw new Error("Location ID not found.");
    sheet.deleteRow(rowInfo.rowIndex);
    return { status: 'success', message: 'Location deleted.' };
}

function handleUpdateOrder(payload) {
  const sheet = getSheet(SHEET_NAMES.locationOrders);
  const { orderID, item, colors, quantity, notes } = payload;

  const rowInfo = findRowById(sheet, orderID, 'OrderID');
  if (!rowInfo) throw new Error(`Order ID ${orderID} not found.`);

  const statusCol = rowInfo.headers.indexOf('Status');
  if (statusCol !== -1 && (String(rowInfo.rowData[statusCol] || '')).trim() !== 'Pending') {
    throw new Error('This order has been processed by logistics and can no longer be edited.');
  }

  const h = rowInfo.headers;
  sheet.getRange(rowInfo.rowIndex, h.indexOf('Item') + 1).setValue(item);
  sheet.getRange(rowInfo.rowIndex, h.indexOf('Colors') + 1).setValue(colors);
  sheet.getRange(rowInfo.rowIndex, h.indexOf('Quantity') + 1).setValue(quantity);
  sheet.getRange(rowInfo.rowIndex, h.indexOf('Notes') + 1).setValue(notes);
  sheet.getRange(rowInfo.rowIndex, h.indexOf('Timestamp') + 1).setValue(new Date());

  return { status: 'success', message: `Order ${orderID} updated successfully.` };
}

function handleAddCategory(payload) { getSheet(SHEET_NAMES.productsCategories).appendRow([generateUniqueId(), payload.category, payload.subCategory, new Date()]); return { status: 'success', message: 'Category added.' }; }
function handleUpdateCategory(payload) {
  const sheet = getSheet(SHEET_NAMES.productsCategories);
  const rowInfo = findRowById(sheet, payload.categoryID, 'CategoryID');
  if (!rowInfo) throw new Error("Category ID not found.");
  const h = rowInfo.headers;
  sheet.getRange(rowInfo.rowIndex, h.indexOf('Category') + 1).setValue(payload.category);
  sheet.getRange(rowInfo.rowIndex, h.indexOf('Sub-Category') + 1).setValue(payload.subCategory);
  sheet.getRange(rowInfo.rowIndex, h.indexOf('Timestamp') + 1).setValue(new Date());
  return { status: 'success', message: 'Category updated.' };
}
function handleDeleteCategory(payload) {
  const sheet = getSheet(SHEET_NAMES.productsCategories);
  const rowInfo = findRowById(sheet, payload.categoryID, 'CategoryID');
  if (!rowInfo) throw new Error("Category ID not found.");
  sheet.deleteRow(rowInfo.rowIndex);
  return { status: 'success', message: 'Category deleted.' };
}

function handleAddUser(payload) {
  const sheet = getSheet(SHEET_NAMES.users);
  sheet.appendRow([generateUniqueId(), payload.name, payload.email, payload.phone, payload.accessCode, payload.role, payload.location]);
  return { status: 'success', message: 'User added.' };
}
function handleUpdateUser(payload) {
  const sheet = getSheet(SHEET_NAMES.users);
  const rowInfo = findRowById(sheet, payload.userID, 'UserID');
  if (!rowInfo) throw new Error("User ID not found.");
  const h = rowInfo.headers;
  const values = [payload.name, payload.email, payload.phone, payload.accessCode, payload.role, payload.location];
  const cols = ['Name', 'Email', 'Phone', 'AccessCode', 'Role', 'Location'];
  cols.forEach((col, i) => sheet.getRange(rowInfo.rowIndex, h.indexOf(col) + 1).setValue(values[i]));
  return { status: 'success', message: 'User updated.' };
}
function handleDeleteUser(payload) {
  const sheet = getSheet(SHEET_NAMES.users);
  const rowInfo = findRowById(sheet, payload.userID, 'UserID');
  if (!rowInfo) throw new Error("User ID not found.");
  sheet.deleteRow(rowInfo.rowIndex);
  return { status: 'success', message: 'User deleted.' };
}

function handleAddProduct(payload) { 
  // Structure: ProductID, Product Name, Category, Image, Locations, CreateDate
  getSheet(SHEET_NAMES.products).appendRow([
    generateUniqueId(), 
    payload.productName, 
    '', // Category - not provided in quick add
    payload.imageUrl, 
    '', // Locations - not provided
    new Date()
  ]); 
  return { status: 'success', message: 'Product added.' }; 
}

function handleUpdateProduct(payload) {
  const sheet = getSheet(SHEET_NAMES.products);
  const idCol = findColumnName(sheet, ['ProductID', 'Product ID', 'ID']);
  const rowInfo = findRowById(sheet, payload.productID, idCol);
  if (!rowInfo) throw new Error("Product ID not found.");
  
  const h = rowInfo.headers;
  const nameCol = findColumnName(sheet, ['ProductName', 'Product Name', 'Item', 'Name']);
  const imgCol = findColumnName(sheet, ['ImageUrl', 'Image Url', 'Image']);
  
  if(nameCol) sheet.getRange(rowInfo.rowIndex, h.indexOf(nameCol) + 1).setValue(payload.productName);
  if(imgCol) sheet.getRange(rowInfo.rowIndex, h.indexOf(imgCol) + 1).setValue(payload.imageUrl);
  
  return { status: 'success', message: 'Product updated.' };
}

function handleUpdateDailyCountStatus(payload) {
  const sheet = getSheet(SHEET_NAMES.products);
  const productNameCol = findColumnName(sheet, ['ProductName', 'Product Name', 'Item', 'Name']);
  const rowInfo = findRowById(sheet, payload.productName, productNameCol);
  
  if (payload.isOnDailyCount) {
    if (!rowInfo) {
       // Structure: ProductID, Product Name, Category, Image, Locations, CreateDate
       sheet.appendRow([
         generateUniqueId(), 
         payload.productName, 
         '', // Category 
         '', // Image
         '', // Locations
         new Date()
       ]);
    }
    return { status: 'success', message: `Added to daily count.` };
  } else {
    if (rowInfo) sheet.deleteRow(rowInfo.rowIndex);
    return { status: 'success', message: `Removed from daily count.` };
  }
}

function handleAddAppSheetProduct(payload) {
  const sheet = getSheet(SHEET_NAMES.productsListAppsheet);
  if (findRowById(sheet, payload.name, 'Items')) {
    throw new Error(`A product with the name '${payload.name}' already exists.`);
  }
  sheet.appendRow([payload.name, payload.colors, payload.category, payload.subCategory, payload.lowStockThreshold]);
  return { status: 'success', message: 'Product added.' };
}
function handleUpdateAppSheetProduct(payload) {
  const sheet = getSheet(SHEET_NAMES.productsListAppsheet);
  const rowInfo = findRowById(sheet, payload.oldName, 'Items');
  if (!rowInfo) {
    throw new Error(`Product '${payload.oldName}' not found.`);
  }

  if (payload.name !== payload.oldName) {
    if (findRowById(sheet, payload.name, 'Items')) {
      throw new Error(`A product with the name '${payload.name}' already exists.`);
    }
  }

  const h = rowInfo.headers;
  sheet.getRange(rowInfo.rowIndex, h.indexOf('Items') + 1).setValue(payload.name);
  sheet.getRange(rowInfo.rowIndex, h.indexOf('Colors') + 1).setValue(payload.colors);
  sheet.getRange(rowInfo.rowIndex, h.indexOf('Category') + 1).setValue(payload.category);
  sheet.getRange(rowInfo.rowIndex, h.indexOf('Sub-Category') + 1).setValue(payload.subCategory);
  sheet.getRange(rowInfo.rowIndex, h.indexOf('Low Stock Threshold') + 1).setValue(payload.lowStockThreshold);
  return { status: 'success', message: 'Product updated.' };
}

function handleDeleteAppSheetProduct(payload) {
  const sheet = getSheet(SHEET_NAMES.productsListAppsheet);
  const rowInfo = findRowById(sheet, payload.productName, 'Items');
  if (!rowInfo) {
    throw new Error(`Product '${payload.productName}' not found.`);
  }
  sheet.deleteRow(rowInfo.rowIndex);
  return { status: 'success', message: 'Product deleted.' };
}

function handleAddAccount(payload) {
  const sheet = getSheet(SHEET_NAMES.accounts);
  sheet.appendRow([generateUniqueId(), new Date(), payload.accountType, payload.subCategory, payload.company, payload.location, payload.locationNumber, payload.expiration ? new Date(payload.expiration) : null, payload.amountDue, payload.billingType, payload.billingAmount, payload.paymentMethod, payload.licenseNumber, payload.insuranceCarrier, payload.insuranceBroker, payload.notes, payload.status]);
  return { status: 'success', message: 'Account added.' };
}
function handleUpdateAccount(payload) {
  const sheet = getSheet(SHEET_NAMES.accounts);
  const rowInfo = findRowById(sheet, payload.accountID, 'AccountID');
  if (!rowInfo) throw new Error(`Account ID ${payload.accountID} not found.`);
  const h = rowInfo.headers;
  const payloadToSheetMap = { 'accountType': 'Account Type', 'subCategory': 'Sub Category', 'company': 'Company', 'location': 'Location', 'locationNumber': 'Location Number', 'expiration': 'Expiration', 'amountDue': 'Amount Due', 'billingType': 'Billing Type', 'billingAmount': 'Billing Amount', 'paymentMethod': 'Payment Method', 'licenseNumber': 'License Number', 'insuranceCarrier': 'Insurance Carrier', 'insuranceBroker': 'Insurance Broker', 'notes': 'Notes', 'status': 'Status' };
  Object.keys(payloadToSheetMap).forEach(key => {
    const headerName = payloadToSheetMap[key], colIndex = h.indexOf(headerName);
    if (colIndex !== -1 && payload.hasOwnProperty(key)) {
      let value = payload[key];
      if (key === 'expiration' && value) try { value = new Date(value); } catch(e) { value = null; }
      sheet.getRange(rowInfo.rowIndex, colIndex + 1).setValue(value);
    }
  });
  sheet.getRange(rowInfo.rowIndex, h.indexOf('Timestamp') + 1).setValue(new Date());
  return { status: 'success', message: 'Account updated.' };
}
function handleDeleteAccount(payload) {
  const sheet = getSheet(SHEET_NAMES.accounts);
  const rowInfo = findRowById(sheet, payload.accountID, 'AccountID');
  if (!rowInfo) throw new Error("Account ID not found.");
  sheet.deleteRow(rowInfo.rowIndex);
  return { status: 'success', message: 'Account deleted.' };
}

// Data fetching handlers
function handleGetProductCategories() {
  const sheet = getSheet(SHEET_NAMES.productsCategories), data = sheet.getDataRange().getValues();
  if (data.length <= 1) return { status: 'success', data: [] };
  const headers = data.shift();
  const [catIdIdx, catIdx, subCatIdx] = ['CategoryID', 'Category', 'Sub-Category'].map(h => headers.indexOf(h));
  if ([catIdIdx, catIdx, subCatIdx].includes(-1)) throw new Error('Missing category columns.');
  return { status: 'success', data: data.map(r => ({ categoryID: r[catIdIdx], category: r[catIdx], subCategory: r[subCatIdx] })).filter(c => c.categoryID) };
}
function handleGetAppSheetProducts() {
  const sheet = getSheet(SHEET_NAMES.productsListAppsheet), data = sheet.getDataRange().getValues();
  if (data.length <= 1) return { status: 'success', data: [] };
  const headers = data.shift();
  const [nameIdx, colorsIdx, catIdx, subCatIdx, lowStockIdx] = ['Items', 'Colors', 'Category', 'Sub-Category', 'Low Stock Threshold'].map(h => headers.indexOf(h));
  if ([nameIdx, colorsIdx, catIdx, subCatIdx, lowStockIdx].includes(-1)) throw new Error('Missing AppSheet product columns.');
  return { status: 'success', data: data.map(r => ({ name: r[nameIdx], colors: String(r[colorsIdx] || '').split(',').map(c=>c.trim()).filter(Boolean), category: r[catIdx] || '', subCategory: r[subCatIdx] || '', lowStockThreshold: parseInt(String(r[lowStockIdx] || '10'), 10) || 10 })).filter(p => p.name) };
}

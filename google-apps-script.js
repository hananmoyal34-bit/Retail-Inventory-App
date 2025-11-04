/**
 * ======================================================================================
 *  Retail Inventory System - Google Apps Script Backend
 *  ======================================================================================
 *  Instructions:
 *  1. Paste this entire script into the Apps Script editor (Code.gs) for your Google Sheet.
 *  2. Deploy as a Web App with access set to "Anyone".
 *  3. Copy the Web App URL and paste it into the APPS_SCRIPT_URL constant
 *     in your application's `services/writeService.ts` file.
 *  4. If you modify this script, you must create a new version of the deployment.
 * ======================================================================================
 */

// --- Configuration ---
const SHEET_NAMES = {
  inventoryLog: 'Inventory Log',
  count: 'Count',
  locations: 'Locations',
  locationOrders: 'Location Orders',
  warehouseCount: 'Warehouse Count',
  productsCategories: 'PRODUCTS_CATEGORIES',
  users: 'Users',
  products: 'Products',
  productsListAppsheet: 'PRODUCTS_LIST_APPSHEET',
  draftCounts: 'Draft Counts',
  accounts: 'Accounts'
};

const LOCK_TIMEOUT_SECONDS = 30;


// --- Main Entry Point ---
function doPost(e) {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(LOCK_TIMEOUT_SECONDS * 1000)) {
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: 'Server is busy, please try again.' }))
      .setMimeType(ContentService.MimeType.JSON);
  }
  
  try {
    const payload = JSON.parse(e.postData.contents);
    const action = payload.action;

    if (!action) {
        throw new Error("No action specified in the payload.");
    }

    let response;
    switch (action) {
      case 'submitInventoryCount':
        response = handleSubmitInventoryCount(payload);
        break;
      case 'saveDraftCount':
        response = handleSaveDraftCount(payload);
        break;
      case 'submitWarehouseCount':
        response = handleSubmitWarehouseCount(payload);
        break;
      case 'submitOrder':
        response = handleSubmitOrder(payload);
        break;
      case 'addLocation':
        response = handleAddLocation(payload);
        break;
      case 'updateLocation':
        response = handleUpdateLocation(payload);
        break;
      case 'deleteLocation':
        response = handleDeleteLocation(payload);
        break;
      case 'updateOrderStatus':
        response = handleUpdateOrderStatus(payload);
        break;
      case 'deleteOrder':
        response = handleDeleteOrder(payload);
        break;
      case 'addCategory':
        response = handleAddCategory(payload);
        break;
      case 'updateCategory':
        response = handleUpdateCategory(payload);
        break;
      case 'deleteCategory':
        response = handleDeleteCategory(payload);
        break;
      case 'addUser':
        response = handleAddUser(payload);
        break;
      case 'updateUser':
        response = handleUpdateUser(payload);
        break;
      case 'deleteUser':
        response = handleDeleteUser(payload);
        break;
      case 'addProduct':
        response = handleAddProduct(payload);
        break;
      case 'updateProduct':
        response = handleUpdateProduct(payload);
        break;
      case 'updateDailyCountStatus':
        response = handleUpdateDailyCountStatus(payload);
        break;
      case 'addAppSheetProduct':
        response = handleAddAppSheetProduct(payload);
        break;
      case 'updateAppSheetProduct':
        response = handleUpdateAppSheetProduct(payload);
        break;
      case 'getProductCategories':
        response = handleGetProductCategories();
        break;
      case 'getAppSheetProducts':
        response = handleGetAppSheetProducts();
        break;
      case 'addAccount':
        response = handleAddAccount(payload);
        break;
      case 'updateAccount':
        response = handleUpdateAccount(payload);
        break;
      case 'deleteAccount':
        response = handleDeleteAccount(payload);
        break;
      default:
        throw new Error(`Unknown action: ${action}`);
    }
    
    return ContentService.createTextOutput(JSON.stringify(response))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    Logger.log(`Error: ${error.toString()}\nStack: ${error.stack}`);
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}

// --- Utility Functions ---
function getSheet(name) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(name);
  if (!sheet) {
    throw new Error(`Sheet not found: "${name}". Please ensure it exists.`);
  }
  return sheet;
}

function generateUniqueId() {
  return Utilities.getUuid();
}

/**
 * Creates a mapping from original sheet headers to camelCase field names.
 * e.g., "Account Type" -> "accountType"
 * @param {string[]} headers An array of header strings from the sheet.
 * @returns {Object} An object where keys are original headers and values are camelCase.
 */
function getHeaderToFieldMap(headers) {
  const map = {};
  headers.forEach(function(header) {
    if (!header) return;
    const cleanHeader = String(header).trim();
    const camelCaseKey = cleanHeader
      .replace(/[^a-zA-Z0-9\s]/g, '') // Remove special chars
      .replace(/^\w/, c => c.toLowerCase()) // Lowercase first letter
      .replace(/\s+(.)/g, function(match, chr) { // Find space and capitalize next letter
        return chr.toUpperCase();
      });
    map[cleanHeader] = camelCaseKey;
  });
  return map;
}


/**
 * Finds a row in a sheet by its ID using a robust, case-insensitive and space-insensitive comparison.
 * @param {Sheet} sheet The Google Sheet object.
 * @param {string} id The ID to search for.
 * @param {string} idColumnName The name of the header for the ID column (e.g., 'LocationID', 'User ID').
 * @returns {object|null} An object with rowIndex, rowData, and headers, or null if not found.
 */
function findRowById(sheet, id, idColumnName) {
  const data = sheet.getDataRange().getValues();
  if (data.length < 1) {
    return null; // Empty sheet
  }
  
  const headers = data[0].map(function(h) { return String(h || '').trim(); });
  const idCol = headers.indexOf(idColumnName);
  
  if (idCol === -1) {
    throw new Error("Missing '" + idColumnName + "' column in '" + sheet.getName() + "' sheet.");
  }
  
  const idValue = String(id || '').trim();
  if (!idValue) {
    return null; // Don't search for an empty ID
  }

  for (var i = 1; i < data.length; i++) {
    const sheetValue = String(data[i][idCol] || '').trim();
    if (sheetValue === idValue) {
      return { rowIndex: i + 1, rowData: data[i], headers: headers };
    }
  }
  return null;
}


// --- Action Handlers ---

/**
 * Deletes all draft counts for a specific location and date.
 * Iterates backwards to avoid issues with changing row indices after deletion.
 */
function deleteDraftCounts(location, date) {
  const sheet = getSheet(SHEET_NAMES.draftCounts);
  if (sheet.getLastRow() < 2) return; // Sheet is empty or only has headers

  const data = sheet.getDataRange().getValues();
  const dateYMD = new Date(date).toISOString().slice(0, 10);

  for (var i = data.length - 1; i >= 1; i--) {
    const row = data[i];
    const rowLocation = row[1]; // Column B
    const rowDateObj = new Date(row[2]); // Column C
    if (isNaN(rowDateObj.getTime())) continue; // Skip invalid date rows
    const rowDate = rowDateObj.toISOString().slice(0, 10);

    if (rowLocation === location && rowDate === dateYMD) {
      sheet.deleteRow(i + 1);
    }
  }
}

/**
 * Handles saving draft counts. It first deletes existing drafts for the day/location,
 * then appends the new ones.
 */
function handleSaveDraftCount(payload) {
  const sheet = getSheet(SHEET_NAMES.draftCounts);
  const { location, date, entries, userName } = payload;
  
  if (!location || !date || !entries || !userName) {
    throw new Error("Missing required data for saving draft count.");
  }

  // Delete existing drafts for this location and date to prevent duplicates/old data.
  deleteDraftCounts(location, date);
  
  const timestamp = new Date();
  const draftRows = [];

  entries.forEach(function(entry) {
    draftRows.push([
      `${location}-${new Date(date).toISOString().slice(0, 10)}-${entry.productName}`, // draftID
      location,
      new Date(date),
      entry.productName,
      entry.openingStock,
      entry.stockIn,
      entry.inStoreSales,
      entry.warehouseShipping,
      entry.physicalEndCount,
      entry.isOpeningStockManual || false,
      userName,
      timestamp
    ]);
  });
  
  if (draftRows.length > 0) {
    const startRow = sheet.getLastRow() + 1;
    sheet.getRange(startRow, 1, draftRows.length, draftRows[0].length).setValues(draftRows);
  }
  
  return { status: 'success', message: 'Draft saved successfully.', data: { timestamp: timestamp.toISOString() } };
}

/**
 * Handles the submission of daily inventory counts for a location using batch writes.
 */
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
    
    if (entry.stockIn > 0) {
      logRows.push([generateUniqueId(), date, location, entry.productName, 'Stock In', entry.stockIn]);
    }
    if (entry.inStoreSales > 0) logRows.push([generateUniqueId(), date, location, entry.productName, 'In-Store Sale', -entry.inStoreSales]);
    if (entry.warehouseShipping > 0) logRows.push([generateUniqueId(), date, location, entry.productName, 'Warehouse Shipping', entry.warehouseShipping]);
    if (variance !== 0) logRows.push([generateUniqueId(), date, location, entry.productName, 'Adjustment-Variance', variance]);
    
    if (entry.isOpeningStockManual) {
      const adjustment = entry.openingStock - entry.calculatedOpeningStock;
      if (adjustment !== 0) {
        logRows.push([generateUniqueId(), date, location, entry.productName, 'Adjustment-Manual', adjustment]);
      }
    }
  });

  if (countRows.length > 0) {
    const startRow = countSheet.getLastRow() + 1;
    countSheet.getRange(startRow, 1, countRows.length, countRows[0].length).setValues(countRows);
  }

  if (logRows.length > 0) {
    const startRow = logSheet.getLastRow() + 1;
    logSheet.getRange(startRow, 1, logRows.length, logRows[0].length).setValues(logRows);
  }

  // After successful submission, delete the drafts for that day and location.
  deleteDraftCounts(location, date);

  return { status: 'success', message: 'Inventory count submitted successfully.' };
}

/**
 * Handles submission of warehouse counts using batch writes for performance.
 * Each submission overwrites previous counts for the same products.
 */
function handleSubmitWarehouseCount(payload) {
  const warehouseSheet = getSheet(SHEET_NAMES.warehouseCount);
  const serverTimestamp = new Date();

  // Create a map of product-color combinations in the current submission
  const submissionMap = new Map();
  payload.entries.forEach(function(entry) {
    const key = `${entry.productName}|${entry.color}`;
    submissionMap.set(key, entry);
  });
  
  const data = warehouseSheet.getDataRange().getValues();
  const headers = data.shift(); // Remove headers
  const productCol = headers.indexOf('Product');
  const colorCol = headers.indexOf('Color');

  const rowsToDelete = [];
  
  // Find existing rows for products in the new submission and mark them for deletion
  data.forEach(function(row, index) {
    const key = `${row[productCol]}|${row[colorCol]}`;
    if(submissionMap.has(key)) {
      rowsToDelete.push(index + 2); // +2 because of 1-based index and header row
    }
  });

  // Delete rows in reverse order to avoid index shifting issues
  for(var i = rowsToDelete.length - 1; i >= 0; i--) {
    warehouseSheet.deleteRow(rowsToDelete[i]);
  }

  // Prepare new rows to be added
  const newRows = [];
  payload.entries.forEach(function(entry) {
    newRows.push([
      generateUniqueId(),
      entry.productName,
      entry.color,
      entry.quantity,
      entry.notes,
      serverTimestamp,
      payload.userName || ''
    ]);
  });

  // Batch write new rows
  if (newRows.length > 0) {
    const startRow = warehouseSheet.getLastRow() + 1;
    warehouseSheet.getRange(startRow, 1, newRows.length, newRows[0].length).setValues(newRows);
  }
  
  return { status: 'success', message: 'Warehouse count submitted and overwritten successfully.' };
}


/**
 * Handles the submission of new orders from the login portal using batch writes.
 */
function handleSubmitOrder(payload) {
  const sheet = getSheet(SHEET_NAMES.locationOrders);
  const timestamp = new Date();
  const userId = payload.userId;
  const userName = payload.userName;
  
  const orderRows = [];

  payload.locations.forEach(function(location) {
    payload.items.forEach(function(item) {
      const newRow = [
        generateUniqueId(), // A: OrderID
        item.name,          // B: item
        item.color,         // C: colors
        item.quantity,      // D: quantity
        item.notes,         // E: notes
        location,           // F: location
        userId,             // G: createdBy (User ID)
        timestamp,          // H: timestamp
        userName,           // I: userName
        'Pending',          // J: Status (Default value added)
        ''                  // K: Office Notes (Default value added)
      ];
      orderRows.push(newRow);
    });
  });
  
  if (orderRows.length > 0) {
    const startRow = sheet.getLastRow() + 1;
    sheet.getRange(startRow, 1, orderRows.length, orderRows[0].length).setValues(orderRows);
  }

  return { status: 'success', message: 'Order submitted successfully!' };
}


/**
 * Finds an order by its ID and updates its Status, Office Notes, and optionally Quantity.
 */
function handleUpdateOrderStatus(payload) {
  const { orderID, status, officeNotes, quantity } = payload;
  if (!orderID) {
    throw new Error('Order ID is missing from the request.');
  }
  
  const sheet = getSheet(SHEET_NAMES.locationOrders);
  const rowInfo = findRowById(sheet, orderID, 'OrderID');

  if (rowInfo) {
    const h = rowInfo.headers;
    const statusCol = h.indexOf('Status');
    const officeNotesCol = h.indexOf('Office Notes');
    const quantityCol = h.indexOf('Quantity');

    if (statusCol !== -1) sheet.getRange(rowInfo.rowIndex, statusCol + 1).setValue(status);
    if (officeNotesCol !== -1) sheet.getRange(rowInfo.rowIndex, officeNotesCol + 1).setValue(officeNotes);
    if (quantityCol !== -1 && quantity !== undefined && quantity !== null) {
      sheet.getRange(rowInfo.rowIndex, quantityCol + 1).setValue(quantity);
    }
    return { status: 'success', message: 'Order ' + orderID + ' updated successfully.' };
  }

  throw new Error('Order ID ' + orderID + ' not found.');
}

function handleDeleteOrder(payload) {
  const sheet = getSheet(SHEET_NAMES.locationOrders);
  const orderID = payload.orderID;
  if (!orderID) {
    throw new Error("Order ID is required for deletion.");
  }
  
  const rowInfo = findRowById(sheet, orderID, 'OrderID');

  if (rowInfo) {
    sheet.deleteRow(rowInfo.rowIndex);
    return { status: 'success', message: 'Order deleted successfully.' };
  }
  
  throw new Error("Order ID not found for deletion: " + orderID);
}


/**
 * Handles CRUD operations for locations.
 */
function handleAddLocation(payload) {
  const sheet = getSheet(SHEET_NAMES.locations);
  const newId = generateUniqueId();
  // New Order: LocationID, LocationFullName, Location Name
  sheet.appendRow([newId, payload.locationFullName || '', payload.name]); 
  return { status: 'success', message: 'Location added successfully.' };
}

function handleUpdateLocation(payload) {
  const sheet = getSheet(SHEET_NAMES.locations);
  const rowInfo = findRowById(sheet, payload.id, 'LocationID');

  if (rowInfo) {
    const h = rowInfo.headers;
    const nameCol = h.indexOf('Location Name');
    const fullNameCol = h.indexOf('LocationFullName');
    if (nameCol !== -1) sheet.getRange(rowInfo.rowIndex, nameCol + 1).setValue(payload.name);
    if (fullNameCol !== -1) sheet.getRange(rowInfo.rowIndex, fullNameCol + 1).setValue(payload.locationFullName || '');
    return { status: 'success', message: 'Location updated successfully.' };
  }
  throw new Error(`Location ID not found for update: ${payload.id}`);
}

function handleDeleteLocation(payload) {
  const sheet = getSheet(SHEET_NAMES.locations);
  const rowInfo = findRowById(sheet, payload.id, 'LocationID');

  if (rowInfo) {
    sheet.deleteRow(rowInfo.rowIndex);
    return { status: 'success', message: 'Location deleted successfully.' };
  }
  
  throw new Error("Location ID not found for deletion: " + payload.id);
}


/**
 * Handles CRUD operations for product categories.
 */
function handleAddCategory(payload) {
  const sheet = getSheet(SHEET_NAMES.productsCategories);
  const newId = generateUniqueId();
  // Columns: CategoryID, Category, Sub-Category, Timestamp
  sheet.appendRow([newId, payload.category, payload.subCategory, new Date()]); 
  return { status: 'success', message: 'Category added successfully.' };
}

function handleUpdateCategory(payload) {
  const sheet = getSheet(SHEET_NAMES.productsCategories);
  const rowInfo = findRowById(sheet, payload.categoryID, 'CategoryID');

  if (rowInfo) {
    const h = rowInfo.headers;
    const categoryCol = h.indexOf('Category');
    const subCategoryCol = h.indexOf('Sub-Category');
    const timestampCol = h.indexOf('Timestamp');

    if (categoryCol !== -1) sheet.getRange(rowInfo.rowIndex, categoryCol + 1).setValue(payload.category);
    if (subCategoryCol !== -1) sheet.getRange(rowInfo.rowIndex, subCategoryCol + 1).setValue(payload.subCategory);
    if (timestampCol !== -1) sheet.getRange(rowInfo.rowIndex, timestampCol + 1).setValue(new Date());

    return { status: 'success', message: 'Category updated successfully.' };
  }
  throw new Error("Category ID not found for update: " + payload.categoryID);
}

function handleDeleteCategory(payload) {
  const sheet = getSheet(SHEET_NAMES.productsCategories);
  const categoryID = payload.categoryID;
  if (!categoryID) {
    throw new Error("Category ID is required for deletion.");
  }
  
  const rowInfo = findRowById(sheet, categoryID, 'CategoryID');

  if (rowInfo) {
    sheet.deleteRow(rowInfo.rowIndex);
    return { status: 'success', message: 'Category deleted successfully.' };
  }
  
  throw new Error("Category ID not found for deletion: " + categoryID);
}

function handleGetProductCategories() {
  const sheet = getSheet(SHEET_NAMES.productsCategories);
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) {
    return { status: 'success', data: [] };
  }
  
  const headers = data[0].map(function(h) { return String(h).trim(); });
  const categoryIdIndex = headers.indexOf('CategoryID');
  const categoryIndex = headers.indexOf('Category');
  const subCategoryIndex = headers.indexOf('Sub-Category');

  if (categoryIdIndex === -1 || categoryIndex === -1 || subCategoryIndex === -1) {
    throw new Error('Missing required columns (CategoryID, Category, Sub-Category) in PRODUCTS_CATEGORIES sheet.');
  }

  const categories = [];
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    if (row[categoryIdIndex]) { // Ensure row is not empty
        categories.push({
          categoryID: row[categoryIdIndex],
          category: row[categoryIndex],
          subCategory: row[subCategoryIndex]
        });
    }
  }
  
  return { status: 'success', data: categories };
}

function handleGetAppSheetProducts() {
    const sheet = getSheet(SHEET_NAMES.productsListAppsheet);
    const data = sheet.getDataRange().getValues();
    if (data.length <= 1) {
        return { status: 'success', data: [] };
    }
    
    const headers = data[0].map(function(h) { return String(h).trim(); });
    // Find column indices robustly
    const nameIndex = headers.indexOf('Items');
    const colorsIndex = headers.indexOf('Colors');
    const categoryIndex = headers.indexOf('Category');
    const subCategoryIndex = headers.indexOf('Sub-Category');
    const lowStockIndex = headers.indexOf('Low Stock Threshold');

    if ([nameIndex, colorsIndex, categoryIndex, subCategoryIndex, lowStockIndex].some(function(index) { return index === -1; })) {
        throw new Error('One or more required columns are missing in PRODUCTS_LIST_APPSHEET: Items, Colors, Category, Sub-Category, Low Stock Threshold.');
    }
    
    const products = [];
    for (var i = 1; i < data.length; i++) {
        var row = data[i];
        if (row[nameIndex]) { // Ensure name exists
            const colorsString = String(row[colorsIndex] || '');
            const threshold = parseInt(String(row[lowStockIndex] || '10'), 10);
            products.push({
                name: row[nameIndex],
                colors: colorsString ? colorsString.split(',').map(function(c) { return c.trim(); }) : [],
                category: row[categoryIndex] || '',
                subCategory: row[subCategoryIndex] || '',
                lowStockThreshold: !isNaN(threshold) ? threshold : 10,
            });
        }
    }
    
    return { status: 'success', data: products };
}


/**
 * Handles CRUD operations for users.
 */
function handleAddUser(payload) {
  const sheet = getSheet(SHEET_NAMES.users);
  const newId = generateUniqueId();
  // Columns: UserID, Name, Email, Phone, AccessCode, Role, Location
  sheet.appendRow([
    newId,
    payload.name,
    payload.email,
    payload.phone,
    payload.accessCode,
    payload.role,
    payload.location
  ]);
  return { status: 'success', message: 'User added successfully.' };
}

function handleUpdateUser(payload) {
  const sheet = getSheet(SHEET_NAMES.users);
  const rowInfo = findRowById(sheet, payload.userID, 'UserID');

  if (rowInfo) {
      const h = rowInfo.headers;
      const nameCol = h.indexOf('Name');
      const emailCol = h.indexOf('Email');
      const phoneCol = h.indexOf('Phone');
      const accessCodeCol = h.indexOf('AccessCode');
      const roleCol = h.indexOf('Role');
      const locationCol = h.indexOf('Location');

      if (nameCol !== -1) sheet.getRange(rowInfo.rowIndex, nameCol + 1).setValue(payload.name);
      if (emailCol !== -1) sheet.getRange(rowInfo.rowIndex, emailCol + 1).setValue(payload.email);
      if (phoneCol !== -1) sheet.getRange(rowInfo.rowIndex, phoneCol + 1).setValue(payload.phone);
      if (accessCodeCol !== -1) sheet.getRange(rowInfo.rowIndex, accessCodeCol + 1).setValue(payload.accessCode);
      if (roleCol !== -1) sheet.getRange(rowInfo.rowIndex, roleCol + 1).setValue(payload.role);
      if (locationCol !== -1) sheet.getRange(rowInfo.rowIndex, locationCol + 1).setValue(payload.location);
      
      return { status: 'success', message: 'User updated successfully.' };
  }
  throw new Error("User ID not found for update: " + payload.userID);
}

function handleDeleteUser(payload) {
  const sheet = getSheet(SHEET_NAMES.users);
  const userID = payload.userID;
  if (!userID) {
    throw new Error("User ID is required for deletion.");
  }
  
  const rowInfo = findRowById(sheet, userID, 'UserID');

  if (rowInfo) {
    sheet.deleteRow(rowInfo.rowIndex);
    return { status: 'success', message: 'User deleted successfully.' };
  }
  
  throw new Error("User ID not found for deletion: " + userID);
}

/**
 * Handles CRUD operations for products.
 */
function handleAddProduct(payload) {
  const sheet = getSheet(SHEET_NAMES.products);
  const newId = generateUniqueId();
  // Columns: ProductID, ProductName, ImageUrl, CreateDate
  sheet.appendRow([
    newId,
    payload.productName,
    payload.imageUrl,
    new Date()
  ]);
  return { status: 'success', message: 'Product added successfully.' };
}

function handleUpdateProduct(payload) {
  const sheet = getSheet(SHEET_NAMES.products);
  const rowInfo = findRowById(sheet, payload.productID, 'ProductID');

  if (rowInfo) {
    const h = rowInfo.headers;
    const nameCol = h.indexOf('ProductName');
    const imageUrlCol = h.indexOf('ImageUrl');

    if (nameCol !== -1) sheet.getRange(rowInfo.rowIndex, nameCol + 1).setValue(payload.productName);
    if (imageUrlCol !== -1) sheet.getRange(rowInfo.rowIndex, imageUrlCol + 1).setValue(payload.imageUrl);
    
    return { status: 'success', message: 'Product updated successfully.' };
  }
  throw new Error("Product ID not found for update: " + payload.productID);
}

function handleUpdateDailyCountStatus(payload) {
  const sheet = getSheet(SHEET_NAMES.products);
  const { productName, isOnDailyCount } = payload;
  const rowInfo = findRowById(sheet, productName, 'ProductName');

  if (isOnDailyCount) {
    if (rowInfo) {
      return { status: 'success', message: 'Product is already on the daily count list.' };
    }
    sheet.appendRow([generateUniqueId(), productName, '', new Date()]);
    return { status: 'success', message: `Added "${productName}" to the daily count.` };
  } else {
    if (!rowInfo) {
      return { status: 'success', message: 'Product was not on the daily count list.' };
    }
    sheet.deleteRow(rowInfo.rowIndex);
    return { status: 'success', message: `Removed "${productName}" from the daily count.` };
  }
}

/**
 * Handles CRUD operations for PRODUCTS_LIST_APPSHEET.
 * The primary key is the 'Items' column (product name).
 */
function handleAddAppSheetProduct(payload) {
  const sheet = getSheet(SHEET_NAMES.productsListAppsheet);
  const rowInfo = findRowById(sheet, payload.name, 'Items');

  if (rowInfo) {
    throw new Error("A product with the name '" + payload.name + "' already exists.");
  }
  
  // Columns: Items, Colors, Category, Sub-Category, Low Stock Threshold
  sheet.appendRow([
    payload.name,
    payload.colors, // Expecting a comma-separated string
    payload.category,
    payload.subCategory,
    payload.lowStockThreshold
  ]);
  return { status: 'success', message: 'Product added successfully.' };
}

function handleUpdateAppSheetProduct(payload) {
  const sheet = getSheet(SHEET_NAMES.productsListAppsheet);
  const rowInfo = findRowById(sheet, payload.name, 'Items');

  if (rowInfo) {
    const h = rowInfo.headers;
    const categoryCol = h.indexOf('Category');
    const subCategoryCol = h.indexOf('Sub-Category');
    const lowStockCol = h.indexOf('Low Stock Threshold');

    // Only update editable fields
    if (categoryCol !== -1) sheet.getRange(rowInfo.rowIndex, categoryCol + 1).setValue(payload.category);
    if (subCategoryCol !== -1) sheet.getRange(rowInfo.rowIndex, subCategoryCol + 1).setValue(payload.subCategory);
    if (lowStockCol !== -1) sheet.getRange(rowInfo.rowIndex, lowStockCol + 1).setValue(payload.lowStockThreshold);
    
    return { status: 'success', message: 'Product updated successfully.' };
  }
  throw new Error("Product not found for update: " + payload.name);
}

function handleAddAccount(payload) {
  const sheet = getSheet(SHEET_NAMES.accounts);
  const newId = generateUniqueId();
  sheet.appendRow([
    newId, new Date(), payload.accountType, payload.subCategory, payload.company,
    payload.location, payload.locationNumber, payload.expiration ? new Date(payload.expiration) : null,
    payload.amountDue, payload.billingType, payload.billingAmount, payload.paymentMethod,
    payload.licenseNumber, payload.insuranceCarrier, payload.insuranceBroker,
    payload.notes, payload.status
  ]);
  return { status: 'success', message: 'Account added successfully.' };
}

function handleUpdateAccount(payload) {
  const sheet = getSheet(SHEET_NAMES.accounts);
  const rowInfo = findRowById(sheet, payload.accountID, 'AccountID');

  if (rowInfo) {
      const h = rowInfo.headers;
      const payloadToSheetMap = {
        'accountType': 'Account Type', 'subCategory': 'Sub Category', 'company': 'Company', 'location': 'Location',
        'locationNumber': 'Location Number', 'expiration': 'Expiration', 'amountDue': 'Amount Due',
        'billingType': 'Billing Type', 'billingAmount': 'Billing Amount', 'paymentMethod': 'Payment Method',
        'licenseNumber': 'License Number', 'insuranceCarrier': 'Insurance Carrier', 'insuranceBroker': 'Insurance Broker',
        'notes': 'Notes', 'status': 'Status'
      };
      
      Object.keys(payloadToSheetMap).forEach(function(payloadKey) {
        const headerName = payloadToSheetMap[payloadKey];
        const colIndex = h.indexOf(headerName);
        if (colIndex !== -1 && payload.hasOwnProperty(payloadKey)) {
          var value = payload[payloadKey];
          if (payloadKey === 'expiration' && value) {
              try { value = new Date(value); } catch(e) { value = null; }
          }
          sheet.getRange(rowInfo.rowIndex, colIndex + 1).setValue(value);
        }
      });

      const timestampIndex = h.indexOf('Timestamp');
      if (timestampIndex !== -1) {
          sheet.getRange(rowInfo.rowIndex, timestampIndex + 1).setValue(new Date());
      }
      
      return { status: 'success', message: 'Account updated successfully.' };
  }
  throw new Error("Account ID not found for update: " + payload.accountID);
}

function handleDeleteAccount(payload) {
  const sheet = getSheet(SHEET_NAMES.accounts);
  const accountID = payload.accountID;
  if (!accountID) {
    throw new Error("Account ID is required for deletion.");
  }
  
  const rowInfo = findRowById(sheet, accountID, 'AccountID');

  if (rowInfo) {
    sheet.deleteRow(rowInfo.rowIndex);
    return { status: 'success', message: 'Account deleted successfully.' };
  }
  
  throw new Error("Account ID not found for deletion: " + accountID);
}
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
  productsListAppsheet: 'PRODUCTS_LIST_APPSHEET'
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
      case 'addProduct':
        response = handleAddProduct(payload);
        break;
      case 'updateProduct':
        response = handleUpdateProduct(payload);
        break;
      case 'addAppSheetProduct':
        response = handleAddAppSheetProduct(payload);
        break;
      case 'updateAppSheetProduct':
        response = handleUpdateAppSheetProduct(payload);
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
  
  // Make header lookup robust to spaces and case by removing them before comparison
  const headers = data[0].map(function(h) { 
    return String(h || '').trim().toLowerCase().replace(/\s+/g, ''); 
  });
  
  const searchColumnName = idColumnName.toLowerCase().replace(/\s+/g, '');
  const idCol = headers.indexOf(searchColumnName);
  
  if (idCol === -1) {
    throw new Error("Missing '" + idColumnName + "' column in '" + sheet.getName() + "' sheet.");
  }
  
  const idValue = String(id || '').trim().toLowerCase();
  if (!idValue) { // Don't search for an empty ID
    return null;
  }

  for (var i = 1; i < data.length; i++) {
    const sheetValue = String(data[i][idCol] || '').trim().toLowerCase();
    if (sheetValue === idValue) {
      // Re-fetch original headers with original casing for the return object
      const originalHeaders = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
      return { rowIndex: i + 1, rowData: data[i], headers: originalHeaders.map(String), idCol: idCol };
    }
  }
  return null;
}


// --- Action Handlers ---

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
    const calculatedEndCount = (entry.openingStock || 0) + (entry.stockIn || 0) - (entry.inStoreSales || 0) - (entry.warehouseShipping || 0);
    const variance = (entry.physicalEndCount || 0) - calculatedEndCount;

    countRows.push([
      generateUniqueId(), date, location, entry.productName,
      entry.openingStock, entry.stockIn, entry.inStoreSales, entry.warehouseShipping,
      entry.physicalEndCount, calculatedEndCount, variance
    ]);
    
    if (entry.stockIn > 0) logRows.push([generateUniqueId(), date, location, entry.productName, 'Stock In', entry.stockIn]);
    if (entry.inStoreSales > 0) logRows.push([generateUniqueId(), date, location, entry.productName, 'In-Store Sale', -entry.inStoreSales]);
    if (entry.warehouseShipping > 0) logRows.push([generateUniqueId(), date, location, entry.productName, 'Warehouse Shipping', -entry.warehouseShipping]);
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

  return { status: 'success', message: 'Inventory count submitted successfully.' };
}

/**
 * Handles submission of warehouse counts using batch writes for performance.
 */
function handleSubmitWarehouseCount(payload) {
  const warehouseSheet = getSheet(SHEET_NAMES.warehouseCount);
  const logSheet = getSheet(SHEET_NAMES.inventoryLog);
  const date = new Date(payload.date);
  const serverTimestamp = new Date();

  const warehouseCountRows = [];
  const inventoryLogRows = [];

  payload.entries.forEach(function(entry) {
    // Row for 'Warehouse Count' sheet
    // Sheet columns: [CountID, Product, Color, Quantity, Notes, Timestamp, User]
    const warehouseRow = [
      generateUniqueId(),
      entry.productName,
      entry.color,
      entry.quantity,
      entry.notes,
      serverTimestamp,
      payload.userName || ''
    ];
    warehouseCountRows.push(warehouseRow);
    
    // Row for 'Inventory Log' sheet
    if (entry.quantity > 0) {
       const logRow = [
         generateUniqueId(),
         date,
         "Warehouse",
         entry.productName,
         "Stock In",
         entry.quantity
       ];
       inventoryLogRows.push(logRow);
    }
  });
  
  // Batch write to Warehouse Count sheet
  if (warehouseCountRows.length > 0) {
    const startRow = warehouseSheet.getLastRow() + 1;
    warehouseSheet.getRange(startRow, 1, warehouseCountRows.length, warehouseCountRows[0].length).setValues(warehouseCountRows);
  }

  // Batch write to Inventory Log sheet
  if (inventoryLogRows.length > 0) {
    const startRow = logSheet.getLastRow() + 1;
    logSheet.getRange(startRow, 1, inventoryLogRows.length, inventoryLogRows[0].length).setValues(inventoryLogRows);
  }
  
  return { status: 'success', message: 'Warehouse count submitted successfully.' };
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
    const h = rowInfo.headers.map(function(h) { return h.toLowerCase().replace(/\s+/g, '') });
    const statusCol = h.indexOf('status');
    const officeNotesCol = h.indexOf('officenotes');
    const quantityCol = h.indexOf('quantity');

    if (statusCol !== -1) sheet.getRange(rowInfo.rowIndex, statusCol + 1).setValue(status);
    if (officeNotesCol !== -1) sheet.getRange(rowInfo.rowIndex, officeNotesCol + 1).setValue(officeNotes);
    if (quantityCol !== -1 && quantity !== undefined && quantity !== null) {
      sheet.getRange(rowInfo.rowIndex, quantityCol + 1).setValue(quantity);
    }
    return { status: 'success', message: 'Order ' + orderID + ' updated successfully.' };
  }

  throw new Error('Order ID ' + orderID + ' not found.');
}


/**
 * Handles CRUD operations for locations.
 */
function handleAddLocation(payload) {
  const sheet = getSheet(SHEET_NAMES.locations);
  const newId = generateUniqueId();
  // Columns: LocationID, Location Name, LocationFullName
  sheet.appendRow([newId, payload.name, payload.locationFullName || '']); 
  return { status: 'success', message: 'Location added successfully.' };
}

function handleUpdateLocation(payload) {
  const sheet = getSheet(SHEET_NAMES.locations);
  const rowInfo = findRowById(sheet, payload.id, 'LocationID');

  if (rowInfo) {
    const h = rowInfo.headers.map(function(h) { return h.toLowerCase().replace(/\s+/g, ''); });
    const nameCol = h.indexOf('locationname');
    const fullNameCol = h.indexOf('locationfullname');
    if (nameCol !== -1) sheet.getRange(rowInfo.rowIndex, nameCol + 1).setValue(payload.name);
    if (fullNameCol !== -1) sheet.getRange(rowInfo.rowIndex, fullNameCol + 1).setValue(payload.locationFullName || '');
    return { status: 'success', message: 'Location updated successfully.' };
  }
  throw new Error(`Location ID not found for update: ${payload.id}`);
}

function handleDeleteLocation(payload) {
  const sheet = getSheet(SHEET_NAMES.locations);
  // Use the robust, centralized findRowById helper function. Pass 'LocationID' as instructed.
  const rowInfo = findRowById(sheet, payload.id, 'LocationID');

  if (rowInfo) {
    // The findRowById function returns the 1-based index, which is what deleteRow needs.
    sheet.deleteRow(rowInfo.rowIndex);
    return { status: 'success', message: 'Location deleted successfully.' };
  }
  
  // If findRowById returns null, the ID was not found.
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
    const h = rowInfo.headers.map(function(h) { return h.toLowerCase().replace(/\s+/g, ''); });
    const categoryCol = h.indexOf('category');
    const subCategoryCol = h.indexOf('sub-category');
    const timestampCol = h.indexOf('timestamp');

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
      const h = rowInfo.headers.map(function(h) { return h.toLowerCase().replace(/\s+/g, ''); });
      const nameCol = h.indexOf('name');
      const emailCol = h.indexOf('email');
      const phoneCol = h.indexOf('phone');
      const accessCodeCol = h.indexOf('accesscode');
      const roleCol = h.indexOf('role');
      const locationCol = h.indexOf('location');

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
    const h = rowInfo.headers.map(function(h) { return h.toLowerCase().replace(/\s+/g, ''); });
    const nameCol = h.indexOf('productname');
    const imageUrlCol = h.indexOf('imageurl');

    if (nameCol !== -1) sheet.getRange(rowInfo.rowIndex, nameCol + 1).setValue(payload.productName);
    if (imageUrlCol !== -1) sheet.getRange(rowInfo.rowIndex, imageUrlCol + 1).setValue(payload.imageUrl);
    
    return { status: 'success', message: 'Product updated successfully.' };
  }
  throw new Error("Product ID not found for update: " + payload.productID);
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
    const h = rowInfo.headers.map(function(h) { return h.toLowerCase().replace(/\s+/g, ''); });
    const categoryCol = h.indexOf('category');
    const subCategoryCol = h.indexOf('sub-category');
    const lowStockCol = h.indexOf('lowstockthreshold');

    // Only update editable fields
    if (categoryCol !== -1) sheet.getRange(rowInfo.rowIndex, categoryCol + 1).setValue(payload.category);
    if (subCategoryCol !== -1) sheet.getRange(rowInfo.rowIndex, subCategoryCol + 1).setValue(payload.subCategory);
    if (lowStockCol !== -1) sheet.getRange(rowInfo.rowIndex, lowStockCol + 1).setValue(payload.lowStockThreshold);
    
    return { status: 'success', message: 'Product updated successfully.' };
  }
  throw new Error("Product not found for update: " + payload.name);
}

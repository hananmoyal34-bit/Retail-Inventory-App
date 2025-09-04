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
  warehouseCount: 'Warehouse Count'
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
    const action = payload.action || 'submitInventoryCount';

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
  
  const dataRange = sheet.getDataRange();
  const data = dataRange.getValues();
  const headers = data[0].map(function(h) { return h.trim(); });

  const orderIdCol = headers.indexOf('OrderID'); 
  const statusCol = headers.indexOf('Status');
  const officeNotesCol = headers.indexOf('Office Notes');
  const quantityCol = headers.indexOf('Quantity');

  if (orderIdCol === -1 || statusCol === -1 || officeNotesCol === -1 || quantityCol === -1) {
    var missingCols = [];
    if (orderIdCol === -1) missingCols.push("'OrderID'");
    if (statusCol === -1) missingCols.push("'Status'");
    if (officeNotesCol === -1) missingCols.push("'Office Notes'");
    if (quantityCol === -1) missingCols.push("'Quantity'");
    throw new Error("The following required columns were not found in the 'Location Orders' sheet: " + missingCols.join(', ') + ".");
  }

  for (var i = 1; i < data.length; i++) {
    if (data[i][orderIdCol] == orderID) {
      sheet.getRange(i + 1, statusCol + 1).setValue(status);
      sheet.getRange(i + 1, officeNotesCol + 1).setValue(officeNotes);
      
      // Update quantity if it was provided in the payload
      if (quantity !== undefined && quantity !== null) {
          sheet.getRange(i + 1, quantityCol + 1).setValue(quantity);
      }
      
      return { status: 'success', message: 'Order ' + orderID + ' updated successfully.' };
    }
  }

  throw new Error('Order ID ' + orderID + ' not found.');
}


/**
 * Handles CRUD operations for locations.
 */
function handleAddLocation(payload) {
  const sheet = getSheet(SHEET_NAMES.locations);
  const newId = generateUniqueId();
  sheet.appendRow([newId, payload.name, '']); 
  return { status: 'success', message: 'Location added successfully.' };
}

function handleUpdateLocation(payload) {
  const sheet = getSheet(SHEET_NAMES.locations);
  const data = sheet.getDataRange().getValues();
  
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] == payload.id) {
      sheet.getRange(i + 1, 2).setValue(payload.name);
      return { status: 'success', message: 'Location updated successfully.' };
    }
  }
  throw new Error(`Location ID not found for update: ${payload.id}`);
}

function handleDeleteLocation(payload) {
  const sheet = getSheet(SHEET_NAMES.locations);
  const data = sheet.getDataRange().getValues();
  
  for (var i = data.length - 1; i >= 1; i--) {
    if (data[i][0] == payload.id) {
      sheet.deleteRow(i + 1);
      return { status: 'success', message: 'Location deleted successfully.' };
    }
  }
  throw new Error(`Location ID not found for deletion: ${payload.id}`);
}
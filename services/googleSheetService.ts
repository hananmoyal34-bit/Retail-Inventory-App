const SPREADSHEET_ID = '1t70QsCiQaHwmgyzwul1QGURyhYZNtWx38dFeNdoMU-c';
const BASE_URL = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq`;

/**
 * A simple CSV parser for the format returned by the gviz endpoint.
 * It assumes all cells are wrapped in double quotes.
 * e.g., "cell1","cell2"\n"cell3","cell4"
 * @param {string} csvText - The CSV content as a string.
 * @returns {string[][]} A 2D array of strings.
 */
const parseCSV = (csvText: string): string[][] => {
    if (!csvText || typeof csvText !== 'string') {
        return [];
    }
    const rows = csvText.trim().split('\n');
    return rows.map(row => {
        if (!row) return [];
        // Slice to remove first and last quote, then split by the separator ","
        return row.slice(1, -1).split('","');
    }).filter(row => row.length > 0 && (row.length > 1 || row[0] !== '')); // Filter out empty rows
};


/**
 * Reads data from a specified sheet in the Google Sheet by fetching its public CSV export.
 * Note: The Google Sheet must be shared with "Anyone with the link can view".
 * @param {string} sheetName - The name of the sheet to retrieve (e.g., 'Products').
 * @returns {Promise<string[][]>} A promise that resolves with the rows of data, including the header.
 */
export const readSheet = async (sheetName: string): Promise<string[][]> => {
  if (!sheetName) {
    console.error("Sheet name cannot be empty.");
    return [];
  }
  
  try {
    const url = `${BASE_URL}?tqx=out:csv&sheet=${encodeURIComponent(sheetName)}`;
    const response = await fetch(url);
    
    if (!response.ok) {
        const errorText = await response.text();
        console.error(`Google Sheets fetch error for sheet "${sheetName}":`, errorText);
        throw new Error(`Google Sheets fetch error: ${response.statusText}`);
    }
    
    const csvText = await response.text();
    
    if (!csvText) {
        return [];
    }
    
    // A valid response starts with a quote. An error might start with `//` or `tqx.response.handle`.
    if (!csvText.startsWith('"')) {
        console.error(`Received invalid data from Google Sheets for sheet "${sheetName}". This can happen if the sheet name is incorrect or the spreadsheet is not public.`, csvText);
        return [];
    }

    return parseCSV(csvText);

  } catch (err) {
    console.error(`Error fetching or parsing sheet "${sheetName}": `, err);
    return [];
  }
};

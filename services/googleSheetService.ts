const SPREADSHEET_ID = '1t70QsCiQaHwmgyzwul1QGURyhYZNtWx38dFeNdoMU-c';
const BASE_URL = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq`;

/**
 * A CSV parser for the format returned by the gviz endpoint.
 * This regex correctly handles cells containing commas and escaped double-quotes ("").
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
        // This regex handles quoted cells, including escaped quotes ("") inside.
        const regex = /"((?:[^"]|"")*)"(?:,|$)/g;
        const cells: string[] = [];
        let match;
        // Reset lastIndex for subsequent exec calls
        regex.lastIndex = 0;

        let lastIndex = 0;

        while ((match = regex.exec(row)) !== null) {
            // Check for unquoted, non-comma content before this match (shouldn't happen in gviz, but good to check)
            if (match.index > lastIndex) {
                 // This handles potential "cells" that are not quoted.
                 // gviz *should* quote everything, but if not, this tries to capture it.
                 let unquoted = row.substring(lastIndex, match.index);
                 // remove leading/trailing commas
                 unquoted = unquoted.replace(/^,|,$/g, '');
                 if(unquoted) cells.push(unquoted);
            }
          
            // match[1] is the content inside the quotes.
            // Unescape double quotes ("") which are used by Google Sheets for escaping.
            cells.push(match[1].replace(/""/g, '"'));
            lastIndex = regex.lastIndex;
        }
        
        // Handle any trailing content after the last quote (if any)
        if (lastIndex < row.length) {
            let trailing = row.substring(lastIndex).replace(/^,|,$/g, '');
            if(trailing) cells.push(trailing);
        }

        return cells;
    }).filter(row => row.length > 0 && row.some(cell => cell.trim() !== '')); // Filter out empty or whitespace-only rows
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
    const cacheBuster = `&_=${new Date().getTime()}`;
    const url = `${BASE_URL}?tqx=out:csv&sheet=${encodeURIComponent(sheetName)}${cacheBuster}`;
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
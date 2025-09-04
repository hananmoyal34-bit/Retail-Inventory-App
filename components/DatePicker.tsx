import React, { useMemo } from 'react';
import { getCurrentDateInTimezone, formatDateToYMD } from '../services/dataService';
import { CalendarIcon, XCircleIcon } from './icons';

interface DatePickerProps {
  value: string;
  onChange: (date: string) => void;
  label?: string;
  allowClear?: boolean;
}

const DatePicker: React.FC<DatePickerProps> = ({ value, onChange, label = "Date", allowClear = true }) => {

  const { today, yesterday } = useMemo(() => {
    const todayStr = getCurrentDateInTimezone();
    const todayMidday = new Date(todayStr + 'T12:00:00Z');
    todayMidday.setDate(todayMidday.getDate() - 1);
    const yesterdayStr = formatDateToYMD(todayMidday) || '';
    return { today: todayStr, yesterday: yesterdayStr };
  }, []);

  const setToday = () => onChange(today);
  const setYesterday = () => onChange(yesterday);
  const clearDate = () => onChange('');

  const handleDateInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  };
  
  const formattedDate = value 
    ? new Date(value + 'T12:00:00').toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        timeZone: 'UTC'
      }) 
    : (allowClear ? 'All Dates' : 'Not Set');

  return (
    <div>
        <label className="block text-sm font-medium text-gray-700">{label}</label>
        <div className="mt-1 flex flex-wrap items-center gap-2">
            <button onClick={setToday} className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${today === value ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}>Today</button>
            <button onClick={setYesterday} className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${yesterday === value ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}>Yesterday</button>
            
            <div className="relative group">
                <div className="p-2 bg-gray-200 text-gray-700 rounded-md pointer-events-none transition-colors group-hover:bg-gray-300" aria-hidden="true">
                    <CalendarIcon className="h-5 w-5" />
                </div>
                <input 
                    type="date"
                    value={value}
                    onChange={handleDateInputChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    aria-label="Select a custom date"
                />
            </div>
            
            {allowClear && value && (
              <button onClick={clearDate} className="p-2 text-gray-500 hover:text-gray-800 hover:bg-gray-200 rounded-md" aria-label="Clear date filter">
                  <XCircleIcon className="h-5 w-5" />
              </button>
            )}
             <p className="text-sm text-gray-600 font-medium ml-2">
                Selected: <span className="text-indigo-600">{formattedDate}</span>
            </p>
        </div>
    </div>
  );
};

export default DatePicker;
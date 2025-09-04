import React, { useState, useEffect, useRef } from 'react';
import { MinusIcon, PlusIcon } from './icons';

interface AccessibleNumberInputProps {
  id?: string;
  value: number;
  onChange: (newValue: number) => void;
  min?: number;
  step?: number;
  className?: string;
  inputClassName?: string;
  ariaLabel?: string;
}

const AccessibleNumberInput: React.FC<AccessibleNumberInputProps> = ({ id, value, onChange, min = 0, step = 1, className = '', inputClassName = '', ariaLabel }) => {
  const [inputValue, setInputValue] = useState(value.toString());
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (document.activeElement !== inputRef.current) {
      setInputValue(value.toString());
    }
  }, [value]);

  const handleValueChange = (amount: number) => {
    const newValue = value + amount;
    onChange(newValue >= min ? newValue : min);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;
    setInputValue(rawValue);

    if (rawValue === '' || rawValue === '-') {
      onChange(0);
      return;
    }

    const numericValue = parseInt(rawValue, 10);
    if (!isNaN(numericValue) && numericValue >= min) {
      onChange(numericValue);
    }
  };

  const handleBlur = () => {
    setInputValue(value.toString());
  };
  
  const QuickButton: React.FC<{amount: number, isLast?: boolean}> = ({ amount, isLast }) => (
    <button
        type="button"
        onClick={() => handleValueChange(amount)}
        aria-label={`Increment by ${amount}`}
        className={`relative px-3 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:z-10 border-l border-gray-300 ${isLast ? 'rounded-r-md' : ''}`}
    >
        +{amount}
    </button>
  );

  return (
    <div className={`inline-flex items-center border border-gray-300 rounded-md bg-white shadow-sm ${className}`}>
      <button
        type="button"
        onClick={() => handleValueChange(-step)}
        aria-label="Decrement"
        className="relative p-2 text-gray-600 hover:bg-gray-200 rounded-l-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:z-10 disabled:opacity-50 disabled:cursor-not-allowed"
        disabled={value <= min}
      >
        <MinusIcon className="h-5 w-5" />
      </button>
      <input
        id={id}
        ref={inputRef}
        type="number"
        value={inputValue}
        onChange={handleChange}
        onBlur={handleBlur}
        className={`relative w-20 py-2 px-1 text-center border-l border-r border-gray-300 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:z-10 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${inputClassName}`}
        min={min}
        aria-valuenow={value}
        aria-label={ariaLabel}
      />
      <button
        type="button"
        onClick={() => handleValueChange(step)}
        aria-label="Increment"
        className="relative p-2 text-gray-600 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:z-10"
      >
        <PlusIcon className="h-5 w-5" />
      </button>
      
      <QuickButton amount={2} />
      <QuickButton amount={5} isLast />
    </div>
  );
};

export default AccessibleNumberInput;
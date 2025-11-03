import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Account, AccountStatus, FileForUpload } from '../types';
import { addAccount, updateAccount, deleteAccount } from '../services/writeService';
import { getAccounts } from '../services/dataService';
import { formatCurrency, formatDateToYMD, formatDateToMDY, getExpirationHighlightClass } from '../utils/formatting';
import { SearchIcon, PlusIcon, PencilIcon, TrashIcon, ChevronRightIcon, CalendarIcon, ViewIcon, AdjustmentsIcon } from './icons';
import Modal from './Modal';

interface AccountsViewProps {
    viewOnly?: boolean;
}

const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve((reader.result as string).split(',')[1].split(',')[0]);
        reader.onerror = error => reject(error);
    });
};

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
    const lowerStatus = (status || '').toLowerCase();
    let colorClasses = 'bg-gray-100 text-gray-800'; // Default
    if (lowerStatus === 'active' || lowerStatus === 'paid') {
        colorClasses = 'bg-green-100 text-green-800';
    } else if (lowerStatus === 'inactive' || lowerStatus === 'cancelled') {
        colorClasses = 'bg-red-100 text-red-800';
    } else if (lowerStatus.includes('due') || lowerStatus.includes('pending')) {
        colorClasses = 'bg-yellow-100 text-yellow-800';
    }
    return <span className={`px-2 py-1 text-xs font-semibold leading-4 rounded-full ${colorClasses}`}>{status}</span>;
};

const getStatusSelectClass = (status: string) => {
    const baseStyles = "w-full text-left px-2 py-1 text-xs font-semibold rounded-md appearance-none focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-surface focus:ring-primary border";
    const lowerStatus = (status || '').toLowerCase();
    if (lowerStatus === 'active' || lowerStatus === 'paid') return `${baseStyles} bg-green-100 text-green-800 border-green-300`;
    if (lowerStatus === 'inactive' || lowerStatus === 'cancelled') return `${baseStyles} bg-red-100 text-red-800 border-red-300`;
    if (lowerStatus.includes('due') || lowerStatus.includes('pending')) return `${baseStyles} bg-yellow-100 text-yellow-800 border-yellow-300`;
    return `${baseStyles} bg-gray-100 text-gray-700 border-gray-300`;
};


const ALL_HEADERS: { key: keyof Account; label: string }[] = [
    { key: 'locationName', label: 'Location Name' },
    { key: 'locationAddress', label: 'Location Address' },
    { key: 'expiration', label: 'Expiration' },
    { key: 'amountDue', label: 'Amount Due' },
    { key: 'billingType', label: 'Billing Type' },
    { key: 'billingAmount', label: 'Billing Amt' },
    { key: 'paymentMethod', label: 'Payment Method' },
    { key: 'licenseNumber', label: 'License #' },
    { key: 'insuranceCarrier', label: 'Ins Carrier' },
    { key: 'insuranceBroker', label: 'Ins Broker' },
    { key: 'notes', label: 'Notes' },
    { key: 'status', label: 'Status' },
    { key: 'timestamp', label: 'Timestamp' },
    { key: 'fileUpload', label: 'File' },
    { key: 'accountID', label: 'Account ID' },
];

const getTabVisibleHeaders = (tabName: string): { key: keyof Account; label: string }[] => {
    const hiddenKeys: (keyof Account)[] = [];
    const upperTab = (tabName || '').toUpperCase();

    if (upperTab.includes('INSURANCE')) {
        hiddenKeys.push('licenseNumber', 'amountDue', 'billingType', 'billingAmount', 'paymentMethod');
    } else if (upperTab.includes('LICENSE')) {
        hiddenKeys.push('insuranceCarrier', 'insuranceBroker', 'amountDue', 'billingType', 'billingAmount', 'paymentMethod');
    } else if (upperTab.includes('NOVA')) { // Example of another type
        hiddenKeys.push('insuranceCarrier', 'insuranceBroker', 'licenseNumber');
    }

    return ALL_HEADERS.filter(header => !hiddenKeys.includes(header.key));
};

const getCellContent = (account: Account, key: keyof Account): React.ReactNode => {
    const value = account[key];
    switch (key) {
      case 'amountDue':
      case 'billingAmount':
        return formatCurrency(value as number);
      case 'status':
        return <StatusBadge status={value as string} />;
      case 'expiration':
      case 'timestamp':
        return formatDateToMDY(value as string) || '';
      case 'fileUpload':
        return value ? <a href={value as string} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">View File</a> : 'N/A';
      default:
        return value as React.ReactNode;
    }
};

const emptyFormState: Omit<Account, 'accountID' | 'timestamp'> = {
    accountType: '', subCategory: '', company: '', locationName: '', locationAddress: '',
    expiration: '', amountDue: 0, billingType: '', billingAmount: 0, paymentMethod: '',
    licenseNumber: '', insuranceCarrier: '', insuranceBroker: '', notes: '', status: 'Active', fileUpload: ''
};

const statusOptions: AccountStatus[] = ['Active', 'Inactive', 'Pending'];
const getLocalStorageKey = (tabName: string) => `accounts-visible-columns-${tabName}`;

const AccountsView: React.FC<AccountsViewProps> = ({ viewOnly = false }) => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedSubCategories, setExpandedSubCategories] = useState<Set<string>>(new Set());
  const [expandedCompanies, setExpandedCompanies] = useState<Set<string>>(new Set());

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [formState, setFormState] = useState(emptyFormState);
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof Account, string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [customAccountType, setCustomAccountType] = useState('');
  const [customSubCategory, setCustomSubCategory] = useState('');
  const [fileToUpload, setFileToUpload] = useState<File | null>(null);


  const customAccountTypeRef = useRef<HTMLInputElement>(null);
  const customSubCategoryRef = useRef<HTMLInputElement>(null);
  
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [recordToView, setRecordToView] = useState<Account | null>(null);
  
  const [isColumnSelectorOpen, setIsColumnSelectorOpen] = useState(false);
  const columnSelectorRef = useRef<HTMLDivElement>(null);

  const [visibleColumnKeys, setVisibleColumnKeys] = useState<Set<keyof Account>>(new Set());
  
  const refetchData = useCallback(async () => {
    setIsLoading(true);
    try {
        const data = await getAccounts();
        setAccounts(data);
    } catch(e) {
        setError(e instanceof Error ? e.message : 'Failed to fetch accounts');
    } finally {
        setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refetchData();
  }, [refetchData]);

    // Load column visibility settings when the active tab changes
    useEffect(() => {
        if (!activeTab) return;
        try {
            const saved = localStorage.getItem(getLocalStorageKey(activeTab));
            if (saved) {
                setVisibleColumnKeys(new Set(JSON.parse(saved)));
            } else {
                // Default to all relevant columns for this tab if nothing is saved
                setVisibleColumnKeys(new Set(getTabVisibleHeaders(activeTab).map(h => h.key)));
            }
        } catch (e) {
            console.error(`Failed to parse visible columns for tab ${activeTab} from localStorage`, e);
            // Fallback to default on error
            setVisibleColumnKeys(new Set(getTabVisibleHeaders(activeTab).map(h => h.key)));
        }
    }, [activeTab]);

    // Save column visibility settings when they change
    useEffect(() => {
        if (!activeTab) return;
        try {
            localStorage.setItem(getLocalStorageKey(activeTab), JSON.stringify(Array.from(visibleColumnKeys)));
        } catch (e) {
            console.error("Failed to save visible columns to localStorage", e);
        }
    }, [visibleColumnKeys, activeTab]);

  const handleColumnVisibilityChange = (key: keyof Account) => {
    setVisibleColumnKeys(prev => {
        const newSet = new Set(prev);
        if (newSet.has(key)) {
            newSet.delete(key);
        } else {
            newSet.add(key);
        }
        return newSet;
    });
  };
  
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
        if (columnSelectorRef.current && !columnSelectorRef.current.contains(event.target as Node)) {
            setIsColumnSelectorOpen(false);
        }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (isModalOpen && formState.accountType === '--custom--') customAccountTypeRef.current?.focus();
  }, [isModalOpen, formState.accountType]);

  useEffect(() => {
    if (isModalOpen && formState.subCategory === '--custom--') customSubCategoryRef.current?.focus();
  }, [isModalOpen, formState.subCategory]);

  const { tabs, accountsByTab, accountTypeOptions, subCategoryOptions } = useMemo(() => {
    const grouped = accounts.reduce((acc, account) => {
        const type = account.accountType || 'Uncategorized';
        if (!acc[type]) acc[type] = [];
        acc[type].push(account);
        return acc;
    }, {} as Record<string, Account[]>);

    const sortedTabs = Object.keys(grouped).sort((a, b) => {
        if (a === 'Uncategorized') return 1;
        if (b === 'Uncategorized') return -1;
        return a.localeCompare(b);
    });

    const allTypes = new Set(accounts.map(a => a.accountType).filter(Boolean));
    const allSubCats = new Set(accounts.map(a => a.subCategory).filter(Boolean));
    
    return { 
        tabs: sortedTabs, 
        accountsByTab: grouped,
        accountTypeOptions: Array.from(allTypes).sort(),
        subCategoryOptions: Array.from(allSubCats).sort(),
    };
  }, [accounts]);

  useEffect(() => {
    if (tabs.length > 0 && !tabs.includes(activeTab)) {
      setActiveTab(tabs[0]);
    }
  }, [tabs, activeTab]);
  
  const groupedAndFilteredAccounts = useMemo(() => {
      if (!activeTab || !accountsByTab[activeTab]) return {};
      const accountsInTab = accountsByTab[activeTab];
      
      // FIX: Add explicit type casting for accountsInTab to resolve 'unknown' type error on reduce.
      const groupedBySubCategory = (accountsInTab as Account[]).reduce((acc, account) => {
          const subCategory = account.subCategory || 'General';
          if (!acc[subCategory]) acc[subCategory] = [];
          acc[subCategory].push(account);
          return acc;
      }, {} as Record<string, Account[]>);
      
      const finalGrouped: Record<string, Record<string, Account[]>> = {};
      Object.entries(groupedBySubCategory).forEach(([subCategory, accounts]) => {
          finalGrouped[subCategory] = accounts.reduce((acc, account) => {
              const company = account.company || 'Unassigned';
              if (!acc[company]) acc[company] = [];
              acc[company].push(account);
              return acc;
          }, {} as Record<string, Account[]>);
      });

      const lowercasedQuery = searchTerm.toLowerCase();
      if (!lowercasedQuery) return finalGrouped;

      const filteredGroups: typeof finalGrouped = {};
      Object.entries(finalGrouped).forEach(([subCategory, companies]) => {
          const filteredCompanies: Record<string, Account[]> = {};
          Object.entries(companies).forEach(([company, companyAccounts]) => {
              if (company.toLowerCase().includes(lowercasedQuery) || 
                  subCategory.toLowerCase().includes(lowercasedQuery) ||
                  companyAccounts.some(acc => Object.values(acc).some(val => String(val).toLowerCase().includes(lowercasedQuery)))) {
                  filteredCompanies[company] = companyAccounts;
              }
          });
          if (Object.keys(filteredCompanies).length > 0) {
              filteredGroups[subCategory] = filteredCompanies;
          }
      });
      return filteredGroups;
  }, [activeTab, accountsByTab, searchTerm]);

    useEffect(() => {
        if (!activeTab || !accountsByTab[activeTab]) return;
        const allSubKeys = new Set<string>();
        const allCompKeys = new Set<string>();
        Object.entries(groupedAndFilteredAccounts).forEach(([sub, companies]) => {
            allSubKeys.add(`${activeTab}-${sub}`);
            Object.keys(companies).forEach(comp => {
                allCompKeys.add(`${activeTab}-${sub}-${comp}`);
            });
        });
        setExpandedSubCategories(allSubKeys);
        setExpandedCompanies(allCompKeys);
    }, [activeTab, groupedAndFilteredAccounts]);


  const handleToggle = (key: string, setExpanded: React.Dispatch<React.SetStateAction<Set<string>>>) => {
    setExpanded(prev => {
        const newSet = new Set(prev);
        if (newSet.has(key)) newSet.delete(key);
        else newSet.add(key);
        return newSet;
    });
  };

  const handleExpandAll = () => {
    const allSubKeys = new Set<string>();
    const allCompKeys = new Set<string>();
    Object.entries(groupedAndFilteredAccounts).forEach(([sub, companies]) => {
        const subKey = `${activeTab}-${sub}`;
        allSubKeys.add(subKey);
        Object.keys(companies).forEach(comp => {
            const compKey = `${activeTab}-${sub}-${comp}`;
            allCompKeys.add(compKey);
        });
    });
    setExpandedSubCategories(allSubKeys);
    setExpandedCompanies(allCompKeys);
  };

  const handleCollapseAll = () => {
    setExpandedSubCategories(new Set());
    setExpandedCompanies(new Set());
  };


  const openModalForAdd = () => {
    if (viewOnly) return;
    setEditingAccount(null);
    setFormState({ ...emptyFormState, accountType: activeTab !== 'Uncategorized' ? activeTab : '' });
    setCustomAccountType('');
    setCustomSubCategory('');
    setFileToUpload(null);
    setError(null);
    setFormErrors({});
    setIsModalOpen(true);
  };
  
  const openModalForEdit = (account: Account) => {
    if (viewOnly) return;
    setEditingAccount(account);
    const { accountID, timestamp, ...editableFields } = account;
    setFormState({ ...emptyFormState, ...editableFields });
    setCustomAccountType('');
    setCustomSubCategory('');
    setFileToUpload(null);
    setError(null);
    setFormErrors({});
    setIsModalOpen(true);
  };
  
  const handleViewDetails = (account: Account) => {
    // In a full implementation, this would open a details modal.
    // For this view-only scenario, we can just log or do nothing.
    console.log("Viewing details for:", account);
  };
  
  const validateForm = (data: Omit<Account, 'accountID' | 'timestamp'>): Partial<Record<keyof Account, string>> => {
      const errors: Partial<Record<keyof Account, string>> = {};
      const finalAccountType = data.accountType === '--custom--' ? customAccountType.trim() : data.accountType;

      if (!data.company.trim()) {
          errors.company = 'Company name is required.';
      }
      if (!finalAccountType) {
          errors.accountType = 'Account Type is required.';
      }
      if (data.accountType === '--custom--' && !customAccountType.trim()) {
          errors.accountType = 'Custom Account Type cannot be empty.';
      }
      if (data.subCategory === '--custom--' && !customSubCategory.trim()) {
          errors.subCategory = 'Custom Sub Category cannot be empty.';
      }
      if (data.amountDue < 0) {
          errors.amountDue = 'Amount Due cannot be negative.';
      }
      if (data.billingAmount < 0) {
          errors.billingAmount = 'Billing Amount cannot be negative.';
      }
      return errors;
  }

  const handleSave = async () => {
      if (viewOnly) return;
      setError(null);
      setFormErrors({});

      const validationErrors = validateForm(formState);
      if (Object.keys(validationErrors).length > 0) {
          setFormErrors(validationErrors);
          return;
      }
      
      setIsSubmitting(true);
      const finalAccountType = formState.accountType === '--custom--' ? customAccountType.trim() : formState.accountType;
      const finalSubCategory = formState.subCategory === '--custom--' ? customSubCategory.trim() : formState.subCategory;
      const dataToSave = { ...formState, accountType: finalAccountType, subCategory: finalSubCategory };
      
      let uploadedFile: FileForUpload | null = null;
      if (fileToUpload) {
          const base64Data = await fileToBase64(fileToUpload);
          uploadedFile = {
              key: 'fileUpload',
              filename: fileToUpload.name,
              mimeType: fileToUpload.type,
              data: base64Data
          };
      }
      
      try {
        if (editingAccount) {
            await updateAccount({ ...editingAccount, ...dataToSave }, uploadedFile);
        } else {
            await addAccount(dataToSave, uploadedFile);
        }
        setIsModalOpen(false);
        await refetchData();
      } catch(err) {
          setError(err instanceof Error ? err.message : 'Failed to save account.');
      }
      setIsSubmitting(false);
  };
  
  const handleDelete = async (account: Account) => {
      if (viewOnly) return;
      if (window.confirm(`Are you sure you want to delete the account for "${account.company}"? This cannot be undone.`)) {
          setIsSubmitting(true);
          try {
            await deleteAccount(account.accountID);
            await refetchData();
          } catch (err) {
             alert(`Error: ${err instanceof Error ? err.message : 'An unknown error occurred.'}`);
          }
          setIsSubmitting(false);
      }
  };

  const handleStatusChange = async (accountToUpdate: Account, newStatus: string) => {
    if (viewOnly) return;
    setIsSubmitting(true);
    try {
        await updateAccount({ ...accountToUpdate, status: newStatus as AccountStatus }, null);
        await refetchData();
    } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to update status.');
    } finally {
        setIsSubmitting(false);
    }
  };

  const tabColorClasses = ['border-indigo-500 text-indigo-600', 'border-blue-500 text-blue-600', 'border-green-500 text-green-600', 'border-purple-500 text-purple-600'];

  const ALL_FORM_FIELDS: { key: keyof Omit<Account, 'accountID' | 'timestamp'>; label: string; type: 'text' | 'select' | 'date' | 'number' | 'textarea' | 'file'; options?: string[]; required?: boolean }[] = [
      { key: 'company', label: 'Company', type: 'text', required: true },
      { key: 'accountType', label: 'Account Type', type: 'select', options: accountTypeOptions, required: true },
      { key: 'subCategory', label: 'Sub Category', type: 'select', options: subCategoryOptions },
      { key: 'locationName', label: 'Location Name', type: 'text' },
      { key: 'locationAddress', label: 'Location Address', type: 'text' },
      { key: 'expiration', label: 'Expiration Date', type: 'date' },
      { key: 'amountDue', label: 'Amount Due', type: 'number' },
      { key: 'billingAmount', label: 'Billing Amount', type: 'number' },
      { key: 'billingType', label: 'Billing Type', type: 'select', options: ['Annual', 'Semi-Annual', 'Quarterly', 'Monthly', 'Other'] },
      { key: 'paymentMethod', label: 'Payment Method', type: 'select', options: ['Credit Card', 'ACH', 'Check', 'Other'] },
      { key: 'licenseNumber', label: 'License Number', type: 'text' },
      { key: 'insuranceCarrier', label: 'Insurance Carrier', type: 'text' },
      { key: 'insuranceBroker', label: 'Insurance Broker', type: 'text' },
      { key: 'status', label: 'Status', type: 'select', options: statusOptions },
      { key: 'notes', label: 'Notes', type: 'textarea' },
  ];
  
  const tabHeaders = useMemo(() => getTabVisibleHeaders(activeTab), [activeTab]);
  const visibleHeaders = useMemo(() => tabHeaders.filter(h => visibleColumnKeys.has(h.key)), [tabHeaders, visibleColumnKeys]);

  const visibleFormFields = useMemo(() => {
    const currentAccountType = formState.accountType === '--custom--' ? customAccountType : formState.accountType || activeTab;
    const visibleTableKeys = getTabVisibleHeaders(currentAccountType).map(h => h.key);
    const coreKeys: (keyof Account)[] = ['company', 'accountType', 'subCategory'];
    return ALL_FORM_FIELDS.filter(field => coreKeys.includes(field.key) || visibleTableKeys.includes(field.key));
  }, [formState.accountType, activeTab, accountTypeOptions, subCategoryOptions, customAccountType]);

  const baseInputClasses = "mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-sm shadow-sm placeholder-gray-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500";
  
  const modalFooter = (
    <>
        {error && <p className="text-sm text-red-600 mr-auto">{error}</p>}
        <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500" disabled={isSubmitting}>
            Cancel
        </button>
        <button onClick={handleSave} className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-400" disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : 'Save Account'}
        </button>
    </>
  );

  if (isLoading) {
    return (
        <div className="flex items-center justify-center min-h-[40vh]">
            <div className="flex flex-col items-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
                <p className="mt-4 text-gray-600">Loading accounts...</p>
            </div>
        </div>
    );
  }

  return (
    <>
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
          <h2 className="text-3xl font-bold text-gray-900">Accounts Overview</h2>
           {!viewOnly && (
            <button onClick={openModalForAdd} className="flex items-center justify-center bg-primary text-white px-4 py-2 rounded-md shadow-sm hover:bg-primary-hover transition-colors w-full sm:w-auto">
                <PlusIcon/>
                <span className="ml-2">Add Account</span>
            </button>
           )}
      </div>
      
      {error && <div className="text-center py-10 text-red-600 bg-red-50 rounded-lg"><p className="font-semibold">Error</p><p>{error}</p></div>}

      <div className="mt-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-4 sm:space-x-8 overflow-x-auto" aria-label="Tabs">
              {tabs.map((tab, index) => (
                  <button key={tab} onClick={() => { setActiveTab(tab); setSearchTerm(''); }}
                      className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === tab ? tabColorClasses[index % tabColorClasses.length] : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
                      aria-current={activeTab === tab ? 'page' : undefined}>
                      {tab} ({accountsByTab[tab]?.length || 0})
                  </button>
              ))}
            </nav>
          </div>
          <div className="mt-4">
              <div className="flex flex-col sm:flex-row gap-4 justify-between items-center mb-4">
                  <div className="relative w-full sm:max-w-xs">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><SearchIcon /></div>
                      <input type="search" placeholder="Search accounts..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md bg-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm"/>
                  </div>
                  <div className="flex items-center gap-2">
                        <div className="relative" ref={columnSelectorRef}>
                            <button onClick={() => setIsColumnSelectorOpen(prev => !prev)} className="px-3 py-1 text-xs font-medium text-gray-700 bg-gray-200 rounded-md flex items-center gap-1 hover:bg-gray-300">
                                <AdjustmentsIcon /> Columns
                            </button>
                            {isColumnSelectorOpen && (
                                <div className="absolute right-0 mt-2 w-56 bg-white rounded-md shadow-lg z-20 border border-gray-200">
                                    <div className="p-2 font-semibold text-sm border-b">Show Columns</div>
                                    <div className="p-2 max-h-60 overflow-y-auto">
                                        {tabHeaders.map(header => (
                                            <label key={header.key} className="flex items-center space-x-2 p-1 hover:bg-gray-100 rounded-md cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                                    checked={visibleColumnKeys.has(header.key)}
                                                    onChange={() => handleColumnVisibilityChange(header.key)}
                                                />
                                                <span className="text-sm text-gray-700 select-none">{header.label}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                      <button onClick={handleExpandAll} className="px-3 py-1 text-xs font-medium text-primary bg-indigo-100 rounded-md">Expand All</button>
                      <button onClick={handleCollapseAll} className="px-3 py-1 text-xs font-medium text-gray-700 bg-gray-200 rounded-md">Collapse All</button>
                  </div>
              </div>

            {Object.keys(groupedAndFilteredAccounts).sort().length > 0 ? (
              <>
                  {/* Desktop View */}
                  <div className="hidden lg:block space-y-4">
                      {Object.entries(groupedAndFilteredAccounts).sort(([a], [b]) => a.localeCompare(b)).map(([subCategory, companies]) => {
                          const subCategoryKey = `${activeTab}-${subCategory}`;
                          return (
                          <details key={subCategoryKey} open={expandedSubCategories.has(subCategoryKey)} className="bg-gray-100 p-2 rounded-lg border border-gray-200 group/sub">
                              <summary className="list-none flex justify-between items-center p-2 cursor-pointer hover:bg-gray-200/50 rounded-md" onClick={(e) => { e.preventDefault(); handleToggle(subCategoryKey, setExpandedSubCategories); }}>
                                <div className="flex items-center">
                                    <ChevronRightIcon className={`h-5 w-5 mr-2 transition-transform ${expandedSubCategories.has(subCategoryKey) ? 'rotate-90' : ''}`} />
                                    <h3 className="font-semibold text-lg text-gray-800">{subCategory}</h3>
                                </div>
                              </summary>
                              <div className="pl-4 pt-2 space-y-2">
                              {Object.entries(companies).sort(([a], [b]) => a.localeCompare(b)).map(([company, companyAccounts]) => {
                                  const companyKey = `${activeTab}-${subCategory}-${company}`;
                                  return (
                                      <details key={companyKey} open={expandedCompanies.has(companyKey)} className="bg-white shadow-md rounded-lg overflow-hidden group/company">
                                          <summary className="list-none flex justify-between items-center p-4 cursor-pointer hover:bg-gray-50 transition-colors" onClick={(e) => { e.preventDefault(); handleToggle(companyKey, setExpandedCompanies); }}>
                                              <div className="flex items-center">
                                                  <ChevronRightIcon className={`h-5 w-5 mr-2 transition-transform ${expandedCompanies.has(companyKey) ? 'rotate-90' : ''}`} />
                                                  <h4 className="font-semibold text-md text-gray-700">{company}</h4>
                                                  <span className="ml-3 px-2 py-1 text-xs font-medium bg-gray-200 text-gray-700 rounded-full">{companyAccounts.length} account(s)</span>
                                              </div>
                                          </summary>
                                          <div className="border-t border-gray-200 overflow-x-auto">
                                              <table className="min-w-full divide-y divide-gray-200 text-sm">
                                                  <thead className="bg-gray-50">
                                                      <tr>
                                                          <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                                          {visibleHeaders.map(header => <th key={header.key} scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">{header.label}</th>)}
                                                      </tr>
                                                  </thead>
                                                  <tbody className="divide-y divide-gray-200">
                                                      {companyAccounts.map(account => (
                                                          <tr key={account.accountID} onClick={(e) => {
                                                              const target = e.target as HTMLElement;
                                                              if (target.closest('button, select')) return; // Don't trigger on buttons or select
                                                              handleViewDetails(account)
                                                          }} className="odd:bg-white even:bg-gray-50/50 hover:bg-indigo-50 cursor-pointer">
                                                              <td className="px-4 py-3 whitespace-nowrap space-x-2">
                                                                  {!viewOnly && (
                                                                      <>
                                                                        <button onClick={() => openModalForEdit(account)} className="text-indigo-600 hover:text-indigo-900 p-1 rounded-md hover:bg-indigo-100" disabled={isSubmitting}><PencilIcon className="h-4 w-4"/></button>
                                                                        <button onClick={() => handleDelete(account)} className="text-red-600 hover:text-red-900 p-1 rounded-md hover:bg-red-100" disabled={isSubmitting}><TrashIcon className="h-4 w-4"/></button>
                                                                      </>
                                                                  )}
                                                              </td>
                                                              {visibleHeaders.map(header => {
                                                                  if (header.key === 'status') {
                                                                      return (
                                                                           <td key={header.key} className="px-4 py-3">
                                                                                <select
                                                                                    value={account.status}
                                                                                    onChange={(e) => handleStatusChange(account, e.target.value)}
                                                                                    className={getStatusSelectClass(account.status)}
                                                                                    disabled={viewOnly}
                                                                                >
                                                                                    {statusOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                                                                </select>
                                                                            </td>
                                                                      )
                                                                  }
                                                                  return (
                                                                    <td key={header.key} className={`px-4 py-3 text-gray-700 ${header.key === 'notes' ? 'whitespace-pre-wrap max-w-xs' : 'whitespace-nowrap'}`}>
                                                                        {header.key === 'expiration' ? (
                                                                            <span className={`px-2 py-1 rounded-full text-xs ${getExpirationHighlightClass(account.expiration)}`}>
                                                                                {getCellContent(account, header.key)}
                                                                            </span>
                                                                        ) : ( getCellContent(account, header.key) )}
                                                                    </td>
                                                                )}
                                                              )}
                                                          </tr>
                                                      ))}
                                                  </tbody>
                                              </table>
                                          </div>
                                      </details>
                                  );
                              })}
                              </div>
                          </details>
                      )})}
                  </div>
                  {/* Mobile View */}
                  <div className="lg:hidden space-y-4">
                    {Object.entries(groupedAndFilteredAccounts).sort(([a], [b]) => a.localeCompare(b)).map(([subCategory, companies]) => (
                        <div key={subCategory} className="bg-gray-100 p-2 rounded-lg">
                            <h3 className="text-lg font-bold text-gray-700 mb-2 p-2">{subCategory}</h3>
                            <div className="space-y-3">
                                {Object.entries(companies).sort(([a], [b]) => a.localeCompare(b)).map(([company, accounts]) => (
                                    <div key={company} className="bg-white rounded-lg shadow-md">
                                        <h4 className="font-semibold text-primary p-4 border-b">{company}</h4>
                                        <div className="divide-y divide-gray-200">
                                            {accounts.map(account => (
                                                <div key={account.accountID} className="p-4">
                                                    <div className="flex justify-between items-start gap-4">
                                                        <div className="flex-1 space-y-2">
                                                            <div>
                                                                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Location</p>
                                                                <p className="font-semibold text-gray-800">{account.locationName || 'N/A'}</p>
                                                            </div>
                                                            <div className="flex items-center gap-4">
                                                                <div>
                                                                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Status</p>
                                                                    <StatusBadge status={account.status} />
                                                                </div>
                                                                <div>
                                                                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Expiration</p>
                                                                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs ${getExpirationHighlightClass(account.expiration)}`}>
                                                                        {formatDateToMDY(account.expiration) || 'N/A'}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="flex-shrink-0 flex items-center gap-2">
                                                            <button onClick={() => handleViewDetails(account)} className="p-1.5 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-100 rounded-md transition-colors" aria-label="View Details"><ViewIcon /></button>
                                                            {!viewOnly && <>
                                                                <button onClick={() => openModalForEdit(account)} className="p-1.5 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-100 rounded-md transition-colors" aria-label="Edit Account"><PencilIcon className="h-5 w-5"/></button>
                                                                <button onClick={() => handleDelete(account)} className="p-1.5 text-red-600 hover:text-red-700 hover:bg-red-100 rounded-md transition-colors" aria-label="Delete Account"><TrashIcon className="h-5 w-5"/></button>
                                                            </>}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                  </div>
              </>
            ) : (
              <div className="text-center py-10 text-gray-500 bg-white rounded-lg shadow">{searchTerm ? `No accounts found for "${searchTerm}".` : `No accounts in this category.`}</div>
            )}
          </div>
      </div>

       <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingAccount ? `Edit Account: ${editingAccount.company}` : 'Add New Account'} size="2xl" footer={modalFooter}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1">
              {visibleFormFields.map(field => {
                  const value = formState[field.key as keyof typeof formState] || '';
                  const error = formErrors[field.key as keyof typeof formErrors];
                  const errorClass = error ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : '';

                  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
                      const { name, value } = e.target;
                      setFormState(prev => ({ ...prev, [name]: field.type === 'number' ? parseFloat(value) || 0 : value }));
                      if (formErrors[name as keyof typeof formErrors]) {
                          setFormErrors(prev => {
                              const newErrors = { ...prev };
                              delete newErrors[name as keyof typeof formErrors];
                              return newErrors;
                          });
                      }
                  };
                  
                  const fieldId = `account-form-${field.key}`;
                  const fieldWrapper = (input: React.ReactNode) => (
                    <div key={field.key} className={field.type === 'textarea' ? 'md:col-span-2' : ''}>
                          <label htmlFor={fieldId} className="block text-sm font-medium text-gray-700">
                              {field.label}
                              {field.required && <span className="text-red-500 ml-1">*</span>}
                          </label>
                          {input}
                          <p className="mt-1 text-xs text-red-600 h-4">{error || ''}</p>
                      </div>
                  )

                  if (field.key === 'accountType') {
                      return fieldWrapper(
                          <>
                              <select id={fieldId} name={field.key} value={value as string} onChange={handleChange} className={`${baseInputClasses} ${errorClass}`}>
                                  <option value="">Select {field.label}</option>
                                  {field.options?.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                  <option value="--custom--">... Add new type</option>
                              </select>
                              {formState.accountType === '--custom--' && (
                                  <input ref={customAccountTypeRef} type="text" placeholder="Enter custom account type" value={customAccountType} onChange={(e) => setCustomAccountType(e.target.value)} className={`${baseInputClasses} mt-2 border-indigo-500 ${errorClass}`} required />
                              )}
                          </>
                      );
                  }

                  if (field.key === 'subCategory') {
                      return fieldWrapper(
                           <>
                              <select id={fieldId} name={field.key} value={value as string} onChange={handleChange} className={`${baseInputClasses} ${errorClass}`}>
                                  <option value="">Select {field.label}</option>
                                  {field.options?.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                  <option value="--custom--">... Add new sub category</option>
                              </select>
                              {formState.subCategory === '--custom--' && (
                                  <input ref={customSubCategoryRef} type="text" placeholder="Enter custom sub category" value={customSubCategory} onChange={(e) => setCustomSubCategory(e.target.value)} className={`${baseInputClasses} mt-2 border-indigo-500 ${errorClass}`} required />
                              )}
                          </>
                      );
                  }

                  if (field.key === 'expiration') {
                      return fieldWrapper(
                          <div className="relative mt-1">
                              <input
                                  id={fieldId}
                                  type="date"
                                  name={field.key}
                                  value={formatDateToYMD(value as string) || ''}
                                  onChange={handleChange}
                                  className={`${baseInputClasses} pr-10 ${errorClass}`}
                                  placeholder="mm/dd/yyyy"
                              />
                              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                                  <CalendarIcon className="h-5 w-5 text-gray-400" />
                              </div>
                          </div>
                      );
                  }
                  
                  if (field.type === 'textarea') {
                    return fieldWrapper(<textarea id={fieldId} name={field.key} value={value as string} onChange={handleChange} className={`${baseInputClasses} ${errorClass}`} rows={4}></textarea>);
                  }
                  if (field.type === 'select') {
                    return fieldWrapper(
                        <select id={fieldId} name={field.key} value={value as string} onChange={handleChange} className={`${baseInputClasses} ${errorClass}`}>
                            <option value="">Select {field.label}</option>
                            {field.options?.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                        </select>
                    );
                  }
                  return fieldWrapper(
                     <input
                        id={fieldId}
                        type={field.type}
                        name={field.key}
                        value={value as any}
                        onChange={handleChange}
                        className={`${baseInputClasses} ${errorClass}`}
                    />
                  )
              })}
              <div className="md:col-span-2">
                <label htmlFor="account-file-upload" className="block text-sm font-medium text-gray-700">File Upload</label>
                {formState.fileUpload && !fileToUpload && (
                    <div className="mt-1 text-sm">
                        <a href={formState.fileUpload} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">
                            View Current File
                        </a>
                    </div>
                )}
                <input
                    id="account-file-upload"
                    type="file"
                    onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                            setFileToUpload(e.target.files[0]);
                        } else {
                            setFileToUpload(null);
                        }
                    }}
                    className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-indigo-100 file:text-indigo-700 hover:file:bg-indigo-200"
                />
              </div>
          </div>
      </Modal>

      {/* {isDetailsModalOpen && recordToView && (
        <AccountDetailsModal
            isOpen={isDetailsModalOpen}
            onClose={() => setIsDetailsModalOpen(false)}
            account={recordToView}
        />
      )} */}
    </>
  );
};

export default AccountsView;
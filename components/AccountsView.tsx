import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Account } from '../types';
import { getAccounts, formatDateToYMD, formatDateToMDY } from '../services/dataService';
import { addAccount, updateAccount, deleteAccount } from '../services/writeService';
import { ChevronRightIcon, SearchIcon, PlusIcon, PencilIcon, TrashIcon } from './icons';
import Modal from './Modal';

const formatCurrency = (amount: number) => {
    if (typeof amount !== 'number' || isNaN(amount)) {
        return '$0.00';
    }
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
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

const getExpirationHighlightClass = (expirationDate: string | undefined): string => {
    if (!expirationDate) return 'bg-gray-100 text-gray-800'; // Neutral for no date

    try {
        const expDateStr = formatDateToYMD(expirationDate);
        if (!expDateStr) return 'bg-gray-100 text-gray-800';
        
        const expDate = new Date(expDateStr + "T00:00:00"); // Use YMD format for reliable parsing
        if (isNaN(expDate.getTime())) {
            return 'bg-gray-100 text-gray-800';
        }
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const diffTime = expDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays < 0) return 'bg-red-100 text-red-800 font-semibold';
        if (diffDays <= 30) return 'bg-orange-100 text-orange-800 font-semibold';
        if (diffDays <= 60) return 'bg-yellow-100 text-yellow-800 font-semibold';
        return 'bg-green-100 text-green-800 font-semibold';
    } catch (e) {
        return 'bg-gray-100 text-gray-800';
    }
};

const ALL_HEADERS: { key: keyof Account; label: string }[] = [
    { key: 'location', label: 'Location' },
    { key: 'locationNumber', label: 'Location Number' },
    { key: 'expiration', label: 'Expiration' },
    { key: 'amountDue', label: 'Amount Due' },
    { key: 'billingType', label: 'Billing Type' },
    { key: 'billingAmount', label: 'Billing Amount' },
    { key: 'paymentMethod', label: 'Payment Method' },
    { key: 'licenseNumber', label: 'License Number' },
    { key: 'insuranceCarrier', label: 'Insurance Carrier' },
    { key: 'insuranceBroker', label: 'Insurance Broker' },
    { key: 'notes', label: 'Notes' },
    { key: 'status', label: 'Status' },
    { key: 'timestamp', label: 'Timestamp' },
    { key: 'accountID', label: 'Account ID' },
];

const getVisibleHeaders = (tabName: string): { key: keyof Account; label: string }[] => {
    const hiddenKeys: (keyof Account)[] = [];
    const upperTab = (tabName || '').toUpperCase();

    if (upperTab.includes('INSURANCE')) {
        hiddenKeys.push('licenseNumber', 'amountDue', 'billingType', 'billingAmount', 'paymentMethod');
    } else if (upperTab.includes('LICENSE')) {
        hiddenKeys.push('insuranceCarrier', 'insuranceBroker', 'amountDue', 'billingType', 'billingAmount', 'paymentMethod');
    } else if (upperTab.includes('NOVA')) {
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
      default:
        return value as React.ReactNode;
    }
};

const emptyFormState: Omit<Account, 'accountID' | 'timestamp'> = {
    accountType: '', subCategory: '', company: '', location: '', locationNumber: '',
    expiration: '', amountDue: 0, billingType: '', billingAmount: 0, paymentMethod: '',
    licenseNumber: '', insuranceCarrier: '', insuranceBroker: '', notes: '', status: 'Active',
};

const AccountsView: React.FC = () => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedSubCategories, setExpandedSubCategories] = useState<Set<string>>(new Set());
  const [expandedCompanies, setExpandedCompanies] = useState<Set<string>>(new Set());

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [formState, setFormState] = useState(emptyFormState);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getAccounts();
      setAccounts(data);
    } catch (err) {
      setError("Failed to load account data. Please try again later.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const { tabs, accountsByTab, accountTypeOptions, subCategoryOptions } = useMemo(() => {
    const grouped = accounts.reduce((acc, account) => {
        const type = account.accountType || 'Uncategorized';
        if (!acc[type]) acc[type] = [];
        acc[type].push(account);
        return acc;
    }, {} as Record<string, Account[]>);

    const sortedTypes = Object.entries(grouped).sort(([, a], [, b]) => b.length - a.length);
    const mainTabs = sortedTypes.slice(0, 3).map(([type]) => type);
    const otherAccounts = sortedTypes.slice(3).flatMap(([, accs]) => accs);
    
    const finalTabs: string[] = [...mainTabs];
    const finalAccountsByTab: Record<string, Account[]> = {};
    mainTabs.forEach(tab => { finalAccountsByTab[tab] = grouped[tab]; });
    
    if (otherAccounts.length > 0) {
        finalTabs.push('Other');
        finalAccountsByTab['Other'] = otherAccounts;
    }

    if (!activeTab && finalTabs.length > 0) setActiveTab(finalTabs[0]);
    
    const allTypes = new Set(accounts.map(a => a.accountType).filter(Boolean));
    const allSubCats = new Set(accounts.map(a => a.subCategory).filter(Boolean));

    return { 
        tabs: finalTabs, 
        accountsByTab: finalAccountsByTab,
        accountTypeOptions: Array.from(allTypes).sort(),
        subCategoryOptions: Array.from(allSubCats).sort(),
    };
  }, [accounts, activeTab]);
  
  const groupedAndFilteredAccounts = useMemo(() => {
      if (!activeTab || !accountsByTab[activeTab]) return {};
      const accountsInTab = accountsByTab[activeTab];
      
      const groupedBySubCategory = accountsInTab.reduce((acc, account) => {
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
    setEditingAccount(null);
    setFormState({ ...emptyFormState, accountType: activeTab !== 'Other' ? activeTab : '' });
    setError(null);
    setIsModalOpen(true);
  };
  
  const openModalForEdit = (account: Account) => {
    setEditingAccount(account);
    setFormState(account);
    setError(null);
    setIsModalOpen(true);
  };

  const handleSave = async () => {
      if (!formState.company.trim() || !formState.accountType.trim()) {
          setError('Company and Account Type are required fields.');
          return;
      }
      setIsSubmitting(true);
      setError(null);
      
      const result = editingAccount 
        ? await updateAccount({ ...editingAccount, ...formState })
        : await addAccount(formState);
        
      if (result.success) {
          setIsModalOpen(false);
          await fetchData();
      } else {
          setError(result.message);
      }
      setIsSubmitting(false);
  };
  
  const handleDelete = async (account: Account) => {
      if (window.confirm(`Are you sure you want to delete the account for "${account.company}"? This cannot be undone.`)) {
          setIsSubmitting(true);
          const result = await deleteAccount(account.accountID);
          if (result.success) {
              await fetchData();
          } else {
              alert(`Error: ${result.message}`);
          }
          setIsSubmitting(false);
      }
  };

  const tabColorClasses = [
    'border-indigo-500 text-indigo-600',
    'border-blue-500 text-blue-600',
    'border-green-500 text-green-600',
    'border-purple-500 text-purple-600',
  ];

  const ALL_FORM_FIELDS: { key: keyof Account; label: string; type: 'text' | 'select' | 'date' | 'number' | 'textarea'; options?: string[] }[] = [
      { key: 'company', label: 'Company', type: 'text' },
      { key: 'accountType', label: 'Account Type', type: 'select', options: accountTypeOptions },
      { key: 'subCategory', label: 'Sub Category', type: 'select', options: subCategoryOptions },
      { key: 'location', label: 'Location', type: 'text' },
      { key: 'locationNumber', label: 'Location Number', type: 'text' },
      { key: 'expiration', label: 'Expiration Date', type: 'date' },
      { key: 'amountDue', label: 'Amount Due', type: 'number' },
      { key: 'billingAmount', label: 'Billing Amount', type: 'number' },
      { key: 'billingType', label: 'Billing Type', type: 'text' },
      { key: 'paymentMethod', label: 'Payment Method', type: 'text' },
      { key: 'licenseNumber', label: 'License Number', type: 'text' },
      { key: 'insuranceCarrier', label: 'Insurance Carrier', type: 'text' },
      { key: 'insuranceBroker', label: 'Insurance Broker', type: 'text' },
      { key: 'status', label: 'Status', type: 'text' },
      { key: 'notes', label: 'Notes', type: 'textarea' },
  ];
  
  const visibleFormFields = useMemo(() => {
    const currentAccountType = formState.accountType || activeTab;
    const visibleTableKeys = getVisibleHeaders(currentAccountType).map(h => h.key);
    const coreKeys: (keyof Account)[] = ['company', 'accountType', 'subCategory'];
    return ALL_FORM_FIELDS.filter(field => coreKeys.includes(field.key) || visibleTableKeys.includes(field.key));
  }, [formState.accountType, activeTab, accountTypeOptions, subCategoryOptions]);

  const visibleHeaders = getVisibleHeaders(activeTab);
  
  return (
    <>
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <h2 className="text-3xl font-bold text-gray-900">Accounts Overview</h2>
           <button onClick={openModalForAdd} className="flex items-center justify-center bg-indigo-600 text-white px-4 py-2 rounded-md shadow-sm hover:bg-indigo-700 transition-colors w-full sm:w-auto">
              <PlusIcon className="h-5 w-5 mr-2" />
              Add Account
          </button>
      </div>

      {loading ? (
           <div className="flex items-center justify-center min-h-[40vh]">
              <div className="flex flex-col items-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
                  <p className="mt-4 text-gray-600">Loading accounts...</p>
              </div>
          </div>
      ) : error ? (
          <div className="text-center py-10 text-red-600 bg-red-50 rounded-lg"><p className="font-semibold">Error</p><p>{error}</p></div>
      ) : (
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
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><SearchIcon className="h-5 w-5 text-gray-400" /></div>
                      <input type="search" placeholder="Search accounts..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md bg-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 sm:text-sm"/>
                  </div>
                  <div className="flex items-center gap-2">
                      <button onClick={handleExpandAll} className="px-3 py-1 text-xs font-medium text-indigo-700 bg-indigo-100 rounded-md">Expand All</button>
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
                                                          <tr key={account.accountID} className="odd:bg-white even:bg-gray-50/50">
                                                              <td className="px-4 py-3 whitespace-nowrap space-x-2">
                                                                  <button onClick={() => openModalForEdit(account)} className="text-indigo-600 hover:text-indigo-900 p-1 rounded-md hover:bg-indigo-100" disabled={isSubmitting}><PencilIcon className="h-4 w-4"/></button>
                                                                  <button onClick={() => handleDelete(account)} className="text-red-600 hover:text-red-900 p-1 rounded-md hover:bg-red-100" disabled={isSubmitting}><TrashIcon className="h-4 w-4"/></button>
                                                              </td>
                                                              {visibleHeaders.map(header => (
                                                                  <td key={header.key} className={`px-4 py-3 text-gray-700 ${header.key === 'notes' ? 'whitespace-pre-wrap max-w-xs' : 'whitespace-nowrap'}`}>
                                                                      {header.key === 'expiration' ? (
                                                                          <span className={`px-2 py-1 rounded-full text-xs ${getExpirationHighlightClass(account.expiration)}`}>
                                                                              {getCellContent(account, header.key)}
                                                                          </span>
                                                                      ) : ( getCellContent(account, header.key) )}
                                                                  </td>
                                                              ))}
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
                                          <h4 className="font-semibold text-indigo-700 p-4 border-b">{company}</h4>
                                          <div className="divide-y divide-gray-200">
                                              {accounts.map(account => (
                                                  <div key={account.accountID} className="p-4">
                                                      <div className="flex justify-between items-start">
                                                          <div className="flex-1 space-y-1">
                                                              <p className="text-sm"><span className="font-medium text-gray-500">Location:</span> {account.location || 'N/A'}</p>
                                                              <StatusBadge status={account.status} />
                                                          </div>
                                                          <div className="flex-shrink-0 flex gap-2">
                                                              <button onClick={() => openModalForEdit(account)} className="text-indigo-600 p-1" disabled={isSubmitting}><PencilIcon className="h-5 w-5"/></button>
                                                              <button onClick={() => handleDelete(account)} className="text-red-600 p-1" disabled={isSubmitting}><TrashIcon className="h-5 w-5"/></button>
                                                          </div>
                                                      </div>
                                                      <div className="mt-2">
                                                          <p className="text-sm">
                                                              <span className="font-medium text-gray-500">Expiration:</span>
                                                              <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${getExpirationHighlightClass(account.expiration)}`}>
                                                                  {formatDateToMDY(account.expiration) || 'N/A'}
                                                              </span>
                                                          </p>
                                                      </div>
                                                      <details className="text-sm mt-3 group">
                                                          <summary className="list-none cursor-pointer text-indigo-600 font-medium">
                                                              <span className="group-open:hidden">Show details</span>
                                                              <span className="hidden group-open:inline">Hide details</span>
                                                          </summary>
                                                          <div className="mt-2 pt-2 border-t grid grid-cols-1 gap-y-1 gap-x-4">
                                                              {visibleHeaders.map(header => (
                                                                  <div key={header.key} className="grid grid-cols-2">
                                                                      <strong className="text-gray-600">{header.label}:</strong>
                                                                      <span className="text-gray-800 break-words">{getCellContent(account, header.key)}</span>
                                                                  </div>
                                                              ))}
                                                          </div>
                                                      </details>
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
      )}

       <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingAccount ? `Edit Account: ${editingAccount.company}` : 'Add New Account'} size="2xl">
        <div className="space-y-4 max-h-[70vh] overflow-y-auto p-1 pr-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               {visibleFormFields.map(field => {
                    const value = formState[field.key as keyof typeof formState] || '';
                    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
                        const { name, value } = e.target;
                        setFormState(prev => ({ ...prev, [name]: field.type === 'number' ? parseFloat(value) || 0 : value }));
                    };

                    return (
                        <div key={field.key} className={field.type === 'textarea' ? 'md:col-span-2' : ''}>
                            <label className="block text-sm font-medium text-gray-700">{field.label}</label>
                            {field.type === 'textarea' ? (
                                <textarea name={field.key} value={value as string} onChange={handleChange} className="mt-1 w-full p-2 border rounded" rows={3}></textarea>
                            ) : field.type === 'select' ? (
                                <select name={field.key} value={value as string} onChange={handleChange} className="mt-1 w-full p-2 border rounded bg-white">
                                    <option value="">Select {field.label}</option>
                                    {field.options?.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                </select>
                            ) : (
                                <input
                                    type={field.type}
                                    name={field.key}
                                    value={field.type === 'date' ? formatDateToYMD(value as string) || '' : value as any}
                                    onChange={handleChange}
                                    className="mt-1 w-full p-2 border rounded"
                                />
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
        <div className="p-4 border-t mt-4 flex justify-between items-center">
            {error && <p className="text-sm text-red-600 flex-1">{error}</p>}
            <div className={`flex justify-end space-x-2 ${error ? '' : 'w-full'}`}>
                <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300" disabled={isSubmitting}>Cancel</button>
                <button onClick={handleSave} className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:bg-indigo-400" disabled={isSubmitting}>
                    {isSubmitting ? 'Saving...' : 'Save Account'}
                </button>
            </div>
        </div>
      </Modal>
    </>
  );
};

export default AccountsView;

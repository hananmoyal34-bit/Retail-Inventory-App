
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Account } from '../types';
import { formatCurrency, formatDateToMDY, getExpirationHighlightClass } from '../utils/formatting';
import { SearchIcon, ChevronRightIcon, ViewIcon, AdjustmentsIcon, SortIcon } from '../../icons';
import AccountDetailsModal from './AccountDetailsModal';

interface AccountsViewProps {
    accounts: Account[];
}

type AccountSortKey = 'locationName' | 'amountDue' | 'expiration';
interface AccountSortConfig {
    key: AccountSortKey;
    direction: 'ascending' | 'descending';
}

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
    const lowerStatus = (status || '').toLowerCase();
    let colorClasses = 'bg-gray-100 text-gray-800'; // Default
    if (lowerStatus === 'active' || lowerStatus === 'paid') colorClasses = 'bg-green-100 text-green-800';
    else if (lowerStatus === 'inactive' || lowerStatus === 'cancelled') colorClasses = 'bg-red-100 text-red-800';
    else if (lowerStatus.includes('due') || lowerStatus.includes('pending')) colorClasses = 'bg-yellow-100 text-yellow-800';
    return <span className={`px-2 py-1 text-xs font-semibold leading-4 rounded-full ${colorClasses}`}>{status}</span>;
};

const ALL_HEADERS: { key: keyof Account; label: string }[] = [
    { key: 'locationName', label: 'Location Name' }, { key: 'locationAddress', label: 'Location Address' },
    { key: 'expiration', label: 'Expiration' }, { key: 'amountDue', label: 'Amount Due' },
    { key: 'billingType', label: 'Billing Type' }, { key: 'billingAmount', label: 'Billing Amt' },
    { key: 'paymentMethod', label: 'Payment Method' }, { key: 'licenseNumber', label: 'License #' },
    { key: 'insuranceCarrier', label: 'Ins Carrier' }, { key: 'insuranceBroker', label: 'Ins Broker' },
    { key: 'notes', label: 'Notes' }, { key: 'status', label: 'Status' },
    { key: 'timestamp', label: 'Timestamp' }, { key: 'fileUpload', label: 'File' },
    { key: 'accountID', label: 'Account ID' },
];

const getTabVisibleHeaders = (tabName: string): { key: keyof Account; label: string }[] => {
    const hiddenKeys: (keyof Account)[] = [];
    const upperTab = (tabName || '').toUpperCase();
    if (upperTab.includes('INSURANCE')) hiddenKeys.push('licenseNumber', 'amountDue', 'billingType', 'billingAmount', 'paymentMethod');
    else if (upperTab.includes('LICENSE')) hiddenKeys.push('insuranceCarrier', 'insuranceBroker', 'amountDue', 'billingType', 'billingAmount', 'paymentMethod');
    else if (upperTab.includes('NOVA')) hiddenKeys.push('insuranceCarrier', 'insuranceBroker', 'licenseNumber');
    return ALL_HEADERS.filter(header => !hiddenKeys.includes(header.key));
};

const getCellContent = (account: Account, key: keyof Account): React.ReactNode => {
    const value = account[key];
    switch (key) {
      case 'amountDue': case 'billingAmount': return formatCurrency(value as number);
      case 'status': return <StatusBadge status={value as string} />;
      case 'expiration': case 'timestamp': return formatDateToMDY(value as string) || '';
      case 'fileUpload': return value ? <a href={value as string} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">View File</a> : 'N/A';
      default: return value as React.ReactNode;
    }
};

const AccountsView: React.FC<AccountsViewProps> = ({ accounts }) => {
    const [activeTab, setActiveTab] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [expandedCompanies, setExpandedCompanies] = useState<Set<string>>(new Set());
    const [sortConfig, setSortConfig] = useState<AccountSortConfig>({ key: 'locationName', direction: 'ascending' });
    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
    const [recordToView, setRecordToView] = useState<Account | null>(null);
    const [isColumnSelectorOpen, setIsColumnSelectorOpen] = useState(false);
    const columnSelectorRef = useRef<HTMLDivElement>(null);
    const [visibleColumnKeys, setVisibleColumnKeys] = useState<Set<keyof Account>>(new Set());

    const { tabs, accountsByTab } = useMemo(() => {
        const grouped = accounts.reduce((acc, account) => {
            const type = account.accountType || 'Uncategorized';
            if (!acc[type]) acc[type] = [];
            acc[type].push(account);
            return acc;
        }, {} as Record<string, Account[]>);
        const sortedTabs = Object.keys(grouped).sort();
        return { tabs: sortedTabs, accountsByTab: grouped };
    }, [accounts]);

    useEffect(() => {
        if (tabs.length > 0 && !tabs.includes(activeTab)) setActiveTab(tabs[0]);
    }, [tabs, activeTab]);

    useEffect(() => {
        if (!activeTab) return;
        try {
            const saved = localStorage.getItem(`accounts-viewer-columns-${activeTab}`);
            if (saved) setVisibleColumnKeys(new Set(JSON.parse(saved)));
            else setVisibleColumnKeys(new Set(getTabVisibleHeaders(activeTab).map(h => h.key)));
        } catch (e) { console.error("Error loading column visibility", e); }
    }, [activeTab]);

    useEffect(() => {
        if (!activeTab) return;
        localStorage.setItem(`accounts-viewer-columns-${activeTab}`, JSON.stringify(Array.from(visibleColumnKeys)));
    }, [visibleColumnKeys, activeTab]);

    const groupedAndFilteredAccounts = useMemo(() => {
        if (!activeTab || !accountsByTab[activeTab]) return {};
        const accountsInTab = accountsByTab[activeTab];
        
        const groupedByCompany = (accountsInTab as Account[]).reduce((acc, account) => {
            const company = account.company || 'Unassigned';
            if (!acc[company]) acc[company] = [];
            acc[company].push(account);
            return acc;
        }, {} as Record<string, Account[]>);

        const lowercasedQuery = searchTerm.toLowerCase();
        let queryFilteredGroups = groupedByCompany;
        if (lowercasedQuery) {
            queryFilteredGroups = {};
            // FIX: Cast result of Object.entries to fix 'unknown' type error.
            (Object.entries(groupedByCompany) as [string, Account[]][]).forEach(([company, companyAccounts]) => {
                if (company.toLowerCase().includes(lowercasedQuery) || 
                    // FIX: Cast `companyAccounts` to `Account[]` to fix 'unknown' type error on `some`.
                    (companyAccounts as Account[]).some(acc => Object.values(acc).some(val => String(val).toLowerCase().includes(lowercasedQuery)))) {
                    queryFilteredGroups[company] = companyAccounts;
                }
            });
        }

        const sortedGroups: typeof queryFilteredGroups = {};
        // FIX: Cast result of Object.entries to fix 'unknown' type error.
        (Object.entries(queryFilteredGroups) as [string, Account[]][]).forEach(([company, companyAccounts]) => {
            sortedGroups[company] = [...companyAccounts].sort((a, b) => {
                const aValue = a[sortConfig.key], bValue = b[sortConfig.key];
                if (sortConfig.key === 'amountDue') {
                    return sortConfig.direction === 'ascending' ? (Number(aValue) || 0) - (Number(bValue) || 0) : (Number(bValue) || 0) - (Number(aValue) || 0);
                }
                return sortConfig.direction === 'ascending' ? String(aValue).localeCompare(String(bValue)) : String(bValue).localeCompare(String(aValue));
            });
        });
        return sortedGroups;
    }, [activeTab, accountsByTab, searchTerm, sortConfig]);

    const handleViewDetails = (account: Account) => {
        setRecordToView(account);
        setIsDetailsModalOpen(true);
    };

    const tabHeaders = useMemo(() => getTabVisibleHeaders(activeTab), [activeTab]);
    const visibleHeaders = useMemo(() => tabHeaders.filter(h => visibleColumnKeys.has(h.key)), [tabHeaders, visibleColumnKeys]);
    
    return (
        <>
            <h2 className="text-3xl font-bold text-gray-900 mb-6">Accounts Viewer</h2>
            <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-8 overflow-x-auto" aria-label="Tabs">
                    {tabs.map(tab => (
                        <button key={tab} onClick={() => setActiveTab(tab)} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === tab ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>
                            {tab} ({accountsByTab[tab]?.length || 0})
                        </button>
                    ))}
                </nav>
            </div>
            <div className="mt-4">
                <div className="flex flex-col sm:flex-row gap-4 justify-between items-center mb-4">
                    <div className="relative w-full sm:max-w-xs">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><SearchIcon /></div>
                        <input type="search" placeholder="Search accounts..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md bg-white"/>
                    </div>
                </div>
                {Object.keys(groupedAndFilteredAccounts).length > 0 ? (
                    <div className="space-y-4">
                        {/* FIX: Cast result of Object.entries to fix 'unknown' type error. */}
                        {(Object.entries(groupedAndFilteredAccounts) as [string, Account[]][]).sort(([a], [b]) => a.localeCompare(b)).map(([company, companyAccounts]) => (
                            <details key={company} open={true} className="bg-white shadow-md rounded-lg overflow-hidden">
                                <summary className="list-none flex justify-between items-center p-4 cursor-pointer hover:bg-gray-50">
                                    <h4 className="font-semibold text-md text-gray-700">{company} ({companyAccounts.length})</h4>
                                </summary>
                                {/* Desktop Table */}
                                <div className="border-t border-gray-200 overflow-x-auto hidden md:block">
                                    <table className="min-w-full divide-y divide-gray-200 text-sm">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-4 py-3"></th>
                                                {visibleHeaders.map(header => <th key={header.key} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{header.label}</th>)}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-200">
                                            {/* FIX: Cast result of Object.entries to fix 'unknown' type error. */}
                                            {(companyAccounts as Account[]).map(account => (
                                                <tr key={account.accountID} className="hover:bg-indigo-50 cursor-pointer" onClick={() => handleViewDetails(account)}>
                                                    <td className="px-4 py-3"><ViewIcon /></td>
                                                    {visibleHeaders.map(header => (
                                                        <td key={header.key} className={`px-4 py-3 text-gray-700 ${header.key === 'notes' ? 'whitespace-pre-wrap max-w-xs' : 'whitespace-nowrap'}`}>
                                                          {header.key === 'expiration' ? <span className={`px-2 py-1 rounded-full text-xs ${getExpirationHighlightClass(account.expiration)}`}>{getCellContent(account, header.key)}</span> : getCellContent(account, header.key)}
                                                        </td>
                                                    ))}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                {/* Mobile Cards */}
                                <div className="border-t border-gray-200 md:hidden p-2 space-y-2">
                                  {/* FIX: Cast result of Object.entries to fix 'unknown' type error. */}
                                  {(companyAccounts as Account[]).map(account => (
                                    <div key={account.accountID} onClick={() => handleViewDetails(account)} className="bg-gray-50/50 rounded-lg p-3 border border-gray-200 space-y-2">
                                      <div className="flex justify-between items-start">
                                        <p className="font-semibold text-on-surface flex-1 pr-2">{account.locationName}</p>
                                        <StatusBadge status={account.status} />
                                      </div>
                                      <div className="text-xs text-on-surface-secondary flex flex-wrap gap-x-4 gap-y-1">
                                        <span>Exp: <span className={`font-medium px-1.5 py-0.5 rounded ${getExpirationHighlightClass(account.expiration)}`}>{formatDateToMDY(account.expiration) || 'N/A'}</span></span>
                                        <span>Due: <span className="font-medium text-on-surface">{formatCurrency(account.amountDue)}</span></span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                            </details>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-10 text-gray-500 bg-white rounded-lg shadow">No accounts found.</div>
                )}
            </div>
            {isDetailsModalOpen && recordToView && <AccountDetailsModal isOpen={isDetailsModalOpen} onClose={() => setIsDetailsModalOpen(false)} account={recordToView} />}
        </>
    );
};

export default AccountsView;

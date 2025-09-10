
import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import type { CustomerRecord, Status, SortConfig } from '../types';
import DetailsModal from './DetailsModal';
import { SearchIcon, AdjustmentsIcon, ViewIcon, SortIcon, ChevronIcon } from '../../icons';
import Pagination from './Pagination';
import Tooltip from './Tooltip';
import Spinner from './Spinner';

interface CSHubViewProps {
    records: CustomerRecord[];
}

const RECORDS_PER_PAGE = 20;
const STATUS_ORDER: (Status | string)[] = ['New', 'In Progress', 'Closed'];

const ALL_CSHUB_HEADERS: { key: keyof CustomerRecord | 'Customer'; label: string }[] = [
    { key: 'Ticket Category', label: 'Category' },
    { key: 'Receipt Number', label: 'Receipt #' },
    { key: 'Customer', label: 'Customer' },
    { key: 'Timestamp', label: 'Submitted On' },
    { key: 'Product', label: 'Product' },
    { key: 'Store Name', label: 'Store' },
    { key: 'TicketID', label: 'Ticket ID' },
];

const DEFAULT_VISIBLE_COLUMNS: (keyof CustomerRecord | 'Customer')[] = [
    'Ticket Category', 'Receipt Number', 'Customer', 'Timestamp'
];

const getStatusClass = (status: string) => {
    const baseStyles = "px-2 py-1 text-xs font-semibold rounded-full";
    switch (status.toLowerCase()) {
        case 'new': return `${baseStyles} bg-indigo-100 text-indigo-800`;
        case 'in progress': return `${baseStyles} bg-amber-100 text-amber-800`;
        case 'closed': return `${baseStyles} bg-gray-200 text-gray-800`;
        default: return `${baseStyles} bg-gray-100 text-gray-700`;
    }
};

const getCategoryClass = (category: string) => {
    return "px-2 py-1 text-xs font-semibold rounded-full inline-block whitespace-nowrap bg-gray-100 text-gray-800";
};

const getCellContent = (record: CustomerRecord, key: keyof CustomerRecord | 'Customer'): React.ReactNode => {
    switch (key) {
        case 'Customer':
            return (
                <div>
                    <div className="font-semibold text-on-surface">{record['First Name']} {record['Last Name']}</div>
                    <div className="text-xs text-on-surface-secondary">{record['Email Address']}</div>
                </div>
            );
        case 'Timestamp':
            return record.Timestamp ? new Date(record.Timestamp).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : 'N/A';
        case 'Ticket Category':
            return <span className={getCategoryClass(record['Ticket Category'])}>{record['Ticket Category']}</span>;
        case 'TicketID':
            return <span className="text-on-surface whitespace-nowrap">{record.TicketID}</span>;
        default:
            return record[key as keyof CustomerRecord] || '';
    }
};


const CSHubView: React.FC<CSHubViewProps> = ({ records }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'Timestamp', direction: 'descending' });
    const [activeTab, setActiveTab] = useState<'open' | 'closed'>('open');
    const [collapsedStatuses, setCollapsedStatuses] = useState<Set<string>>(new Set());
    
    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
    const [recordToView, setRecordToView] = useState<CustomerRecord | null>(null);

    const [isColumnSelectorOpen, setIsColumnSelectorOpen] = useState(false);
    const [visibleColumnKeys, setVisibleColumnKeys] = useState<Set<keyof CustomerRecord | 'Customer'>>(new Set(DEFAULT_VISIBLE_COLUMNS));
    const columnSelectorRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        try {
            const saved = localStorage.getItem(`cshub-viewer-columns-${activeTab}`);
            if (saved) setVisibleColumnKeys(new Set(JSON.parse(saved)));
            else setVisibleColumnKeys(new Set(DEFAULT_VISIBLE_COLUMNS));
        } catch (e) {
            console.error("Failed to parse visible columns from localStorage", e);
            setVisibleColumnKeys(new Set(DEFAULT_VISIBLE_COLUMNS));
        }
    }, [activeTab]);

    useEffect(() => {
        localStorage.setItem(`cshub-viewer-columns-${activeTab}`, JSON.stringify(Array.from(visibleColumnKeys)));
    }, [visibleColumnKeys, activeTab]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (columnSelectorRef.current && !columnSelectorRef.current.contains(event.target as Node)) {
                setIsColumnSelectorOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleViewDetails = (record: CustomerRecord) => {
        setRecordToView(record);
        setIsDetailsModalOpen(true);
    };

    const handleSort = (key: keyof CustomerRecord | 'Customer') => {
        setSortConfig(prev => ({
            key,
            direction: prev.key === key && prev.direction === 'ascending' ? 'descending' : 'ascending'
        }));
        setCurrentPage(1);
    };

    const processedRecords = useMemo(() => {
        return records
            .filter(record => activeTab === 'open' ? record.Status !== 'Closed' : record.Status === 'Closed')
            .filter(record => {
                const query = searchQuery.toLowerCase();
                return `${record['First Name']} ${record['Last Name']}`.toLowerCase().includes(query) ||
                       (record['Email Address'] || '').toLowerCase().includes(query) ||
                       (record.TicketID || '').toLowerCase().includes(query);
            })
            .sort((a, b) => {
                const statusA = STATUS_ORDER.indexOf(a.Status);
                const statusB = STATUS_ORDER.indexOf(b.Status);
                if (statusA !== statusB) return statusA - statusB;

                const { key, direction } = sortConfig;
                let aValue: string | number, bValue: string | number;

                if (key === 'Customer') {
                    aValue = `${a['First Name']} ${a['Last Name']}`.trim().toLowerCase();
                    bValue = `${b['First Name']} ${b['Last Name']}`.trim().toLowerCase();
                } else if (key === 'Timestamp') {
                    aValue = new Date(a.Timestamp).getTime() || 0;
                    bValue = new Date(b.Timestamp).getTime() || 0;
                } else {
                    aValue = a[key]?.toLowerCase() || '';
                    bValue = b[key]?.toLowerCase() || '';
                }

                if (aValue < bValue) return direction === 'ascending' ? -1 : 1;
                if (aValue > bValue) return direction === 'ascending' ? 1 : -1;
                return 0;
            });
    }, [records, searchQuery, sortConfig, activeTab]);

    const paginatedRecords = useMemo(() => {
        return processedRecords.slice((currentPage - 1) * RECORDS_PER_PAGE, currentPage * RECORDS_PER_PAGE);
    }, [processedRecords, currentPage]);

    const totalPages = Math.ceil(processedRecords.length / RECORDS_PER_PAGE);
    const visibleHeaders = ALL_CSHUB_HEADERS.filter(h => visibleColumnKeys.has(h.key));
    let lastStatus: string | null = null;

    return (
        <>
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <h1 className="text-4xl font-bold text-on-surface">Customer Service Hub</h1>
                <div className="flex w-full md:w-auto md:flex-grow max-w-lg items-center gap-2">
                    <div className="relative flex-grow">
                        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none"><SearchIcon /></div>
                        <input
                           type="search"
                           placeholder="Search by Ticket ID, Name, or Email..."
                           value={searchQuery}
                           onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                           className="w-full pl-10 pr-4 py-2 bg-surface border border-border-color text-on-surface rounded-lg focus:ring-primary focus:border-primary"
                        />
                    </div>
                    <div className="relative" ref={columnSelectorRef}>
                        <Tooltip text="Manage Columns">
                            <button onClick={() => setIsColumnSelectorOpen(prev => !prev)} className="h-full px-3 py-2 text-sm font-medium text-on-surface-secondary bg-surface border border-border-color rounded-lg flex items-center gap-1 hover:bg-gray-100">
                                <AdjustmentsIcon />
                            </button>
                        </Tooltip>
                        {isColumnSelectorOpen && (
                            <div className="absolute right-0 mt-2 w-56 bg-white rounded-md shadow-lg z-20 border border-gray-200">
                                <div className="p-2 font-semibold text-sm border-b">Show Columns</div>
                                <div className="p-2 max-h-60 overflow-y-auto">
                                    {ALL_CSHUB_HEADERS.map(header => (
                                        <label key={String(header.key)} className="flex items-center space-x-2 p-1 hover:bg-gray-100 rounded-md cursor-pointer">
                                            <input
                                                type="checkbox"
                                                className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                                checked={visibleColumnKeys.has(header.key)}
                                                onChange={() => setVisibleColumnKeys(prev => {
                                                    const newSet = new Set(prev);
                                                    newSet.has(header.key) ? newSet.delete(header.key) : newSet.add(header.key);
                                                    return newSet;
                                                })}
                                            />
                                            <span className="text-sm text-gray-700 select-none">{header.label}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </header>

            <div className="mb-4 border-b border-border-color">
                <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                    <button onClick={() => { setActiveTab('open'); setCurrentPage(1); }} className={`${activeTab === 'open' ? 'border-primary text-primary' : 'border-transparent text-on-surface-secondary hover:text-on-surface hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}>Open Tickets</button>
                    <button onClick={() => { setActiveTab('closed'); setCurrentPage(1); }} className={`${activeTab === 'closed' ? 'border-primary text-primary' : 'border-transparent text-on-surface-secondary hover:text-on-surface hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}>Closed Tickets</button>
                </nav>
            </div>

            <main className="bg-surface rounded-xl shadow-lg">
                {/* Mobile Card View */}
                <div className="md:hidden p-2 space-y-3">
                    {paginatedRecords.map(record => (
                        <div key={record.TicketID} onClick={() => handleViewDetails(record)} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm space-y-2 cursor-pointer">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="font-bold text-on-surface">{record['First Name']} {record['Last Name']}</p>
                                    <p className="text-xs text-on-surface-secondary">{record['Ticket Category']}</p>
                                </div>
                                <span className={getStatusClass(record.Status)}>{record.Status}</span>
                            </div>
                            <div className="text-sm text-on-surface-secondary pt-2 border-t">
                                <p>ID: <span className="font-mono text-on-surface">{record.TicketID}</span></p>
                                <p>Submitted: <span className="font-medium text-on-surface">{record.Timestamp ? new Date(record.Timestamp).toLocaleDateString() : 'N/A'}</span></p>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Desktop Table View */}
                <div className="hidden md:block overflow-x-auto relative max-h-[65vh]">
                    <table className="w-full text-sm text-left text-gray-700">
                        <thead className="text-xs text-on-surface uppercase bg-gray-50 border-b-2 border-border-color sticky top-0 z-10">
                            <tr>
                                {visibleHeaders.map(header => (
                                    <th scope="col" key={String(header.key)} className="px-6 py-3 cursor-pointer" onClick={() => handleSort(header.key)}>
                                        <div className="flex items-center gap-2">
                                            {header.label}
                                            <SortIcon direction={sortConfig.key === header.key ? sortConfig.direction : 'none'} />
                                        </div>
                                    </th>
                                ))}
                                <th scope="col" className="px-6 py-3">Status</th>
                                <th scope="col" className="px-6 py-3 text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {paginatedRecords.map(record => {
                                const isCollapsed = collapsedStatuses.has(record.Status);
                                const showStatusHeader = record.Status !== lastStatus && activeTab !== 'closed';
                                lastStatus = record.Status;

                                return (
                                    <React.Fragment key={record.TicketID}>
                                        {showStatusHeader && (
                                            <tr className="bg-gray-100/95 backdrop-blur-sm sticky top-[41px] z-[9] border-b border-t border-gray-200 cursor-pointer hover:bg-gray-200" onClick={() => setCollapsedStatuses(prev => { const s = new Set(prev); s.has(record.Status) ? s.delete(record.Status) : s.add(record.Status); return s; })}>
                                                <th colSpan={visibleHeaders.length + 2} className="px-6 py-2 text-left text-sm font-bold text-on-surface select-none">
                                                    <div className="flex items-center gap-2"><ChevronIcon isCollapsed={isCollapsed} />{record.Status}</div>
                                                </th>
                                            </tr>
                                        )}
                                        {!isCollapsed && (
                                            <tr className="odd:bg-white even:bg-gray-50/70 border-b border-border-color hover:bg-indigo-50 cursor-pointer" onClick={() => handleViewDetails(record)}>
                                                {visibleHeaders.map(header => (
                                                    <td className="px-6 py-4" key={String(header.key)}>{getCellContent(record, header.key)}</td>
                                                ))}
                                                <td className="px-6 py-4"><span className={getStatusClass(record.Status)}>{record.Status}</span></td>
                                                <td className="px-6 py-4 text-center">
                                                    <Tooltip text="View Details">
                                                        <button onClick={(e) => { e.stopPropagation(); handleViewDetails(record); }} className="text-emerald-500 hover:text-emerald-700"><ViewIcon /></button>
                                                    </Tooltip>
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
                {totalPages > 1 && <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />}
            </main>

            {isDetailsModalOpen && recordToView && <DetailsModal isOpen={isDetailsModalOpen} onClose={() => setIsDetailsModalOpen(false)} record={recordToView} />}
        </>
    );
};

export default CSHubView;
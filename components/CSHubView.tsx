import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import type { CustomerRecord, FileForUpload, FormState, Status, SortConfig } from '../types';
import { updateRecord, deleteRecord, createRecord } from '../services/writeService';
import { getCustomerRecords } from '../services/dataService';
import CustomerTable from './customer_service_hub/components/CustomerTable';
import RecordModal from './customer_service_hub/components/RecordModal';
import ConfirmationModal from './customer_service_hub/components/ConfirmationModal';
import { PlusIcon, SearchIcon, AdjustmentsIcon } from './icons';
import Spinner from './customer_service_hub/components/Spinner';
import Alert from './customer_service_hub/components/Alert';
import DetailsModal from './customer_service_hub/components/DetailsModal';
import Tooltip from './Tooltip';
import Pagination from './customer_service_hub/components/Pagination';

interface CSHubViewProps {
    viewOnly?: boolean;
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
    'Ticket Category',
    'Receipt Number',
    'Customer',
    'Timestamp'
];

const CSHubView: React.FC<CSHubViewProps> = ({ viewOnly = false }) => {
    const [records, setRecords] = useState<CustomerRecord[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [currentPage, setCurrentPage] = useState<number>(1);
    const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'Timestamp', direction: 'descending' });
    const [activeTab, setActiveTab] = useState<'open' | 'closed'>('open');
    const [collapsedStatuses, setCollapsedStatuses] = useState<Set<string>>(new Set());
    const [actionTarget, setActionTarget] = useState<{action: string, ticketId: string} | null>(null);

    const [isRecordModalOpen, setIsRecordModalOpen] = useState<boolean>(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState<boolean>(false);
    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState<boolean>(false);

    const [selectedRecord, setSelectedRecord] = useState<CustomerRecord | null>(null);
    const [recordToDelete, setRecordToDelete] = useState<CustomerRecord | null>(null);
    const [recordToView, setRecordToView] = useState<CustomerRecord | null>(null);

    const [isColumnSelectorOpen, setIsColumnSelectorOpen] = useState(false);
    const [visibleColumnKeys, setVisibleColumnKeys] = useState<Set<keyof CustomerRecord | 'Customer'>>(new Set(DEFAULT_VISIBLE_COLUMNS));
    const columnSelectorRef = useRef<HTMLDivElement>(null);
    
    const refetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            const data = await getCustomerRecords();
            setRecords(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred fetching records.');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        refetchData();
    }, [refetchData]);


    const getLocalStorageKey = (tab: 'open' | 'closed') => `cshub-visible-columns-${tab}`;

    useEffect(() => {
        try {
            const saved = localStorage.getItem(getLocalStorageKey(activeTab));
            if (saved) {
                setVisibleColumnKeys(new Set(JSON.parse(saved)));
            } else {
                setVisibleColumnKeys(new Set(DEFAULT_VISIBLE_COLUMNS));
            }
        } catch (e) {
            console.error("Failed to parse visible columns from localStorage", e);
            setVisibleColumnKeys(new Set(DEFAULT_VISIBLE_COLUMNS));
        }
    }, [activeTab]);

    useEffect(() => {
        try {
            localStorage.setItem(getLocalStorageKey(activeTab), JSON.stringify(Array.from(visibleColumnKeys)));
        } catch (e) {
            console.error("Failed to save visible columns to localStorage", e);
        }
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

    const handleColumnVisibilityChange = (key: keyof CustomerRecord | 'Customer') => {
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

    const showSuccessMessage = (message: string) => {
        setSuccessMessage(message);
        setTimeout(() => setSuccessMessage(null), 3000);
    };

    const handleAddNew = () => {
        if (viewOnly) return;
        setSelectedRecord(null);
        setIsRecordModalOpen(true);
    };

    const handleEdit = (record: CustomerRecord) => {
        if (viewOnly) return;
        setActionTarget({ action: 'edit', ticketId: record.TicketID });
        setTimeout(() => {
            setSelectedRecord(record);
            setIsRecordModalOpen(true);
            setActionTarget(null);
        }, 100);
    };

    const handleDelete = (record: CustomerRecord) => {
        if (viewOnly) return;
        setRecordToDelete(record);
        setIsDeleteModalOpen(true);
    };

    const handleViewDetails = (record: CustomerRecord) => {
        setActionTarget({ action: 'view', ticketId: record.TicketID });
        setTimeout(() => {
            setRecordToView(record);
            setIsDetailsModalOpen(true);
            setActionTarget(null);
        }, 100);
    };
    
    const handleToggleCollapse = useCallback((status: string) => {
        setCollapsedStatuses(prev => {
            const newSet = new Set(prev);
            if (newSet.has(status)) {
                newSet.delete(status);
            } else {
                newSet.add(status);
            }
            return newSet;
        });
    }, []);

    const handleSort = (key: keyof CustomerRecord | 'Customer') => {
        let direction: 'ascending' | 'descending' = 'ascending';
        if (sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
        setCurrentPage(1);
    };

    const handleStatusChange = async (ticketId: string, status: Status | string) => {
        if (viewOnly) return;
        // ... (rest of the function is the same)
    };

    const handleConfirmDelete = async () => {
        if (!recordToDelete || viewOnly) return;
        // ... (rest of the function is the same)
    };
    
    const handleSave = async (formData: FormState, files: FileForUpload[]) => {
        if (viewOnly) return;
        // ... (rest of the function is the same)
    };
    
    const processedRecords = useMemo(() => {
        const tabFiltered = records.filter(record => activeTab === 'open' ? record.Status !== 'Closed' : record.Status === 'Closed');
        const searchFiltered = tabFiltered.filter(record => {
            const query = searchQuery.toLowerCase();
            const fullName = `${record['First Name'] || ''} ${record['Last Name'] || ''}`.toLowerCase();
            const email = (record['Email Address'] || '').toLowerCase();
            const ticketId = (record.TicketID || '').toLowerCase();
            return fullName.includes(query) || email.includes(query) || ticketId.includes(query);
        });
        searchFiltered.sort((a, b) => {
            const statusA = STATUS_ORDER.indexOf(a.Status);
            const statusB = STATUS_ORDER.indexOf(b.Status);
            if (statusA !== statusB) return statusA - statusB;
            const { key, direction } = sortConfig;
            let aValue: string | number, bValue: string | number;
            if (key === 'Customer') {
                aValue = `${a['First Name'] || ''} ${a['Last Name'] || ''}`.trim().toLowerCase();
                bValue = `${b['First Name'] || ''} ${b['Last Name'] || ''}`.trim().toLowerCase();
            } else if (key === 'Timestamp') {
                aValue = a.Timestamp ? new Date(a.Timestamp).getTime() : 0;
                bValue = b.Timestamp ? new Date(b.Timestamp).getTime() : 0;
            } else {
                aValue = a[key]?.toLowerCase() || '';
                bValue = b[key]?.toLowerCase() || '';
            }
            if (aValue < bValue) return direction === 'ascending' ? -1 : 1;
            if (aValue > bValue) return direction === 'ascending' ? 1 : -1;
            return 0;
        });
        return searchFiltered;
    }, [records, searchQuery, sortConfig, activeTab]);

    const paginatedRecords = useMemo(() => {
        const startIndex = (currentPage - 1) * RECORDS_PER_PAGE;
        return processedRecords.slice(startIndex, startIndex + RECORDS_PER_PAGE);
    }, [processedRecords, currentPage]);

    const totalPages = Math.ceil(processedRecords.length / RECORDS_PER_PAGE);

    if (isLoading) {
        return <div className="flex justify-center items-center h-64"><Spinner /></div>;
    }

    return (
        <>
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <h1 className="text-4xl font-bold text-on-surface text-center md:text-left w-full md:w-auto">Customer Service Hub</h1>
                 <div className="flex w-full md:w-auto md:flex-grow max-w-lg items-center gap-2">
                     <div className="relative flex-grow">
                         <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                            <SearchIcon />
                         </div>
                         <input
                            type="search"
                            placeholder="Search by Ticket ID, Name, or Email..."
                            value={searchQuery}
                            onChange={(e) => {
                                setSearchQuery(e.target.value);
                                setCurrentPage(1);
                            }}
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
                                                onChange={() => handleColumnVisibilityChange(header.key)}
                                            />
                                            <span className="text-sm text-gray-700 select-none">{header.label}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                 </div>
                {!viewOnly && (
                    <Tooltip text="Create a new customer ticket">
                        <button
                            onClick={handleAddNew}
                            className="w-full md:w-auto flex-shrink-0 flex items-center justify-center gap-2 bg-primary hover:bg-primary-hover text-white font-bold py-2 px-4 rounded-lg shadow-lg transition-transform transform hover:scale-105"
                        >
                            <PlusIcon />
                            Add New Record
                        </button>
                    </Tooltip>
                )}
            </header>

            {error && <Alert message={error} type="error" onClose={() => setError(null)} />}
            {successMessage && <Alert message={successMessage} type="success" onClose={() => setSuccessMessage(null)} />}

             <div className="mb-4 border-b border-border-color">
                <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                    <button
                        onClick={() => {
                            setActiveTab('open');
                            setCurrentPage(1);
                        }}
                        className={`${activeTab === 'open' ? 'border-primary text-primary' : 'border-transparent text-on-surface-secondary hover:text-on-surface hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200 focus:outline-none`}
                        aria-current={activeTab === 'open' ? 'page' : undefined}
                    >
                        Open Tickets
                    </button>
                    <button
                        onClick={() => {
                            setActiveTab('closed');
                            setCurrentPage(1);
                        }}
                        className={`${activeTab === 'closed' ? 'border-primary text-primary' : 'border-transparent text-on-surface-secondary hover:text-on-surface hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200 focus:outline-none`}
                         aria-current={activeTab === 'closed' ? 'page' : undefined}
                    >
                        Closed Tickets
                    </button>
                </nav>
            </div>

            <main className="bg-surface rounded-xl shadow-lg">
                <CustomerTable 
                    records={paginatedRecords} 
                    sortConfig={sortConfig}
                    onSort={handleSort}
                    onEdit={handleEdit} 
                    onDelete={handleDelete} 
                    onViewDetails={handleViewDetails}
                    onStatusChange={handleStatusChange}
                    isClosedTab={activeTab === 'closed'}
                    collapsedStatuses={collapsedStatuses}
                    onToggleCollapse={handleToggleCollapse}
                    actionTarget={actionTarget}
                    allHeaders={ALL_CSHUB_HEADERS}
                    visibleColumnKeys={visibleColumnKeys}
                    viewOnly={viewOnly}
                />
                {totalPages > 1 && (
                    <Pagination 
                        currentPage={currentPage}
                        totalPages={totalPages}
                        onPageChange={setCurrentPage}
                    />
                )}
            </main>

            {isRecordModalOpen && (
                <RecordModal
                    isOpen={isRecordModalOpen}
                    onClose={() => setIsRecordModalOpen(false)}
                    onSave={handleSave}
                    record={selectedRecord}
                />
            )}

            {isDetailsModalOpen && recordToView && (
                <DetailsModal
                    isOpen={isDetailsModalOpen}
                    onClose={() => setIsDetailsModalOpen(false)}
                    record={recordToView}
                />
            )}

            {isDeleteModalOpen && recordToDelete && (
                <ConfirmationModal
                    isOpen={isDeleteModalOpen}
                    onClose={() => setIsDeleteModalOpen(false)}
                    onConfirm={handleConfirmDelete}
                    title="Delete Record"
                    message={`Are you sure you want to delete Ticket ${recordToDelete.TicketID}? This action cannot be undone.`}
                    isConfirming={isSubmitting || (actionTarget?.action === 'delete')}
                    // FIX: Removed non-existent 'variant' prop. The modal is already styled for deletion.
                    confirmText="Delete"
                />
            )}
        </>
    );
};

export default CSHubView;
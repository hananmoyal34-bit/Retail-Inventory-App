import React, { useState, useEffect, useCallback, useMemo } from 'react';
import type { CustomerRecord, FileForUpload, FormState, Status, SortConfig } from './types';
import { getAllRecords, updateRecord, deleteRecord, createRecord } from './services/apiService';
import CustomerTable from './components/CustomerTable';
import RecordModal from './components/RecordModal';
import ConfirmationModal from './components/ConfirmationModal';
import { PlusIcon } from './components/icons/PlusIcon';
import Spinner from './components/Spinner';
import Alert from './components/Alert';
import DetailsModal from './components/DetailsModal';
import { SearchIcon } from './components/icons/SearchIcon';
import Tooltip from './components/Tooltip';
import Pagination from './components/Pagination';

const RECORDS_PER_PAGE = 20;
const STATUS_ORDER: (Status | string)[] = ['New', 'In Progress', 'Resolved', 'Closed'];

const CustomerServiceHub: React.FC = () => {
    const [records, setRecords] = useState<CustomerRecord[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [currentPage, setCurrentPage] = useState<number>(1);
    const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'Timestamp', direction: 'descending' });

    const [isRecordModalOpen, setIsRecordModalOpen] = useState<boolean>(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState<boolean>(false);
    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState<boolean>(false);

    const [selectedRecord, setSelectedRecord] = useState<CustomerRecord | null>(null);
    const [recordToDelete, setRecordToDelete] = useState<CustomerRecord | null>(null);
    const [recordToView, setRecordToView] = useState<CustomerRecord | null>(null);

    const fetchRecords = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const data = await getAllRecords();
            setRecords(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unknown error occurred.');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchRecords();
    }, [fetchRecords]);

    const showSuccessMessage = (message: string) => {
        setSuccessMessage(message);
        setTimeout(() => setSuccessMessage(null), 3000);
    };

    const handleAddNew = () => {
        setSelectedRecord(null);
        setIsRecordModalOpen(true);
    };

    const handleEdit = (record: CustomerRecord) => {
        setSelectedRecord(record);
        setIsRecordModalOpen(true);
    };

    const handleDelete = (record: CustomerRecord) => {
        setRecordToDelete(record);
        setIsDeleteModalOpen(true);
    };

    const handleViewDetails = (record: CustomerRecord) => {
        setRecordToView(record);
        setIsDetailsModalOpen(true);
    };

    const handleSort = (key: keyof CustomerRecord | 'Customer') => {
        let direction: 'ascending' | 'descending' = 'ascending';
        if (sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
        setCurrentPage(1);
    };

    const handleStatusChange = async (ticketId: string, status: Status | string) => {
        const originalRecords = [...records];
        const recordToUpdate = records.find(r => r.TicketID === ticketId);

        if (!recordToUpdate) {
            setError("Could not find the record to update.");
            return;
        }

        setRecords(prevRecords =>
            prevRecords.map(r =>
                r.TicketID === ticketId ? { ...r, Status: status } : r
            )
        );

        const formData: FormState = {
            fullName: `${recordToUpdate['First Name'] || ''} ${recordToUpdate['Last Name'] || ''}`.trim(),
            email: recordToUpdate['Email Address'] || '',
            phoneNumber: recordToUpdate['Phone Number'] || '',
            formType: recordToUpdate['Ticket Category'] || '',
            issueDescription: recordToUpdate['Ticket Notes'] || '',
            purchaseDate: recordToUpdate['Date of Transaction'] || '',
            invoiceNumber: recordToUpdate['Receipt Number'] || '',
            purchaseAmount: recordToUpdate['Purchase Amount'] || '',
            last4Digits: recordToUpdate['Last 4 Digits of Card'] || '',
            product: recordToUpdate['Product'] || '',
            storeOfPurchase: recordToUpdate['Store Name'] || '',
            officeNotes: recordToUpdate['Office Notes'] || '',
            status,
            ticketId: recordToUpdate.TicketID,
            // Preserve existing files on status update
            receipt: recordToUpdate['Receipt File'] || '',
            file1: recordToUpdate['File 1'] || '',
            file2: recordToUpdate['File 2'] || '',
            file3: recordToUpdate['File 3'] || '',
            file4: recordToUpdate['File 4'] || '',
        };

        try {
            await updateRecord(formData, []);
            showSuccessMessage(`Status for ticket ${ticketId} updated.`);
        } catch (err) {
            setRecords(originalRecords);
            setError(err instanceof Error ? err.message : 'Failed to update status.');
        }
    };

    const handleConfirmDelete = async () => {
        if (!recordToDelete) return;
        setIsLoading(true);
        try {
            await deleteRecord(recordToDelete.TicketID);
            showSuccessMessage(`Ticket ${recordToDelete.TicketID} deleted successfully.`);
            await fetchRecords();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to delete record.');
        } finally {
            setIsLoading(false);
            setIsDeleteModalOpen(false);
            setRecordToDelete(null);
        }
    };
    
    const handleSave = async (formData: FormState, files: FileForUpload[]) => {
        setIsLoading(true);
        setIsRecordModalOpen(false);
        try {
            if (selectedRecord) {
                await updateRecord({ ...formData, ticketId: selectedRecord.TicketID }, files);
                showSuccessMessage(`Ticket ${selectedRecord.TicketID} updated successfully.`);
            } else {
                await createRecord(formData, files);
                showSuccessMessage(`New ticket created successfully.`);
            }
            await fetchRecords();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to save record.');
        } finally {
            setIsLoading(false);
            setSelectedRecord(null);
        }
    };
    
    const processedRecords = useMemo(() => {
        // 1. Filter
        const filtered = records.filter(record => {
            const query = searchQuery.toLowerCase();
            const fullName = `${record['First Name'] || ''} ${record['Last Name'] || ''}`.toLowerCase();
            const email = (record['Email Address'] || '').toLowerCase();
            const ticketId = (record.TicketID || '').toLowerCase();
            return fullName.includes(query) || email.includes(query) || ticketId.includes(query);
        });

        // 2. Sort & Group
        filtered.sort((a, b) => {
            // Primary sort: Group by Status
            const statusA = STATUS_ORDER.indexOf(a.Status);
            const statusB = STATUS_ORDER.indexOf(b.Status);
            if (statusA !== statusB) {
                return statusA - statusB;
            }

            // Secondary sort: by selected column
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

        return filtered;
    }, [records, searchQuery, sortConfig]);

    const paginatedRecords = useMemo(() => {
        const startIndex = (currentPage - 1) * RECORDS_PER_PAGE;
        return processedRecords.slice(startIndex, startIndex + RECORDS_PER_PAGE);
    }, [processedRecords, currentPage]);

    const totalPages = Math.ceil(processedRecords.length / RECORDS_PER_PAGE);

    return (
        <div className="bg-background min-h-screen text-on-surface font-sans -m-4 sm:-m-6 lg:-m-8">
            <div className="container mx-auto p-4 md:p-8">
                <header className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
                    <h1 className="text-4xl font-bold text-on-surface text-center md:text-left">Customer Service Hub</h1>
                     <div className="relative w-full md:w-auto md:flex-grow max-w-lg">
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
                    <Tooltip text="Create a new customer ticket">
                        <button
                            onClick={handleAddNew}
                            className="flex-shrink-0 flex items-center gap-2 bg-primary hover:bg-primary-hover text-white font-bold py-2 px-4 rounded-lg shadow-lg transition-transform transform hover:scale-105"
                        >
                            <PlusIcon />
                            Add New Record
                        </button>
                    </Tooltip>
                </header>

                {error && <Alert message={error} type="error" onClose={() => setError(null)} />}
                {successMessage && <Alert message={successMessage} type="success" onClose={() => setSuccessMessage(null)} />}

                <main className="bg-surface rounded-xl shadow-lg">
                    {isLoading && !records.length ? (
                         <div className="flex justify-center items-center h-64">
                            <Spinner />
                         </div>
                    ) : (
                        <CustomerTable 
                            records={paginatedRecords} 
                            searchQuery={searchQuery}
                            sortConfig={sortConfig}
                            onSort={handleSort}
                            onEdit={handleEdit} 
                            onDelete={handleDelete} 
                            onViewDetails={handleViewDetails}
                            onStatusChange={handleStatusChange}
                            recordToDelete={recordToDelete}
                            isLoading={isLoading}
                        />
                    )}
                    {totalPages > 1 && (
                        <Pagination 
                            currentPage={currentPage}
                            totalPages={totalPages}
                            onPageChange={setCurrentPage}
                        />
                    )}
                </main>
            </div>

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
                    isConfirming={isLoading}
                />
            )}
        </div>
    );
};

export default CustomerServiceHub;
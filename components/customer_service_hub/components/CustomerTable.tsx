import React from 'react';
import type { CustomerRecord, Status, SortConfig } from '../types';
import { EditIcon } from './icons/EditIcon';
import { DeleteIcon } from './icons/DeleteIcon';
import { ViewIcon } from './icons/ViewIcon';
import Tooltip from './Tooltip';
import { SortIcon } from './icons/SortIcon';

interface CustomerTableProps {
    records: CustomerRecord[];
    searchQuery: string;
    sortConfig: SortConfig;
    recordToDelete: CustomerRecord | null;
    isLoading: boolean;
    onSort: (key: keyof CustomerRecord | 'Customer') => void;
    onEdit: (record: CustomerRecord) => void;
    onDelete: (record: CustomerRecord) => void;
    onViewDetails: (record: CustomerRecord) => void;
    onStatusChange: (ticketId: string, status: Status | string) => void;
}

const SortableHeader: React.FC<{
    title: string;
    sortKey: keyof CustomerRecord | 'Customer';
    sortConfig: SortConfig;
    onSort: (key: keyof CustomerRecord | 'Customer') => void;
}> = ({ title, sortKey, sortConfig, onSort }) => {
    const isSorting = sortConfig.key === sortKey;
    return (
        <th scope="col" className="px-6 py-3 cursor-pointer" onClick={() => onSort(sortKey)}>
            <div className="flex items-center gap-2">
                {title}
                <SortIcon
                    direction={isSorting ? sortConfig.direction : 'none'}
                />
            </div>
        </th>
    );
};

const CustomerTable: React.FC<CustomerTableProps> = ({ records, searchQuery, sortConfig, onSort, onEdit, onDelete, onViewDetails, onStatusChange, recordToDelete, isLoading }) => {
    
    const getStatusClass = (status: string) => {
        const baseStyles = "w-full text-left px-2 py-1 text-xs font-semibold rounded-md appearance-none focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-surface focus:ring-primary border";
        switch (status.toLowerCase()) {
            case 'new': return `${baseStyles} bg-indigo-100 text-indigo-800 border-indigo-300`;
            case 'in progress': return `${baseStyles} bg-amber-100 text-amber-800 border-amber-300`;
            case 'resolved': return `${baseStyles} bg-emerald-100 text-emerald-800 border-emerald-300`;
            case 'closed': return `${baseStyles} bg-gray-200 text-gray-800 border-gray-300`;
            default: return `${baseStyles} bg-gray-100 text-gray-700 border-gray-300`;
        }
    };

    if (records.length === 0) {
        const message = searchQuery
            ? `No records found matching your search.`
            : "No records found.";
        return <p className="text-center text-on-surface-secondary py-10">{message}</p>;
    }

    let lastStatus: string | null = null;

    return (
        <>
            {/* Mobile Card View */}
            <div className="md:hidden p-4 space-y-4 bg-background rounded-b-xl">
                {records.map(record => {
                    const isActionDisabled = isLoading || recordToDelete?.TicketID === record.TicketID;
                    return (
                        <div key={record.TicketID} className="bg-surface rounded-lg shadow border border-border-color p-4 space-y-3" onClick={() => !isActionDisabled && onViewDetails(record)}>
                            {/* Card Header */}
                            <div className="flex justify-between items-start gap-2">
                                <div>
                                    <h3 className="font-bold text-on-surface">{record['First Name']} {record['Last Name']}</h3>
                                    <p className="text-xs text-on-surface-secondary font-mono">#{record.TicketID}</p>
                                </div>
                                <select
                                    value={record.Status}
                                    onChange={(e) => onStatusChange(record.TicketID, e.target.value)}
                                    className={`${getStatusClass(record.Status)} max-w-[120px] flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed`}
                                    aria-label={`Status for ticket ${record.TicketID}`}
                                    disabled={isActionDisabled}
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <option value="New">New</option>
                                    <option value="In Progress">In Progress</option>
                                    <option value="Resolved">Resolved</option>
                                    <option value="Closed">Closed</option>
                                </select>
                            </div>

                            {/* Card Body */}
                            <div className="text-sm text-on-surface-secondary pt-3 border-t">
                                <p><strong>Category:</strong> {record['Ticket Category']}</p>
                                <p><strong>Submitted:</strong> {record.Timestamp ? new Date(record.Timestamp).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : 'N/A'}</p>
                            </div>

                            {/* Card Actions */}
                            <div className="flex justify-end items-center gap-4 pt-3 border-t" onClick={(e) => e.stopPropagation()}>
                                <Tooltip text="View Details">
                                    <button onClick={() => onViewDetails(record)} className="text-emerald-500 hover:text-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed" aria-label="View Details" disabled={isActionDisabled}>
                                        <ViewIcon />
                                    </button>
                                </Tooltip>
                                <Tooltip text="Edit Record">
                                    <button onClick={() => onEdit(record)} className="text-sky-500 hover:text-sky-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed" aria-label="Edit" disabled={isActionDisabled}>
                                        <EditIcon />
                                    </button>
                                </Tooltip>
                                <Tooltip text="Delete Record">
                                    <button onClick={() => onDelete(record)} className="text-red-500 hover:text-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed" aria-label="Delete" disabled={isActionDisabled}>
                                        <DeleteIcon />
                                    </button>
                                </Tooltip>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto relative max-h-[65vh]">
                <table className="w-full text-sm text-left text-on-surface-secondary">
                    <thead className="text-xs text-on-surface uppercase bg-gray-50 border-b-2 border-border-color sticky top-0 z-10">
                        <tr>
                            <SortableHeader title="Ticket ID" sortKey="TicketID" sortConfig={sortConfig} onSort={onSort} />
                            <SortableHeader title="Customer" sortKey="Customer" sortConfig={sortConfig} onSort={onSort} />
                            <SortableHeader title="Category" sortKey="Ticket Category" sortConfig={sortConfig} onSort={onSort} />
                            <SortableHeader title="Submitted On" sortKey="Timestamp" sortConfig={sortConfig} onSort={onSort} />
                            <th scope="col" className="px-6 py-3">Status</th>
                            <th scope="col" className="px-6 py-3 text-center">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {records.map((record) => {
                            const showStatusHeader = record.Status !== lastStatus;
                            lastStatus = record.Status;
                            const isActionDisabled = isLoading || recordToDelete?.TicketID === record.TicketID;
                            
                            return (
                                <React.Fragment key={record.TicketID}>
                                    {showStatusHeader && (
                                        <tr className="bg-gray-100 sticky top-[41px] z-10">
                                            <th colSpan={6} className="px-4 py-2 text-left text-sm font-bold text-on-surface">
                                                {record.Status}
                                            </th>
                                        </tr>
                                    )}
                                    <tr 
                                        className="bg-surface border-b border-border-color hover:bg-gray-50 cursor-pointer"
                                        onClick={() => !isActionDisabled && onViewDetails(record)}
                                    >
                                        <th scope="row" className="px-6 py-4 font-medium text-on-surface whitespace-nowrap">
                                            {record.TicketID}
                                        </th>
                                        <td className="px-6 py-4">
                                            <div className="font-semibold text-on-surface">{record['First Name']} {record['Last Name']}</div>
                                            <div className="text-xs text-on-surface-secondary">{record['Email Address']}</div>
                                        </td>
                                        <td className="px-6 py-4">{record['Ticket Category']}</td>
                                        <td className="px-6 py-4">
                                            {record.Timestamp ? new Date(record.Timestamp).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : 'N/A'}
                                        </td>
                                        <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                                        <select
                                                value={record.Status}
                                                onChange={(e) => onStatusChange(record.TicketID, e.target.value)}
                                                className={`${getStatusClass(record.Status)} disabled:opacity-50 disabled:cursor-not-allowed`}
                                                aria-label={`Status for ticket ${record.TicketID}`}
                                                disabled={isActionDisabled}
                                            >
                                                <option value="New">New</option>
                                                <option value="In Progress">In Progress</option>
                                                <option value="Resolved">Resolved</option>
                                                <option value="Closed">Closed</option>
                                            </select>
                                        </td>
                                        <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                                            <div className="flex items-center justify-center gap-4">
                                                <Tooltip text="View Details">
                                                    <button onClick={() => onViewDetails(record)} className="text-emerald-500 hover:text-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed" aria-label="View Details" disabled={isActionDisabled}>
                                                        <ViewIcon />
                                                    </button>
                                                </Tooltip>
                                                <Tooltip text="Edit Record">
                                                    <button onClick={() => onEdit(record)} className="text-sky-500 hover:text-sky-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed" aria-label="Edit" disabled={isActionDisabled}>
                                                        <EditIcon />
                                                    </button>
                                                </Tooltip>
                                                <Tooltip text="Delete Record">
                                                    <button onClick={() => onDelete(record)} className="text-red-500 hover:text-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed" aria-label="Delete" disabled={isActionDisabled}>
                                                        <DeleteIcon />
                                                    </button>
                                                </Tooltip>
                                            </div>
                                        </td>
                                    </tr>
                                </React.Fragment>
                            )
                        })}
                    </tbody>
                </table>
            </div>
        </>
    );
};

export default CustomerTable;

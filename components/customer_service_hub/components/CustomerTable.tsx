
import React from 'react';
import type { CustomerRecord, Status, SortConfig } from '../../../types';
import { PencilIcon as EditIcon, TrashIcon as DeleteIcon, ViewIcon, SortIcon, ChevronRightIcon } from '../../icons';
import Tooltip from '../../Tooltip';

interface CustomerTableProps {
    records: CustomerRecord[];
    sortConfig: SortConfig;
    onSort: (key: keyof CustomerRecord | 'Customer') => void;
    onEdit: (record: CustomerRecord) => void;
    onDelete: (record: CustomerRecord) => void;
    onViewDetails: (record: CustomerRecord) => void;
    onStatusChange: (ticketId: string, status: Status | string) => void;
    isClosedTab: boolean;
    collapsedStatuses: Set<string>;
    onToggleCollapse: (status: string) => void;
    actionTarget: { action: string, ticketId: string } | null;
    allHeaders: { key: keyof CustomerRecord | 'Customer'; label: string }[];
    visibleColumnKeys: Set<keyof CustomerRecord | 'Customer'>;
    viewOnly?: boolean;
}

const SortableHeader: React.FC<{
    title: string;
    sortKey: keyof CustomerRecord | 'Customer';
    sortConfig: SortConfig;
    onSort: (key: keyof CustomerRecord | 'Customer') => void;
}> = ({ title, sortKey, sortConfig, onSort }) => {
    const isSorting = sortConfig.key === sortKey;
    return (
        <th scope="col" className="px-4 py-3 cursor-pointer" onClick={() => onSort(sortKey)}>
            <div className="flex items-center gap-1">
                {title}
                <SortIcon
                    direction={isSorting ? sortConfig.direction : 'none'}
                />
            </div>
        </th>
    );
};

const CustomerTable: React.FC<CustomerTableProps> = ({ 
    records, sortConfig, onSort, onEdit, onDelete, onViewDetails, onStatusChange, 
    isClosedTab, collapsedStatuses, onToggleCollapse, actionTarget, allHeaders, visibleColumnKeys, viewOnly = false 
}) => {
    
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
    
    const visibleHeaders = allHeaders.filter(h => visibleColumnKeys.has(h.key));
    
    if (records.length === 0) {
        return <p className="text-center text-on-surface-secondary py-10">No records found.</p>;
    }

    const groupedRecords = records.reduce((acc, record) => {
        const status = record.Status || 'Uncategorized';
        if (!acc[status]) {
            acc[status] = [];
        }
        acc[status].push(record);
        return acc;
    }, {} as Record<string, CustomerRecord[]>);


    return (
        <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-on-surface-secondary">
                <thead className="text-xs text-on-surface uppercase bg-gray-50 border-b-2 border-border-color sticky top-0 z-10">
                    <tr>
                        <th scope="col" className="px-4 py-3 w-12"></th>
                        {visibleHeaders.map(header => (
                            <SortableHeader key={String(header.key)} title={header.label} sortKey={header.key} sortConfig={sortConfig} onSort={onSort} />
                        ))}
                        <th scope="col" className="px-4 py-3 text-center">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {Object.entries(groupedRecords).map(([status, recordsInGroup]) => {
                        const isCollapsed = collapsedStatuses.has(status);
                        return (
                             <React.Fragment key={status}>
                                <tr className="bg-gray-100/50 sticky top-[41px] z-[9]">
                                    <th colSpan={visibleHeaders.length + 2} className="px-4 py-2 text-left text-sm font-bold text-on-surface">
                                        <button onClick={() => onToggleCollapse(status)} className="flex items-center gap-2 w-full">
                                            <ChevronRightIcon className={`h-5 w-5 transition-transform ${isCollapsed ? '' : 'rotate-90'}`} />
                                            {status} ({recordsInGroup.length})
                                        </button>
                                    </th>
                                </tr>
                                {!isCollapsed && recordsInGroup.map((record) => (
                                    <tr 
                                        key={record.TicketID}
                                        className="bg-surface border-b border-border-color hover:bg-gray-50"
                                    >
                                        <td className="px-4 py-3">
                                            <select
                                                value={record.Status}
                                                onChange={(e) => onStatusChange(record.TicketID, e.target.value)}
                                                className={getStatusClass(record.Status)}
                                                aria-label={`Status for ticket ${record.TicketID}`}
                                                disabled={actionTarget?.ticketId === record.TicketID || viewOnly}
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                <option value="New">New</option>
                                                <option value="In Progress">In Progress</option>
                                                <option value="Closed">Closed</option>
                                            </select>
                                        </td>
                                        {visibleHeaders.map(header => {
                                            let content;
                                            if (header.key === 'Customer') {
                                                content = `${record['First Name']} ${record['Last Name']}`;
                                            } else if (header.key === 'Timestamp') {
                                                content = record.Timestamp ? new Date(record.Timestamp).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : 'N/A';
                                            } else {
                                                content = record[header.key as keyof CustomerRecord];
                                            }
                                            return <td key={`${record.TicketID}-${String(header.key)}`} className="px-4 py-3">{content}</td>
                                        })}
                                        <td className="px-4 py-3 text-center">
                                             <div className="flex items-center justify-center gap-4">
                                                <Tooltip text="View Details">
                                                    <button onClick={(e) => { e.stopPropagation(); onViewDetails(record); }} className="text-emerald-500 hover:text-emerald-700 disabled:opacity-50" disabled={actionTarget?.ticketId === record.TicketID} aria-label="View Details">
                                                        <ViewIcon />
                                                    </button>
                                                </Tooltip>
                                                {!viewOnly && (
                                                    <>
                                                        <Tooltip text="Edit Record">
                                                            <button onClick={(e) => { e.stopPropagation(); onEdit(record); }} className="text-sky-500 hover:text-sky-700 disabled:opacity-50" disabled={actionTarget?.ticketId === record.TicketID} aria-label="Edit">
                                                                <EditIcon />
                                                            </button>
                                                        </Tooltip>
                                                        <Tooltip text="Delete Record">
                                                            <button onClick={(e) => { e.stopPropagation(); onDelete(record); }} className="text-red-500 hover:text-red-700 disabled:opacity-50" disabled={actionTarget?.ticketId === record.TicketID} aria-label="Delete">
                                                                <DeleteIcon />
                                                            </button>
                                                        </Tooltip>
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </React.Fragment>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
};

export default CustomerTable;

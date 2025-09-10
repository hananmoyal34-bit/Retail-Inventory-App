import React, { useState, useMemo } from 'react';
import { FinancingRecord } from '../types';
import { SearchIcon, ViewIcon, SortIcon } from '../../icons';
import Pagination from './Pagination';
import { formatCurrency, formatDateToMDY } from '../utils/formatting';
import FinancingDetailsModal from './FinancingDetailsModal';

interface FinancingLedgerViewProps {
    records: FinancingRecord[];
}

const RECORDS_PER_PAGE = 20;
type SortKey = 'customer_name' | 'sale_date' | 'total_sale_amount' | 'current_balance_due';
type SortConfig = { key: SortKey; direction: 'ascending' | 'descending' };

const getStatusClass = (status: string) => {
    const base = "px-2 py-1 text-xs font-semibold rounded-full";
    const lowerStatus = (status || '').toLowerCase();
    if (lowerStatus === 'active') return `${base} bg-blue-100 text-blue-800`;
    if (lowerStatus === 'paid off') return `${base} bg-green-100 text-green-800`;
    if (lowerStatus === 'on hold') return `${base} bg-yellow-100 text-yellow-800`;
    if (lowerStatus === 'default') return `${base} bg-red-100 text-red-800`;
    return `${base} bg-gray-100 text-gray-700`;
};

const FinancingLedgerView: React.FC<FinancingLedgerViewProps> = ({ records }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'customer_name', direction: 'ascending' });
    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
    const [selectedRecord, setSelectedRecord] = useState<FinancingRecord | null>(null);

    const filteredRecords = useMemo(() => {
        return records
            .filter(r =>
                r.customer_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                r.receipt_number?.toLowerCase().includes(searchQuery.toLowerCase())
            )
            .sort((a, b) => {
                const { key, direction } = sortConfig;
                const aValue = a[key], bValue = b[key];
                const dir = direction === 'ascending' ? 1 : -1;
                if (typeof aValue === 'number' && typeof bValue === 'number') return (aValue - bValue) * dir;
                return String(aValue).localeCompare(String(bValue)) * dir;
            });
    }, [records, searchQuery, sortConfig]);

    const paginatedRecords = useMemo(() => {
        return filteredRecords.slice((currentPage - 1) * RECORDS_PER_PAGE, currentPage * RECORDS_PER_PAGE);
    }, [filteredRecords, currentPage]);

    const totalPages = Math.ceil(filteredRecords.length / RECORDS_PER_PAGE);

    return (
        <>
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <h1 className="text-4xl font-bold text-on-surface">Financing Ledger Viewer</h1>
                <div className="relative flex-grow max-w-lg">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><SearchIcon /></div>
                    <input type="search" placeholder="Search by Name, Receipt..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                           className="w-full pl-10 pr-4 py-2 bg-surface border border-border-color rounded-lg"/>
                </div>
            </header>
            
            <main className="bg-surface rounded-xl shadow-lg">
                {/* Mobile Card View */}
                <div className="md:hidden p-2 space-y-3">
                    {paginatedRecords.map(rec => (
                        <div key={rec.finance_id} onClick={() => { setSelectedRecord(rec); setIsDetailsModalOpen(true); }} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm space-y-2">
                             <div className="flex justify-between items-start">
                                <p className="font-bold text-on-surface text-lg">{rec.customer_name}</p>
                                <span className={getStatusClass(rec.agreement_status)}>{rec.agreement_status}</span>
                            </div>
                            <div className="text-sm text-on-surface-secondary pt-2 border-t">
                                <p>Balance Due: <span className="font-semibold text-red-600">{formatCurrency(rec.current_balance_due)}</span></p>
                                <p>Sale Date: <span className="font-medium text-on-surface">{formatDateToMDY(rec.sale_date)}</span></p>
                                <p>Total Sale: <span className="font-medium text-on-surface">{formatCurrency(rec.total_sale_amount)}</span></p>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Desktop Table View */}
                <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-on-surface uppercase bg-gray-50">
                            <tr>
                                {['customer_name', 'sale_date', 'total_sale_amount', 'current_balance_due', 'agreement_status'].map(h => (
                                    <th key={h} className="px-6 py-3" onClick={() => setSortConfig(p => ({key: h as SortKey, direction: p.key===h && p.direction==='ascending' ? 'descending' : 'ascending'}))}>
                                        <div className="flex items-center gap-2 cursor-pointer">{h.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}<SortIcon direction={sortConfig.key === h ? sortConfig.direction : 'none'} /></div>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {paginatedRecords.map(rec => (
                                <tr key={rec.finance_id} onClick={() => { setSelectedRecord(rec); setIsDetailsModalOpen(true); }} className="bg-white border-b hover:bg-gray-50 cursor-pointer">
                                    <td className="px-6 py-4 font-medium text-on-surface">{rec.customer_name}</td>
                                    <td className="px-6 py-4">{formatDateToMDY(rec.sale_date)}</td>
                                    <td className="px-6 py-4">{formatCurrency(rec.total_sale_amount)}</td>
                                    <td className="px-6 py-4 font-semibold text-on-surface">{formatCurrency(rec.current_balance_due)}</td>
                                    <td className="px-6 py-4"><span className={getStatusClass(rec.agreement_status)}>{rec.agreement_status}</span></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {totalPages > 1 && <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />}
            </main>

            {isDetailsModalOpen && selectedRecord && <FinancingDetailsModal isOpen={isDetailsModalOpen} onClose={() => setIsDetailsModalOpen(false)} record={selectedRecord}/>}
        </>
    );
};

export default FinancingLedgerView;

import React from 'react';
import type { FinancingRecord } from '../types';
import Modal from './Modal';
import { formatCurrency, formatDateToMDY } from '../utils/formatting';
import ClipboardCopyButton from './ClipboardCopyButton';
interface FinancingDetailsModalProps { isOpen: boolean; onClose: () => void; record: FinancingRecord; }
const DetailItem: React.FC<{ label: string; value?: string | number | null; children?: React.ReactNode; copyValue?: string|number|null }> = ({ label, value, children, copyValue }) => (<div><p className="font-semibold text-sm text-gray-500">{label}</p><div className="flex items-center bg-gray-50 p-2 rounded-md mt-1 min-h-[38px]"><span className="flex-grow pr-2">{children || value || 'N/A'}</span>{copyValue != null && <ClipboardCopyButton textToCopy={String(copyValue)} />}</div></div>);
const FileLink: React.FC<{ label: string; url?: string | null }> = ({ label, url }) => (<div><p className="font-semibold text-sm text-gray-500">{label}</p>{url ? <a href={url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline mt-2 block truncate">View File</a> : <p className="text-gray-400 mt-2">N/A</p>}</div>);
const getStatusClass = (status: string) => { const s = (status || '').toLowerCase(); if (s === 'active') return 'bg-blue-100 text-blue-800'; if (s === 'paid off') return 'bg-green-100 text-green-800'; if (s === 'on hold') return 'bg-yellow-100 text-yellow-800'; if (s === 'default') return 'bg-red-100 text-red-800'; return 'bg-gray-100 text-gray-800'; };
const FinancingDetailsModal: React.FC<FinancingDetailsModalProps> = ({ isOpen, onClose, record }) => {
    const footer = <button onClick={onClose} className="px-4 py-2 bg-gray-200 rounded-md">Close</button>;
    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Agreement: ${record.finance_id}`} size="2xl" footer={footer}>
            <div className="space-y-6">
                <section><h3 className="text-lg font-medium border-b pb-2 mb-3">Customer & Sale Info</h3><div className="grid md:grid-cols-2 gap-4"><DetailItem label="Customer" value={record.customer_name} /><DetailItem label="Email" value={record.customer_email} /><DetailItem label="Phone" value={record.customer_phone} /><DetailItem label="Sale Date" value={formatDateToMDY(record.sale_date)} /><div className="md:col-span-2"><DetailItem label="Product Description" value={record.product_description}/></div></div></section>
                <section><h3 className="text-lg font-medium border-b pb-2 mb-3">Financial Summary</h3><div className="grid grid-cols-2 md:grid-cols-4 gap-4"><DetailItem label="Total Sale" value={formatCurrency(record.total_sale_amount)} /><DetailItem label="Down Payment" value={formatCurrency(record.down_payment_amount)} /><DetailItem label="Amount Financed" value={formatCurrency(record.financed_amount)} /><DetailItem label="Total Paid" value={formatCurrency(record.total_amount_paid)} /><DetailItem label="Current Balance"><span className="font-bold text-lg text-red-600">{formatCurrency(record.current_balance_due)}</span></DetailItem><DetailItem label="Status"><span className={`px-2 py-1 text-xs rounded-full ${getStatusClass(record.agreement_status)}`}>{record.agreement_status}</span></DetailItem></div></section>
                <section><h3 className="text-lg font-medium border-b pb-2 mb-3">Files & Notes</h3><div className="grid md:grid-cols-3 gap-4"><FileLink label="Agreement" url={record.agreement_file} /><FileLink label="ID Card" url={record.id_card_file_url} /><FileLink label="Receipt" url={record.receipt_file} /></div><div className="mt-4"><DetailItem label="Notes Log" value={record.notes_log} /></div></section>
            </div>
        </Modal>
    );
};
export default FinancingDetailsModal;

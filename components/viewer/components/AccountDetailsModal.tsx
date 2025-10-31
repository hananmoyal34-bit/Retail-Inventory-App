
import React from 'react';
import type { Account } from '../types';
import Modal from './Modal';
import { formatCurrency, formatDateToMDY } from '../utils/formatting';
import ClipboardCopyButton from './ClipboardCopyButton';
interface AccountDetailsModalProps { isOpen: boolean; onClose: () => void; account: Account; }
const DetailItem: React.FC<{ label: string; value?: string | number | null; children?: React.ReactNode, copyValue?: string | number | null; }> = ({ label, value, children, copyValue }) => (<div><p className="font-semibold text-sm text-gray-500">{label}</p><div className="flex items-center justify-between bg-gray-50 p-2 rounded-md mt-1 text-sm min-h-[38px]"><span className="text-gray-900 whitespace-pre-wrap break-all flex-grow pr-2">{children || (value || value === 0 ? String(value) : 'Not provided')}</span>{copyValue != null && <ClipboardCopyButton textToCopy={String(copyValue)} />}</div></div>);
const getStatusClass = (status: string) => { const s = (status || '').toLowerCase(); if (s === 'active') return 'bg-green-100 text-green-800'; if (s === 'inactive') return 'bg-red-100 text-red-800'; if (s === 'pending') return 'bg-yellow-100 text-yellow-800'; return 'bg-gray-100 text-gray-800'; };
const AccountDetailsModal: React.FC<AccountDetailsModalProps> = ({ isOpen, onClose, account }) => {
    if (!isOpen) return null;
    const footer = <button onClick={onClose} className="px-4 py-2 text-sm bg-white border rounded-md hover:bg-gray-50">Close</button>;
    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Details for ${account.company}`} size="2xl" footer={footer}>
            <div className="space-y-6">
                <section><h3 className="text-lg font-medium border-b pb-2 mb-3">General Information</h3><div className="grid md:grid-cols-2 gap-4"><DetailItem label="Account Type" value={account.accountType} /><DetailItem label="Sub Category" value={account.subCategory} /><DetailItem label="Location Name" value={account.locationName} /><DetailItem label="Location Address" value={account.locationAddress} /><DetailItem label="Status"><span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusClass(account.status)}`}>{account.status}</span></DetailItem></div></section>
                <section><h3 className="text-lg font-medium border-b pb-2 mb-3">Financial Information</h3><div className="grid md:grid-cols-2 gap-4"><DetailItem label="Amount Due" value={formatCurrency(account.amountDue)} /><DetailItem label="Billing Amount" value={formatCurrency(account.billingAmount)} /><DetailItem label="Billing Type" value={account.billingType} /><DetailItem label="Payment Method" value={account.paymentMethod}/></div></section>
                <section><h3 className="text-lg font-medium border-b pb-2 mb-3">Licensing & Insurance</h3><div className="grid md:grid-cols-2 gap-4"><DetailItem label="Expiration Date" value={formatDateToMDY(account.expiration)} /><DetailItem label="License Number" value={account.licenseNumber} /><DetailItem label="Insurance Carrier" value={account.insuranceCarrier} /><DetailItem label="Insurance Broker" value={account.insuranceBroker} /></div></section>
                <section><h3 className="text-lg font-medium border-b pb-2 mb-3">Attachments & Notes</h3><div className="grid md:grid-cols-2 gap-4"><DetailItem label="File">{account.fileUpload ? <a href={account.fileUpload} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">View File</a> : 'Not provided'}</DetailItem><div className="md:col-span-2"><DetailItem label="Notes" value={account.notes} /></div><DetailItem label="Last Updated" value={formatDateToMDY(account.timestamp)} /><DetailItem label="Account ID" value={account.accountID} copyValue={account.accountID} /></div></section>
            </div>
        </Modal>
    );
};
export default AccountDetailsModal;

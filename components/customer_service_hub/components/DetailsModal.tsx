import React from 'react';
import type { CustomerRecord } from '../types';

interface DetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    record: CustomerRecord;
}

const DetailItem: React.FC<{ label: string; value?: string | null }> = ({ label, value }) => (
  <div>
    <p className="font-semibold text-sm text-on-surface-secondary">{label}</p>
    <p className="text-on-surface bg-gray-50 p-2 rounded-md whitespace-pre-wrap mt-1 text-sm">{value || 'Not provided'}</p>
  </div>
);

const FileLink: React.FC<{ label: string; url?: string | null }> = ({ label, url }) => (
  <div>
    <p className="font-semibold text-sm text-on-surface-secondary">{label}</p>
    {url ? (
      <a href={url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline mt-2 block truncate text-sm">
        View {label}
      </a>
    ) : (
      <p className="text-on-surface-secondary mt-2 text-sm">Not provided</p>
    )}
  </div>
);

const getStatusClass = (status: string) => {
    switch (status.toLowerCase()) {
        case 'new': return 'bg-indigo-100 text-indigo-800';
        case 'in progress': return 'bg-amber-100 text-amber-800';
        case 'resolved': return 'bg-emerald-100 text-emerald-800';
        case 'closed': return 'bg-gray-200 text-gray-800';
        default: return 'bg-gray-100 text-gray-700';
    }
};

const DetailsModal: React.FC<DetailsModalProps> = ({ isOpen, onClose, record }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 p-4" aria-modal="true" role="dialog">
            <div className="bg-surface rounded-lg shadow-xl w-full max-w-3xl transform transition-all flex flex-col max-h-[90vh]" role="document">
                 <header className="p-5 border-b border-border-color flex justify-between items-start">
                    <div>
                        <h2 className="text-xl font-bold text-on-surface">{record['Ticket Category']}</h2>
                        <p className="text-sm text-on-surface-secondary mt-1">Ticket ID: {record.TicketID}</p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600" aria-label="Close modal">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </header>
                <div className="p-6 overflow-y-auto">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 mb-6">
                        <div>
                            <p className="font-semibold text-on-surface-secondary text-sm">Customer</p>
                            <p className="text-on-surface font-medium">{record['First Name']} {record['Last Name']}</p>
                            <p className="text-on-surface-secondary text-xs">{record['Email Address']}</p>
                        </div>
                        <div>
                            <p className="font-semibold text-on-surface-secondary text-sm">Submitted On</p>
                            <p className="text-on-surface font-medium">
                                {record.Timestamp ? new Date(record.Timestamp).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : 'N/A'}
                            </p>
                        </div>
                        <div>
                            <p className="font-semibold text-on-surface-secondary text-sm">Phone</p>
                            <p className="text-on-surface font-medium">{record['Phone Number'] || 'N/A'}</p>
                        </div>
                        <div>
                            <p className="font-semibold text-on-surface-secondary text-sm">Status</p>
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusClass(record.Status)}`}>{record.Status}</span>
                        </div>
                    </div>

                    <div className="space-y-5">
                         <div>
                            <h3 className="text-lg font-semibold text-on-surface border-b border-border-color pb-2 mb-3">Ticket Details</h3>
                            <DetailItem label="Ticket Notes / Issue Description" value={record['Ticket Notes']} />
                        </div>
                        
                        <div>
                            <h3 className="text-lg font-semibold text-on-surface border-b border-border-color pb-2 mb-3">Transaction Information</h3>
                             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                <DetailItem label="Date of Transaction" value={record['Date of Transaction']} />
                                <DetailItem label="Receipt/Invoice Number" value={record['Receipt Number']} />
                                <DetailItem label="Purchase Amount" value={record['Purchase Amount']} />
                                <DetailItem label="Last 4 Digits of Card" value={record['Last 4 Digits of Card']} />
                                <DetailItem label="Product" value={record['Product']} />
                                <DetailItem label="Store of Purchase" value={record['Store Name']} />
                            </div>
                        </div>

                        <div>
                            <h3 className="text-lg font-semibold text-on-surface border-b border-border-color pb-2 mb-3">Internal Notes</h3>
                            <DetailItem label="Office Notes" value={record['Office Notes']} />
                        </div>

                        <div>
                            <h3 className="text-lg font-semibold text-on-surface border-b border-border-color pb-2 mb-3">Attachments</h3>
                             <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                <FileLink label="Receipt File" url={record['Receipt File']} />
                                <FileLink label="File 1" url={record['File 1']} />
                                <FileLink label="File 2" url={record['File 2']} />
                                <FileLink label="File 3" url={record['File 3']} />
                                <FileLink label="File 4" url={record['File 4']} />
                            </div>
                        </div>
                    </div>
                </div>
                <footer className="bg-gray-50 px-6 py-3 flex justify-end rounded-b-lg border-t border-border-color">
                    <button type="button" onClick={onClose} className="text-on-surface bg-white hover:bg-gray-100 border border-border-color font-medium rounded-lg text-sm px-5 py-2.5 text-center">
                        Close
                    </button>
                </footer>
            </div>
        </div>
    );
};

export default DetailsModal;
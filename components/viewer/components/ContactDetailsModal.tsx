
import React from 'react';
import type { Contact } from '../types';
import Modal from './Modal';
interface ContactDetailsModalProps { isOpen: boolean; onClose: () => void; contact: Contact | null; }
const DetailItem: React.FC<{ label: string; value?: string | null }> = ({ label, value }) => (<div><p className="font-semibold text-sm text-gray-500">{label}</p><p className="text-gray-900 bg-gray-50 p-2 rounded-md mt-1">{value || 'N/A'}</p></div>);
const getStatusClass = (status: string) => { const s = (status || '').toLowerCase(); if (s === 'active') return 'bg-green-100 text-green-800'; if (s.includes('inactive') || s.includes('do not contact')) return 'bg-red-100 text-red-800'; if (s === 'lead') return 'bg-blue-100 text-blue-800'; return 'bg-gray-100 text-gray-800'; };
const ContactDetailsModal: React.FC<ContactDetailsModalProps> = ({ isOpen, onClose, contact }) => {
    if (!isOpen || !contact) return null;
    const footer = <button onClick={onClose} className="px-4 py-2 bg-white border rounded-md">Close</button>;
    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Contact: ${contact['First Name']} ${contact['Last Name']}`} size="2xl" footer={footer}>
            <div className="space-y-6">
                <section><h3 className="text-lg font-medium border-b pb-2 mb-3">Contact Information</h3><div className="grid md:grid-cols-2 gap-4"><DetailItem label="Full Name" value={`${contact['First Name']} ${contact['Last Name']}`} /><DetailItem label="Email" value={contact['Email Address']} /><DetailItem label="Phone" value={contact['Phone Number']} /><DetailItem label="Address" value={contact.Address} /></div></section>
                <section><h3 className="text-lg font-medium border-b pb-2 mb-3">Professional Information</h3><div className="grid md:grid-cols-2 gap-4"><DetailItem label="Company" value={contact['Company/Organization']} /><DetailItem label="Title" value={contact['Job Title']} /><DetailItem label="Department" value={contact.Department} /><div><p className="font-semibold text-sm">Status</p><span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusClass(contact.Status)}`}>{contact.Status}</span></div></div></section>
                <section><h3 className="text-lg font-medium border-b pb-2 mb-3">Notes & Metadata</h3><div className="grid md:grid-cols-2 gap-4"><div className="md:col-span-2"><DetailItem label="Notes" value={contact.Notes} /></div><DetailItem label="Created On" value={new Date(contact['Created On']).toLocaleDateString()} /><DetailItem label="Contact ID" value={contact.ContactID} /></div></section>
            </div>
        </Modal>
    );
};
export default ContactDetailsModal;

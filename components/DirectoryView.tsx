import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Contact, ContactFormState } from '../types';
import { addContact, updateContact, deleteContact } from '../services/writeService';
import { getContacts } from '../services/dataService';
import { PlusIcon, SearchIcon, PencilIcon, TrashIcon, ViewIcon, AdjustmentsIcon } from './icons';
import Alert from './customer_service_hub/components/Alert';
import Modal from './Modal';
import ConfirmationModal from './customer_service_hub/components/ConfirmationModal';
import Pagination from './customer_service_hub/components/Pagination';
// import ContactDetailsModal from './ContactDetailsModal';

interface DirectoryViewProps {
    viewOnly?: boolean;
}

const RECORDS_PER_PAGE = 15;
const STATUS_OPTIONS = ['Active', 'Inactive', 'Lead', 'Do Not Contact'];
type DirectoryColumnKey = keyof Contact | 'FullName' | 'ContactInfo';

const ALL_DIRECTORY_HEADERS: { key: DirectoryColumnKey; label: string }[] = [
    { key: 'FullName', label: 'Name' },
    { key: 'Company/Organization', label: 'Company' },
    { key: 'ContactInfo', label: 'Contact Info' },
    { key: 'Status', label: 'Status' },
    { key: 'Job Title', label: 'Title' },
    { key: 'Department', label: 'Department' },
    { key: 'Address', label: 'Address' },
    { key: 'ContactID', label: 'Contact ID' },
];

const DEFAULT_VISIBLE_DIRECTORY_COLUMNS: DirectoryColumnKey[] = ['FullName', 'Company/Organization', 'ContactInfo', 'Status'];

const getStatusSelectClass = (status: string) => {
    const baseStyles = "w-full text-left px-2 py-1 text-xs font-semibold rounded-md appearance-none focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-surface focus:ring-primary border";
    const lowerStatus = (status || '').toLowerCase();
    if (lowerStatus === 'active') return `${baseStyles} bg-green-100 text-green-800 border-green-300`;
    if (lowerStatus === 'inactive' || lowerStatus === 'do not contact') return `${baseStyles} bg-red-100 text-red-800 border-red-300`;
    if (lowerStatus === 'lead') return `${baseStyles} bg-blue-100 text-blue-800 border-blue-300`;
    return `${baseStyles} bg-gray-100 text-gray-700 border-gray-300`;
};

const DetailItem: React.FC<{ label: string; children?: React.ReactNode }> = ({ label, children }) => (
    <div>
      <p className="font-semibold text-sm text-gray-500">{label}</p>
      <div className="text-gray-900 bg-gray-50 p-2 rounded-md mt-1 text-sm min-h-[38px]">{children || 'Not provided'}</div>
    </div>
  );

const DirectoryView: React.FC<DirectoryViewProps> = ({ viewOnly = false }) => {
    const [contacts, setContacts] = useState<Contact[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

    const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
    const [formState, setFormState] = useState<ContactFormState>({} as ContactFormState);
    const [formErrors, setFormErrors] = useState<Partial<Record<keyof ContactFormState, string>>>({});
    
    const [isColumnSelectorOpen, setIsColumnSelectorOpen] = useState(false);
    const [visibleColumnKeys, setVisibleColumnKeys] = useState<Set<DirectoryColumnKey>>(new Set(DEFAULT_VISIBLE_DIRECTORY_COLUMNS));
    const columnSelectorRef = useRef<HTMLDivElement>(null);

    const refetchData = React.useCallback(async () => {
        setIsLoading(true);
        try {
            const data = await getContacts();
            setContacts(data);
        } catch(e) {
            setError(e instanceof Error ? e.message : 'Failed to load contacts');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        refetchData();
    }, [refetchData]);

     useEffect(() => {
        try {
            const saved = localStorage.getItem('directory-visible-columns');
            if (saved) {
                setVisibleColumnKeys(new Set(JSON.parse(saved)));
            }
        } catch (e) { console.error("Failed to parse visible columns from localStorage", e); }
    }, []);

    useEffect(() => {
        try {
            localStorage.setItem('directory-visible-columns', JSON.stringify(Array.from(visibleColumnKeys)));
        } catch (e) { console.error("Failed to save visible columns to localStorage", e); }
    }, [visibleColumnKeys]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (columnSelectorRef.current && !columnSelectorRef.current.contains(event.target as Node)) {
                setIsColumnSelectorOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const emptyForm: ContactFormState = {
        'First Name': '', 'Last Name': '', 'Phone Number': '', 'Email Address': '',
        Address: '', 'Company/Organization': '', 'Job Title': '', Department: '',
        Status: 'Active', Notes: '',
    };

    const showSuccess = (message: string) => {
        setSuccessMessage(message);
        setTimeout(() => setSuccessMessage(null), 3000);
    };

    const filteredContacts = useMemo(() => {
        const query = searchQuery.toLowerCase();
        if (!query) return contacts;
        return contacts.filter(c => 
            `${c['First Name']} ${c['Last Name']}`.toLowerCase().includes(query) ||
            c['Email Address']?.toLowerCase().includes(query) ||
            c['Company/Organization']?.toLowerCase().includes(query)
        );
    }, [contacts, searchQuery]);

    const paginatedContacts = useMemo(() => {
        const startIndex = (currentPage - 1) * RECORDS_PER_PAGE;
        return filteredContacts.slice(startIndex, startIndex + RECORDS_PER_PAGE);
    }, [filteredContacts, currentPage]);
    
    const totalPages = Math.ceil(filteredContacts.length / RECORDS_PER_PAGE);

    const openAddModal = () => {
        if(viewOnly) return;
        setSelectedContact(null);
        setFormState(emptyForm);
        setFormErrors({});
        setIsModalOpen(true);
    };

    const openEditModal = (contact: Contact) => {
        if(viewOnly) return;
        setSelectedContact(contact);
        const { ContactID, 'Created On': _, ...editableFields } = contact;
        setFormState(editableFields);
        setFormErrors({});
        setIsModalOpen(true);
    };

    const openDetailsModal = (contact: Contact) => {
        setSelectedContact(contact);
        setIsDetailsModalOpen(true);
    };

    const openDeleteModal = (contact: Contact) => {
        if(viewOnly) return;
        setSelectedContact(contact);
        setIsDeleteModalOpen(true);
    };

    const validateForm = () => {
        const errors: Partial<Record<keyof ContactFormState, string>> = {};
        if (!formState['First Name']?.trim()) errors['First Name'] = 'First Name is required.';
        if (!formState['Last Name']?.trim()) errors['Last Name'] = 'Last Name is required.';
        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleSave = async () => {
        if (viewOnly || !validateForm()) return;
        
        setError(null);
        setIsSubmitting(true);
        try {
            if (selectedContact) {
                await updateContact({ ...selectedContact, ...formState });
                showSuccess('Contact updated successfully.');
            } else {
                await addContact(formState);
                showSuccess('Contact added successfully.');
            }
            setIsModalOpen(false);
            await refetchData();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to save contact.');
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const handleStatusChange = async (contact: Contact, newStatus: string) => {
        if (viewOnly) return;
        setIsSubmitting(true);
        try {
            await updateContact({ ...contact, Status: newStatus as Contact['Status'] });
            await refetchData();
        } catch(err) {
             setError(err instanceof Error ? err.message : 'Failed to update status.');
        } finally {
            setIsSubmitting(false);
        }
    }

    const handleDelete = async () => {
        if (viewOnly || !selectedContact) return;
        setIsSubmitting(true);
        try {
            await deleteContact(selectedContact.ContactID);
            showSuccess('Contact deleted successfully.');
            setIsDeleteModalOpen(false);
            await refetchData();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to delete contact.');
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const visibleHeaders = ALL_DIRECTORY_HEADERS.filter(h => visibleColumnKeys.has(h.key));
    
    const getCellContent = (contact: Contact, key: DirectoryColumnKey) => {
        switch (key) {
            case 'FullName': return `${contact['First Name']} ${contact['Last Name']}`;
            case 'ContactInfo': return (<><div>{contact['Email Address']}</div><div className="text-xs">{contact['Phone Number']}</div></>);
            case 'Status':
                return (
                     <select value={contact.Status || ''} onChange={e => handleStatusChange(contact, e.target.value)} disabled={isSubmitting || viewOnly}
                        className={getStatusSelectClass(contact.Status)}>
                        {STATUS_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                );
            default: return contact[key as keyof Contact];
        }
    };

    if (isLoading) {
        return <div className="flex justify-center items-center h-64">Loading directory...</div>
    }

    return (
        <>
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <h1 className="text-4xl font-bold text-on-surface">Directory</h1>
                <div className="flex w-full md:w-auto md:flex-grow max-w-lg items-center gap-2">
                    <div className="relative flex-grow">
                        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none"><SearchIcon /></div>
                        <input
                           type="search"
                           placeholder="Search by Name, Email, or Company..."
                           value={searchQuery}
                           onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                           className="w-full pl-10 pr-4 py-2 bg-surface border border-border-color text-on-surface rounded-lg focus:ring-primary focus:border-primary"
                        />
                    </div>
                     <div className="relative" ref={columnSelectorRef}>
                         <button onClick={() => setIsColumnSelectorOpen(prev => !prev)} className="h-full px-3 py-2 text-sm font-medium text-on-surface-secondary bg-surface border border-border-color rounded-lg flex items-center gap-1 hover:bg-gray-100">
                             <AdjustmentsIcon />
                         </button>
                        {isColumnSelectorOpen && (
                            <div className="absolute right-0 mt-2 w-56 bg-white rounded-md shadow-lg z-20 border border-gray-200">
                                <div className="p-2 font-semibold text-sm border-b">Show Columns</div>
                                <div className="p-2">
                                    {ALL_DIRECTORY_HEADERS.map(header => (
                                        <label key={header.key} className="flex items-center space-x-2 p-1 hover:bg-gray-100 rounded-md cursor-pointer">
                                            <input type="checkbox" className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                                checked={visibleColumnKeys.has(header.key)} onChange={() => setVisibleColumnKeys(prev => {
                                                    const newSet = new Set(prev);
                                                    if (newSet.has(header.key)) newSet.delete(header.key);
                                                    else newSet.add(header.key);
                                                    return newSet;
                                                })} />
                                            <span className="text-sm text-gray-700">{header.label}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
                {!viewOnly && (
                    <button onClick={openAddModal} className="w-full md:w-auto flex-shrink-0 flex items-center justify-center gap-2 bg-primary hover:bg-primary-hover text-white font-bold py-2 px-4 rounded-lg shadow-lg">
                        <PlusIcon /> Add Contact
                    </button>
                )}
            </header>
            
            {error && <Alert message={error} type="error" onClose={() => setError(null)} />}
            {successMessage && <Alert message={successMessage} type="success" onClose={() => setSuccessMessage(null)} />}

            <main className="bg-surface rounded-xl shadow-lg">
                {/* Mobile Card View */}
                <div className="md:hidden p-2 space-y-3">
                    {paginatedContacts.map(contact => (
                        <div key={contact.ContactID} className="bg-surface border border-border-color rounded-lg p-4 shadow-sm" onClick={() => openDetailsModal(contact)}>
                            <div className="mb-3">
                                <p className="font-bold text-on-surface text-lg">{`${contact['First Name']} ${contact['Last Name']}`}</p>
                                <p className="text-sm text-on-surface-secondary">{contact['Company/Organization'] || 'No Company'}</p>
                                <p className="text-xs text-on-surface-secondary truncate">{contact['Email Address']}</p>
                            </div>
                             <div className="flex flex-col sm:flex-row items-center gap-4" onClick={(e) => e.stopPropagation()}>
                                <div className="w-full sm:flex-1">
                                    <select
                                        value={contact.Status}
                                        onChange={(e) => handleStatusChange(contact, e.target.value)}
                                        className={getStatusSelectClass(contact.Status)}
                                        aria-label={`Status for ${contact['First Name']}`}
                                        disabled={viewOnly}
                                    >
                                        {STATUS_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                    </select>
                                </div>
                                <div className="flex items-center justify-end gap-4 w-full sm:w-auto">
                                    <button onClick={() => openDetailsModal(contact)} className="text-emerald-500 hover:text-emerald-700" aria-label="View Details"><ViewIcon /></button>
                                    {!viewOnly && <>
                                        <button onClick={() => openEditModal(contact)} className="text-sky-500 hover:text-sky-700" aria-label="Edit"><PencilIcon className="h-5 w-5"/></button>
                                        <button onClick={() => openDeleteModal(contact)} className="text-red-500 hover:text-red-700" aria-label="Delete"><TrashIcon className="h-5 w-5"/></button>
                                    </>}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
                
                {/* Desktop Table View */}
                <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-sm text-left text-on-surface-secondary">
                        <thead className="text-xs text-on-surface uppercase bg-gray-50">
                            <tr>
                                {visibleHeaders.map(h => <th key={h.key} scope="col" className="px-6 py-3">{h.label}</th>)}
                                <th scope="col" className="px-6 py-3 text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {paginatedContacts.map(contact => (
                                <tr key={contact.ContactID} onClick={() => openDetailsModal(contact)} className="bg-white border-b hover:bg-gray-50 cursor-pointer">
                                    {visibleHeaders.map(h => (
                                        <td key={h.key} className="px-6 py-4" onClick={e => ['SELECT'].includes((e.target as HTMLElement).tagName) && e.stopPropagation()}>
                                            {getCellContent(contact, h.key)}
                                        </td>
                                    ))}
                                    <td className="px-6 py-4 text-center" onClick={e => e.stopPropagation()}>
                                        <div className="flex items-center justify-center gap-4">
                                            {!viewOnly && <>
                                                <button onClick={() => openEditModal(contact)} className="text-sky-500 hover:text-sky-700"><PencilIcon className="h-5 w-5"/></button>
                                                <button onClick={() => openDeleteModal(contact)} className="text-red-500 hover:text-red-700"><TrashIcon className="h-5 w-5"/></button>
                                            </>}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {totalPages > 1 && (
                    <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
                )}
            </main>

            {/* Add/Edit Modal */}
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={selectedContact ? 'Edit Contact' : 'Add New Contact'}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">First Name<span className="text-red-500">*</span></label>
                        <input type="text" value={formState['First Name']} onChange={e => setFormState(p => ({...p, 'First Name': e.target.value}))} 
                               className={`mt-1 block w-full border rounded-md shadow-sm p-2 ${formErrors['First Name'] ? 'border-red-500' : 'border-gray-300'}`} />
                        {formErrors['First Name'] && <p className="text-xs text-red-600 mt-1">{formErrors['First Name']}</p>}
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-gray-700">Last Name<span className="text-red-500">*</span></label>
                        <input type="text" value={formState['Last Name']} onChange={e => setFormState(p => ({...p, 'Last Name': e.target.value}))}
                               className={`mt-1 block w-full border rounded-md shadow-sm p-2 ${formErrors['Last Name'] ? 'border-red-500' : 'border-gray-300'}`} />
                         {formErrors['Last Name'] && <p className="text-xs text-red-600 mt-1">{formErrors['Last Name']}</p>}
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Email Address</label>
                        <input type="email" value={formState['Email Address']} onChange={e => setFormState(p => ({...p, 'Email Address': e.target.value}))} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" />
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-gray-700">Phone Number</label>
                        <input type="tel" value={formState['Phone Number']} onChange={e => setFormState(p => ({...p, 'Phone Number': e.target.value}))} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" />
                    </div>
                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700">Address</label>
                        <input type="text" value={formState.Address} onChange={e => setFormState(p => ({...p, Address: e.target.value}))} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" />
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-gray-700">Company / Organization</label>
                        <input type="text" value={formState['Company/Organization']} onChange={e => setFormState(p => ({...p, 'Company/Organization': e.target.value}))} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Job Title</label>
                        <input type="text" value={formState['Job Title']} onChange={e => setFormState(p => ({...p, 'Job Title': e.target.value}))} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" />
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-gray-700">Department</label>
                        <input type="text" value={formState.Department} onChange={e => setFormState(p => ({...p, Department: e.target.value}))} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Status</label>
                        <select value={formState.Status} onChange={e => setFormState(p => ({...p, Status: e.target.value as Contact['Status']}))} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2">
                            {STATUS_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                        </select>
                    </div>
                     <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700">Notes</label>
                        <textarea value={formState.Notes} onChange={e => setFormState(p => ({...p, Notes: e.target.value}))} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" rows={3}></textarea>
                    </div>
                </div>
                <div className="mt-6 flex justify-end gap-3">
                    <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm bg-gray-200 rounded-md">Cancel</button>
                    <button onClick={handleSave} className="px-4 py-2 text-sm text-white bg-primary rounded-md" disabled={isSubmitting}>{isSubmitting ? 'Saving...' : 'Save'}</button>
                </div>
            </Modal>

            {/* FIX: Add Details Modal implementation */}
            {selectedContact && (
                <Modal isOpen={isDetailsModalOpen} onClose={() => setIsDetailsModalOpen(false)} title={`Contact: ${selectedContact['First Name']} ${selectedContact['Last Name']}`} size="2xl">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <DetailItem label="Full Name">{`${selectedContact['First Name']} ${selectedContact['Last Name']}`}</DetailItem>
                        <DetailItem label="Status">{selectedContact.Status}</DetailItem>
                        <DetailItem label="Company">{selectedContact['Company/Organization']}</DetailItem>
                        <DetailItem label="Job Title">{selectedContact['Job Title']}</DetailItem>
                        <DetailItem label="Department">{selectedContact.Department}</DetailItem>
                        <DetailItem label="Email">{selectedContact['Email Address']}</DetailItem>
                        <DetailItem label="Phone">{selectedContact['Phone Number']}</DetailItem>
                        <DetailItem label="Address">{selectedContact.Address}</DetailItem>
                        <div className="md:col-span-2"><DetailItem label="Notes">{selectedContact.Notes}</DetailItem></div>
                    </div>
                </Modal>
            )}

            {selectedContact && (
                <ConfirmationModal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} onConfirm={handleDelete}
                    title="Delete Contact" message={`Are you sure you want to delete contact "${selectedContact['First Name']} ${selectedContact['Last Name']}"?`} isConfirming={isSubmitting}/>
            )}
        </>
    );
};

export default DirectoryView;
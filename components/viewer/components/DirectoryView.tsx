import React, { useState, useMemo } from 'react';
import { Contact } from '../types';
import { SearchIcon, SortIcon } from '../../icons';
import Pagination from './Pagination';
import ContactDetailsModal from './ContactDetailsModal';

interface DirectoryViewProps {
    contacts: Contact[];
}

const RECORDS_PER_PAGE = 15;
type DirectoryColumnKey = keyof Contact | 'FullName' | 'ContactInfo';
type DirectorySortConfig = { key: DirectoryColumnKey, direction: 'ascending' | 'descending' };

const getStatusClass = (status: string) => {
    const base = "px-2 py-1 text-xs font-semibold rounded-full";
    const lowerStatus = (status || '').toLowerCase();
    if (lowerStatus === 'active') return `${base} bg-green-100 text-green-800`;
    if (lowerStatus === 'inactive' || lowerStatus === 'do not contact') return `${base} bg-red-100 text-red-800`;
    if (lowerStatus === 'lead') return `${base} bg-blue-100 text-blue-800`;
    return `${base} bg-gray-100 text-gray-700`;
};

const DirectoryView: React.FC<DirectoryViewProps> = ({ contacts }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [sortConfig, setSortConfig] = useState<DirectorySortConfig>({ key: 'FullName', direction: 'ascending' });
    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
    const [selectedContact, setSelectedContact] = useState<Contact | null>(null);

    const filteredContacts = useMemo(() => {
        return contacts
            .filter(c => 
                `${c['First Name']} ${c['Last Name']}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
                c['Email Address']?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                c['Company/Organization']?.toLowerCase().includes(searchQuery.toLowerCase())
            )
            .sort((a, b) => {
                const { key, direction } = sortConfig;
                let aValue = '', bValue = '';
                if (key === 'FullName') { aValue = `${a['First Name']} ${a['Last Name']}`; bValue = `${b['First Name']} ${b['Last Name']}`; }
                else { aValue = a[key as keyof Contact] || ''; bValue = b[key as keyof Contact] || ''; }
                return direction === 'ascending' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
            });
    }, [contacts, searchQuery, sortConfig]);

    const paginatedContacts = useMemo(() => {
        return filteredContacts.slice((currentPage - 1) * RECORDS_PER_PAGE, currentPage * RECORDS_PER_PAGE);
    }, [filteredContacts, currentPage]);
    
    const totalPages = Math.ceil(filteredContacts.length / RECORDS_PER_PAGE);
    
    return (
        <>
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <h1 className="text-4xl font-bold text-on-surface">Directory Viewer</h1>
                <div className="relative flex-grow max-w-lg">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><SearchIcon /></div>
                    <input type="search" placeholder="Search by Name, Email, or Company..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                           className="w-full pl-10 pr-4 py-2 bg-surface border border-border-color rounded-lg"/>
                </div>
            </header>
            
            <main className="bg-surface rounded-xl shadow-lg">
                 {/* Mobile Card View */}
                <div className="md:hidden p-2 space-y-3">
                    {paginatedContacts.map(contact => (
                        <div key={contact.ContactID} onClick={() => { setSelectedContact(contact); setIsDetailsModalOpen(true); }} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm space-y-2">
                            <div className="flex justify-between items-start">
                                <p className="font-bold text-on-surface text-lg">{`${contact['First Name']} ${contact['Last Name']}`}</p>
                                <span className={getStatusClass(contact.Status)}>{contact.Status}</span>
                            </div>
                            <div className="text-sm text-on-surface-secondary pt-2 border-t">
                                <p>{contact['Company/Organization']}</p>
                                <p className="text-xs">{contact['Email Address']}</p>
                                <p className="text-xs">{contact['Phone Number']}</p>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Desktop Table View */}
                <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-on-surface uppercase bg-gray-50">
                            <tr>
                                {['FullName', 'Company/Organization', 'Email Address', 'Phone Number', 'Status'].map(h => (
                                    <th key={h} className="px-6 py-3" onClick={() => setSortConfig(p => ({key: h as DirectoryColumnKey, direction: p.key===h && p.direction==='ascending' ? 'descending' : 'ascending'}))}>
                                        <div className="flex items-center gap-2 cursor-pointer">{h.replace('FullName', 'Name')}<SortIcon direction={sortConfig.key === h ? sortConfig.direction : 'none'} /></div>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {paginatedContacts.map(contact => (
                                <tr key={contact.ContactID} onClick={() => { setSelectedContact(contact); setIsDetailsModalOpen(true); }} className="odd:bg-white even:bg-gray-50/70 border-b hover:bg-indigo-50 cursor-pointer">
                                    <td className="px-6 py-4 font-semibold text-on-surface">{`${contact['First Name']} ${contact['Last Name']}`}</td>
                                    <td className="px-6 py-4">{contact['Company/Organization']}</td>
                                    <td className="px-6 py-4">{contact['Email Address']}</td>
                                    <td className="px-6 py-4">{contact['Phone Number']}</td>
                                    <td className="px-6 py-4"><span className={getStatusClass(contact.Status)}>{contact.Status}</span></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {totalPages > 1 && <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />}
            </main>
            
            {selectedContact && <ContactDetailsModal isOpen={isDetailsModalOpen} onClose={() => setIsDetailsModalOpen(false)} contact={selectedContact} />}
        </>
    );
};

export default DirectoryView;
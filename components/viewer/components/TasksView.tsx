import React, { useState, useMemo } from 'react';
import { Task, Account, Contact } from '../types';
import { formatDateToMDY, getDueDateHighlightClass } from '../utils/formatting';
import { SearchIcon, ViewIcon, SortIcon } from '../../icons';
import Modal from './Modal';
import Pagination from './Pagination';
import AccountDetailsModal from './AccountDetailsModal';
import ContactDetailsModal from './ContactDetailsModal';

interface TasksViewProps {
    tasks: Task[];
    accounts: Account[];
    contacts: Contact[];
}

const RECORDS_PER_PAGE = 20;
const STATUS_ORDER: (Task['Status'])[] = ['To Do', 'In Progress', 'Pending Review', 'Completed', 'Canceled'];
const PRIORITY_ORDER: (Task['Priority'])[] = ['Critical', 'High', 'Medium', 'Low'];

const getPriorityClass = (priority: string) => {
    switch (priority) {
        case 'Critical': return "bg-red-100 text-red-800";
        case 'High': return "bg-orange-100 text-orange-800";
        case 'Medium': return "bg-yellow-100 text-yellow-800";
        case 'Low': return "bg-gray-100 text-gray-700";
        default: return "bg-gray-100 text-gray-700";
    }
};

const getStatusClass = (status: string) => {
     switch (status) {
        case 'To Do': return "bg-blue-100 text-blue-800";
        case 'In Progress': return "bg-amber-100 text-amber-800";
        case 'Pending Review': return "bg-purple-100 text-purple-800";
        case 'Completed': return "bg-green-100 text-green-800";
        case 'Canceled': return "bg-gray-200 text-gray-800";
        default: return "bg-gray-100 text-gray-700";
    }
}

type SortConfig = { key: keyof Task, direction: 'ascending' | 'descending' };

const TasksView: React.FC<TasksViewProps> = ({ tasks, accounts, contacts }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'Status', direction: 'ascending' });
    const [activeTab, setActiveTab] = useState<'active' | 'completed'>('active');
    
    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);
    const [accountToView, setAccountToView] = useState<Account | null>(null);
    const [contactToView, setContactToView] = useState<Contact | null>(null);

    const processedTasks = useMemo(() => {
        return tasks
            .filter(task => activeTab === 'active' ? task.Status !== 'Completed' && task.Status !== 'Canceled' : task.Status === 'Completed' || task.Status === 'Canceled')
            .filter(t => t['Task Name']?.toLowerCase().includes(searchQuery.toLowerCase()))
            .sort((a, b) => {
                if (sortConfig.key === 'Status') {
                    const statusA = STATUS_ORDER.indexOf(a.Status), statusB = STATUS_ORDER.indexOf(b.Status);
                    if (statusA !== statusB) return sortConfig.direction === 'ascending' ? statusA - statusB : statusB - statusA;
                }
                if (sortConfig.key === 'Priority') {
                    const priorityA = PRIORITY_ORDER.indexOf(a.Priority), priorityB = PRIORITY_ORDER.indexOf(b.Priority);
                    if (priorityA !== priorityB) return sortConfig.direction === 'ascending' ? priorityA - priorityB : priorityB - priorityA;
                }
                const aValue = a[sortConfig.key] || '', bValue = b[sortConfig.key] || '';
                if (aValue < bValue) return sortConfig.direction === 'ascending' ? -1 : 1;
                if (aValue > bValue) return sortConfig.direction === 'ascending' ? 1 : -1;
                return 0;
            });
    }, [tasks, searchQuery, sortConfig, activeTab]);

    const paginatedTasks = useMemo(() => {
        return processedTasks.slice((currentPage - 1) * RECORDS_PER_PAGE, currentPage * RECORDS_PER_PAGE);
    }, [processedTasks, currentPage]);
    
    const totalPages = Math.ceil(processedTasks.length / RECORDS_PER_PAGE);
    const findContactName = (id: string) => contacts.find(c=>c.ContactID===id) ? `${contacts.find(c=>c.ContactID===id)!['First Name']} ${contacts.find(c=>c.ContactID===id)!['Last Name']}` : 'Unknown';
    const findAccountName = (id: string) => accounts.find(a=>a.accountID===id)?.company || 'Unknown';

    return (
        <>
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <h1 className="text-4xl font-bold text-on-surface">Tasks Viewer</h1>
                <div className="relative flex-grow max-w-lg">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><SearchIcon /></div>
                    <input type="search" placeholder="Search by Task Name..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                           className="w-full pl-10 pr-4 py-2 bg-surface border border-border-color rounded-lg"/>
                </div>
            </header>

            <div className="mb-4 border-b border-border-color">
                <nav className="-mb-px flex space-x-8">
                    <button onClick={() => { setActiveTab('active'); setCurrentPage(1); }} className={`${activeTab === 'active' ? 'border-primary text-primary' : 'border-transparent text-on-surface-secondary'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}>Active Tasks</button>
                    <button onClick={() => { setActiveTab('completed'); setCurrentPage(1); }} className={`${activeTab === 'completed' ? 'border-primary text-primary' : 'border-transparent text-on-surface-secondary'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}>Completed & Canceled</button>
                </nav>
            </div>

            <main className="bg-surface rounded-xl shadow-lg">
                {/* Mobile Card View */}
                <div className="md:hidden p-2 space-y-3">
                    {paginatedTasks.map(task => (
                        <div key={task.TaskID} onClick={() => { setSelectedTask(task); setIsDetailsModalOpen(true); }} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm space-y-3">
                            <p className="font-bold text-on-surface">{task['Task Name']}</p>
                            <div className="flex flex-wrap items-center gap-2">
                                <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusClass(task.Status)}`}>{task.Status}</span>
                                <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getPriorityClass(task.Priority)}`}>{task.Priority}</span>
                                {task['Due Date'] && <span className={getDueDateHighlightClass(task['Due Date'])}>{formatDateToMDY(task['Due Date'])}</span>}
                            </div>
                            <div className="text-sm text-on-surface-secondary border-t pt-2">
                                <p><strong>Account:</strong> {findAccountName(task.Account)}</p>
                                <p><strong>Contact:</strong> {findContactName(task.Contact)}</p>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Desktop Table View */}
                <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-on-surface uppercase bg-gray-50">
                            <tr>
                                {['Task Name', 'Status', 'Priority', 'Account', 'Contact', 'Due Date'].map(h => (
                                    <th key={h} className="px-6 py-3" onClick={() => setSortConfig(p => ({key: h as keyof Task, direction: p.key===h && p.direction==='ascending' ? 'descending' : 'ascending'}))}>
                                        <div className="flex items-center gap-2 cursor-pointer">{h}<SortIcon direction={sortConfig.key === h ? sortConfig.direction : 'none'} /></div>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                        {paginatedTasks.map(task => (
                            <tr key={task.TaskID} onClick={() => { setSelectedTask(task); setIsDetailsModalOpen(true); }} className="odd:bg-white even:bg-gray-50/70 border-b hover:bg-indigo-50 cursor-pointer">
                                <td className="px-6 py-4 font-bold text-on-surface">{task['Task Name']}</td>
                                <td className="px-6 py-4"><span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusClass(task.Status)}`}>{task.Status}</span></td>
                                <td className="px-6 py-4"><span className={`px-2 py-1 rounded-full text-xs font-semibold ${getPriorityClass(task.Priority)}`}>{task.Priority}</span></td>
                                <td className="px-6 py-4">{findAccountName(task.Account)}</td>
                                <td className="px-6 py-4">{findContactName(task.Contact)}</td>
                                <td className="px-6 py-4">{task['Due Date'] ? <span className={getDueDateHighlightClass(task['Due Date'])}>{formatDateToMDY(task['Due Date'])}</span> : ''}</td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                </div>
                 {totalPages > 1 && <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />}
            </main>

            {selectedTask && (
                 <Modal isOpen={isDetailsModalOpen} onClose={() => setIsDetailsModalOpen(false)} title={`Task: ${selectedTask['Task Name']}`} size="2xl">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div><p className="font-semibold text-sm">Status</p><p>{selectedTask.Status}</p></div>
                        <div><p className="font-semibold text-sm">Priority</p><p>{selectedTask.Priority}</p></div>
                        <div><p className="font-semibold text-sm">Due Date</p><p>{formatDateToMDY(selectedTask['Due Date'])}</p></div>
                        <div><p className="font-semibold text-sm">Completed On</p><p>{formatDateToMDY(selectedTask['Completed On'])}</p></div>
                        <div><p className="font-semibold text-sm">Account</p><button onClick={() => setAccountToView(accounts.find(a => a.accountID === selectedTask.Account) || null)} className="text-primary hover:underline">{findAccountName(selectedTask.Account)}</button></div>
                        <div><p className="font-semibold text-sm">Contact</p><button onClick={() => setContactToView(contacts.find(c => c.ContactID === selectedTask.Contact) || null)} className="text-primary hover:underline">{findContactName(selectedTask.Contact)}</button></div>
                        <div className="md:col-span-2"><p className="font-semibold text-sm">Description</p><p>{selectedTask['Task Description']}</p></div>
                        <div className="md:col-span-2"><p className="font-semibold text-sm">Notes</p><p>{selectedTask.Notes}</p></div>
                    </div>
                 </Modal>
            )}
            {accountToView && <AccountDetailsModal isOpen={true} onClose={() => setAccountToView(null)} account={accountToView} />}
            {contactToView && <ContactDetailsModal isOpen={!!contactToView} onClose={() => setContactToView(null)} contact={contactToView} />}
        </>
    );
};

export default TasksView;
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Task, TaskFormState, Account, Contact } from '../types';
import { addTask, updateTask, deleteTask } from '../services/writeService';
import { getTasks, getAccounts, getContacts } from '../services/dataService';
import { formatDateToYMD, formatDateToMDY, getDueDateHighlightClass } from '../utils/formatting';
import { PlusIcon, SearchIcon, PencilIcon, TrashIcon, ViewIcon, AdjustmentsIcon, SortIcon } from './icons';
import Alert from './customer_service_hub/components/Alert';
import Modal from './Modal';
import ConfirmationModal from './customer_service_hub/components/ConfirmationModal';
import Pagination from './customer_service_hub/components/Pagination';
// import AccountDetailsModal from './AccountDetailsModal';
// import ContactDetailsModal from './ContactDetailsModal';

interface TasksViewProps {
    viewOnly?: boolean;
}

const RECORDS_PER_PAGE = 20;
const STATUS_ORDER: (Task['Status'])[] = ['To Do', 'In Progress', 'Pending Review', 'Completed', 'Canceled'];
const PRIORITY_ORDER: (Task['Priority'])[] = ['Critical', 'High', 'Medium', 'Low'];

const ALL_TASK_HEADERS: { key: keyof Task; label: string }[] = [
    { key: 'Task Name', label: 'Task Name' },
    { key: 'Status', label: 'Status' },
    { key: 'Priority', label: 'Priority' },
    { key: 'Account', label: 'Account' },
    { key: 'Contact', label: 'Contact' },
    { key: 'Due Date', label: 'Due Date' },
    { key: 'Completed On', label: 'Completed On' },
    { key: 'TaskID', label: 'Task ID' },
];

const DEFAULT_VISIBLE_TASK_COLUMNS: (keyof Task)[] = [
    'Task Name', 'Status', 'Priority', 'Account', 'Contact', 'Due Date'
];

const getPriorityClass = (priority: string) => {
    const base = "w-full text-left px-2 py-1 text-xs font-semibold rounded-md appearance-none focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-surface focus:ring-primary border";
    switch (priority) {
        case 'Critical': return `${base} bg-red-100 text-red-800 border-red-300`;
        case 'High': return `${base} bg-orange-100 text-orange-800 border-orange-300`;
        case 'Medium': return `${base} bg-yellow-100 text-yellow-800 border-yellow-300`;
        case 'Low': return `${base} bg-gray-100 text-gray-700 border-gray-300`;
        default: return `${base} bg-gray-100 text-gray-700 border-gray-300`;
    }
};

const getStatusClass = (status: string) => {
    const base = "w-full text-left px-2 py-1 text-xs font-semibold rounded-md appearance-none focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-surface focus:ring-primary border";
     switch (status) {
        case 'To Do': return `${base} bg-blue-100 text-blue-800 border-blue-300`;
        case 'In Progress': return `${base} bg-amber-100 text-amber-800 border-amber-300`;
        case 'Pending Review': return `${base} bg-purple-100 text-purple-800 border-purple-300`;
        case 'Completed': return `${base} bg-green-100 text-green-800 border-green-300`;
        case 'Canceled': return `${base} bg-gray-200 text-gray-800 border-gray-300`;
        default: return `${base} bg-gray-100 text-gray-700 border-gray-300`;
    }
}

type SortConfig = { key: keyof Task, direction: 'ascending' | 'descending' };

const TasksView: React.FC<TasksViewProps> = ({ viewOnly = false }) => {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [contacts, setContacts] = useState<Contact[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'Status', direction: 'ascending' });
    
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

    const [selectedTask, setSelectedTask] = useState<Task | null>(null);
    const [formState, setFormState] = useState<TaskFormState>({} as TaskFormState);
    const [formErrors, setFormErrors] = useState<Partial<Record<keyof TaskFormState, string>>>({});
    
    const [accountToView, setAccountToView] = useState<Account | null>(null);
    const [contactToView, setContactToView] = useState<Contact | null>(null);
    
    const [isColumnSelectorOpen, setIsColumnSelectorOpen] = useState(false);
    const [visibleColumnKeys, setVisibleColumnKeys] = useState<Set<keyof Task>>(new Set(DEFAULT_VISIBLE_TASK_COLUMNS));
    const columnSelectorRef = useRef<HTMLDivElement>(null);

    const [accountSearch, setAccountSearch] = useState('');
    const [contactSearch, setContactSearch] = useState('');

    const refetchData = React.useCallback(async () => {
        setIsLoading(true);
        try {
            const [tasksData, accountsData, contactsData] = await Promise.all([getTasks(), getAccounts(), getContacts()]);
            setTasks(tasksData);
            setAccounts(accountsData);
            setContacts(contactsData);
        } catch(e) {
            setError(e instanceof Error ? e.message : 'Failed to fetch data');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        refetchData();
    }, [refetchData]);


    useEffect(() => {
        try {
            const saved = localStorage.getItem('tasks-visible-columns');
            if (saved) {
                setVisibleColumnKeys(new Set(JSON.parse(saved)));
            }
        } catch (e) { console.error("Failed to parse visible columns from localStorage", e); }
    }, []);

    useEffect(() => {
        try {
            localStorage.setItem('tasks-visible-columns', JSON.stringify(Array.from(visibleColumnKeys)));
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

    const emptyForm: TaskFormState = {
        'Task Name': '', 'Due Date': '', 'Task Description': '', Contact: '', Account: '',
        Status: 'To Do', Priority: 'Medium', Notes: '', 'Completed On': ''
    };

    const showSuccess = (message: string) => {
        setSuccessMessage(message);
        setTimeout(() => setSuccessMessage(null), 3000);
    };

    const handleSort = (key: keyof Task) => {
        let direction: 'ascending' | 'descending' = 'ascending';
        if (sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

    const processedTasks = useMemo(() => {
        let filtered = tasks;
        const query = searchQuery.toLowerCase();
        if (query) {
            filtered = tasks.filter(t => t['Task Name']?.toLowerCase().includes(query));
        }

        return [...filtered].sort((a, b) => {
            if (sortConfig.key === 'Status') {
                const statusA = STATUS_ORDER.indexOf(a.Status);
                const statusB = STATUS_ORDER.indexOf(b.Status);
                if (statusA !== statusB) return sortConfig.direction === 'ascending' ? statusA - statusB : statusB - statusA;
            }
            if (sortConfig.key === 'Priority') {
                const priorityA = PRIORITY_ORDER.indexOf(a.Priority);
                const priorityB = PRIORITY_ORDER.indexOf(b.Priority);
                 if (priorityA !== priorityB) return sortConfig.direction === 'ascending' ? priorityA - priorityB : priorityB - priorityA;
            }
            const aValue = a[sortConfig.key];
            const bValue = b[sortConfig.key];
            if (aValue < bValue) return sortConfig.direction === 'ascending' ? -1 : 1;
            if (aValue > bValue) return sortConfig.direction === 'ascending' ? 1 : -1;
            return 0;
        });
    }, [tasks, searchQuery, sortConfig]);

    const paginatedTasks = useMemo(() => {
        const startIndex = (currentPage - 1) * RECORDS_PER_PAGE;
        return processedTasks.slice(startIndex, startIndex + RECORDS_PER_PAGE);
    }, [processedTasks, currentPage]);
    
    const totalPages = Math.ceil(processedTasks.length / RECORDS_PER_PAGE);

    const openAddModal = () => {
        if(viewOnly) return;
        setSelectedTask(null);
        setFormState(emptyForm);
        setFormErrors({});
        setAccountSearch('');
        setContactSearch('');
        setIsModalOpen(true);
    };

    const openEditModal = (task: Task) => {
        if(viewOnly) return;
        setSelectedTask(task);
        const { TaskID, ...editableFields } = task;
        setFormState(editableFields);
        setFormErrors({});
        setAccountSearch('');
        setContactSearch('');
        setIsModalOpen(true);
    };

    const openDetailsModal = (task: Task) => {
        setSelectedTask(task);
        setIsDetailsModalOpen(true);
    };

    const openDeleteModal = (task: Task) => {
        if(viewOnly) return;
        setSelectedTask(task);
        setIsDeleteModalOpen(true);
    };

    const validateForm = () => {
        const errors: Partial<Record<keyof TaskFormState, string>> = {};
        if (!formState['Task Name']?.trim()) errors['Task Name'] = 'Task Name is required.';
        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleSave = async () => {
        if (viewOnly || !validateForm()) return;
        
        setError(null);
        setIsSubmitting(true);
        try {
            if (selectedTask) {
                await updateTask({ ...selectedTask, ...formState });
                showSuccess('Task updated successfully.');
            } else {
                await addTask(formState);
                showSuccess('Task added successfully.');
            }
            setIsModalOpen(false);
            await refetchData();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to save task.');
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const handleQuickUpdate = async (task: Task, field: 'Status' | 'Priority', value: string) => {
        if (viewOnly) return;
        setIsSubmitting(true);
        try {
            await updateTask({ ...task, [field]: value });
            await refetchData();
        } catch (err) {
            setError(err instanceof Error ? err.message : `Failed to update ${field}.`);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async () => {
        if (viewOnly || !selectedTask) return;
        setIsSubmitting(true);
        try {
            await deleteTask(selectedTask.TaskID);
            showSuccess('Task deleted successfully.');
            setIsDeleteModalOpen(false);
            await refetchData();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to delete task.');
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const DetailItem: React.FC<{ label: string; children?: React.ReactNode }> = ({ label, children }) => (
      <div>
        <p className="font-semibold text-sm text-gray-500">{label}</p>
        <div className="text-gray-900 bg-gray-50 p-2 rounded-md mt-1 text-sm min-h-[38px]">{children || 'Not provided'}</div>
      </div>
    );
    
    const findContactName = (contactId: string) => {
        const contact = contacts.find(c => c.ContactID === contactId);
        return contact ? `${contact['First Name']} ${contact['Last Name']}` : 'Unknown';
    }
    const findAccountName = (accountId: string) => {
        const account = accounts.find(a => a.accountID === accountId);
        return account ? `${account.company} - ${account.locationAddress}` : 'Unknown';
    }

    const visibleHeaders = ALL_TASK_HEADERS.filter(h => visibleColumnKeys.has(h.key));

    const getCellContent = (task: Task, key: keyof Task) => {
        switch(key) {
            case 'Status':
                return (
                    <select value={task.Status} onChange={e => handleQuickUpdate(task, 'Status', e.target.value)} className={getStatusClass(task.Status)} disabled={isSubmitting || viewOnly}>
                        {STATUS_ORDER.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                );
            case 'Priority':
                 return (
                    <select value={task.Priority} onChange={e => handleQuickUpdate(task, 'Priority', e.target.value)} className={getPriorityClass(task.Priority)} disabled={isSubmitting || viewOnly}>
                        {PRIORITY_ORDER.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                );
            case 'Account': return findAccountName(task.Account);
            case 'Contact': return findContactName(task.Contact);
            case 'Due Date': {
                const formattedDate = formatDateToMDY(task[key]);
                if (!formattedDate) return '';
                const highlightClass = getDueDateHighlightClass(task[key]);
                return highlightClass ? (
                    <span className={highlightClass}>{formattedDate}</span>
                ) : (
                    formattedDate
                );
            }
            case 'Completed On': return formatDateToMDY(task[key]);
            default: return task[key];
        }
    };
    
    const filteredAndSortedAccounts = useMemo(() => {
        return [...accounts]
            .filter(a =>
                `${a.company} - ${a.locationAddress}`.toLowerCase().includes(accountSearch.toLowerCase())
            )
            .sort((a, b) =>
                `${a.company} - ${a.locationAddress || ''}`.localeCompare(`${b.company} - ${b.locationAddress || ''}`)
            );
    }, [accounts, accountSearch]);

    const filteredAndSortedContacts = useMemo(() => {
        return [...contacts]
            .filter(c =>
                `${c['First Name']} ${c['Last Name']}`.toLowerCase().includes(contactSearch.toLowerCase())
            )
            .sort((a, b) =>
                `${a['First Name']} ${a['Last Name']}`.localeCompare(`${b['First Name']} ${b['Last Name']}`)
            );
    }, [contacts, contactSearch]);

    if (isLoading) {
        return <div className="flex justify-center items-center h-64">Loading tasks...</div>
    }

    return (
        <>
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <h1 className="text-4xl font-bold text-on-surface">Tasks</h1>
                 <div className="flex w-full md:w-auto md:flex-grow max-w-lg items-center gap-2">
                    <div className="relative flex-grow">
                        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none"><SearchIcon /></div>
                        <input type="search" placeholder="Search by Task Name..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                               className="w-full pl-10 pr-4 py-2 bg-surface border border-border-color text-on-surface rounded-lg focus:ring-primary focus:border-primary" />
                    </div>
                    <div className="relative" ref={columnSelectorRef}>
                         <button onClick={() => setIsColumnSelectorOpen(prev => !prev)} className="h-full px-3 py-2 text-sm font-medium text-on-surface-secondary bg-surface border border-border-color rounded-lg flex items-center gap-1 hover:bg-gray-100">
                             <AdjustmentsIcon />
                         </button>
                        {isColumnSelectorOpen && (
                            <div className="absolute right-0 mt-2 w-56 bg-white rounded-md shadow-lg z-20 border border-gray-200">
                                <div className="p-2 font-semibold text-sm border-b">Show Columns</div>
                                <div className="p-2">
                                    {ALL_TASK_HEADERS.map(header => (
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
                        <PlusIcon /> Add Task
                    </button>
                )}
            </header>
            
            {error && <Alert message={error} type="error" onClose={() => setError(null)} />}
            {successMessage && <Alert message={successMessage} type="success" onClose={() => setSuccessMessage(null)} />}

            <main className="bg-surface rounded-xl shadow-lg">
                {/* Mobile Card View */}
                <div className="md:hidden p-2 space-y-3">
                    {paginatedTasks.map(task => (
                        <div key={task.TaskID} className="bg-surface border border-border-color rounded-lg p-4 shadow-sm" onClick={() => openDetailsModal(task)}>
                            <p className="font-bold text-on-surface text-lg mb-2">{task['Task Name']}</p>
                             <p className="text-sm text-on-surface-secondary mb-1">
                                Due:{' '}
                                {task['Due Date'] ? (
                                    <span className={getDueDateHighlightClass(task['Due Date'])}>
                                        {formatDateToMDY(task['Due Date'])}
                                    </span>
                                ) : (
                                    'N/A'
                                )}
                            </p>
                            <p className="text-xs text-on-surface-secondary mb-3 truncate">Acct: {findAccountName(task.Account)}</p>
                            
                            <div className="flex flex-col sm:flex-row gap-2 mb-3" onClick={(e) => e.stopPropagation()}>
                                <select value={task.Status} onChange={e => handleQuickUpdate(task, 'Status', e.target.value)} className={getStatusClass(task.Status)} disabled={isSubmitting || viewOnly}>
                                    {STATUS_ORDER.map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                                <select value={task.Priority} onChange={e => handleQuickUpdate(task, 'Priority', e.target.value)} className={getPriorityClass(task.Priority)} disabled={isSubmitting || viewOnly}>
                                    {PRIORITY_ORDER.map(p => <option key={p} value={p}>{p}</option>)}
                                </select>
                            </div>
                            
                            <div className="flex items-center justify-end gap-4 border-t border-border-color pt-3" onClick={(e) => e.stopPropagation()}>
                                <button onClick={() => openDetailsModal(task)} className="text-emerald-500 hover:text-emerald-700" aria-label="View Details"><ViewIcon /></button>
                                {!viewOnly && <>
                                    <button onClick={() => openEditModal(task)} className="text-sky-500 hover:text-sky-700" aria-label="Edit"><PencilIcon className="h-5 w-5"/></button>
                                    <button onClick={() => openDeleteModal(task)} className="text-red-500 hover:text-red-700" aria-label="Delete"><TrashIcon className="h-5 w-5"/></button>
                                </>}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Desktop Table View */}
                <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-sm text-left text-on-surface-secondary">
                        <thead className="text-xs text-on-surface uppercase bg-gray-50">
                            <tr>
                                {visibleHeaders.map(h => (
                                    <th key={h.key} scope="col" className="px-6 py-3 cursor-pointer" onClick={() => handleSort(h.key)}>
                                        <div className="flex items-center gap-2">
                                            {h.label}
                                            <SortIcon direction={sortConfig.key === h.key ? sortConfig.direction : 'none'} />
                                        </div>
                                    </th>
                                ))}
                                <th scope="col" className="px-6 py-3 text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                        {paginatedTasks.map(task => (
                            <tr key={task.TaskID} onClick={() => openDetailsModal(task)} className="bg-white border-b hover:bg-gray-50 cursor-pointer">
                                {visibleHeaders.map(h => (
                                    <td key={h.key} className="px-6 py-4" onClick={e => ['SELECT'].includes((e.target as HTMLElement).tagName) && e.stopPropagation()}>
                                        {getCellContent(task, h.key)}
                                    </td>
                                ))}
                                <td className="px-6 py-4 text-center" onClick={e => e.stopPropagation()}>
                                    <div className="flex items-center justify-center gap-4">
                                       {!viewOnly && <>
                                         <button onClick={() => openEditModal(task)} className="text-sky-500 hover:text-sky-700"><PencilIcon className="h-5 w-5"/></button>
                                         <button onClick={() => openDeleteModal(task)} className="text-red-500 hover:text-red-700"><TrashIcon className="h-5 w-5"/></button>
                                       </>}
                                    </div>
                                </td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                </div>
                 {totalPages > 1 && <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />}
            </main>

            {/* Add/Edit Modal */}
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={selectedTask ? 'Edit Task' : 'Add New Task'} size="2xl">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700">Task Name<span className="text-red-500">*</span></label>
                        <input type="text" value={formState["Task Name"]} onChange={e => setFormState(p => ({...p, 'Task Name': e.target.value}))} 
                               className={`mt-1 block w-full border rounded-md shadow-sm p-2 ${formErrors['Task Name'] ? 'border-red-500' : 'border-gray-300'}`} />
                        {formErrors['Task Name'] && <p className="text-xs text-red-600 mt-1">{formErrors['Task Name']}</p>}
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Status</label>
                        <select value={formState.Status} onChange={e => setFormState(p => ({...p, Status: e.target.value as Task['Status']}))} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2">
                            {STATUS_ORDER.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-gray-700">Priority</label>
                        <select value={formState.Priority} onChange={e => setFormState(p => ({...p, Priority: e.target.value as Task['Priority']}))} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2">
                            {PRIORITY_ORDER.map(p => <option key={p} value={p}>{p}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Account</label>
                        <input type="search" placeholder="Search accounts..." value={accountSearch} onChange={e => setAccountSearch(e.target.value)}
                               className="mt-1 block w-full border rounded-md shadow-sm p-2 border-gray-300" />
                        <select value={formState.Account} onChange={e => setFormState(p => ({...p, Account: e.target.value}))} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2">
                            <option value="">Select an Account</option>
                            {filteredAndSortedAccounts.map(a => <option key={a.accountID} value={a.accountID}>{`${a.company} - ${a.locationAddress}`}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Contact</label>
                        <input type="search" placeholder="Search contacts..." value={contactSearch} onChange={e => setContactSearch(e.target.value)}
                               className="mt-1 block w-full border rounded-md shadow-sm p-2 border-gray-300" />
                        <select value={formState.Contact} onChange={e => setFormState(p => ({...p, Contact: e.target.value}))} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2">
                            <option value="">Select a Contact</option>
                            {filteredAndSortedContacts.map(c => <option key={c.ContactID} value={c.ContactID}>{`${c['First Name']} ${c['Last Name']}`}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Due Date</label>
                        <input type="date" value={formatDateToYMD(formState['Due Date']) || ''} onChange={e => setFormState(p => ({...p, 'Due Date': e.target.value}))} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"/>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Completed On</label>
                        <input type="date" value={formatDateToYMD(formState['Completed On']) || ''} onChange={e => setFormState(p => ({...p, 'Completed On': e.target.value}))} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"/>
                    </div>
                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700">Task Description</label>
                        <textarea value={formState['Task Description']} onChange={e => setFormState(p => ({...p, 'Task Description': e.target.value}))} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" rows={3}/>
                    </div>
                     <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700">Notes</label>
                        <textarea value={formState.Notes} onChange={e => setFormState(p => ({...p, Notes: e.target.value}))} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" rows={3}/>
                    </div>
                </div>
                 <div className="mt-6 flex justify-end gap-3">
                    <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm bg-gray-200 rounded-md">Cancel</button>
                    <button onClick={handleSave} className="px-4 py-2 text-sm text-white bg-primary rounded-md" disabled={isSubmitting}>{isSubmitting ? 'Saving...' : 'Save'}</button>
                </div>
            </Modal>
            
            {/* Details Modal */}
            {selectedTask && (
                 <Modal isOpen={isDetailsModalOpen} onClose={() => setIsDetailsModalOpen(false)} title={`Task: ${selectedTask['Task Name']}`} size="2xl">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <DetailItem label="Status"><span className={`px-2 py-1 text-xs rounded-full border ${getStatusClass(selectedTask.Status).replace('w-full', '')}`}>{selectedTask.Status}</span></DetailItem>
                        <DetailItem label="Priority"><span className={`px-2 py-1 text-xs rounded-full border ${getPriorityClass(selectedTask.Priority).replace('w-full', '')}`}>{selectedTask.Priority}</span></DetailItem>
                        <DetailItem label="Due Date">{formatDateToMDY(selectedTask['Due Date'])}</DetailItem>
                        <DetailItem label="Completed On">{formatDateToMDY(selectedTask['Completed On'])}</DetailItem>
                        <DetailItem label="Account">
                            <button onClick={() => setAccountToView(accounts.find(a => a.accountID === selectedTask.Account) || null)} 
                                    className="text-primary hover:underline text-left w-full">{findAccountName(selectedTask.Account)}</button>
                        </DetailItem>
                        <DetailItem label="Contact">
                            <button onClick={() => setContactToView(contacts.find(c => c.ContactID === selectedTask.Contact) || null)}
                                    className="text-primary hover:underline text-left w-full">{findContactName(selectedTask.Contact)}</button>
                        </DetailItem>
                        <div className="md:col-span-2"><DetailItem label="Description">{selectedTask['Task Description']}</DetailItem></div>
                        <div className="md:col-span-2"><DetailItem label="Notes">{selectedTask.Notes}</DetailItem></div>
                    </div>
                 </Modal>
            )}

            {/* {accountToView && (
                <AccountDetailsModal isOpen={true} onClose={() => setAccountToView(null)} account={accountToView} />
            )}

            {contactToView && (
                <ContactDetailsModal isOpen={!!contactToView} onClose={() => setContactToView(null)} contact={contactToView} />
            )} */}

            {selectedTask && (
                <ConfirmationModal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} onConfirm={handleDelete}
                    title="Delete Task" message={`Are you sure you want to delete task "${selectedTask['Task Name']}"?`} isConfirming={isSubmitting}/>
            )}
        </>
    );
};

export default TasksView;
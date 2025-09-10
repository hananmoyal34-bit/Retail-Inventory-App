import React, { useState, useEffect } from 'react';
import CSHubView from './components/CSHubView';
import AccountsView from './components/AccountsView';
import TasksView from './components/TasksView';
import DirectoryView from './components/DirectoryView';
import FinancingLedgerView from './components/FinancingLedgerView';
import { UsersIcon, ClipboardListIcon, UserCircleIcon, CreditCardIcon, FolderIcon } from '../icons';
import type { CustomerRecord, Account, Task, Contact, FinancingRecord } from './types';

type View = 'csHub' | 'accounts' | 'tasks' | 'directory' | 'financing';

interface ViewerDashboardProps {
    data: {
        csHubRecords: CustomerRecord[];
        accounts: Account[];
        tasks: Task[];
        contacts: Contact[];
        financingRecords: FinancingRecord[];
    };
    initialView: View;
}

const ViewerDashboard: React.FC<ViewerDashboardProps> = ({ data, initialView }) => {
    const [activeView, setActiveView] = useState<View>(initialView);

    useEffect(() => {
        setActiveView(initialView);
    }, [initialView]);
    
    const NavButton: React.FC<{ label: string; view: View; icon: React.ReactNode; }> = ({ label, view, icon }) => {
        const isActive = activeView === view;
        return (
            <button
                onClick={() => setActiveView(view)}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary ${
                    isActive
                        ? 'bg-primary text-white'
                        : 'text-on-surface-secondary hover:bg-gray-200'
                }`}
                aria-current={isActive ? 'page' : undefined}
            >
                {icon}
                {label}
            </button>
        );
    };

    const renderContent = () => {
        switch (activeView) {
            case 'csHub':
                return <CSHubView records={data.csHubRecords} />;
            case 'accounts':
                return <AccountsView accounts={data.accounts} />;
            case 'tasks':
                return <TasksView tasks={data.tasks} accounts={data.accounts} contacts={data.contacts} />;
            case 'directory':
                return <DirectoryView contacts={data.contacts} />;
            case 'financing':
                return <FinancingLedgerView records={data.financingRecords} />;
            default:
                return <div className="text-center p-8 text-on-surface-secondary">Please select a view.</div>;
        }
    }

    return (
        <div className="bg-background min-h-screen text-on-surface font-sans -m-4 sm:-m-6 lg:-m-8">
            <div className="container mx-auto p-4 md:p-8">
                <header className="mb-6 bg-surface p-3 rounded-xl shadow-md flex flex-col sm:flex-row justify-between items-center gap-4">
                    <nav className="flex items-center gap-2 flex-wrap">
                        <NavButton label="CS Hub" view="csHub" icon={<UserCircleIcon />} />
                        <NavButton label="Financing" view="financing" icon={<CreditCardIcon />} />
                        <NavButton label="Accounts" view="accounts" icon={<FolderIcon />} />
                        <NavButton label="Tasks" view="tasks" icon={<ClipboardListIcon />} />
                        <NavButton label="Directory" view="directory" icon={<UsersIcon />} />
                    </nav>
                </header>

                <main>
                    {renderContent()}
                </main>
            </div>
        </div>
    );
};

export default ViewerDashboard;
import React, { useState, useEffect, useCallback } from 'react';
import ViewerDashboard from './ViewerDashboard';
import * as api from './services/apiService';
import type { CustomerRecord, Account, Task, Contact, FinancingRecord } from './types';
import { Page } from '../../types';
import Spinner from './components/Spinner';

interface ViewerPortalProps {
    activePage: Page;
}

type View = 'csHub' | 'accounts' | 'tasks' | 'directory' | 'financing';

const pageToViewMap: Partial<Record<Page, View>> = {
    [Page.VIEWER_CS_HUB]: 'csHub',
    [Page.VIEWER_FINANCING]: 'financing',
    [Page.VIEWER_ACCOUNTS]: 'accounts',
    [Page.VIEWER_TASKS]: 'tasks',
    [Page.VIEWER_DIRECTORY]: 'directory',
};

const ViewerPortal: React.FC<ViewerPortalProps> = ({ activePage }) => {
    const [data, setData] = useState({
        csHubRecords: [] as CustomerRecord[],
        accounts: [] as Account[],
        tasks: [] as Task[],
        contacts: [] as Contact[],
        financingRecords: [] as FinancingRecord[],
    });
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const [
                csHubRecords,
                accounts,
                tasks,
                contacts,
                financingRecords
            ] = await Promise.all([
                api.getAllRecords(),
                api.getAccounts(),
                api.getTasks(),
                api.getDirectory(),
                api.getFinancingLedger()
            ]);
            setData({ csHubRecords, accounts, tasks, contacts, financingRecords });
        } catch (err) {
            const message = err instanceof Error ? err.message : "An unknown error occurred while fetching data.";
            setError(message);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    if (isLoading) {
        return (
            <div className="bg-background min-h-[70vh] flex flex-col justify-center items-center">
                <Spinner size="lg" />
                <p className="mt-4 text-on-surface-secondary text-lg">Loading Viewer Data...</p>
            </div>
        );
    }

    if (error) {
        return (
             <div className="bg-background min-h-[70vh] flex flex-col justify-center items-center p-4">
                <div className="text-center p-8 bg-surface rounded-lg shadow-md">
                    <h2 className="text-xl font-bold text-red-600 mb-2">Failed to Load Data</h2>
                    <p className="text-on-surface-secondary">{error}</p>
                    <button onClick={fetchData} className="mt-6 px-5 py-2.5 bg-primary text-white rounded-lg hover:bg-primary-hover font-semibold">
                        Try Again
                    </button>
                </div>
            </div>
        );
    }
    
    const initialView = pageToViewMap[activePage] || 'csHub';

    return <ViewerDashboard data={data} initialView={initialView} />;
};

export default ViewerPortal;
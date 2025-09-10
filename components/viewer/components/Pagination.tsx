import React from 'react';

interface PaginationProps {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
}

const Pagination: React.FC<PaginationProps> = ({ currentPage, totalPages, onPageChange }) => {
    
    const pageNumbers = [];
    if (totalPages <= 7) {
        for (let i = 1; i <= totalPages; i++) pageNumbers.push(i);
    } else {
        pageNumbers.push(1);
        if (currentPage > 3) pageNumbers.push('...');
        if (currentPage > 2) pageNumbers.push(currentPage - 1);
        if (currentPage !== 1 && currentPage !== totalPages) pageNumbers.push(currentPage);
        if (currentPage < totalPages - 1) pageNumbers.push(currentPage + 1);
        if (currentPage < totalPages - 2) pageNumbers.push('...');
        pageNumbers.push(totalPages);
    }
    
    const uniquePageNumbers = [...new Set(pageNumbers)];

    return (
        <nav className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 border-t border-border-color" aria-label="Table navigation">
            <span className="text-sm font-normal text-on-surface-secondary">
                Page <span className="font-semibold text-on-surface">{currentPage}</span> of <span className="font-semibold text-on-surface">{totalPages}</span>
            </span>
            <ul className="inline-flex items-center -space-x-px">
                <li>
                    <button onClick={() => onPageChange(currentPage - 1)} disabled={currentPage === 1} className="px-3 py-2 ml-0 leading-tight text-on-surface-secondary bg-white border border-border-color rounded-l-lg hover:bg-gray-100 disabled:bg-gray-50">
                        Previous
                    </button>
                </li>
                {uniquePageNumbers.map((page, index) => (
                    <li key={index}>
                         {typeof page === 'string' ? (
                             <span className="px-3 py-2 leading-tight text-on-surface-secondary bg-white border border-border-color">...</span>
                         ) : (
                             <button onClick={() => onPageChange(page)} className={`px-3 py-2 leading-tight border border-border-color ${currentPage === page ? 'text-white bg-primary' : 'text-on-surface-secondary bg-white hover:bg-gray-100'}`}>
                                 {page}
                             </button>
                         )}
                    </li>
                ))}
                <li>
                    <button onClick={() => onPageChange(currentPage + 1)} disabled={currentPage === totalPages} className="px-3 py-2 leading-tight text-on-surface-secondary bg-white border border-border-color rounded-r-lg hover:bg-gray-100 disabled:bg-gray-50">
                        Next
                    </button>
                </li>
            </ul>
        </nav>
    );
};

export default Pagination;
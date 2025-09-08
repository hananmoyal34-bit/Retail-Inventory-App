import React, { useState, useEffect } from 'react';
import type { CustomerRecord, FileForUpload, FormState } from '../types';
import Spinner from './Spinner';
import Tooltip from './Tooltip';

interface RecordModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (formData: FormState, files: FileForUpload[]) => void;
    record: CustomerRecord | null;
}

const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = error => reject(error);
    });
};

// --- Child Components moved outside of RecordModal to prevent re-rendering on state change ---

interface InputFieldProps {
    name: keyof FormState;
    label: string;
    value: string | number;
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
    tooltip?: string;
    type?: string;
    required?: boolean;
}

const InputField: React.FC<InputFieldProps> = ({ name, label, value, onChange, tooltip, type = 'text', required = false }) => (
    <div>
        <label htmlFor={name} className="block mb-2 text-sm font-medium text-on-surface-secondary">
            <Tooltip text={tooltip || label}>{label}</Tooltip>
        </label>
        <input type={type} id={name} name={name} value={value || ''} onChange={onChange} required={required} className="bg-gray-50 border border-border-color text-on-surface text-sm rounded-lg focus:ring-primary focus:border-primary block w-full p-2.5" />
    </div>
);

interface FileInputFieldProps {
    name: keyof FormState;
    label: string;
    currentFileUrl?: string;
    onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const FileInputField: React.FC<FileInputFieldProps> = ({ name, label, currentFileUrl, onFileChange }) => (
    <div>
        <label htmlFor={name} className="block mb-2 text-sm font-medium text-on-surface-secondary">{label}</label>
        {currentFileUrl && <a href={currentFileUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline mb-2 block truncate">View current file</a>}
        <input type="file" id={name} name={name} onChange={onFileChange} className="block w-full text-sm text-on-surface-secondary file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-white hover:file:bg-primary-hover cursor-pointer"/>
    </div>
);


// --- Main Modal Component ---

const RecordModal: React.FC<RecordModalProps> = ({ isOpen, onClose, onSave, record }) => {
    const [formData, setFormData] = useState<FormState>({
        fullName: '', email: '', phoneNumber: '', formType: 'General Inquiry',
        issueDescription: '', purchaseDate: '', invoiceNumber: '', purchaseAmount: '',
        last4Digits: '', product: '', storeOfPurchase: '', status: 'New', officeNotes: ''
    });
    const [filesToUpload, setFilesToUpload] = useState<File[]>([]);
    const [fileKeys, setFileKeys] = useState<{ [key: string]: string }>({});
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (record) {
            setFormData({
                fullName: `${record['First Name'] || ''} ${record['Last Name'] || ''}`.trim(),
                email: record['Email Address'] || '',
                phoneNumber: record['Phone Number'] || '',
                formType: record['Ticket Category'] || 'General Inquiry',
                issueDescription: record['Ticket Notes'] || '',
                purchaseDate: record['Date of Transaction'] || '',
                invoiceNumber: record['Receipt Number'] || '',
                purchaseAmount: record['Purchase Amount'] || '',
                last4Digits: record['Last 4 Digits of Card'] || '',
                product: record['Product'] || '',
                storeOfPurchase: record['Store Name'] || '',
                status: record.Status || 'New',
                officeNotes: record['Office Notes'] || '',
                receipt: record['Receipt File'] || '',
                file1: record['File 1'] || '',
                file2: record['File 2'] || '',
                file3: record['File 3'] || '',
                file4: record['File 4'] || '',
            });
        } else {
             setFormData({
                fullName: '', email: '', phoneNumber: '', formType: 'General Inquiry',
                issueDescription: '', purchaseDate: '', invoiceNumber: '', purchaseAmount: '',
                last4Digits: '', product: '', storeOfPurchase: '', status: 'New', officeNotes: ''
            });
        }
    }, [record]);
    
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name as keyof FormState]: value }));
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, files } = e.target;
        if (files && files[0]) {
            const file = files[0];
            setFilesToUpload(prev => [...prev.filter(f => fileKeys[f.name] !== name), file]);
            setFileKeys(prev => ({ ...prev, [file.name]: name }));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        const uploadedFiles: FileForUpload[] = await Promise.all(
            filesToUpload.map(async (file) => {
                const base64Data = await fileToBase64(file);
                return {
                    key: fileKeys[file.name],
                    filename: file.name,
                    mimeType: file.type,
                    data: base64Data
                };
            })
        );
        onSave(formData, uploadedFiles);
        setIsSaving(false);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 p-4">
            <div className="bg-surface rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
                <div className="sticky top-0 bg-surface p-6 border-b border-border-color z-10">
                    <h3 className="text-xl font-semibold text-on-surface">{record ? `Edit Ticket ${record.TicketID}` : 'Create New Record'}</h3>
                </div>
                <form onSubmit={handleSubmit} className="p-6 overflow-y-auto">
                    <div className="grid gap-6 mb-6 grid-cols-1 md:grid-cols-2">
                        <InputField name="fullName" label="Full Name" required value={formData.fullName} onChange={handleChange} />
                        <InputField name="email" label="Email Address" type="email" required value={formData.email} onChange={handleChange} />
                        <InputField name="phoneNumber" label="Phone Number" value={formData.phoneNumber} onChange={handleChange}/>
                        <div>
                             <label htmlFor="formType" className="block mb-2 text-sm font-medium text-on-surface-secondary">Ticket Category</label>
                             <select id="formType" name="formType" value={formData.formType} onChange={handleChange} className="bg-gray-50 border border-border-color text-on-surface text-sm rounded-lg focus:ring-primary focus:border-primary block w-full p-2.5">
                                <option>General Inquiry</option>
                                <option>Product Issue</option>
                                <option>Billing Question</option>
                                <option>Return Request</option>
                             </select>
                        </div>
                        <div className="md:col-span-2">
                            <label htmlFor="issueDescription" className="block mb-2 text-sm font-medium text-on-surface-secondary">Ticket Notes / Issue Description</label>
                            <textarea id="issueDescription" name="issueDescription" rows={4} value={formData.issueDescription} onChange={handleChange} className="bg-gray-50 border border-border-color text-on-surface text-sm rounded-lg focus:ring-primary focus:border-primary block w-full p-2.5"></textarea>
                        </div>
                    </div>
                    
                    <h4 className="text-lg font-semibold text-on-surface mb-4 border-t border-border-color pt-4">Transaction Details</h4>
                    <div className="grid gap-6 mb-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
                        <InputField name="purchaseDate" label="Date of Transaction" type="date" value={formData.purchaseDate} onChange={handleChange}/>
                        <InputField name="invoiceNumber" label="Receipt/Invoice Number" value={formData.invoiceNumber} onChange={handleChange} />
                        <InputField name="purchaseAmount" label="Purchase Amount" value={formData.purchaseAmount} onChange={handleChange} />
                        <InputField name="last4Digits" label="Last 4 Digits of Card" tooltip="For transaction verification purposes only." value={formData.last4Digits} onChange={handleChange}/>
                        <InputField name="product" label="Product" value={formData.product} onChange={handleChange}/>
                        <InputField name="storeOfPurchase" label="Store of Purchase" value={formData.storeOfPurchase} onChange={handleChange}/>
                    </div>
                    
                    <h4 className="text-lg font-semibold text-on-surface mb-4 border-t border-border-color pt-4">Internal Fields</h4>
                    <div className="grid gap-6 mb-6 grid-cols-1 md:grid-cols-2">
                         <div>
                             <label htmlFor="status" className="block mb-2 text-sm font-medium text-on-surface-secondary">Status</label>
                             <select id="status" name="status" value={formData.status} onChange={handleChange} className="bg-gray-50 border border-border-color text-on-surface text-sm rounded-lg focus:ring-primary focus:border-primary block w-full p-2.5">
                                <option>New</option>
                                <option>In Progress</option>
                                <option>Resolved</option>
                                <option>Closed</option>
                             </select>
                        </div>
                        <div className="md:col-span-2">
                             <label htmlFor="officeNotes" className="block mb-2 text-sm font-medium text-on-surface-secondary">
                                <Tooltip text="Internal notes not visible to the customer.">Office Notes</Tooltip>
                             </label>
                            <textarea id="officeNotes" name="officeNotes" rows={3} value={formData.officeNotes} onChange={handleChange} className="bg-gray-50 border border-border-color text-on-surface text-sm rounded-lg focus:ring-primary focus:border-primary block w-full p-2.5"></textarea>
                        </div>
                    </div>

                    <h4 className="text-lg font-semibold text-on-surface mb-4 border-t border-border-color pt-4">File Attachments</h4>
                    <div className="grid gap-6 mb-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                        <FileInputField name="receipt" label="Receipt File" currentFileUrl={formData.receipt} onFileChange={handleFileChange}/>
                        <FileInputField name="file1" label="File 1" currentFileUrl={formData.file1} onFileChange={handleFileChange}/>
                        <FileInputField name="file2" label="File 2" currentFileUrl={formData.file2} onFileChange={handleFileChange}/>
                        <FileInputField name="file3" label="File 3" currentFileUrl={formData.file3} onFileChange={handleFileChange}/>
                        <FileInputField name="file4" label="File 4" currentFileUrl={formData.file4} onFileChange={handleFileChange}/>
                    </div>
                </form>
                <div className="flex items-center justify-end p-4 border-t border-border-color sticky bottom-0 bg-gray-50 rounded-b-lg">
                    <button type="button" onClick={onClose} className="text-on-surface bg-transparent hover:bg-gray-200 font-medium rounded-lg text-sm px-5 py-2.5 text-center mr-2">Cancel</button>
                    <button type="submit" disabled={isSaving} onClick={handleSubmit} className="text-white bg-primary hover:bg-primary-hover focus:ring-4 focus:outline-none focus:ring-indigo-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center">
                        {isSaving ? <><Spinner size="sm" /> Saving...</> : 'Save'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default RecordModal;
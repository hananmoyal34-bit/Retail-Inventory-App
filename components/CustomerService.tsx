import React, { useState, useEffect } from 'react';
import { Product } from '../types';
import { getProducts } from '../services/dataService';
import { SearchIcon } from './icons';

type View = 'main' | 'productSupport' | 'salesInquiry' | 'warrantyRegistration' | 'general' | 'requestCallback' | 'shippingInquiry';
type ProductSupportSubView = 'select' | 'form';

// --- Reusable UI Components ---

const BackButton: React.FC<{ onClick: () => void; className?: string }> = ({ onClick, className = '' }) => (
    <button onClick={onClick} className={`text-indigo-600 hover:text-indigo-800 font-medium mb-6 ${className}`}>
        &larr; Back
    </button>
);

const FormWrapper: React.FC<{ title: string; intro?: string; children: React.ReactNode }> = ({ title, intro, children }) => (
    <div className="bg-white p-6 sm:p-8 rounded-lg shadow-md max-w-3xl mx-auto">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">{title}</h2>
        {intro && <p className="text-gray-600 mb-6">{intro}</p>}
        {children}
    </div>
);

const ServiceCard: React.FC<{ title: string; description: string; onClick: () => void; }> = ({ title, description, onClick }) => (
    <button
        onClick={onClick}
        className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg hover:-translate-y-1 transition-all text-left w-full h-full flex flex-col justify-between border border-gray-200"
    >
        <div>
            <h3 className="text-xl font-semibold text-indigo-700">{title}</h3>
            <p className="mt-2 text-gray-600">{description}</p>
        </div>
        <div className="mt-4 text-sm font-medium text-indigo-600">
            Proceed &rarr;
        </div>
    </button>
);

const SuccessMessage: React.FC<{ message: string, onReset: () => void }> = ({ message, onReset }) => (
    <div className="text-center p-8 bg-green-50 rounded-lg border border-green-200">
        <h3 className="text-2xl font-bold text-green-800">Thank You!</h3>
        <p className="mt-2 text-green-700">{message}</p>
        <button onClick={onReset} className="mt-6 bg-green-600 text-white px-6 py-2 rounded-md hover:bg-green-700">
            Submit Another Request
        </button>
    </div>
);

// --- Form Components ---

const ProductSupportForm: React.FC<{ products: Product[]; onBack: () => void; onSubmission: (msg: string) => void }> = ({ products, onBack, onSubmission }) => {
    const [subView, setSubView] = useState<ProductSupportSubView>('select');
    const [showNoInvoice, setShowNoInvoice] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmission("Your support ticket has been submitted successfully. Our team will review the details and get back to you soon.");
    };

    if (subView === 'select') {
        return (
            <FormWrapper title="Product Support & Warranty">
                 <BackButton onClick={onBack} />
                 <div className="space-y-4">
                     <button onClick={() => setSubView('form')} className="w-full text-left p-4 border rounded-md hover:bg-gray-50 transition-colors">
                        <p className="font-semibold text-gray-800">My product is damaged or not working.</p>
                        <p className="text-sm text-gray-600">Proceed to file a report for a defective or damaged item.</p>
                     </button>
                      <button onClick={onBack} className="w-full text-left p-4 border rounded-md hover:bg-gray-50 transition-colors">
                        <p className="font-semibold text-gray-800">I need help with something else related to my product.</p>
                         <p className="text-sm text-gray-600">Please use the 'General Questions' form for other inquiries.</p>
                     </button>
                 </div>
            </FormWrapper>
        )
    }

    return (
        <FormWrapper 
            title="Product Issue Report" 
            intro="We're sorry you're experiencing an issue. Please provide the details below, and our team will get back to you shortly. To speed up the process, please be as detailed as possible."
        >
            <BackButton onClick={() => setSubView('select')} />
            <form onSubmit={handleSubmit} className="space-y-8">
                <fieldset className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <legend className="text-lg font-semibold text-gray-700 mb-2 col-span-full">Part 1: Your Information</legend>
                    <div><label className="block text-sm font-medium text-gray-700">Full Name</label><input type="text" required className="mt-1 block w-full p-2 border border-gray-300 rounded-md" /></div>
                    <div><label className="block text-sm font-medium text-gray-700">Email Address</label><input type="email" required className="mt-1 block w-full p-2 border border-gray-300 rounded-md" /></div>
                </fieldset>
                
                <fieldset className="space-y-4">
                    <legend className="text-lg font-semibold text-gray-700 mb-2">Part 2: Purchase Details</legend>
                     <div><label className="block text-sm font-medium text-gray-700">Order / Invoice Number</label><input type="text" className="mt-1 block w-full p-2 border border-gray-300 rounded-md" /></div>
                    <button type="button" onClick={() => setShowNoInvoice(!showNoInvoice)} className="text-sm text-indigo-600 hover:underline">Don't have your invoice number?</button>
                    {showNoInvoice && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 border rounded-md bg-gray-50">
                            <div><label className="block text-sm font-medium text-gray-700">Last 4 Digits of Card Used</label><input type="text" pattern="\d{4}" title="Four digits" className="mt-1 block w-full p-2 border border-gray-300 rounded-md" /></div>
                            <div><label className="block text-sm font-medium text-gray-700">Approximate Purchase Amount</label><input type="number" step="0.01" className="mt-1 block w-full p-2 border border-gray-300 rounded-md" /></div>
                            <div><label className="block text-sm font-medium text-gray-700">Date of Purchase</label><input type="date" className="mt-1 block w-full p-2 border border-gray-300 rounded-md" /></div>
                             <div><label className="block text-sm font-medium text-gray-700">Store of Purchase</label><input type="text" placeholder="e.g., OurWebsite.com, Amazon" className="mt-1 block w-full p-2 border border-gray-300 rounded-md" /></div>
                        </div>
                    )}
                </fieldset>
                
                <fieldset className="space-y-4">
                    <legend className="text-lg font-semibold text-gray-700 mb-2">Part 3: Issue Details</legend>
                     <div>
                        <label className="block text-sm font-medium text-gray-700">Which product are you having an issue with?</label>
                        <select required className="mt-1 block w-full p-2 border border-gray-300 rounded-md">
                            <option value="">Select a product</option>
                            {products.map(p => <option key={p.productID} value={p.productName}>{p.productName}</option>)}
                            <option value="other">Other (Please specify)</option>
                        </select>
                    </div>
                     <div><label className="block text-sm font-medium text-gray-700">Please describe the issue in detail.</label><textarea required rows={5} className="mt-1 block w-full p-2 border border-gray-300 rounded-md"></textarea></div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Upload Photos of the Damage</label>
                        <input type="file" multiple accept="image/*" className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"/>
                        <p className="text-xs text-gray-500 mt-1">Please upload up to 4 clear photos showing the issue. Include one photo of the entire product and others showing the damage up close.</p>
                    </div>
                </fieldset>

                <div className="bg-gray-100 p-4 rounded-md text-sm text-gray-600">
                    <p><b>Please note:</b> Replacements are subject to our warranty and return policies. In some cases, a processing or restocking fee may apply for out-of-warranty or non-defective items. Our team will confirm all details and any potential costs with you before proceeding.</p>
                </div>
                
                <button type="submit" className="w-full bg-indigo-600 text-white py-3 rounded-md font-semibold hover:bg-indigo-700">Submit Support Ticket</button>
            </form>
        </FormWrapper>
    );
};

const SalesInquiryInfo: React.FC<{ onBack: () => void; }> = ({ onBack }) => (
    <FormWrapper title="How can I reach the salesperson to purchase more products?">
        <BackButton onClick={onBack} />
        <div className="prose max-w-none text-gray-600">
            <p>For all new orders, inquiries about bulk pricing, or questions about our product line, our dedicated sales team is here to help.</p>
            <div className="mt-6 p-4 border rounded-lg bg-gray-50">
                <h3 className="text-lg font-semibold text-gray-800">Sales Department Contact</h3>
                <p className="mt-2"><strong>Email:</strong> <a href="mailto:sales@invsys.com" className="text-indigo-600 underline">sales@invsys.com</a></p>
                <p><strong>Phone:</strong> <a href="tel:+18005557253" className="text-indigo-600 underline">1-800-555-SALE (7253)</a></p>
            </div>
            <div className="mt-4">
                <p className="font-semibold">Business Hours:</p>
                <p>Monday - Friday, 9:00 AM - 5:00 PM (PST)</p>
            </div>
        </div>
    </FormWrapper>
);

const WarrantyRegistrationForm: React.FC<{ products: Product[]; onBack: () => void; onSubmission: (msg: string) => void }> = ({ products, onBack, onSubmission }) => {
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmission("Your warranty has been successfully registered. Thank you for choosing our products!");
    };
    
    return (
        <FormWrapper title="Register Your Product Warranty">
            <BackButton onClick={onBack} />
            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                     <div><label className="block text-sm font-medium text-gray-700">Full Name</label><input type="text" required className="mt-1 block w-full p-2 border border-gray-300 rounded-md" /></div>
                    <div><label className="block text-sm font-medium text-gray-700">Email Address</label><input type="email" required className="mt-1 block w-full p-2 border border-gray-300 rounded-md" /></div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Product Purchased</label>
                        <select required className="mt-1 block w-full p-2 border border-gray-300 rounded-md">
                            <option value="">Select a product</option>
                            {products.map(p => <option key={p.productID} value={p.productName}>{p.productName}</option>)}
                        </select>
                    </div>
                    <div><label className="block text-sm font-medium text-gray-700">Date of Purchase</label><input type="date" required className="mt-1 block w-full p-2 border border-gray-300 rounded-md" /></div>
                    <div className="md:col-span-2"><label className="block text-sm font-medium text-gray-700">Store of Purchase</label><input type="text" required placeholder="e.g., OurWebsite.com, Amazon" className="mt-1 block w-full p-2 border border-gray-300 rounded-md" /></div>
                    <div className="md:col-span-2"><label className="block text-sm font-medium text-gray-700">Order / Invoice Number</label><input type="text" required className="mt-1 block w-full p-2 border border-gray-300 rounded-md" /></div>
                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700">Upload Receipt</label>
                        <input type="file" accept="image/*,.pdf" className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"/>
                        <p className="text-xs text-gray-500 mt-1">A clear photo or PDF of your receipt is required. If you do not have a receipt, please contact our support team directly through the 'General Questions' form.</p>
                    </div>
                </div>
                <button type="submit" className="w-full bg-indigo-600 text-white py-3 rounded-md font-semibold hover:bg-indigo-700">Register My Warranty</button>
            </form>
        </FormWrapper>
    );
};

const GeneralQuestionsForm: React.FC<{ onBack: () => void; onSubmission: (msg: string) => void }> = ({ onBack, onSubmission }) => {
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmission("Your message has been sent. We'll get back to you as soon as possible.");
    };
    return (
         <FormWrapper title="Contact Us">
             <BackButton onClick={onBack} />
             <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div><label className="block text-sm font-medium text-gray-700">Full Name</label><input type="text" required className="mt-1 block w-full p-2 border border-gray-300 rounded-md" /></div>
                    <div><label className="block text-sm font-medium text-gray-700">Email Address</label><input type="email" required className="mt-1 block w-full p-2 border border-gray-300 rounded-md" /></div>
                </div>
                 <div>
                    <label className="block text-sm font-medium text-gray-700">Subject</label>
                    <select required className="mt-1 block w-full p-2 border border-gray-300 rounded-md">
                        <option value="">Select a subject</option>
                        <option>Question about a product</option>
                        <option>Feedback</option>
                        <option>Media/Partnership Inquiry</option>
                        <option>Other</option>
                    </select>
                </div>
                <div><label className="block text-sm font-medium text-gray-700">Your Message</label><textarea required rows={6} className="mt-1 block w-full p-2 border border-gray-300 rounded-md"></textarea></div>
                <button type="submit" className="w-full bg-indigo-600 text-white py-3 rounded-md font-semibold hover:bg-indigo-700">Send Message</button>
             </form>
        </FormWrapper>
    );
};

const RequestCallbackForm: React.FC<{ onBack: () => void; onSubmission: (msg: string) => void }> = ({ onBack, onSubmission }) => {
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmission("Your callback request has been received. Our team will contact you shortly.");
    };
    return (
         <FormWrapper title="Request a Callback">
             <BackButton onClick={onBack} />
             <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div><label className="block text-sm font-medium text-gray-700">Full Name</label><input type="text" required className="mt-1 block w-full p-2 border border-gray-300 rounded-md" /></div>
                    <div><label className="block text-sm font-medium text-gray-700">Phone Number</label><input type="tel" required placeholder="(555) 555-5555" className="mt-1 block w-full p-2 border border-gray-300 rounded-md" /></div>
                </div>
                 <div>
                    <label className="block text-sm font-medium text-gray-700">Best Time to Call</label>
                    <select required className="mt-1 block w-full p-2 border border-gray-300 rounded-md">
                        <option>Anytime</option>
                        <option>Morning (9am - 12pm)</option>
                        <option>Afternoon (12pm - 5pm)</option>
                    </select>
                </div>
                <div><label className="block text-sm font-medium text-gray-700">Reason for Call (optional)</label><textarea rows={4} className="mt-1 block w-full p-2 border border-gray-300 rounded-md"></textarea></div>
                <button type="submit" className="w-full bg-indigo-600 text-white py-3 rounded-md font-semibold hover:bg-indigo-700">Submit Request</button>
             </form>
        </FormWrapper>
    );
};

const ShippingInquiryForm: React.FC<{ onBack: () => void; onSubmission: (msg: string) => void }> = ({ onBack, onSubmission }) => {
    const [subject, setSubject] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmission("Your shipping inquiry has been submitted. We'll review it and get back to you shortly.");
    };

    return (
        <FormWrapper 
            title="Shipping & Order Inquiries"
            intro="Please provide your order details below so we can assist you with your shipping questions."
        >
            <BackButton onClick={onBack} />
            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div><label className="block text-sm font-medium text-gray-700">Full Name</label><input type="text" required className="mt-1 block w-full p-2 border border-gray-300 rounded-md" /></div>
                    <div><label className="block text-sm font-medium text-gray-700">Email Address</label><input type="email" required className="mt-1 block w-full p-2 border border-gray-300 rounded-md" /></div>
                </div>
                 <div>
                    <label className="block text-sm font-medium text-gray-700">Order / Invoice Number</label>
                    <input type="text" required placeholder="Located on your confirmation email" className="mt-1 block w-full p-2 border border-gray-300 rounded-md" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Subject</label>
                    <select value={subject} onChange={(e) => setSubject(e.target.value)} required className="mt-1 block w-full p-2 border border-gray-300 rounded-md">
                        <option value="">Please select a reason</option>
                        <option>Where is my order?</option>
                        <option>My order arrived damaged</option>
                        <option>I received the wrong item(s)</option>
                        <option>Question about shipping policy</option>
                        <option>Other</option>
                    </select>
                </div>

                {subject === 'My order arrived damaged' && (
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Upload Photos of the Damage</label>
                        <input type="file" multiple accept="image/*" className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"/>
                        <p className="text-xs text-gray-500 mt-1">Please provide photos of the damaged item and the shipping box.</p>
                    </div>
                )}
                
                <div>
                    <label className="block text-sm font-medium text-gray-700">Message</label>
                    <textarea required rows={6} className="mt-1 block w-full p-2 border border-gray-300 rounded-md" placeholder="Please provide any additional details that might help us resolve your issue."></textarea>
                </div>
                <button type="submit" className="w-full bg-indigo-600 text-white py-3 rounded-md font-semibold hover:bg-indigo-700">Submit Inquiry</button>
            </form>
        </FormWrapper>
    );
};


// --- Main Customer Service Page Component ---

const CustomerService: React.FC = () => {
  const [view, setView] = useState<View>('main');
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [submissionMessage, setSubmissionMessage] = useState<string | null>(null);

  useEffect(() => {
    const fetchProductsData = async () => {
        try {
            const data = await getProducts();
            setProducts(data);
        } catch (error) {
            console.error("Failed to fetch products for customer service:", error);
        } finally {
            setLoading(false);
        }
    };
    fetchProductsData();
  }, []);

  const handleSubmission = (message: string) => {
      setSubmissionMessage(message);
      setView('main'); // Go back to main view to show the success message
  };

  const resetView = () => {
      setSubmissionMessage(null);
      setView('main');
  }

  const renderContent = () => {
    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
            </div>
        );
    }
    
    if (submissionMessage) {
        return <SuccessMessage message={submissionMessage} onReset={resetView} />
    }

    switch(view) {
        case 'productSupport':
            return <ProductSupportForm products={products} onBack={() => setView('main')} onSubmission={handleSubmission} />;
        case 'shippingInquiry':
            return <ShippingInquiryForm onBack={() => setView('main')} onSubmission={handleSubmission} />;
        case 'salesInquiry':
            return <SalesInquiryInfo onBack={() => setView('main')} />;
        case 'warrantyRegistration':
            return <WarrantyRegistrationForm products={products} onBack={() => setView('main')} onSubmission={handleSubmission} />;
        case 'general':
            return <GeneralQuestionsForm onBack={() => setView('main')} onSubmission={handleSubmission} />;
        case 'requestCallback':
            return <RequestCallbackForm onBack={() => setView('main')} onSubmission={handleSubmission} />;
        case 'main':
        default:
            return (
                <div className="space-y-8">
                    <div className="text-center">
                        <h2 className="text-3xl md:text-4xl font-bold text-gray-900">How can we help you today?</h2>
                        <p className="mt-2 text-lg text-gray-600">Please select the option that best matches your needs so we can assist you quickly.</p>
                    </div>
                    
                    <div className="max-w-xl mx-auto">
                        <div className="relative">
                            <input 
                                type="search" 
                                placeholder="Search our Help Center (e.g., 'warranty policy', 'order tracking')"
                                className="w-full p-4 pl-12 border border-gray-300 rounded-full focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                aria-label="Search help center"
                            />
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                <SearchIcon className="text-gray-400" />
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
                        <ServiceCard title="Product Support & Warranty" description="For issues with a damaged product or to file a warranty claim." onClick={() => setView('productSupport')} />
                        <ServiceCard title="Shipping & Order Inquiries" description="Track your order, report a shipping issue, or ask about delivery." onClick={() => setView('shippingInquiry')} />
                        <ServiceCard title="Request a Callback" description="Leave your number and we'll call you back as soon as possible." onClick={() => setView('requestCallback')} />
                        <ServiceCard title="Purchase More Products" description="Contact our sales team to place new orders or inquire about bulk purchases." onClick={() => setView('salesInquiry')} />
                        <ServiceCard title="Warranty Registration" description="Register your new product to activate your warranty." onClick={() => setView('warrantyRegistration')} />
                        <ServiceCard title="General Questions" description="For all other questions, partnership inquiries, or feedback." onClick={() => setView('general')} />
                    </div>
                </div>
            );
    }
  };

  return <div>{renderContent()}</div>;
};

export default CustomerService;
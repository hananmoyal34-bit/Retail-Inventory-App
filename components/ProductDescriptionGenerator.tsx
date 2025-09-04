
import React, { useState, useCallback } from 'react';
import { generateProductDescription } from '../services/geminiService';
import Modal from './Modal';
import { SparklesIcon } from './icons';

interface Props {
  productName: string;
}

const ProductDescriptionGenerator: React.FC<Props> = ({ productName }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [description, setDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleGenerate = useCallback(async () => {
    setIsLoading(true);
    setDescription('');
    const result = await generateProductDescription(productName);
    setDescription(result);
    setIsLoading(false);
  }, [productName]);

  const openModal = () => {
    setIsModalOpen(true);
    handleGenerate();
  };
  
  return (
    <>
      <button
        onClick={openModal}
        className="flex items-center text-sm text-indigo-600 hover:text-indigo-800 font-medium"
      >
        <SparklesIcon />
        <span className="ml-1">Generate Description</span>
      </button>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={`AI Description for ${productName}`}>
        {isLoading && (
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            <p className="ml-4 text-gray-600">Generating...</p>
          </div>
        )}
        {!isLoading && description && (
          <div>
            <p className="text-gray-700 bg-gray-100 p-4 rounded-md">{description}</p>
            <div className="mt-4 flex justify-end space-x-2">
                <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300">Close</button>
                <button onClick={handleGenerate} className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700">Regenerate</button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
};

export default ProductDescriptionGenerator;

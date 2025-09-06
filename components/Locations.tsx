import React, { useState, useEffect, useCallback } from 'react';
import { Location } from '../types';
import { getLocations } from '../services/dataService';
import { addLocation, updateLocation, deleteLocation } from '../services/writeService';
import Modal from './Modal';
import { PencilIcon, PlusIcon, DuplicateIcon, TrashIcon } from './icons';

const Locations: React.FC = () => {
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  const [locationName, setLocationName] = useState('');
  const [locationFullName, setLocationFullName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchLocations = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getLocations();
      setLocations(data);
    } catch (err) {
      console.error("Failed to fetch locations", err);
      setError('Failed to fetch locations.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLocations();
  }, [fetchLocations]);

  const openModalForAdd = () => {
    setEditingLocation(null);
    setLocationName('');
    setLocationFullName('');
    setError(null);
    setIsModalOpen(true);
  };

  const openModalForEdit = (location: Location) => {
    setEditingLocation(location);
    setLocationName(location.name);
    setLocationFullName(location.locationFullName);
    setError(null);
    setIsModalOpen(true);
  };
  
  const openModalForDuplicate = (location: Location) => {
    setEditingLocation(null); // This makes it an "add" operation
    setLocationName(`${location.name} (Copy)`);
    setLocationFullName(location.locationFullName);
    setError(null);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingLocation(null);
    setLocationName('');
    setLocationFullName('');
  };

  const handleSave = async () => {
    if (!locationName.trim()) {
      setError('Location name cannot be empty.');
      return;
    }
    setIsSubmitting(true);
    setError(null);
    const result = editingLocation
      ? await updateLocation({ ...editingLocation, name: locationName, locationFullName })
      : await addLocation({ name: locationName, locationFullName });
    setIsSubmitting(false);
    if (result.success) {
      closeModal();
      await fetchLocations();
    } else {
      setError(result.message);
    }
  };

  const handleDelete = async (locationId: string) => {
    if (window.confirm('Are you sure you want to delete this location? This action cannot be undone.')) {
        setIsSubmitting(true);
        const result = await deleteLocation(locationId);
        setIsSubmitting(false);

        if (result.success) {
            await fetchLocations();
        } else {
            alert(`Failed to delete location: ${result.message}`);
        }
    }
  };


  if (loading) {
    return (
      <div className="space-y-6">
        <h2 className="text-3xl font-bold text-gray-900">Manage Locations</h2>
         <div className="flex items-center justify-center min-h-[40vh]">
            <div className="flex flex-col items-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
            <p className="mt-4 text-gray-600">Loading locations...</p>
            </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
            <h2 className="text-3xl font-bold text-gray-900">Manage Locations</h2>
            <p className="mt-1 text-gray-600">View, create, and manage your business locations and addresses.</p>
        </div>
        <button
          onClick={openModalForAdd}
          className="flex items-center justify-center bg-indigo-600 text-white px-4 py-2 rounded-md shadow-sm hover:bg-indigo-700 transition-colors w-full sm:w-auto"
        >
          <PlusIcon className="h-5 w-5 mr-2" />
          Add Location
        </button>
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block bg-white shadow-md rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Full Name / Address</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location ID</th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {locations.map((location) => (
                <tr key={location.id} className="odd:bg-white even:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{location.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{location.locationFullName}</td>
                   <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">{location.id}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-right space-x-2">
                    <button onClick={() => openModalForEdit(location)} className="text-indigo-600 hover:text-indigo-900 p-1 rounded-md hover:bg-indigo-100" disabled={isSubmitting}>
                      <PencilIcon className="h-5 w-5"/>
                    </button>
                     <button onClick={() => openModalForDuplicate(location)} className="text-green-600 hover:text-green-900 p-1 rounded-md hover:bg-green-100" disabled={isSubmitting}>
                      <DuplicateIcon className="h-5 w-5"/>
                    </button>
                    <button onClick={() => handleDelete(location.id)} className="text-red-600 hover:text-red-900 p-1 rounded-md hover:bg-red-100" disabled={isSubmitting}>
                      <TrashIcon className="h-5 w-5"/>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Mobile Card View */}
       <div className="md:hidden space-y-4">
            {locations.map(location => (
                <div key={location.id} className="bg-white rounded-lg shadow-md p-4 space-y-3">
                    <div className="flex justify-between items-start">
                        <h3 className="font-bold text-lg text-gray-800">{location.name}</h3>
                        <div className="flex items-center space-x-1 flex-shrink-0">
                            <button onClick={() => openModalForEdit(location)} className="p-2 text-indigo-600 hover:bg-indigo-100 rounded-full" disabled={isSubmitting}><PencilIcon className="h-5 w-5" /></button>
                            <button onClick={() => openModalForDuplicate(location)} className="p-2 text-green-600 hover:bg-green-100 rounded-full" disabled={isSubmitting}><DuplicateIcon className="h-5 w-5" /></button>
                            <button onClick={() => handleDelete(location.id)} className="p-2 text-red-600 hover:bg-red-100 rounded-full" disabled={isSubmitting}><TrashIcon className="h-5 w-5" /></button>
                        </div>
                    </div>
                    <div className="text-sm text-gray-600 border-t pt-3">
                        <p className="font-medium text-gray-500">Address / Full Name:</p>
                        <p>{location.locationFullName || 'Not specified'}</p>
                        <p className="mt-2 font-medium text-gray-500">ID: <span className="font-mono bg-gray-100 px-1.5 py-0.5 rounded">{location.id}</span></p>
                    </div>
                </div>
            ))}
       </div>

      <Modal isOpen={isModalOpen} onClose={closeModal} title={editingLocation ? 'Edit Location' : 'Add New Location'}>
        <div className="space-y-4">
          <div>
            <label htmlFor="location-name" className="block text-sm font-medium text-gray-700">Location Name (Short)</label>
            <input
              type="text"
              id="location-name"
              value={locationName}
              onChange={(e) => setLocationName(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              placeholder="e.g., Downtown Store"
              disabled={isSubmitting}
            />
          </div>
          <div>
            <label htmlFor="location-full-name" className="block text-sm font-medium text-gray-700">Location Full Name / Address</label>
            <input
              type="text"
              id="location-full-name"
              value={locationFullName}
              onChange={(e) => setLocationFullName(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              placeholder="e.g., 123 Main St, Anytown, USA"
              disabled={isSubmitting}
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex justify-end space-x-2">
            <button onClick={closeModal} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300" disabled={isSubmitting}>
              Cancel
            </button>
            <button onClick={handleSave} className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:bg-indigo-400" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Locations;
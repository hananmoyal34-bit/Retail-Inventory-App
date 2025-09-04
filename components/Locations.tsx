import React, { useState, useEffect, useCallback } from 'react';
import { Location } from '../types';
import { getLocations } from '../services/dataService';
import { addLocation, updateLocation, deleteLocation } from '../services/writeService';
import Modal from './Modal';
import { PencilIcon, TrashIcon, PlusIcon } from './icons';

const Locations: React.FC = () => {
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  const [locationName, setLocationName] = useState('');
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
    setError(null);
    setIsModalOpen(true);
  };

  const openModalForEdit = (location: Location) => {
    setEditingLocation(location);
    setLocationName(location.name);
    setError(null);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingLocation(null);
    setLocationName('');
  };

  const handleSave = async () => {
    if (!locationName.trim()) {
      setError('Location name cannot be empty.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const result = editingLocation
      ? await updateLocation({ ...editingLocation, name: locationName })
      : await addLocation({ name: locationName });

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
        <p>Loading locations...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold text-gray-900">Manage Locations</h2>
        <button
          onClick={openModalForAdd}
          className="flex items-center bg-indigo-600 text-white px-4 py-2 rounded-md shadow-sm hover:bg-indigo-700 transition-colors"
        >
          <PlusIcon className="h-5 w-5 mr-2" />
          Add Location
        </button>
      </div>

      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location ID</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {locations.map((location) => (
                <tr key={location.id} className="odd:bg-white even:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{location.id}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{location.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-right space-x-2">
                    <button onClick={() => openModalForEdit(location)} className="text-indigo-600 hover:text-indigo-900 p-1">
                      <PencilIcon className="h-5 w-5"/>
                    </button>
                    <button onClick={() => handleDelete(location.id)} className="text-red-600 hover:text-red-900 p-1" disabled={isSubmitting}>
                      <TrashIcon className="h-5 w-5"/>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal isOpen={isModalOpen} onClose={closeModal} title={editingLocation ? 'Edit Location' : 'Add New Location'}>
        <div className="space-y-4">
          <div>
            <label htmlFor="location-name" className="block text-sm font-medium text-gray-700">Location Name</label>
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
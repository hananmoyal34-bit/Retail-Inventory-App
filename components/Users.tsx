import React, { useState, useEffect, useCallback } from 'react';
import { User, Location } from '../types';
// FIX: Import getUsers from dataService for consistency
import { getLocations, getUsers } from '../services/dataService';
import { addUser, updateUser, deleteUser } from '../services/writeService';
import LocationTag from './LocationTag';
import Modal from './Modal';
import { PencilIcon, PlusIcon, DuplicateIcon, TrashIcon } from './icons';

const Users: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  const [formState, setFormState] = useState({
    name: '',
    email: '',
    phone: '',
    accessCode: '',
    role: 'Manager' as User['role'],
    location: [] as string[],
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchUsersAndLocations = useCallback(async () => {
    setLoading(true);
    try {
      const [usersData, locationsData] = await Promise.all([
          getUsers(),
          getLocations()
      ]);
      setUsers(usersData);
      setLocations(locationsData);
    } catch (error) {
      console.error("Failed to fetch users or locations", error);
      setError('Failed to fetch user and location data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsersAndLocations();
  }, [fetchUsersAndLocations]);

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormState(prev => ({ ...prev, [name]: value }));
  };

  const handleLocationChange = (locationName: string) => {
    setFormState(prev => {
        const newLocations = prev.location.includes(locationName)
            ? prev.location.filter(l => l !== locationName)
            : [...prev.location, locationName];
        return { ...prev, location: newLocations };
    });
  };

  const openModalForAdd = () => {
    setEditingUser(null);
    setFormState({ name: '', email: '', phone: '', accessCode: '', role: 'Manager', location: [] });
    setError(null);
    setIsModalOpen(true);
  };

  const openModalForEdit = (user: User) => {
    setEditingUser(user);
    setFormState({
      name: user.name,
      email: user.email,
      phone: user.phone,
      accessCode: user.accessCode,
      role: user.role || 'Manager',
      location: user.location.split(',').map(loc => loc.trim()).filter(Boolean),
    });
    setError(null);
    setIsModalOpen(true);
  };
  
  const openModalForDuplicate = (user: User) => {
    setEditingUser(null); // This ensures it's an "add" operation
    setFormState({
      name: `${user.name} (Copy)`,
      email: user.email,
      phone: user.phone,
      accessCode: '', // Access code should be new
      role: user.role || 'Manager',
      location: user.location.split(',').map(loc => loc.trim()).filter(Boolean),
    });
    setError(null);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingUser(null);
  };

  const handleSave = async () => {
    if (!formState.name.trim() || !formState.accessCode.trim()) {
      setError('User name and access code cannot be empty.');
      return;
    }
    setIsSubmitting(true);
    setError(null);
    const dataToSubmit = { ...formState, location: formState.location.join(', ') };
    const result = editingUser
      ? await updateUser({ ...editingUser, ...dataToSubmit })
      : await addUser(dataToSubmit);
    setIsSubmitting(false);
    if (result.success) {
      closeModal();
      await fetchUsersAndLocations();
    } else {
      setError(result.message);
    }
  };

  const handleDelete = async (user: User) => {
    if (window.confirm(`Are you sure you want to delete the user "${user.name}"? This action cannot be undone.`)) {
      setIsSubmitting(true);
      setError(null);
      const result = await deleteUser(user.userID);
      setIsSubmitting(false);
      if (result.success) {
        await fetchUsersAndLocations();
      } else {
        alert(`Failed to delete user: ${result.message}`);
      }
    }
  };
  
  const RoleBadge: React.FC<{ role: string }> = ({ role }) => {
    const styles: { [key: string]: string } = {
        'Admin': 'bg-red-100 text-red-800',
        'Manager': 'bg-blue-100 text-blue-800',
        'Logistics': 'bg-green-100 text-green-800',
        'Accounting': 'bg-purple-100 text-purple-800',
        'Office': 'bg-cyan-100 text-cyan-800',
    };
    const style = styles[role] || 'bg-gray-100 text-gray-800';
    return <span className={`px-2 py-1 text-xs font-semibold rounded-full ${style}`}>{role}</span>;
  };

  if (loading) {
    return (
        <div className="space-y-6">
            <h2 className="text-3xl font-bold text-gray-900">User Management</h2>
            <div className="flex items-center justify-center min-h-[40vh]">
                <div className="flex flex-col items-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
                <p className="mt-4 text-gray-600">Loading users...</p>
                </div>
            </div>
        </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
            <h2 className="text-3xl font-bold text-gray-900">User Management</h2>
            <p className="mt-1 text-gray-600">Add, edit, or remove user accounts and their assigned locations.</p>
        </div>
        <button
          onClick={openModalForAdd}
          className="flex items-center justify-center bg-indigo-600 text-white px-4 py-2 rounded-md shadow-sm hover:bg-indigo-700 transition-colors w-full sm:w-auto"
        >
          <PlusIcon className="h-5 w-5 mr-2" />
          Add User
        </button>
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block bg-white shadow-md rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Access Code</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Assigned Locations</th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {users.map((user) => (
                <tr key={user.userID} className="odd:bg-white even:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{user.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap"><RoleBadge role={user.role} /></td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div>{user.email}</div>
                    <div>{user.phone}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">{user.accessCode}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div className="flex flex-wrap gap-1">
                      {user.location.split(',').map(loc => loc.trim()).filter(Boolean).map(loc => (
                        <LocationTag key={loc} location={loc} />
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-right space-x-2">
                     <button onClick={() => openModalForEdit(user)} className="text-indigo-600 hover:text-indigo-900 p-1 rounded-md hover:bg-indigo-100 disabled:opacity-50" disabled={isSubmitting}>
                      <PencilIcon className="h-5 w-5"/>
                    </button>
                    <button onClick={() => openModalForDuplicate(user)} className="text-green-600 hover:text-green-900 p-1 rounded-md hover:bg-green-100 disabled:opacity-50" disabled={isSubmitting}>
                      <DuplicateIcon className="h-5 w-5"/>
                    </button>
                    <button onClick={() => handleDelete(user)} className="text-red-600 hover:text-red-900 p-1 rounded-md hover:bg-red-100 disabled:opacity-50" disabled={isSubmitting}>
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
        {users.map(user => (
            <div key={user.userID} className="bg-white rounded-lg shadow-md p-4 space-y-3">
                <div className="flex justify-between items-start">
                    <div>
                        <h3 className="font-bold text-lg text-gray-800">{user.name}</h3>
                        <RoleBadge role={user.role} />
                    </div>
                    <div className="flex items-center space-x-1 flex-shrink-0">
                        <button onClick={() => openModalForEdit(user)} className="p-2 text-indigo-600 hover:bg-indigo-100 rounded-full disabled:opacity-50" disabled={isSubmitting}><PencilIcon className="h-5 w-5" /></button>
                        <button onClick={() => openModalForDuplicate(user)} className="p-2 text-green-600 hover:bg-green-100 rounded-full disabled:opacity-50" disabled={isSubmitting}><DuplicateIcon className="h-5 w-5" /></button>
                        <button onClick={() => handleDelete(user)} className="p-2 text-red-600 hover:bg-red-100 rounded-full disabled:opacity-50" disabled={isSubmitting}><TrashIcon className="h-5 w-5" /></button>
                    </div>
                </div>
                <div className="text-sm text-gray-600 border-t pt-3">
                    <p>{user.email}</p>
                    <p>{user.phone}</p>
                    <p className="mt-1">Access Code: <span className="font-mono bg-gray-100 px-1.5 py-0.5 rounded">{user.accessCode}</span></p>
                </div>
                <div>
                    <h4 className="text-sm font-medium text-gray-500 mb-1">Locations</h4>
                    <div className="flex flex-wrap gap-1.5">
                        {user.location.split(',').map(loc => loc.trim()).filter(Boolean).map(loc => (
                            <LocationTag key={loc} location={loc} />
                        ))}
                    </div>
                </div>
            </div>
        ))}
      </div>

      <Modal isOpen={isModalOpen} onClose={closeModal} title={editingUser ? 'Edit User' : 'Add New User'}>
        <div className="space-y-4">
            <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700">Name</label>
                <input type="text" id="name" name="name" value={formState.name} onChange={handleFormChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" required disabled={isSubmitting} />
            </div>
            <div>
                <label htmlFor="role" className="block text-sm font-medium text-gray-700">Role</label>
                <select id="role" name="role" value={formState.role} onChange={handleFormChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" disabled={isSubmitting}>
                    <option>Manager</option>
                    <option value="Logistics">Logistics</option>
                    <option>Office</option>
                    <option>Admin</option>
                </select>
            </div>
            <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email</label>
                <input type="email" id="email" name="email" value={formState.email} onChange={handleFormChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" disabled={isSubmitting} />
            </div>
            <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700">Phone</label>
                <input type="tel" id="phone" name="phone" value={formState.phone} onChange={handleFormChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" disabled={isSubmitting} />
            </div>
            <div>
                <label htmlFor="accessCode" className="block text-sm font-medium text-gray-700">Access Code</label>
                <input type="text" id="accessCode" name="accessCode" value={formState.accessCode} onChange={handleFormChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" required disabled={isSubmitting} />
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700">Assigned Locations</label>
                <div className="mt-2 p-2 border border-gray-300 rounded-md max-h-40 overflow-y-auto space-y-2 bg-gray-50">
                    {locations.length > 0 ? locations.map(loc => (
                        <label key={loc.id} className="flex items-center space-x-3 p-2 rounded-md hover:bg-gray-100 transition-colors cursor-pointer">
                            <input
                                type="checkbox"
                                className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                                checked={formState.location.includes(loc.name)}
                                onChange={() => handleLocationChange(loc.name)}
                                disabled={isSubmitting}
                            />
                            <span className="text-sm text-gray-700">{loc.name}</span>
                        </label>
                    )) : <p className="text-sm text-gray-500 p-2">No locations available to assign.</p>}
                </div>
            </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex justify-end space-x-2 pt-2">
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

export default Users;

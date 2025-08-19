import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit, Trash2, User, Shield, X, Eye, EyeOff } from 'lucide-react';
import apiService from '../services/api';
import { useAuth } from '../contexts/AuthContext';

interface UserData {
  id: string;
  device_serial: string;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  phone: string;
  role_code: string;
  last_login: string;
}

const Users: React.FC = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [editingUser, setEditingUser] = useState<UserData | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  const [newUser, setNewUser] = useState({
    deviceSerial: '',
    email: '',
    username: '',
    password: '',
    firstName: '',
    lastName: '',
    phone: '',
    roleCode: '',
    stationId: '', // <-- add this
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [stations, setStations] = useState<any[]>([]);
  const [showStationModal, setShowStationModal] = useState(false);
  const [stationSearch, setStationSearch] = useState('');

  // Update the fetchUsers function
  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await apiService.getUsers();
      console.log('Fetched users:', response);
      
      // Check if response has data property and it's an array
      if (response.success && Array.isArray(response.data)) {
        setUsers(response.data);
      } else {
        console.error('Invalid response format:', response);
        setUsers([]);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      if (error.message === 'Unauthorized access') {
        window.location.href = '/login';
      }
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchStations = async () => {
    try {
      const response = await apiService.getStations();
      console.log('mzigo wa stations ndo huu hapa:', response);
      // Fix: set stations from response.data.stations
      if (response.success && Array.isArray(response.data?.stations)) {
        setStations(response.data.stations);
      } else {
        setStations([]);
      }
    } catch (error) {
      setStations([]);
    }
  };

  useEffect(() => {
    // Check for token before fetching
    const token = localStorage.getItem('token');
    if (!token) {
      window.location.href = '/login';
      return;
    }
    fetchUsers();
    fetchStations();
  }, []);

  const handleCreateUser = async () => {
    const deviceSerialPattern = /^[0-9]{2}TZ[0-9]{6,}$/;
    if (!deviceSerialPattern.test(newUser.deviceSerial)) {
      alert('Device Serial must be in the format 02TZ followed by at least 6 digits, e.g. 02TZ994528');
      return;
    }

    // Only validate station if not admin
    if (newUser.roleCode !== 'ADMIN' && !newUser.stationId) {
      alert('Station selection is required for non-admin users');
      return;
    }

    try {
      await apiService.createUser({
        ...newUser,
        stationId: newUser.roleCode === 'ADMIN' ? null : newUser.stationId,
      });
      setShowUserModal(false);
      setNewUser({
        deviceSerial: '',
        email: '',
        username: '',
        password: '',
        firstName: '',
        lastName: '',
        phone: '',
        roleCode: '',
        stationId: '',
      });
      fetchUsers();
    } catch (error) {
      console.error('Error creating user:', error);
    }
  };

  const handleUpdateUser = async () => {
    if (!newUser.stationId) {
      alert("Station selection is required.");
      return;
    }

    // Build payload
    const payload = {
      ...newUser,
      stationId: newUser.stationId, // must be a valid station ID
      // Only include password if provided
      ...(newUser.password ? { password: newUser.password } : {}),
    };

    try {
      await apiService.updateUser(editingUser.id, payload);
      setShowUserModal(false);
      setEditingUser(null);
      setNewUser({
        deviceSerial: '',
        email: '',
        username: '',
        password: '',
        firstName: '',
        lastName: '',
        phone: '',
        roleCode: '',
        stationId: '',
      });
      fetchUsers();
    } catch (error) {
      console.error('Error updating user:', error);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      try {
        await apiService.deleteUser(userId);
        fetchUsers();
      } catch (error) {
        console.error('Error deleting user:', error);
      }
    }
  };

  const handleChangePassword = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      alert('New passwords do not match');
      return;
    }

    try {
      await apiService.changePassword(passwordData.currentPassword, passwordData.newPassword);
      setShowPasswordModal(false);
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
      alert('Password changed successfully');
    } catch (error) {
      console.error('Error changing password:', error);
      alert('Error changing password');
    }
  };

  const openEditModal = (user: UserData) => {
    setEditingUser(user);
    setNewUser({
      deviceSerial: user.device_serial || '',
      email: user.email || '',
      username: user.username || '',
      password: '',
      firstName: user.first_name || '',
      lastName: user.last_name || '',
      phone: user.phone || '',
      roleCode: user.role_code || '',
      stationId: user.station_id || '', // if you have station_id in user
    });
    setShowUserModal(true);
  };

  const filteredUsers = users.filter(user =>
    user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.device_serial.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const canManageUsers = currentUser?.permissions?.user_create || currentUser?.role === '';

  const formatDate = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      if (date instanceof Date && !isNaN(date.getTime())) {
        return new Intl.DateTimeFormat('en-GB', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        }).format(date).replace(',', '');
      }
      return 'N/A';
    } catch {
      return 'N/A';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-black">User Management</h1>
        <div className="flex space-x-3">
          <button
            onClick={() => setShowPasswordModal(true)}
            className="bg-black text-white px-4 py-2 rounded-lg hover:bg-gray-800 flex items-center space-x-2"
          >
            <Shield className="w-4 h-4" />
            <span>Change Password</span>
          </button>
        
            <button
              onClick={() => setShowUserModal(true)}
              className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 flex items-center space-x-2"
            >
              <Plus className="w-4 h-4" />
              <span>Add User</span>
            </button>
          
        </div>
      </div>

      {/* Search */}
      <div className="bg-white p-4 rounded-lg shadow-sm">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search users..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
          />
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User Details
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contact Info
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Station
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                        <User className="w-5 h-5 text-red-600" />
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-black">
                          {user.first_name} {user.last_name}
                        </div>
                        <div className="text-xs text-gray-500">
                          {user.device_serial}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{user.email}</div>
                    <div className="text-sm text-gray-500">{user.phone || 'N/A'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      user.role_code === 'ADMIN' ? 'bg-red-100 text-red-800' :
                      user.role_code === 'MANAGER' ? 'bg-blue-100 text-blue-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {user.role_name || user.role_code}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {user.role_code === 'ADMIN' ? 'No Station' : (user.station_name || 'N/A')}
                    </div>
                    <div className="text-xs text-gray-500">
                      {user.role_code === 'ADMIN' ? '-' : (user.station_code || 'N/A')}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <div className="flex justify-end space-x-2">
                      <button
                        onClick={() => openEditModal(user)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteUser(user.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit User Modal */}
      {showUserModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl my-4">
            {/* Sticky Header */}
            <div className="sticky top-0 z-10 bg-white px-6 py-4 border-b rounded-t-xl">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-black">
                  {editingUser ? 'Edit User' : 'Add User'}
                </h2>
                <button
                  onClick={() => setShowUserModal(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Scrollable Content */}
            <div className="px-6 py-4 max-h-[calc(100vh-200px)] overflow-y-auto">
              {/* Form content */}
              <div className="space-y-4">
                {/* Only show these fields when adding a new user */}
                {!editingUser && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-black mb-1">
                        Device Serial
                      </label>
                      <input
                        type="text"
                        value={newUser.deviceSerial}
                        readOnly={!!editingUser}
                        onChange={(e) => setNewUser({ ...newUser, deviceSerial: e.target.value })}
                        placeholder="e.g. 02TZ994528"
                        pattern="^[0-9]{2}TZ[0-9]{6,}$"
                        title="Format: 02TZ followed by at least 6 digits"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-black mb-1">
                        Username
                      </label>
                      <input
                        type="text"
                        value={newUser.username}
                        readOnly={!!editingUser}
                        onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                        placeholder="Enter username"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-black mb-1">
                        Password
                      </label>
                      <input
                        type="password"
                        value={newUser.password}
                        onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                        placeholder="Enter password"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-black mb-1">
                        Role
                      </label>
                      <select
                        value={newUser.roleCode}
                        onChange={async (e) => {
                          const role = e.target.value;
                          setNewUser({ ...newUser, roleCode: role, stationId: '' });
                          if (role === 'MANAGER') {
                            await fetchStations();
                            setStationSearch(''); // clear search
                            setShowStationModal(true);
                          }
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                        required
                      >
                        <option value="">Select role</option>
                        <option value="MANAGER">Manager</option>
                        <option value="ADMIN">Admin</option>
                      </select>
                    </div>
                  </>
                )}

                {/* Always show these fields */}
                <div>
                  <label className="block text-sm font-medium text-black mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={newUser.email}
                    onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                    placeholder="Enter email"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-black mb-1">
                    First Name
                  </label>
                  <input
                    type="text"
                    value={newUser.firstName}
                    onChange={(e) => setNewUser({ ...newUser, firstName: e.target.value })}
                    placeholder="Enter first name"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-black mb-1">
                    Last Name
                  </label>
                  <input
                    type="text"
                    value={newUser.lastName}
                    onChange={(e) => setNewUser({ ...newUser, lastName: e.target.value })}
                    placeholder="Enter last name"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-black mb-1">
                    Phone
                  </label>
                  <input
                    type="text"
                    value={newUser.phone}
                    onChange={(e) => setNewUser({ ...newUser, phone: e.target.value })}
                    placeholder="Enter phone number"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>

                {/* Only show password field when editing an existing user */}
                {editingUser && (
                  <div>
                    <label className="block text-sm font-medium text-black mb-1">
                      Password <span className="text-xs text-gray-400">(leave blank to keep current)</span>
                    </label>
                    <input
                      type="password"
                      value={newUser.password}
                      onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                      placeholder="Enter new password (optional)"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                  </div>
                )}

                {/* Station selection - always show the select field */}
                {newUser.roleCode !== 'ADMIN' && (
                  <div>
                    <label className="block text-sm font-medium text-black mb-1">
                      Station
                    </label>
                    <select
                      name="stationId"
                      value={newUser.stationId || ""}
                      onChange={e => setNewUser({ ...newUser, stationId: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      required={newUser.roleCode !== 'ADMIN'}
                    >
                      <option value="">Select Station</option>
                      {stations.map(station => (
                        <option key={station.id} value={station.id}>
                          {station.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </div>

            {/* Sticky Footer */}
            <div className="sticky bottom-0 z-10 bg-white px-6 py-4 border-t">
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowUserModal(false)}
                  className="px-4 py-3 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  onClick={editingUser ? handleUpdateUser : handleCreateUser}
                  className="px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  {editingUser ? 'Update User' : 'Register User'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Change Password Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-black">Change Password</h2>
              <button
                onClick={() => {
                  setShowPasswordModal(false);
                  setPasswordData({
                    currentPassword: '',
                    newPassword: '',
                    confirmPassword: '',
                  });
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-black mb-1">
                  <span className="text-red-500">*</span> Current Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={passwordData.currentPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                    placeholder="Enter current password"
                    className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-black mb-1">
                  <span className="text-red-500">*</span> New Password
                </label>
                <input
                  type="password"
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                  placeholder="Enter new password"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-black mb-1">
                  <span className="text-red-500">*</span> Confirm New Password
                </label>
                <input
                  type="password"
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                  placeholder="Confirm new password"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  required
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowPasswordModal(false);
                  setPasswordData({
                    currentPassword: '',
                    newPassword: '',
                    confirmPassword: '',
                  });
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg text-black hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleChangePassword}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Change Password
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Select Station Modal */}
      {showStationModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg">
            <h2 className="text-xl font-bold mb-4">Select Station</h2>
            <input
              type="text"
              placeholder="Search stations..."
              value={stationSearch}
              onChange={(e) => setStationSearch(e.target.value)}
              className="w-full px-3 py-2 mb-4 border border-gray-300 rounded-lg"
            />
            <div className="max-h-60 overflow-y-auto">
              {(() => {
                const filtered = stations.filter(station =>
                  station.name?.toLowerCase().includes(stationSearch.toLowerCase()) ||
                  station.code?.toLowerCase().includes(stationSearch.toLowerCase())
                );
                if (filtered.length === 0) {
                  return <div>No stations found.</div>;
                }
                return filtered.map(station => (
                  <div
                    key={station.id}
                    className={`p-2 rounded hover:bg-red-100 cursor-pointer ${newUser.stationId === station.id ? 'bg-red-200' : ''}`}
                    onClick={() => {
                      setNewUser({ ...newUser, stationId: station.id });
                      setShowStationModal(false);
                    }}
                  >
                    <div className="font-semibold">{station.name}</div>
                    {/* Optionally show code below */}
                    {/* <div className="text-xs text-gray-500">{station.code}</div> */}
                  </div>
                ));
              })()}
            </div>
            <div className="flex justify-end mt-4">
              <button
                onClick={() => setShowStationModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-black hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Users;
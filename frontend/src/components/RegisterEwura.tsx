import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit, Trash2, Building, User, Phone, Mail, AlertCircle, CheckCircle } from 'lucide-react';
import apiService from '../services/api';
import { toast } from 'react-hot-toast';

interface EwuraRegistration {
  id: string;
  stationId: string;
  stationName: string;
  stationCode: string;
  ewuraLicenseNo: string;
  taxpayerName: string;
  operatorTin: string;
  operatorVrn: string;
  transactionId: string;
  submittedAt: string;
  status: string;
  responseData: string;
  registrationStatus: 'SUCCESSFULLY_REGISTERED' | 'PENDING' | 'FAILED';
}

interface Manager {
  id: string;
  displayName: string;
  email: string;
  phone: string;
  stationName: string;
  stationCode: string;
}

const RegisterEwura: React.FC = () => {
  const [registrations, setRegistrations] = useState<EwuraRegistration[]>([]);
  const [managers, setManagers] = useState<Manager[]>([]);
  const [loading, setLoading] = useState(true);
  const [showRegistrationModal, setShowRegistrationModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [managerSearch, setManagerSearch] = useState('');
  const [selectedManager, setSelectedManager] = useState<string>('');
  const [fieldsReadOnly, setFieldsReadOnly] = useState(false);
  
  const [registrationData, setRegistrationData] = useState({
    tranId: '1',
    brandName: '',
    receiptCode: '',
    phone: '',
    email: '',
    ewuraLicense: '',
    tin: '',
    vrn: '',
    ward: '',
    region: '',
    district: '',
    stationLocation: '',
    efdSerial: ''
  });

  useEffect(() => {
    fetchRegistrations();
    fetchManagers();
  }, []);

  const fetchRegistrations = async () => {
    try {
      const response = await apiService.getEwuraSubmissionHistory({ type: 'registration' });
      if (!response.error && response.data?.history) {
        const formattedRegistrations = response.data.history.map((reg: any) => ({
          id: reg.id,
          stationId: reg.station_id,
          stationName: reg.station_name,
          stationCode: reg.station_code,
          ewuraLicenseNo: reg.ewura_license_no,
          taxpayerName: reg.taxpayer_name,
          operatorTin: reg.operator_tin,
          operatorVrn: reg.operator_vrn,
          transactionId: reg.transaction_id,
          submittedAt: reg.submitted_at,
          status: reg.status,
          responseData: reg.response_data,
          registrationStatus: reg.response_data?.includes('SUCCESS') ? 'SUCCESSFULLY_REGISTERED' : 
                             reg.response_data?.includes('SIMULATION') ? 'PENDING' : 'FAILED'
        }));
        setRegistrations(formattedRegistrations);
      }
    } catch (error) {
      console.error('Error fetching registrations:', error);
      toast.error('Failed to fetch EWURA registrations');
    } finally {
      setLoading(false);
    }
  };

  const fetchManagers = async () => {
    try {
      const response = await apiService.getManagers();
      if (!response.error && response.data?.managers) {
        setManagers(response.data.managers);
      }
    } catch (error) {
      console.error('Error fetching managers:', error);
      toast.error('Failed to fetch managers');
    }
  };

  const handleManagerSelect = async (managerId: string) => {
    setSelectedManager(managerId);
    if (!managerId) {
      setFieldsReadOnly(false);
      return;
    }

    try {
      const response = await apiService.getEwuraRegistrationData(managerId);
      if (!response.error && response.data?.ewuraData?.autoFilled) {
        const auto = response.data.ewuraData.autoFilled;
        setRegistrationData({
          ...registrationData,
          phone: auto.contactPersonPhone || '',
          email: auto.contactPersonEmailAddress || '',
          brandName: auto.retailStationName || '',
          tin: auto.operatorTin || '',
          vrn: auto.operatorVrn || '',
          ward: auto.wardName || '',
          region: auto.regionName || '',
          district: auto.districtName || '',
          stationLocation: auto.streetName || '',
          ewuraLicense: auto.ewuraLicenseNo || '',
          efdSerial: auto.efdSerialNumber || ''
        });
        setFieldsReadOnly(true);
        toast.success('Manager data auto-filled successfully');
      }
    } catch (error) {
      console.error('Error auto-filling form:', error);
      toast.error('Failed to auto-fill manager data');
    }
  };

  const handleSubmitRegistration = async () => {
    if (!selectedManager) {
      toast.error('Please select a manager');
      return;
    }
    if (!registrationData.receiptCode) {
      toast.error('Please enter the Receipt Code');
      return;
    }

    try {
      const response = await apiService.registerWithManager(selectedManager, {
        tranId: registrationData.tranId,
        brandName: registrationData.brandName,
        receiptCode: registrationData.receiptCode,
      });

      if (!response.error) {
        toast.success('Device registered with EWURA successfully');
        setShowRegistrationModal(false);
        resetForm();
        fetchRegistrations();
      } else {
        toast.error(response.message || 'Failed to register device');
      }
    } catch (error) {
      console.error('Error registering device:', error);
      toast.error('Failed to register device');
    }
  };

  const resetForm = () => {
    setRegistrationData({
      tranId: '1',
      brandName: '',
      receiptCode: '',
      phone: '',
      email: '',
      ewuraLicense: '',
      tin: '',
      vrn: '',
      ward: '',
      region: '',
      district: '',
      stationLocation: '',
      efdSerial: ''
    });
    setSelectedManager('');
    setFieldsReadOnly(false);
    setManagerSearch('');
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'SUCCESSFULLY_REGISTERED':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'PENDING':
        return <AlertCircle className="w-5 h-5 text-yellow-500" />;
      case 'FAILED':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      default:
        return <AlertCircle className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'SUCCESSFULLY_REGISTERED':
        return 'bg-green-100 text-green-800';
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800';
      case 'FAILED':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredRegistrations = registrations.filter(reg =>
    reg.ewuraLicenseNo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    reg.operatorTin?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    reg.stationName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    reg.taxpayerName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
        <div>
          <h1 className="text-2xl font-bold text-gray-900">EWURA Device Registration</h1>
          <p className="text-gray-600">Register and manage devices with EWURA</p>
        </div>
        <button
          onClick={() => setShowRegistrationModal(true)}
          className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 flex items-center space-x-2 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Register Device</span>
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <div className="text-2xl font-bold text-gray-900">{registrations.length}</div>
          <div className="text-sm text-gray-500">Total Registrations</div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <div className="text-2xl font-bold text-green-600">
            {registrations.filter(r => r.registrationStatus === 'SUCCESSFULLY_REGISTERED').length}
          </div>
          <div className="text-sm text-gray-500">Successfully Registered</div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <div className="text-2xl font-bold text-yellow-600">
            {registrations.filter(r => r.registrationStatus === 'PENDING').length}
          </div>
          <div className="text-sm text-gray-500">Pending</div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <div className="text-2xl font-bold text-red-600">
            {registrations.filter(r => r.registrationStatus === 'FAILED').length}
          </div>
          <div className="text-sm text-gray-500">Failed</div>
        </div>
      </div>

      {/* Search and Controls */}
      <div className="bg-white p-4 rounded-lg shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Search className="w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by license, TIN, station name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>
        </div>
      </div>

      {/* Registrations Table */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Station
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  EWURA License
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Operator
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Transaction ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Submitted
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredRegistrations.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                    No EWURA registrations found. Click "Register Device" to add a new registration.
                  </td>
                </tr>
              ) : (
                filteredRegistrations.map((registration) => (
                  <tr key={registration.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Building className="w-8 h-8 text-gray-400 mr-3" />
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {registration.stationName}
                          </div>
                          <div className="text-sm text-gray-500">
                            {registration.stationCode}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {registration.ewuraLicenseNo}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {registration.taxpayerName}
                        </div>
                        <div className="text-sm text-gray-500">
                          TIN: {registration.operatorTin}
                        </div>
                        <div className="text-sm text-gray-500">
                          VRN: {registration.operatorVrn}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {registration.transactionId}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(registration.submittedAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {getStatusIcon(registration.registrationStatus)}
                        <span className={`ml-2 px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(registration.registrationStatus)}`}>
                          {registration.registrationStatus.replace('_', ' ')}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => {
                          // View details functionality
                          console.log('View registration details:', registration);
                        }}
                        className="text-blue-600 hover:text-blue-900 p-1 rounded hover:bg-blue-50"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Registration Modal */}
      {showRegistrationModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl my-4">
            {/* Header */}
            <div className="sticky top-0 bg-gray-50 px-6 py-4 rounded-t-xl border-b z-10">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">Register Device with EWURA</h2>
                <button
                  onClick={() => {
                    setShowRegistrationModal(false);
                    resetForm();
                  }}
                  className="text-gray-400 hover:text-gray-500 focus:outline-none"
                >
                  ×
                </button>
              </div>
            </div>

            {/* Manager Selection */}
            <div className="p-6 pt-4">
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Select Manager <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Search manager..."
                  value={managerSearch}
                  onChange={e => setManagerSearch(e.target.value)}
                  className="w-full px-3 py-2 mb-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                />
                <select
                  value={selectedManager}
                  onChange={(e) => handleManagerSelect(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  required
                >
                  <option value="">Select Manager</option>
                  {managers
                    .filter(m =>
                      m.displayName?.toLowerCase().includes(managerSearch.toLowerCase()) ||
                      m.email?.toLowerCase().includes(managerSearch.toLowerCase())
                    )
                    .map(manager => (
                      <option key={manager.id} value={manager.id}>
                        {manager.displayName} - {manager.stationName}
                      </option>
                    ))}
                </select>
              </div>

              {/* Form Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Transaction ID <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={registrationData.tranId}
                    onChange={(e) => setRegistrationData({ ...registrationData, tranId: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Receipt Code <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={registrationData.receiptCode}
                    onChange={(e) => setRegistrationData({ ...registrationData, receiptCode: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                    placeholder="Enter receipt code"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Brand Name</label>
                  <input
                    type="text"
                    value={registrationData.brandName}
                    readOnly={fieldsReadOnly}
                    onChange={(e) => setRegistrationData({ ...registrationData, brandName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                  <input
                    type="tel"
                    value={registrationData.phone}
                    readOnly={fieldsReadOnly}
                    onChange={(e) => setRegistrationData({ ...registrationData, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                  <input
                    type="email"
                    value={registrationData.email}
                    readOnly={fieldsReadOnly}
                    onChange={(e) => setRegistrationData({ ...registrationData, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">EWURA License</label>
                  <input
                    type="text"
                    value={registrationData.ewuraLicense}
                    readOnly={fieldsReadOnly}
                    onChange={(e) => setRegistrationData({ ...registrationData, ewuraLicense: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">TIN Number</label>
                  <input
                    type="text"
                    value={registrationData.tin}
                    readOnly={fieldsReadOnly}
                    onChange={(e) => setRegistrationData({ ...registrationData, tin: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">VRN</label>
                  <input
                    type="text"
                    value={registrationData.vrn}
                    readOnly={fieldsReadOnly}
                    onChange={(e) => setRegistrationData({ ...registrationData, vrn: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Region</label>
                  <input
                    type="text"
                    value={registrationData.region}
                    readOnly={fieldsReadOnly}
                    onChange={(e) => setRegistrationData({ ...registrationData, region: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">District</label>
                  <input
                    type="text"
                    value={registrationData.district}
                    readOnly={fieldsReadOnly}
                    onChange={(e) => setRegistrationData({ ...registrationData, district: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ward</label>
                  <input
                    type="text"
                    value={registrationData.ward}
                    readOnly={fieldsReadOnly}
                    onChange={(e) => setRegistrationData({ ...registrationData, ward: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Station Location</label>
                  <input
                    type="text"
                    value={registrationData.stationLocation}
                    readOnly={fieldsReadOnly}
                    onChange={(e) => setRegistrationData({ ...registrationData, stationLocation: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 bg-gray-50 px-6 py-4 rounded-b-xl border-t">
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowRegistrationModal(false);
                    resetForm();
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmitRegistration}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700"
                >
                  Register Device
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RegisterEwura;
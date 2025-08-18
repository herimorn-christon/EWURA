import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit, Trash2, Building, User, Phone, Mail } from 'lucide-react';
import apiService from '../services/api';

interface Taxpayer {
  id: string;
  tin: string;
  vrn: string;
  phone: string;
  email: string;
  licence_trns: string;
  status: string;
  stations: Station[];
}

interface Station {
  id: string;
  name: string;
  ward: string;
  district: string;
  region: string;
  zone: string;
  street: string;
  licence: string;
  operator_name: string;
  status: string;
  phone: string;
  email: string;
  brand_name: string;
  efd_serial: string;
  other_efd_serial: string;
  receipt_code: string;
  ewura_license: string;
  password: string;
  station_location: string;
  device_type: 'EFPP' | 'VFD'; // <-- Add device_type field
}

const dummyData = [
  {
    id: '1',
    tin: '100770962',
    vrn: '',
    phone: '0715083666',
    email: 'msawipetrol@gmail.com',
    licence_trns: 'LIC-001',
    status: 'active',
    stations: [{
      id: '1',
      ewura_license: 'PRL-2011-094',
      efd_serial: '02TZ994528',
      brand_name: 'MSAWI PETROL STATI...',
      phone: '0715083666',
      email: 'msawipetrol@gmail.com',
      status: 'active',
      device_type: 'EFPP'
    }]
  },
  {
    id: '2',
    tin: '156238007',
    vrn: '',
    phone: '0652899299',
    email: 'totalenergiesmianzini@gmail.com',
    licence_trns: 'LIC-002',
    status: 'active',
    stations: [{
      id: '2',
      ewura_license: 'PRL-2016-198',
      efd_serial: '02TZ994609',
      brand_name: 'MIANZINI GAPCO SERV...',
      phone: '0652899299',
      email: 'totalenergiesmianzini@gmail.com',
      status: 'active',
      device_type: 'VFD'
    }]
  },
  // Add more dummy data as needed
];

const RegisterEwura: React.FC = () => {
  const [taxpayers, setTaxpayers] = useState<Taxpayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showTaxpayerModal, setShowTaxpayerModal] = useState(false);
  const [showStationModal, setShowStationModal] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  
  const [newTaxpayer, setNewTaxpayer] = useState({
    tin: '',
    vrn: '',
    phone: '',
    email: '',
    licence_trns: '',
  });

  const [newStation, setNewStation] = useState({
    brand_name: '',
    efd_serial: '',
    receipt_code: '',
    ewura_license: '',
    phone: '',
    email: '',
    tin: '',
    ward: '',
    region: '',
    district: '',
    station_location: '',
    vrn: '',
    device_type: 'EFPP',
  });

  const [managers, setManagers] = useState<any[]>([]);
  const [selectedManager, setSelectedManager] = useState<string>('');
  const [fieldsReadOnly, setFieldsReadOnly] = useState(false);

  // Add this state for manager search
  const [managerSearch, setManagerSearch] = useState('');

  useEffect(() => {
    setTaxpayers(dummyData);
    setLoading(false);
  }, []);

  // Fetch managers on mount
  useEffect(() => {
    const fetchManagers = async () => {
      try {
        const res = await apiService.getManagers();
        if (res.success) setManagers(res.data.managers);
      } catch (error) {
        console.error('Error fetching managers:', error);
      }
    };
    fetchManagers();
  }, []);

  const fetchTaxpayers = async () => {
    try {
      const data = await apiService.getTaxpayers();
      setTaxpayers(data);
    } catch (error) {
      console.error('Error fetching taxpayers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTaxpayer = async () => {
    try {
      await apiService.createTaxpayer(newTaxpayer);
      setShowTaxpayerModal(false);
      setNewTaxpayer({
        tin: '',
        vrn: '',
        phone: '',
        email: '',
        licence_trns: '',
      });
      fetchTaxpayers();
    } catch (error) {
      console.error('Error creating taxpayer:', error);
    }
  };

  const handleCreateStation = async () => {
    if (!selectedManager) {
      alert("Please select a manager.");
      return;
    }
    if (!newStation.receipt_code) {
      alert("Please enter the Receipt Code.");
      return;
    }
    try {
      await apiService.registerWithManager(selectedManager, {
        tranId: '1', // or use a dynamic value if needed
        brandName: newStation.brand_name,
        receiptCode: newStation.receipt_code,
      });
      setShowStationModal(false);
      setNewStation({
        brand_name: '',
        efd_serial: '',
        receipt_code: '',
        ewura_license: '',
        phone: '',
        email: '',
        tin: '',
        ward: '',
        region: '',
        district: '',
        station_location: '',
        vrn: '',
        device_type: 'EFPP',
      });
      setFieldsReadOnly(false);
      setSelectedManager('');
      // Optionally show a success message here
    } catch (error) {
      console.error('Error registering device:', error);
      alert("Failed to register device.");
    }
  };

  // 2. When manager selected, auto-fill form
  const handleManagerSelect = async (managerId: string) => {
    setSelectedManager(managerId);
    if (!managerId) return;
    try {
      const res = await apiService.getEwuraRegistrationData(managerId);
      console.log('Auto-fill data:', res.data);
      const auto = res.data?.ewuraData?.autoFilled;
      if (auto) {
        setNewStation({
          ...newStation,
          efd_serial: auto.efdSerialNumber || '',
          receipt_code: '', // clear receipt_code for manual entry
          ewura_license: auto.ewuraLicenseNo || '',
          phone: auto.contactPersonPhone || '',
          email: auto.contactPersonEmailAddress || '',
          ward: auto.wardName || '',
          region: auto.regionName || '',
          district: auto.districtName || '',
          station_location: auto.streetName || '',
          vrn: auto.operatorVrn || '',
          tin: auto.operatorTin || '',
          brand_name: auto.retailStationName || '',
        });
        setFieldsReadOnly(true);
      }
    } catch (error) {
      console.error('Error auto-filling form:', error);
    }
  };


  //   e.preventDefault();
  //   if (!selectedManager) return;
  //   try {
  //     await apiService.registerWithManager(selectedManager, {
  //       tranId: '1', // or your value
  //       brandName: newStation.brand_name,
  //       receiptCode: newStation.receipt_code,
  //       // ...add other required fields
  //     });
  //     // Handle success (e.g., show message, reset form)
  //   } catch (error) {
  //     console.error('Error submitting:', error);
  //   }
  // };

  const filteredTaxpayers = taxpayers.filter(taxpayer =>
    (taxpayer.tin?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    (taxpayer.vrn?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    (taxpayer.email?.toLowerCase() || '').includes(searchTerm.toLowerCase())
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
        <h1 className="text-xl font-bold text-gray-900">Devices</h1>
        <button
          onClick={() => setShowStationModal(true)}
          className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 flex items-center space-x-2"
        >
          <Plus className="w-4 h-4" />
          <span>Register Device</span>
        </button>
      </div>

      {/* Table Controls */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-600">Show</span>
          <select className="border border-gray-300 rounded px-2 py-1 text-sm">
            <option value="10">10</option>
            <option value="25">25</option>
            <option value="50">50</option>
            <option value="100">100</option>
          </select>
          <span className="text-sm text-gray-600">entries</span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-600">Search:</span>
          <input
            type="text"
            className="border border-gray-300 rounded px-3 py-1"
            placeholder="Search..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="px-6 py-3">Ewura Licence No.</th>
              <th className="px-6 py-3">TIN No.</th>
              <th className="px-6 py-3">EFD Serial</th>
              <th className="px-6 py-3">Brand Name</th>
              <th className="px-6 py-3">Phone Number</th>
              <th className="px-6 py-3">Email Address</th>
              <th className="px-6 py-3">Status</th>
              <th className="px-6 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredTaxpayers.flatMap(taxpayer => 
              taxpayer.stations.map(station => (
                <tr key={station.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">{station.ewura_license}</td>
                  <td className="px-6 py-4">{taxpayer.tin}</td>
                  <td className="px-6 py-4">{station.efd_serial}</td>
                  <td className="px-6 py-4">{station.brand_name}</td>
                  <td className="px-6 py-4">{station.phone}</td>
                  <td className="px-6 py-4">{station.email}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      station.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {station.status.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <button className="text-[#00A3D7] hover:text-[#0090BE]">
                      <Edit className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-600">
          Showing 1 to {Math.min(10, filteredTaxpayers.length)} of {filteredTaxpayers.length} entries
        </div>
        <div className="flex items-center space-x-2">
          <button className="px-3 py-1 text-sm border rounded hover:bg-gray-50">Previous</button>
          <button className="px-3 py-1 text-sm bg-blue-500 text-white rounded">1</button>
          <button className="px-3 py-1 text-sm border rounded hover:bg-gray-50">2</button>
          <button className="px-3 py-1 text-sm border rounded hover:bg-gray-50">3</button>
          <button className="px-3 py-1 text-sm border rounded hover:bg-gray-50">Next</button>
        </div>
      </div>

      {/* Add Taxpayer Modal */}
      {showTaxpayerModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-black">Add Taxpayer</h2>
              <button
                onClick={() => setShowTaxpayerModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ×
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-black mb-1">
                  <span className="text-red-500">*</span> TIN
                </label>
                <input
                  type="text"
                  value={newTaxpayer.tin}
                  onChange={(e) => setNewTaxpayer({ ...newTaxpayer, tin: e.target.value })}
                  placeholder="Enter TIN"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-black mb-1">
                  <span className="text-red-500">*</span> VRN
                </label>
                <input
                  type="text"
                  value={newTaxpayer.vrn}
                  onChange={(e) => setNewTaxpayer({ ...newTaxpayer, vrn: e.target.value })}
                  placeholder="Enter VRN"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-black mb-1">
                  <span className="text-red-500">*</span> Phone
                </label>
                <input
                  type="tel"
                  value={newTaxpayer.phone}
                  onChange={(e) => setNewTaxpayer({ ...newTaxpayer, phone: e.target.value })}
                  placeholder="Enter phone number"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-black mb-1">
                  <span className="text-red-500">*</span> Email
                </label>
                <input
                  type="email"
                  value={newTaxpayer.email}
                  onChange={(e) => setNewTaxpayer({ ...newTaxpayer, email: e.target.value })}
                  placeholder="Enter email"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-black mb-1">
                  <span className="text-red-500">*</span> Licence TRNS
                </label>
                <input
                  type="text"
                  value={newTaxpayer.licence_trns}
                  onChange={(e) => setNewTaxpayer({ ...newTaxpayer, licence_trns: e.target.value })}
                  placeholder="Enter licence TRNS"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  required
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowTaxpayerModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-black hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateTaxpayer}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Station Modal */}
      {showStationModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl my-4">
            {/* Sticky Header */}
            <div className="sticky top-0 bg-gray-50 px-6 py-4 rounded-t-xl border-b z-10">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">Register Device</h2>
                <button
                  onClick={() => setShowStationModal(false)}
                  className="text-gray-400 hover:text-gray-500 focus:outline-none"
                >
                  ×
                </button>
              </div>
            </div>

            {/* Manager Select Dropdown */}
            <div className="p-6 pt-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Select Manager <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="Search manager..."
                value={managerSearch}
                onChange={e => setManagerSearch(e.target.value)}
                className="w-full px-3 py-2 mb-2 border border-gray-300 rounded-lg"
              />
              <select
                value={selectedManager}
                onChange={async (e) => {
                  await handleManagerSelect(e.target.value);
                  setFieldsReadOnly(!!e.target.value);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                <option value="">Select Manager</option>
                {managers
                  .filter(m =>
                    m.displayName?.toLowerCase().includes(managerSearch.toLowerCase()) ||
                    m.email?.toLowerCase().includes(managerSearch.toLowerCase())
                  )
                  .map(manager => (
                    <option key={manager.id} value={manager.id}>
                      {manager.displayName}
                    </option>
                  ))}
              </select>
            </div>

            {/* Scrollable Form Body */}
            <div className="p-6 pt-0 max-h-[calc(100vh-200px)] overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                {/* Form Fields */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    value={newStation.phone}
                    readOnly={fieldsReadOnly}
                    onChange={(e) => setNewStation({ ...newStation, phone: e.target.value })}
                    placeholder="07xxxxxxxx"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email Address <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={newStation.email}
                    readOnly={fieldsReadOnly}
                    onChange={(e) => setNewStation({ ...newStation, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Brand Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={newStation.brand_name}
                    readOnly={fieldsReadOnly}
                    onChange={(e) => setNewStation({ ...newStation, brand_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    TIN Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={newStation.tin}
                    readOnly={fieldsReadOnly}
                    onChange={(e) => setNewStation({ ...newStation, tin: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Ward Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={newStation.ward || newStation.ward}
                    readOnly={fieldsReadOnly}
                    onChange={(e) => setNewStation({ ...newStation, ward: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Region Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={newStation.region}
                    readOnly={fieldsReadOnly}
                    onChange={(e) => setNewStation({ ...newStation, region: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    District Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={newStation.district}
                    readOnly={fieldsReadOnly}
                    onChange={(e) => setNewStation({ ...newStation, district: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Station Location <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={newStation.station_location}
                    readOnly={fieldsReadOnly}
                    onChange={(e) => setNewStation({ ...newStation, station_location: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    VRN <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={
               newStation.vrn || newStation.vrn
                      }
                    readOnly={fieldsReadOnly}
                    onChange={(e) => setNewStation({ ...newStation, vrn: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    EFD Serial Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={newStation.efd_serial}
                    readOnly={fieldsReadOnly}
                    onChange={(e) => setNewStation({ ...newStation, efd_serial: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Receipt Code <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={newStation.receipt_code}
                    
                    onChange={(e) => setNewStation({ ...newStation, receipt_code: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Ewura License Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={newStation.ewura_license}
                    readOnly={fieldsReadOnly}
                    onChange={(e) => setNewStation({ ...newStation, ewura_license: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    required
                  />
                </div>

    
              
              </div>
            </div>

            {/* Sticky Footer */}
            <div className="sticky bottom-0 bg-gray-50 px-6 py-4 rounded-b-xl border-t">
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowStationModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateStation}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
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
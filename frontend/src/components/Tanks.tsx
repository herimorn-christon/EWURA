import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Fuel, AlertTriangle, CheckCircle } from 'lucide-react';
import apiService from '../services/api';
import { toast } from 'react-hot-toast';

interface Tank {
  id: string;
  station_id: string;
  tank_number: string;
  product_id: string;
  capacity: number;
  safe_level: number;
  critical_level: number;
  current_level?: number;
  product?: {
    id: string;
    code: string;
    name: string;
    color: string;
  };
  station?: {
    id: string;
    name: string;
    code: string;
  };
  created_at: string;
  updated_at: string;
}

interface Station {
  id: string;
  name: string;
  code: string;
}

interface Product {
  id: string;
  code: string;
  name: string;
  color: string;
}

const Tanks: React.FC = () => {
  const [tanks, setTanks] = useState<Tank[]>([]);
  const [stations, setStations] = useState<Station[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingTank, setEditingTank] = useState<Tank | null>(null);
  const [selectedStation, setSelectedStation] = useState<string>('');
  const [formData, setFormData] = useState({
    stationId: '',
    tankNumber: '',
    productId: '',
    capacity: '',
    safeLevel: '',
    criticalLevel: ''
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch stations
      const stationsResponse = await apiService.getStations();
      if (!stationsResponse.error && stationsResponse.data?.stations) {
        setStations(stationsResponse.data.stations);
        
        // Set first station as default if none selected
        if (!selectedStation && stationsResponse.data.stations.length > 0) {
          setSelectedStation(stationsResponse.data.stations[0].id);
        }
      }

      // Fetch products
      const productsResponse = await apiService.getProducts();
      if (!productsResponse.error && productsResponse.data?.products) {
        setProducts(productsResponse.data.products);
      }

      // Fetch tanks for selected station
      if (selectedStation || (stationsResponse.data?.stations && stationsResponse.data.stations.length > 0)) {
        const stationId = selectedStation || stationsResponse.data.stations[0].id;
        const tanksResponse = await apiService.getTanks({ stationId });
        
        if (!tanksResponse.error && tanksResponse.data?.tanks) {
          setTanks(tanksResponse.data.tanks);
        } else {
          setTanks([]);
        }
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedStation]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        stationId: formData.stationId,
        tankNumber: formData.tankNumber,
        productId: formData.productId,
        capacity: parseInt(formData.capacity),
        safeLevel: parseInt(formData.safeLevel),
        criticalLevel: parseInt(formData.criticalLevel)
      };

      const response = editingTank
        ? await apiService.updateTank(editingTank.id, payload)
        : await apiService.createTank(payload);

      if (response.error) {
        toast.error(response.message || 'Failed to save tank');
        return;
      }

      toast.success(editingTank ? 'Tank updated successfully' : 'Tank created successfully');
      setShowModal(false);
      fetchData();
      resetForm();
    } catch (error) {
      console.error('Error saving tank:', error);
      toast.error('Failed to save tank');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this tank?')) return;

    try {
      const response = await apiService.deleteTank(id);
      
      if (response.error) {
        toast.error(response.message || 'Failed to delete tank');
        return;
      }
      
      toast.success('Tank deleted successfully');
      fetchData();
    } catch (error) {
      console.error('Error deleting tank:', error);
      toast.error('Failed to delete tank');
    }
  };

  const resetForm = () => {
    setFormData({
      stationId: selectedStation,
      tankNumber: '',
      productId: '',
      capacity: '',
      safeLevel: '',
      criticalLevel: ''
    });
    setEditingTank(null);
  };

  const getLevelStatus = (currentLevel: number | undefined, criticalLevel: number, safeLevel: number) => {
    if (!currentLevel && currentLevel !== 0) return 'unknown';
    if (currentLevel <= criticalLevel) return 'critical';
    if (currentLevel <= safeLevel) return 'warning';
    return 'normal';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'critical':
        return <AlertTriangle className="w-5 h-5 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case 'normal':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      default:
        return <Fuel className="w-5 h-5 text-gray-400" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Tank Management</h1>
          <p className="text-gray-600">Monitor and manage fuel storage tanks</p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
          className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors flex items-center"
        >
          <Plus className="w-5 h-5 mr-2" />
          Add Tank
        </button>
      </div>

      {/* Station Filter */}
      <div className="bg-white p-4 rounded-lg shadow-sm">
        <label className="block text-sm font-medium text-gray-700 mb-2">Select Station</label>
        <select
          value={selectedStation}
          onChange={(e) => setSelectedStation(e.target.value)}
          className="w-full max-w-md rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500"
        >
          {stations.map(station => (
            <option key={station.id} value={station.id}>
              {station.name} ({station.code})
            </option>
          ))}
        </select>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <div className="text-2xl font-bold text-gray-900">{tanks.length}</div>
          <div className="text-sm text-gray-500">Total Tanks</div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <div className="text-2xl font-bold text-green-600">
            {tanks.filter(t => getLevelStatus(t.current_level, t.critical_level, t.safe_level) === 'normal').length}
          </div>
          <div className="text-sm text-gray-500">Normal Level</div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <div className="text-2xl font-bold text-yellow-600">
            {tanks.filter(t => getLevelStatus(t.current_level, t.critical_level, t.safe_level) === 'warning').length}
          </div>
          <div className="text-sm text-gray-500">Low Level</div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <div className="text-2xl font-bold text-red-600">
            {tanks.filter(t => getLevelStatus(t.current_level, t.critical_level, t.safe_level) === 'critical').length}
          </div>
          <div className="text-sm text-gray-500">Critical Level</div>
        </div>
      </div>

      {/* Tanks Table */}
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tank
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Product
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Capacity
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Current Level
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
                {tanks.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                      No tanks found for this station. Click "Add Tank" to create a new tank.
                    </td>
                  </tr>
                ) : (
                  tanks.map((tank) => {
                    const status = getLevelStatus(tank.current_level, tank.critical_level, tank.safe_level);
                    const percentage = tank.current_level ? ((tank.current_level / tank.capacity) * 100).toFixed(1) : 'N/A';
                    
                    return (
                      <tr key={tank.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <Fuel className="w-8 h-8 text-gray-400 mr-3" />
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                Tank {tank.tank_number}
                              </div>
                              <div className="text-sm text-gray-500">
                                {tank.station?.name}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {tank.product ? (
                            <div className="flex items-center">
                              <div 
                                className="w-6 h-6 rounded mr-3"
                                style={{ backgroundColor: tank.product.color }}
                              />
                              <div>
                                <div className="text-sm font-medium text-gray-900">
                                  {tank.product.name}
                                </div>
                                <div className="text-sm text-gray-500">
                                  {tank.product.code}
                                </div>
                              </div>
                            </div>
                          ) : (
                            <span className="text-sm text-gray-400">Not assigned</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {tank.capacity.toLocaleString()} L
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {tank.current_level ? `${tank.current_level.toLocaleString()} L` : 'N/A'}
                          </div>
                          <div className="text-sm text-gray-500">
                            {percentage !== 'N/A' ? `${percentage}%` : 'No data'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            {getStatusIcon(status)}
                            <span className={`ml-2 text-sm font-medium ${
                              status === 'critical' ? 'text-red-600' :
                              status === 'warning' ? 'text-yellow-600' :
                              status === 'normal' ? 'text-green-600' :
                              'text-gray-500'
                            }`}>
                              {status.charAt(0).toUpperCase() + status.slice(1)}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex justify-end space-x-2">
                            <button
                              onClick={() => {
                                setFormData({
                                  stationId: tank.station_id,
                                  tankNumber: tank.tank_number,
                                  productId: tank.product_id || '',
                                  capacity: tank.capacity.toString(),
                                  safeLevel: tank.safe_level.toString(),
                                  criticalLevel: tank.critical_level.toString()
                                });
                                setEditingTank(tank);
                                setShowModal(true);
                              }}
                              className="text-blue-600 hover:text-blue-900 p-1 rounded hover:bg-blue-50"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(tank.id)}
                              className="text-red-600 hover:text-red-900 p-1 rounded hover:bg-red-50"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-semibold mb-6">
              {editingTank ? 'Edit Tank' : 'Add New Tank'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Station</label>
                  <select
                    value={formData.stationId}
                    onChange={(e) => setFormData({ ...formData, stationId: e.target.value })}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500"
                    required
                  >
                    <option value="">Select Station</option>
                    {stations.map(station => (
                      <option key={station.id} value={station.id}>
                        {station.name} ({station.code})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tank Number</label>
                  <input
                    type="text"
                    value={formData.tankNumber}
                    onChange={(e) => setFormData({ ...formData, tankNumber: e.target.value })}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500"
                    placeholder="e.g., 01, 02, 03"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Product</label>
                <select
                  value={formData.productId}
                  onChange={(e) => setFormData({ ...formData, productId: e.target.value })}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500"
                  required
                >
                  <option value="">Select Product</option>
                  {products.map(product => (
                    <option key={product.id} value={product.id}>
                      {product.name} ({product.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Capacity (Liters)</label>
                <input
                  type="number"
                  value={formData.capacity}
                  onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500"
                  placeholder="e.g., 30000"
                  min="1"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Safe Level (Liters)</label>
                  <input
                    type="number"
                    value={formData.safeLevel}
                    onChange={(e) => setFormData({ ...formData, safeLevel: e.target.value })}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500"
                    placeholder="e.g., 5000"
                    min="1"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Critical Level (Liters)</label>
                  <input
                    type="number"
                    value={formData.criticalLevel}
                    onChange={(e) => setFormData({ ...formData, criticalLevel: e.target.value })}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500"
                    placeholder="e.g., 2000"
                    min="1"
                    required
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md transition-colors"
                >
                  {editingTank ? 'Update Tank' : 'Create Tank'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Tanks;
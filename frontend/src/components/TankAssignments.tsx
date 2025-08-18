import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Link as LinkIcon, AlertTriangle, CheckCircle } from 'lucide-react';
import apiService from '../services/api';
import { toast } from 'react-hot-toast';

interface TankAssignment {
  id: string;
  tank_id: string;
  product_id: string;
  capacity: number;
  safe_level: number;
  critical_level: number;
  tank?: {
    id: string;
    tank_number: string;
    station?: {
      name: string;
      code: string;
    };
  };
  product?: {
    id: string;
    code: string;
    name: string;
    color: string;
    category: string;
  };
  created_at: string;
  updated_at: string;
}

interface Tank {
  id: string;
  tank_number: string;
  station_id: string;
  station?: {
    name: string;
    code: string;
  };
}

interface Product {
  id: string;
  code: string;
  name: string;
  color: string;
  category: string;
}

interface Station {
  id: string;
  name: string;
  code: string;
}

const TankAssignments: React.FC = () => {
  const [assignments, setAssignments] = useState<TankAssignment[]>([]);
  const [tanks, setTanks] = useState<Tank[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [stations, setStations] = useState<Station[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<TankAssignment | null>(null);
  const [selectedStation, setSelectedStation] = useState<string>('');
  const [formData, setFormData] = useState({
    tankId: '',
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
          
          // Extract assignments from tanks data
          const tankAssignments: TankAssignment[] = tanksResponse.data.tanks
            .filter((tank: any) => tank.product_id)
            .map((tank: any) => ({
              id: `${tank.id}_${tank.product_id}`,
              tank_id: tank.id,
              product_id: tank.product_id,
              capacity: tank.capacity,
              safe_level: tank.safe_level,
              critical_level: tank.critical_level,
              tank: {
                id: tank.id,
                tank_number: tank.tank_number,
                station: tank.station
              },
              product: tank.product,
              created_at: tank.created_at,
              updated_at: tank.updated_at
            }));
          
          setAssignments(tankAssignments);
        } else {
          setTanks([]);
          setAssignments([]);
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
        tankId: formData.tankId,
        productId: formData.productId,
        capacity: parseInt(formData.capacity),
        safeLevel: parseInt(formData.safeLevel),
        criticalLevel: parseInt(formData.criticalLevel)
      };

      let response;
      if (editingAssignment) {
        // Update assignment
        response = await apiService.request(`/tanks/${formData.tankId}/product`, {
          method: 'PUT',
          body: JSON.stringify({
            productId: formData.productId,
            capacity: parseInt(formData.capacity),
            safeLevel: parseInt(formData.safeLevel),
            criticalLevel: parseInt(formData.criticalLevel)
          })
        });
      } else {
        // Create new assignment
        response = await apiService.request('/tanks/assign-product', {
          method: 'POST',
          body: JSON.stringify(payload)
        });
      }

      if (response.error) {
        toast.error(response.message || 'Failed to save assignment');
        return;
      }

      toast.success(editingAssignment ? 'Assignment updated successfully' : 'Tank assigned successfully');
      setShowModal(false);
      fetchData();
      resetForm();
    } catch (error) {
      console.error('Error saving assignment:', error);
      toast.error('Failed to save assignment');
    }
  };

  const handleRemoveAssignment = async (tankId: string, productName: string) => {
    if (!window.confirm(`Are you sure you want to remove ${productName} from this tank?`)) return;

    try {
      const response = await apiService.request(`/tanks/${tankId}/product`, {
        method: 'DELETE'
      });
      
      if (response.error) {
        toast.error(response.message || 'Failed to remove assignment');
        return;
      }
      
      toast.success('Product assignment removed successfully');
      fetchData();
    } catch (error) {
      console.error('Error removing assignment:', error);
      toast.error('Failed to remove assignment');
    }
  };

  const resetForm = () => {
    setFormData({
      tankId: '',
      productId: '',
      capacity: '',
      safeLevel: '',
      criticalLevel: ''
    });
    setEditingAssignment(null);
  };

  const getAvailableTanks = () => {
    // For editing, include the current tank
    if (editingAssignment) {
      return tanks;
    }
    
    // For new assignments, only show unassigned tanks
    const assignedTankIds = assignments.map(a => a.tank_id);
    return tanks.filter(tank => !assignedTankIds.includes(tank.id));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Tank Assignments</h1>
          <p className="text-gray-600">Manage product assignments to storage tanks</p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
          className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors flex items-center"
        >
          <LinkIcon className="w-5 h-5 mr-2" />
          Assign Product
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
          <div className="text-2xl font-bold text-gray-900">{assignments.length}</div>
          <div className="text-sm text-gray-500">Assigned Tanks</div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <div className="text-2xl font-bold text-blue-600">{tanks.length - assignments.length}</div>
          <div className="text-sm text-gray-500">Available Tanks</div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <div className="text-2xl font-bold text-green-600">
            {assignments.filter(a => a.product?.category === 'FUEL').length}
          </div>
          <div className="text-sm text-gray-500">Fuel Assignments</div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <div className="text-2xl font-bold text-purple-600">
            {assignments.filter(a => a.product?.category !== 'FUEL').length}
          </div>
          <div className="text-sm text-gray-500">Other Products</div>
        </div>
      </div>

      {/* Assignments Table */}
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
                    Assigned Product
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Capacity
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Alert Levels
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
                {assignments.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                      No tank assignments found for this station. Click "Assign Product" to create assignments.
                    </td>
                  </tr>
                ) : (
                  assignments.map((assignment) => (
                    <tr key={assignment.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <LinkIcon className="w-8 h-8 text-gray-400 mr-3" />
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              Tank {assignment.tank?.tank_number}
                            </div>
                            <div className="text-sm text-gray-500">
                              {assignment.tank?.station?.name}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {assignment.product ? (
                          <div className="flex items-center">
                            <div 
                              className="w-6 h-6 rounded mr-3"
                              style={{ backgroundColor: assignment.product.color }}
                            />
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {assignment.product.name}
                              </div>
                              <div className="text-sm text-gray-500">
                                {assignment.product.code}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400">Product not found</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {assignment.capacity.toLocaleString()} L
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          Safe: {assignment.safe_level.toLocaleString()} L
                        </div>
                        <div className="text-sm text-red-600">
                          Critical: {assignment.critical_level.toLocaleString()} L
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
                          <span className="text-sm font-medium text-green-600">Active</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end space-x-2">
                          <button
                            onClick={() => {
                              setFormData({
                                tankId: assignment.tank_id,
                                productId: assignment.product_id,
                                capacity: assignment.capacity.toString(),
                                safeLevel: assignment.safe_level.toString(),
                                criticalLevel: assignment.critical_level.toString()
                              });
                              setEditingAssignment(assignment);
                              setShowModal(true);
                            }}
                            className="text-blue-600 hover:text-blue-900 p-1 rounded hover:bg-blue-50"
                            title="Edit Assignment"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleRemoveAssignment(assignment.tank_id, assignment.product?.name || 'Unknown')}
                            className="text-red-600 hover:text-red-900 p-1 rounded hover:bg-red-50"
                            title="Remove Assignment"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
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
              {editingAssignment ? 'Edit Tank Assignment' : 'Assign Product to Tank'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tank</label>
                <select
                  value={formData.tankId}
                  onChange={(e) => setFormData({ ...formData, tankId: e.target.value })}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500"
                  required
                  disabled={!!editingAssignment}
                >
                  <option value="">Select Tank</option>
                  {getAvailableTanks().map(tank => (
                    <option key={tank.id} value={tank.id}>
                      Tank {tank.tank_number} - {tank.station?.name}
                    </option>
                  ))}
                </select>
                {!editingAssignment && getAvailableTanks().length === 0 && (
                  <p className="text-sm text-gray-500 mt-1">
                    All tanks at this station are already assigned. Create new tanks or remove existing assignments.
                  </p>
                )}
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
                      {product.name} ({product.code}) - {product.category}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tank Capacity (Liters)</label>
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

              <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mt-4">
                <div className="flex">
                  <AlertTriangle className="w-5 h-5 text-yellow-400 mr-2 mt-0.5" />
                  <div className="text-sm text-yellow-700">
                    <strong>Important:</strong> Critical level should be less than safe level, 
                    and both should be less than tank capacity.
                  </div>
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
                  {editingAssignment ? 'Update Assignment' : 'Assign Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TankAssignments;
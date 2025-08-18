import React, { useState, useEffect } from 'react';
import { Plus, Calendar, User, Wrench, Clock, CheckCircle, X } from 'lucide-react';
import apiService from '../services/api';

interface MaintenanceRecord {
  id: string;
  title: string;
  description: string;
  type: 'preventive' | 'corrective' | 'emergency' | 'inspection';
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'overdue';
  scheduled_date: string;
  completed_date?: string;
  estimated_duration?: number;
  actual_duration?: number;
  cost?: number;
  notes?: string;
  station: {
    name: string;
  };
  tank?: {
    tank_number: string;
  };
  assignee?: {
    username: string;
  };
  creator: {
    username: string;
  };
}

const Maintenance: React.FC = () => {
  const [maintenance, setMaintenance] = useState<MaintenanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [filter, setFilter] = useState({
    status: '',
    type: '',
    priority: '',
  });
  const [newMaintenance, setNewMaintenance] = useState({
    title: '',
    description: '',
    type: 'preventive',
    priority: 'medium',
    scheduled_date: '',
    estimated_duration: '',
    tank_id: '',
    assigned_to: '',
  });

  useEffect(() => {
    fetchMaintenance();
  }, [filter]);

  const fetchMaintenance = async () => {
    try {
      const params = Object.fromEntries(
        Object.entries(filter).filter(([_, value]) => value !== '')
      );
      const data = await apiService.getMaintenance(params);
      setMaintenance(data);
    } catch (error) {
      console.error('Error fetching maintenance:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddMaintenance = async () => {
    try {
      await apiService.createMaintenance({
        ...newMaintenance,
        estimated_duration: newMaintenance.estimated_duration ? parseInt(newMaintenance.estimated_duration) : null,
        station_id: 'your-station-id', // This should come from context or props
      });
      setShowAddModal(false);
      setNewMaintenance({
        title: '',
        description: '',
        type: 'preventive',
        priority: 'medium',
        scheduled_date: '',
        estimated_duration: '',
        tank_id: '',
        assigned_to: '',
      });
      fetchMaintenance();
    } catch (error) {
      console.error('Error creating maintenance:', error);
    }
  };

  const updateMaintenanceStatus = async (id: string, status: string) => {
    try {
      const updateData: any = { status };
      if (status === 'completed') {
        updateData.completed_date = new Date().toISOString();
      }
      await apiService.updateMaintenance(id, updateData);
      fetchMaintenance();
    } catch (error) {
      console.error('Error updating maintenance:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'bg-blue-100 text-blue-800';
      case 'in_progress': return 'bg-yellow-100 text-yellow-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-gray-100 text-gray-800';
      case 'overdue': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'preventive': return 'bg-green-100 text-green-800';
      case 'corrective': return 'bg-yellow-100 text-yellow-800';
      case 'emergency': return 'bg-red-100 text-red-800';
      case 'inspection': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-600 text-white';
      case 'high': return 'bg-red-500 text-white';
      case 'medium': return 'bg-yellow-500 text-white';
      case 'low': return 'bg-green-500 text-white';
      default: return 'bg-gray-500 text-white';
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
        <h1 className="text-2xl font-bold text-black">Maintenance</h1>
        <button
          onClick={() => setShowAddModal(true)}
          className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 flex items-center space-x-2"
        >
          <Plus className="w-4 h-4" />
          <span>Schedule Maintenance</span>
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-black mb-1">Status</label>
            <select
              value={filter.status}
              onChange={(e) => setFilter({ ...filter, status: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              <option value="">All Statuses</option>
              <option value="scheduled">Scheduled</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
              <option value="overdue">Overdue</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-black mb-1">Type</label>
            <select
              value={filter.type}
              onChange={(e) => setFilter({ ...filter, type: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              <option value="">All Types</option>
              <option value="preventive">Preventive</option>
              <option value="corrective">Corrective</option>
              <option value="emergency">Emergency</option>
              <option value="inspection">Inspection</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-black mb-1">Priority</label>
            <select
              value={filter.priority}
              onChange={(e) => setFilter({ ...filter, priority: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              <option value="">All Priorities</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </div>
        </div>
      </div>

      {/* Maintenance List */}
      <div className="space-y-4">
        {maintenance.length === 0 ? (
          <div className="text-center py-12">
            <Wrench className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No maintenance records found</p>
          </div>
        ) : (
          maintenance.map((record) => (
            <div key={record.id} className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h3 className="text-lg font-semibold text-black">{record.title}</h3>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getTypeColor(record.type)}`}>
                      {record.type.toUpperCase()}
                    </span>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getPriorityColor(record.priority)}`}>
                      {record.priority.toUpperCase()}
                    </span>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(record.status)}`}>
                      {record.status.replace('_', ' ').toUpperCase()}
                    </span>
                  </div>
                  
                  {record.description && (
                    <p className="text-gray-700 mb-3">{record.description}</p>
                  )}
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm text-gray-600">
                    <div className="flex items-center space-x-2">
                      <Calendar className="w-4 h-4" />
                      <span>Scheduled: {new Date(record.scheduled_date).toLocaleDateString()}</span>
                    </div>
                    {record.assignee && (
                      <div className="flex items-center space-x-2">
                        <User className="w-4 h-4" />
                        <span>Assigned: {record.assignee.username}</span>
                      </div>
                    )}
                    <div>Station: {record.station.name}</div>
                    {record.tank && <div>Tank: {record.tank.tank_number}</div>}
                  </div>
                  
                  {record.estimated_duration && (
                    <div className="mt-2 text-sm text-gray-600">
                      <Clock className="w-4 h-4 inline mr-1" />
                      Estimated duration: {record.estimated_duration} minutes
                    </div>
                  )}
                  
                  {record.completed_date && (
                    <div className="mt-2 text-sm text-gray-600">
                      <CheckCircle className="w-4 h-4 inline mr-1" />
                      Completed: {new Date(record.completed_date).toLocaleString()}
                    </div>
                  )}
                  
                  {record.cost && (
                    <div className="mt-2 text-sm text-gray-600">
                      Cost: ${record.cost.toFixed(2)}
                    </div>
                  )}
                </div>
                
                <div className="flex items-center space-x-2 ml-4">
                  {record.status === 'scheduled' && (
                    <button
                      onClick={() => updateMaintenanceStatus(record.id, 'in_progress')}
                      className="px-3 py-1 bg-yellow-600 text-white text-sm rounded hover:bg-yellow-700"
                    >
                      Start
                    </button>
                  )}
                  {record.status === 'in_progress' && (
                    <button
                      onClick={() => updateMaintenanceStatus(record.id, 'completed')}
                      className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                    >
                      Complete
                    </button>
                  )}
                  {(record.status === 'scheduled' || record.status === 'in_progress') && (
                    <button
                      onClick={() => updateMaintenanceStatus(record.id, 'cancelled')}
                      className="px-3 py-1 bg-gray-600 text-white text-sm rounded hover:bg-gray-700"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add Maintenance Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-black">Schedule Maintenance</h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-black mb-1">
                  <span className="text-red-500">*</span> Title
                </label>
                <input
                  type="text"
                  value={newMaintenance.title}
                  onChange={(e) => setNewMaintenance({ ...newMaintenance, title: e.target.value })}
                  placeholder="Enter maintenance title"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-black mb-1">Description</label>
                <textarea
                  value={newMaintenance.description}
                  onChange={(e) => setNewMaintenance({ ...newMaintenance, description: e.target.value })}
                  placeholder="Enter maintenance description"
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-black mb-1">Type</label>
                  <select
                    value={newMaintenance.type}
                    onChange={(e) => setNewMaintenance({ ...newMaintenance, type: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  >
                    <option value="preventive">Preventive</option>
                    <option value="corrective">Corrective</option>
                    <option value="emergency">Emergency</option>
                    <option value="inspection">Inspection</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-black mb-1">Priority</label>
                  <select
                    value={newMaintenance.priority}
                    onChange={(e) => setNewMaintenance({ ...newMaintenance, priority: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-black mb-1">
                  <span className="text-red-500">*</span> Scheduled Date
                </label>
                <input
                  type="datetime-local"
                  value={newMaintenance.scheduled_date}
                  onChange={(e) => setNewMaintenance({ ...newMaintenance, scheduled_date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-black mb-1">
                  Estimated Duration (minutes)
                </label>
                <input
                  type="number"
                  value={newMaintenance.estimated_duration}
                  onChange={(e) => setNewMaintenance({ ...newMaintenance, estimated_duration: e.target.value })}
                  placeholder="Enter estimated duration"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-black hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleAddMaintenance}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Schedule
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Maintenance;
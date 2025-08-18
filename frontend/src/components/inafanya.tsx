import React, { useState, useEffect } from 'react';
import { Search, Plus, MoreHorizontal, X } from 'lucide-react';
import apiService from '../services/api';

interface Tank {
  id: string;
  tankNo: string;
  description: string;
  product: string;
  capacity: number;
  waterHeight: number;
  fuelTemperature: number;
}

const Tanks: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTank, setNewTank] = useState({
    tankNo: '',
    description: '',
    maxVolume: '',
    product: ''
  });

  // Dynamic state for tanks and readings
  const [tanks, setTanks] = useState<Tank[]>([]);
  const [dailySummary, setDailySummary] = useState<any[]>([]);
  const [hourlyReadings, setHourlyReadings] = useState<any[]>([]);
  const [periodReadings, setPeriodReadings] = useState<any[]>([]);
  const [selectedTankId, setSelectedTankId] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [tableMode, setTableMode] = useState<'daily' | 'hourly' | 'periodic'>('daily');

  // Fetch tanks and summaries on mount
  useEffect(() => {
    setLoading(true);
    apiService.getTanks()
      .then((data: any) => {
        const tanksArray = Array.isArray(data) ? data : Object.values(data);
        setTanks(tanksArray);
      })
      .catch(() => setTanks([]));

    apiService.getTanksDailySummary()
      .then((data: any) => {
        if (Array.isArray(data)) {
          setDailySummary(data);
        } else if (Array.isArray(data?.data)) {
          setDailySummary(data.data);
        } else {
          setDailySummary([]);
        }
      })
      .catch(() => setDailySummary([]));

    apiService.getTanksHourlyReadings()
      .then((data: any) => {
        if (Array.isArray(data)) {
          setHourlyReadings(data);
        } else if (Array.isArray(data?.data)) {
          setHourlyReadings(data.data);
        } else {
          setHourlyReadings([]);
        }
      })
      .catch(() => setHourlyReadings([]));

    setLoading(false);
  }, []);

  // Fetch period readings when tank or date changes
  useEffect(() => {
    if (
      tableMode === 'periodic' &&
      selectedTankId &&
      startDate &&
      endDate &&
      /^[0-9a-fA-F-]{36}$/.test(selectedTankId)
    ) {
      setLoading(true);
      apiService.getTankReadingsForPeriod(selectedTankId, startDate, endDate)
        .then((data: any) => {
          setPeriodReadings(Array.isArray(data) ? data : data.data || []);
        })
        .catch(() => setPeriodReadings([]))
        .finally(() => setLoading(false));
    } else if (tableMode === 'periodic') {
      setPeriodReadings([]);
    }
  }, [tableMode, selectedTankId, startDate, endDate]);

  // Table data and columns based on mode
  let tableData: any[] = [];
  let columns: string[] = [];

  if (tableMode === 'daily') {
    tableData = Array.isArray(dailySummary) ? dailySummary : dailySummary.data || [];
    columns = [
      'tank_number', 'capacity', 'avg_volume', 'min_volume', 'max_volume',
      'avg_temperature', 'min_temperature', 'max_temperature', 'reading_count'
    ];
  } else if (tableMode === 'hourly') {
    tableData = Array.isArray(hourlyReadings) ? hourlyReadings : hourlyReadings.data || [];
    columns = tableData[0] ? Object.keys(tableData[0]) : [];
  } else if (tableMode === 'periodic') {
    tableData = Array.isArray(periodReadings) ? periodReadings : periodReadings.data || [];
    columns = tableData[0] ? Object.keys(tableData[0]) : [];
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Tank Management</h1>
        <button 
          onClick={() => setShowAddModal(true)}
          className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 flex items-center space-x-2"
        >
          <Plus className="w-4 h-4" />
          <span>Add</span>
        </button>
      </div>

      {/* Search */}
      <div className="bg-white p-6 rounded-lg shadow-sm">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Please enter tank number"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Table Mode Buttons */}
      <div className="flex items-center gap-2 mb-4">
        <button
          className={`px-3 py-1 rounded ${tableMode === 'daily' ? 'bg-red-600 text-white' : 'bg-gray-200'}`}
          onClick={() => setTableMode('daily')}
        >
          Daily
        </button>
        <button
          className={`px-3 py-1 rounded ${tableMode === 'hourly' ? 'bg-red-600 text-white' : 'bg-gray-200'}`}
          onClick={() => setTableMode('hourly')}
        >
          Hourly
        </button>
        <button
          className={`px-3 py-1 rounded ${tableMode === 'periodic' ? 'bg-red-600 text-white' : 'bg-gray-200'}`}
          onClick={() => setTableMode('periodic')}
        >
          Periodic
        </button>
        {tableMode === 'periodic' && (
          <>
            <select
              value={selectedTankId}
              onChange={e => setSelectedTankId(e.target.value)}
              className="border px-2 py-1 rounded"
            >
              <option value="">-- Select Tank --</option>
              {tanks.map(tank => (
                <option key={tank.id} value={tank.id}>{tank.tankNo}</option>
              ))}
            </select>
            <input
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className="border px-2 py-1 rounded"
            />
            <input
              type="date"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              className="border px-2 py-1 rounded"
            />
          </>
        )}
      </div>

      {/* Dynamic Tank Readings Table */}
      <div className="bg-white rounded-lg shadow-sm p-4 mt-6">
        <h2 className="text-lg font-bold mb-2 capitalize">{tableMode} Tank Readings</h2>
        <table className="w-full text-sm">
          <thead>
            <tr>
              {columns.map(col => (
                <th key={col} className="px-2 py-1 text-left">{col.replace(/_/g, ' ').toUpperCase()}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tableData.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="text-center py-4 text-gray-400">No data available</td>
              </tr>
            ) : (
              tableData.map((row, idx) => (
                <tr key={idx}>
                  {columns.map(col => (
                    <td key={col} className="px-2 py-1">{row[col]}</td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add Tank Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">Add Tank</h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <span className="text-red-500">*</span> Tank No.
                </label>
                <input
                  type="text"
                  value={newTank.tankNo}
                  onChange={(e) => setNewTank({ ...newTank, tankNo: e.target.value })}
                  placeholder="Please enter tank number"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                />
                <p className="text-red-500 text-sm mt-1">Please enter tank number</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <input
                  type="text"
                  value={newTank.description}
                  onChange={(e) => setNewTank({ ...newTank, description: e.target.value })}
                  placeholder="Please enter tank description"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <span className="text-red-500">*</span> Maximum Volume (L)
                </label>
                <input
                  type="number"
                  value={newTank.maxVolume}
                  onChange={(e) => setNewTank({ ...newTank, maxVolume: e.target.value })}
                  placeholder="Please enter the volume (L)"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <span className="text-red-500">*</span> Product
                </label>
                <select
                  value={newTank.product}
                  onChange={(e) => setNewTank({ ...newTank, product: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                >
                  <option value="">Please choose the product</option>
                  <option value="ULEADED">UNLEADED</option>
                  <option value="Diesel">Diesel</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleAddTank}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Tanks;
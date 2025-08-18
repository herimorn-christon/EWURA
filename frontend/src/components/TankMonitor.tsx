import React, { useState, useEffect } from 'react';
import { Fuel, Thermometer, Droplets, Activity, AlertTriangle, Play, Pause, RefreshCw, Building, Filter } from 'lucide-react';
import apiService from '../services/api';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'react-hot-toast';

interface Tank {
  id: string;
  tank_number: number;
  name: string;
  fuel_type: string;
  current_volume: number;
  capacity: number;
  water_level: number;
  temperature: number;
  pressure?: number;
  status: string;
  station: {
    name: string;
  };
}

interface Station {
  id: string;
  name: string;
  code: string;
  interface_code: string;
  interface_name: string;
}

const WS_URL = 'http://192.168.1.104:3001';

const TankMonitor: React.FC = () => {
  const [tanks, setTanks] = useState<Tank[]>([]);
  const [stations, setStations] = useState<Station[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTank, setSelectedTank] = useState<Tank | null>(null);
  const [selectedStation, setSelectedStation] = useState<string>('');
  const [selectedInterface, setSelectedInterface] = useState<string>('');
  const [interfaceStatus, setInterfaceStatus] = useState<any>({});
  const [socket, setSocket] = useState<Socket | null>(null);
  const { user } = useAuth();
  console.log('the comming users are',user);

  const isAdmin = user?.role === 'admin' || user?.role_code === 'ADMIN';
  console.log('User role:', user?.role, 'Is Admin:', isAdmin);

  useEffect(() => {
    fetchStations();
  }, []);

  useEffect(() => {
    if (stations.length > 0) {
      fetchTanks();
      fetchInterfaceStatus();
    }
  }, [selectedStation, selectedInterface, stations]);

  // Setup WebSocket for live tank data
  useEffect(() => {
    const s = io(WS_URL, {
      transports: ['websocket', 'polling'],
    });

    s.on('connect', () => {
      console.log('Connected to WebSocket');
    });

    s.on('tankData', (data: any) => {
      // If data is an object with numeric keys, convert to array
      const payload = data.payload || data;
      const tanksArray = Array.isArray(payload.tanks) ? payload.tanks : 
                        Array.isArray(payload) ? payload : Object.values(payload);

      setTanks(
        tanksArray.map((tank: any) => ({
          ...tank,
          current_volume: Number(tank.oilVolume || tank.oil_volume || tank.current_volume || 0),
          capacity: Number(tank.totalVolume || tank.total_volume || tank.capacity || 0),
          water_level: Number(tank.waterHeight || tank.water_height || tank.water_level || 0),
          temperature: Number(tank.temperature || 0),
          pressure: Number(tank.pressure || 0),
          id: tank.tankNumber || tank.tank_number || tank.id,
          tank_number: tank.tankNumber || tank.tank_number,
          name: tank.name || `Tank ${tank.tankNumber || tank.tank_number}`,
          fuel_type: tank.fuel_type || tank.fuelType || 'unknown',
          status: tank.status || 'unknown',
          station: {
            name: tank.stationName || tank.station_name || 'Unknown',
          },
        }))
      );
    });

    s.on('disconnect', () => {
      console.log('Disconnected from WebSocket');
    });

    setSocket(s);

    return () => {
      s.disconnect();
    };
  }, []);

  const fetchStations = async () => {
    try {
      const response = await apiService.getAccessibleStations();
      console.log('getAccessibleStations response raw:', response);

      let stationList = !response.error && response.data?.stations ? response.data.stations : [];

      // If admin and accessible list is unexpectedly small, fetch full stations list as fallback
      if (isAdmin && (!stationList || stationList.length < 2)) {
        try {
          const allResp = await apiService.getStations();
          console.log('getStations (fallback) response:', allResp);
          if (!allResp.error && allResp.data?.stations && allResp.data.stations.length > stationList.length) {
            stationList = allResp.data.stations;
          }
        } catch (err) {
          console.warn('Fallback getStations failed:', err);
        }
      }

      const normalized = stationList.map((s: any) => ({
        id: s.id,
        name: s.name,
        code: s.code,
        interface_code: s.interface_code || s.interfaceType?.code || s.interface_type_code || s.interface_type?.code || null,
        interface_name: s.interface_name || s.interface_type_name || s.interfaceType?.name || s.interface_type?.name || null,
        is_active: s.is_active
      }));

      console.log('Normalized stations:', normalized.map((s: any) => ({ id: s.id, interface_code: s.interface_code, interface_name: s.interface_name })));

      setStations(normalized);
      
      // Set default station for non-admin users
      if (!isAdmin && normalized.length > 0) {
        setSelectedStation(normalized[0].id);
      }
    } catch (error) {
      console.error('Error fetching stations:', error);
      toast.error('Failed to fetch stations');
    }
  };

  const fetchTanks = async () => {
    try {
      const params: any = {};
      if (selectedStation) params.stationId = selectedStation;
      if (selectedInterface) params.interfaceCode = selectedInterface;

      const response = await apiService.getCurrentTankDataUnified(params);
      
      if (!response.error && response.data?.tanks) {
        const tanksArray = Array.isArray(response.data.tanks) ? response.data.tanks : Object.values(response.data.tanks);
        const formattedData = tanksArray.map((tank: any) => ({
          ...tank,
          current_volume: Number(tank.total_volume || tank.oil_volume || tank.current_volume || 0),
          capacity: Number(tank.capacity || 10000),
          water_level: Number(tank.water_height || tank.water_level || 0),
          temperature: Number(tank.temperature || 0),
          pressure: Number(tank.pressure || 0),
          id: tank.id || tank.tank_number,
          tank_number: tank.tank_number,
          name: tank.product_name || `Tank ${tank.tank_number}`,
          fuel_type: tank.product_name?.toLowerCase() || 'unknown',
          status: tank.reading_timestamp ? 'online' : 'offline',
          station: {
            name: tank.station_name || 'Unknown',
          },
        }));
        setTanks(formattedData);
      } else {
        setTanks([]);
      }
    } catch (error) {
      console.error('Error fetching tanks:', error);
      toast.error('Failed to fetch tank data');
    } finally {
      setLoading(false);
    }
  };

  const fetchInterfaceStatus = async () => {
    try {
      const params: any = {};
      if (selectedStation) params.stationId = selectedStation;
      if (selectedInterface) params.interfaceCode = selectedInterface;

      const response = await apiService.getInterfaceStatus(params);
      if (!response.error && response.data?.statuses) {
        setInterfaceStatus(response.data.statuses);
      }
    } catch (error) {
      console.error('Error fetching interface status:', error);
    }
  };

  const handleStartMonitoring = async () => {
    try {
      const data: any = {};
      if (selectedStation) data.stationId = selectedStation;
      if (selectedInterface) data.interfaceCode = selectedInterface;

      const response = await apiService.startInterfaceMonitoring(data);
      if (!response.error) {
        toast.success('Monitoring started successfully');
        fetchInterfaceStatus();
      } else {
        toast.error(response.message || 'Failed to start monitoring');
      }
    } catch (error) {
      console.error('Error starting monitoring:', error);
      toast.error('Failed to start monitoring');
    }
  };

  const handleStopMonitoring = async () => {
    try {
      const data: any = {};
      if (selectedStation) data.stationId = selectedStation;
      if (selectedInterface) data.interfaceCode = selectedInterface;

      const response = await apiService.stopInterfaceMonitoring(data);
      if (!response.error) {
        toast.success('Monitoring stopped successfully');
        fetchInterfaceStatus();
      } else {
        toast.error(response.message || 'Failed to stop monitoring');
      }
    } catch (error) {
      console.error('Error stopping monitoring:', error);
      toast.error('Failed to stop monitoring');
    }
  };

  const handleRefreshCurrentData = async () => {
    setLoading(true);
    await fetchTanks();
  };

  const getOverallStatus = () => {
    const statuses = Object.values(interfaceStatus);
    if (statuses.length === 0) return 'unknown';
    
    const hasConnected = statuses.some((s: any) => s.isConnected);
    const hasMonitoring = statuses.some((s: any) => s.isMonitoring);
    
    if (hasConnected && hasMonitoring) return 'monitoring';
    if (hasConnected) return 'connected';
    return 'disconnected';
  };

  const getFillPercentage = (tank: Tank) => {
    if (!tank.capacity || tank.capacity === 0) return '0';
    return ((tank.current_volume / tank.capacity) * 100).toFixed(1);
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'online':
        return 'bg-green-100 text-green-800';
      case 'offline':
        return 'bg-red-100 text-red-800';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const [interfaces, setInterfaces] = useState<{ code: string; name: string }[]>([]);

  const fetchInterfaceTypes = async () => {
    try {
      const resp = await apiService.getInterfaceTypes();
      console.log('getInterfaceTypes response raw:', resp);

      // tolerate different response shapes
      const apiTypes = !resp.error && (resp.data?.interfaceTypes || resp.data?.interface_types || resp.data?.types || resp.data) 
        ? (resp.data.interfaceTypes || resp.data.interface_types || resp.data.types || resp.data.interfaceTypes || resp.data)
        : [];

      // make sure it's an array
      const apiList = Array.isArray(apiTypes) ? apiTypes : [];

      // station-level interface types from normalized stations
      const stationTypes = stations
        .filter(s => s.interface_code)
        .map(s => ({ code: s.interface_code, name: s.interface_name || s.interface_type_name || s.interface_code }));

      // merge and dedupe by code
      const merged = [...apiList.map((t: any) => ({ code: t.code, name: t.name })), ...stationTypes];
      const uniqueMap: Record<string, { code: string; name: string }> = {};
      merged.forEach((t) => {
        if (t?.code) uniqueMap[String(t.code).toUpperCase()] = { code: String(t.code), name: t.name || t.code };
      });
      let list = Object.values(uniqueMap);

      // If non-admin, restrict to interfaces present in stations
      if (!isAdmin) {
        const present = new Set(stations.map(s => s.interface_code).filter(Boolean));
        list = list.filter(i => present.has(i.code));
      }

      // Always add an "All Interfaces" option for admins (if not already present)
      if (isAdmin) {
        if (!list.find(i => i.code === 'ALL')) list.unshift({ code: 'ALL', name: 'All Interfaces' });
      }

      console.log('Final interfaces list:', list);
      setInterfaces(list);

      // default selection
      if (!selectedInterface && list.length > 0) {
        setSelectedInterface(list[0].code);
      }
    } catch (err) {
      console.error('Error fetching interface types:', err);
    }
  };

  useEffect(() => {
    // refresh interface types whenever stations or user role changes
    fetchInterfaceTypes();
  }, [stations, isAdmin]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-red-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-black">Tank Monitor</h1>
          <p className="text-gray-600">Real-time tank monitoring from all interfaces</p>
        </div>
        <div className="flex items-center space-x-2 text-sm text-gray-600">
          <Activity className="w-4 h-4" />
          <span>Real-time monitoring</span>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow-sm">
        <div className="flex items-center space-x-4">
          <Filter className="w-5 h-5 text-gray-400" />
          <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Station Filter - Only show for admin */}
            {isAdmin && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Station</label>
                <select
                  value={selectedStation}
                  onChange={(e) => setSelectedStation(e.target.value)}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500"
                >
                  <option value="">All Stations</option>
                  {stations.map(station => (
                    <option key={station.id} value={station.id}>
                      {station.name} ({station.interface_code})
                    </option>
                  ))}
                </select>
              </div>
            )}
            
            {/* Interface Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Interface</label>
              <select
                value={selectedInterface}
                onChange={(e) => setSelectedInterface(e.target.value)}
                className="w-full max-w-md rounded-md border-gray-300 shadow-sm"
              >
                {interfaces.map(i => (
                  <option key={i.code} value={i.code}>
                    {i.name} {i.code !== 'ALL' ? `(${i.code.toUpperCase()})` : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Interface Controls */}
      <div className="flex items-center justify-between bg-white p-4 rounded-lg shadow-sm">
        <div className="flex items-center space-x-4">
          <Building className="w-5 h-5 text-gray-400" />
          <span className="text-sm font-medium text-gray-700">Interface Controls</span>
        </div>
        <div className="flex items-center space-x-4">
        <button
          onClick={handleStartMonitoring}
          className="flex items-center px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
        >
          <Play className="w-4 h-4 mr-2" /> Start Monitoring
        </button>
        <button
          onClick={handleStopMonitoring}
          className="flex items-center px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          <Pause className="w-4 h-4 mr-2" /> Stop Monitoring
        </button>
        <button
          onClick={handleRefreshCurrentData}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          <RefreshCw className="w-4 h-4 mr-2" /> Refresh Data
        </button>
          <div className="text-sm">
            <span className="font-medium">Status: </span>
            <span className={`px-2 py-1 rounded text-xs font-medium ${
              getOverallStatus() === 'monitoring' ? 'bg-green-100 text-green-800' :
              getOverallStatus() === 'connected' ? 'bg-yellow-100 text-yellow-800' :
              'bg-red-100 text-red-800'
            }`}>
              {getOverallStatus().toUpperCase()}
            </span>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <div className="text-2xl font-bold text-gray-900">{tanks.length}</div>
          <div className="text-sm text-gray-500">Total Tanks</div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <div className="text-2xl font-bold text-green-600">
            {tanks.filter(t => parseFloat(getFillPercentage(t)) > 20).length}
          </div>
          <div className="text-sm text-gray-500">Normal Level</div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <div className="text-2xl font-bold text-yellow-600">
            {tanks.filter(t => {
              const fill = parseFloat(getFillPercentage(t));
              return fill <= 20 && fill > 10;
            }).length}
          </div>
          <div className="text-sm text-gray-500">Low Level</div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <div className="text-2xl font-bold text-red-600">
            {tanks.filter(t => parseFloat(getFillPercentage(t)) <= 10).length}
          </div>
          <div className="text-sm text-gray-500">Critical Level</div>
        </div>
      </div>

      {/* Tank Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {tanks.map((tank) => {
          const fillPercentage = getFillPercentage(tank);
          const isLowLevel = parseFloat(fillPercentage) <= 20;
          const isHighWater = (tank.water_level || 0) > 50;

          return (
            <div
              key={tank.id}
              className={`bg-white rounded-lg shadow-sm border-2 cursor-pointer transition-all hover:shadow-md ${
                isLowLevel ? 'border-red-300' : 'border-gray-200'
              }`}
              onClick={() => setSelectedTank(tank)}
            >
              <div className="p-4">
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-2">
                    <Fuel className={`w-5 h-5 ${isLowLevel ? 'text-red-500' : 'text-blue-500'}`} />
                    <div>
                      <div className="font-semibold text-black">Tank {tank.tank_number}</div>
                      <div className="text-sm text-gray-600 capitalize">{tank.fuel_type}</div>
                      <div className="text-xs text-gray-500">{tank.station.name}</div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end space-y-1">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(tank.status)}`}>
                      {tank.status.toUpperCase()}
                    </span>
                    {isLowLevel && <AlertTriangle className="w-4 h-4 text-red-500" />}
                    {isHighWater && <Droplets className="w-4 h-4 text-red-500" />}
                  </div>
                </div>

                {/* Tank Visual */}
                <div className="mb-4">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-600">Fuel Level</span>
                    <span className={`font-medium ${isLowLevel ? 'text-red-600' : 'text-black'}`}>
                      {fillPercentage}%
                    </span>
                  </div>
                  <div className="relative w-40 h-32 mx-auto border-2 border-gray-300 rounded-lg overflow-hidden">
                    {/* Tank Fill */}
                    <div 
                      className={`absolute bottom-0 w-full transition-all duration-500 ${
                        isLowLevel ? 'bg-red-600' : fillPercentage > 80 ? 'bg-green-500' : 'bg-blue-500'
                      }`}
                      style={{ height: `${fillPercentage}%` }}
                    ></div>
                    {/* Level Lines */}
                    <div className="absolute w-full h-full flex flex-col justify-between py-1">
                      <div className="w-full border-t border-gray-300"></div>
                      <div className="w-full border-t border-gray-300"></div>
                      <div className="w-full border-t border-gray-300"></div>
                      <div className="w-full border-t border-gray-300"></div>
                    </div>
                    
                    {/* Volume Display */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-sm font-medium text-white drop-shadow-md">
                        {tank.current_volume?.toFixed(0) || '0'}L
                      </span>
                    </div>
                  </div>
                  <div className="flex justify-between text-xs text-gray-500 mt-2">
                    <span>0L</span>
                    <span>{tank.capacity?.toFixed(0) || '0'}L</span>
                  </div>
                </div>

                {/* Sensor Data */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Thermometer className="w-4 h-4 text-orange-500" />
                      <span className="text-sm text-gray-600">Temperature</span>
                    </div>
                    <span className="text-sm font-medium text-black">
                      {tank.temperature ? `${tank.temperature.toFixed(1)}°C` : 'N/A'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Droplets className={`w-4 h-4 ${isHighWater ? 'text-red-500' : 'text-blue-500'}`} />
                      <span className="text-sm text-gray-600">Water Level</span>
                    </div>
                    <span className={`text-sm font-medium ${isHighWater ? 'text-red-600' : 'text-black'}`}>
                      {tank.water_level ? `${tank.water_level.toFixed(1)}mm` : '0mm'}
                    </span>
                  </div>

                  {tank.pressure && (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Activity className="w-4 h-4 text-purple-500" />
                        <span className="text-sm text-gray-600">Pressure</span>
                      </div>
                      <span className="text-sm font-medium text-black">
                        {tank.pressure?.toFixed(1) || '0'} PSI
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Tank Details Modal */}
      {selectedTank && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-black">
                Tank {selectedTank.tank_number} Details
              </h2>
              <button
                onClick={() => setSelectedTank(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                ×
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Basic Information */}
              <div className="space-y-4">
                <h3 className="font-semibold text-black">Basic Information</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Tank Number:</span>
                    <span className="font-medium text-black">{selectedTank.tank_number}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Name:</span>
                    <span className="font-medium text-black">{selectedTank.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Fuel Type:</span>
                    <span className="font-medium text-black capitalize">{selectedTank.fuel_type}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Status:</span>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(selectedTank.status)}`}>
                      {selectedTank.status.toUpperCase()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Capacity Information */}
              <div className="space-y-4">
                <h3 className="font-semibold text-black">Capacity Information</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Capacity:</span>
                    <span className="font-medium text-black">{selectedTank.capacity?.toFixed(0) || '0'}L</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Current Volume:</span>
                    <span className="font-medium text-black">{selectedTank.current_volume?.toFixed(0) || '0'}L</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Fill Percentage:</span>
                    <span className="font-medium text-black">{getFillPercentage(selectedTank)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Available Space:</span>
                    <span className="font-medium text-black">
                      {((selectedTank.capacity || 0) - (selectedTank.current_volume || 0)).toFixed(0)}L
                    </span>
                  </div>
                </div>
              </div>

              {/* Sensor Readings */}
              <div className="space-y-4">
                <h3 className="font-semibold text-black">Sensor Readings</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Temperature:</span>
                    <span className="font-medium text-black">
                      {selectedTank.temperature ? `${selectedTank.temperature.toFixed(1)}°C` : 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Water Level:</span>
                    <span className={`font-medium ${(selectedTank.water_level || 0) > 50 ? 'text-red-600' : 'text-black'}`}>
                      {selectedTank.water_level ? `${selectedTank.water_level.toFixed(1)}mm` : '0mm'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Pressure:</span>
                    <span className="font-medium text-black">
                      {selectedTank.pressure ? `${selectedTank.pressure.toFixed(1)} PSI` : 'N/A'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Station Information */}
              <div className="space-y-4">
                <h3 className="font-semibold text-black">Station Information</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Station:</span>
                    <span className="font-medium text-black">{selectedTank.station.name}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end mt-6">
              <button
                onClick={() => setSelectedTank(null)}
                className="px-4 py-2 bg-gray-300 text-black rounded-lg hover:bg-gray-400"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TankMonitor;
import React, { useState, useEffect } from 'react';
import { Activity, Filter, Download, RefreshCw, Calendar, Building } from 'lucide-react';
import apiService from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'react-hot-toast';

interface Transaction {
  id: string;
  transaction_id: string;
  station_id: string;
  station_code: string;
  station_name: string;
  pump_id?: string;
  volume: number | string;
  tc_volume: string;
  unit_price: number | string;
  total_amount: number | string;
  discount_amount: string;
  transaction_date: string;
  transaction_time: string;
  interface_source: string;
  customer_name?: string;
  card_description?: string;
  created_at: string;
  efd_serial_number?: string;
  ewura_sent_at?: string;
  sent_to_ewura: boolean;
  fuel_grade_name?: string;
  payment_method?: string;
  product_code?: string;
  product_id?: string;
  product_name?: string;
  receipt_number?: string;
  tank_id?: string;
  user_id?: string;
  user_name?: string;
  station?: {
    name: string;
    code: string;
  };
}

interface Station {
  id: string;
  name: string;
  code: string;
  interface_code: string;
  interface_name: string;
}

const Transactions: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [stations, setStations] = useState<Station[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStation, setSelectedStation] = useState<string>('');
  const [selectedInterface, setSelectedInterface] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [limit, setLimit] = useState<number>(50);
  const [interfaces, setInterfaces] = useState<{ code: string; name: string }[]>([]);
  const { user } = useAuth();

  const isAdmin = user?.role === 'admin' || user?.role_code === 'ADMIN';

  useEffect(() => {
    fetchStations();
  }, []);

  useEffect(() => {
    // Only fetch if we have stations and either:
    // 1. User is admin and a station is selected (or no selection for all stations)
    // 2. User is not admin and has their station assigned
    if (stations.length > 0 && (
      (isAdmin && (selectedStation || selectedStation === '')) || 
      (!isAdmin && stations[0]?.id)
    )) {
      fetchTransactions();
    }
  }, [selectedStation, selectedInterface, selectedDate, limit, stations]);

  useEffect(() => {
    // refresh interface types whenever stations or user role changes
    fetchInterfaceTypes();
  }, [stations, isAdmin]);

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
        .map(s => ({ code: s.interface_code, name: s.interface_name || s.interface_code }));

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

      // Always add an "All Interfaces" option for admins
      if (isAdmin && !list.find(i => i.code === 'ALL')) {
        list.unshift({ code: 'ALL', name: 'All Interfaces' });
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

  const fetchStations = async () => {
    try {
      const response = await apiService.getAccessibleStations();
      console.log('getAccessibleStations response raw:', response);

      let stationList = !response.error && response.data?.stations ? response.data.stations : [];

      // If admin and accessible list is small, fetch full stations list as fallback
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

      console.log('Normalized stations:', normalized);
      setStations(normalized);
      
      // Set default station for non-admin users
      if (!isAdmin && normalized.length > 0) {
        setSelectedStation(normalized[0].id);
        setSelectedInterface(normalized[0].interface_code || '');
      }
    } catch (error) {
      console.error('Error fetching stations:', error);
      toast.error('Failed to fetch stations');
    }
  };

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      
      const params: any = {
        date: selectedDate,
        limit: limit.toString()
      };
      
      // For non-admin users, always use their assigned station
      if (!isAdmin && stations[0]?.id) {
        params.stationId = stations[0].id;
      } 
      // For admin users, use selected station if any
      else if (isAdmin && selectedStation) {
        params.stationId = selectedStation;
      }

      // Only add interface filter if selected
      if (selectedInterface) {
        params.interfaceCode = selectedInterface;
      }

      console.log('Fetching transactions with params:', params);
      const response = await apiService.getTransactionsUnified(params);
      
      console.log('Transactions API response:', {
        error: response.error,
        message: response.message,
        count: response.data?.transactions?.length,
        transactions: response.data?.transactions
      });
      
      if (!response.error && response.data?.transactions) {
        // Fix: Remove 'r' prefix and fix string template syntax
        console.log('New transactions:', response.data.transactions);
        
        // Log individual transactions for debugging
        response.data.transactions.forEach((tx: Transaction, index: number) => {
          console.log(`Transaction ${index + 1}:`, {
            // Basic Info
            id: tx.id,
            transaction_id: tx.transaction_id,
            station: {
              id: tx.station_id,
              name: tx.station_name,
              code: tx.station_code
            },
            
            // Transaction Details
            volume: tx.volume,
            tc_volume: tx.tc_volume,
            unit_price: tx.unit_price,
            total_amount: tx.total_amount,
            discount_amount: tx.discount_amount,
            
            // Product Info
            product: {
              id: tx.product_id,
              code: tx.product_code,
              name: tx.product_name,
              grade: tx.fuel_grade_name
            },
            
            // Equipment Info
            pump_id: tx.pump_id,
            tank_id: tx.tank_id,
            efd_serial: tx.efd_serial_number,
            
            // Customer & Payment
            customer_name: tx.customer_name,
            payment_method: tx.payment_method,
            card_description: tx.card_description,
            receipt_number: tx.receipt_number,
            
            // Timestamps & Status
            date: tx.transaction_date,
            time: tx.transaction_time,
            created_at: tx.created_at,
            interface: tx.interface_source,
            ewura_status: {
              sent: tx.sent_to_ewura,
              sent_at: tx.ewura_sent_at
            },
            
            // User Info
            user: {
              id: tx.user_id,
              name: tx.user_name
            }
          });
        });

        setTransactions(response.data.transactions);
      } else {
        setTransactions([]);
        if (response.error) {
          toast.error(response.message || 'Failed to fetch transactions');
        }
      }
    } catch (error) {
      console.error('Error fetching transactions:', error);
      toast.error('Failed to fetch transactions');
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    fetchTransactions();
  };

  const handleExport = async () => {
    try {
      // TODO: Implement export functionality
      toast.success('Export functionality will be implemented');
    } catch (error) {
      toast.error('Export failed');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-TZ', {
      style: 'currency',
      currency: 'TZS'
    }).format(amount);
  };

  const formatVolume = (volume: number | string | null | undefined): string => {
    // Handle null/undefined
    if (volume == null) return '0.00 L';
    
    // Convert to number if string
    const numVolume = typeof volume === 'string' ? parseFloat(volume) : volume;
    
    // Check if valid number
    if (isNaN(numVolume)) return '0.00 L';
    
    return `${numVolume.toFixed(2)} L`;
  };

  const getInterfaceColor = (interfaceSource: string) => {
    switch (interfaceSource?.toUpperCase()) {
      case 'NPGIS':
      case 'ATG':
        return 'bg-blue-100 text-blue-800';
      case 'NFPP':
      case 'PTS':
      case 'VFD':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Transactions</h1>
          <p className="text-gray-600">Monitor fuel sales transactions from all interfaces</p>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={handleRefresh}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </button>
          <button
            onClick={handleExport}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center"
          >
            <Download className="w-4 h-4 mr-2" />
            Export
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow-sm">
        <div className="flex items-center space-x-4">
          <Filter className="w-5 h-5 text-gray-400" />
          <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-4">
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
                      {station.name} ({station.interface_code || 'Unknown'})
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
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500"
                disabled={!isAdmin && stations[0]?.interface_code}
              >
                {interfaces.map(i => (
                  <option key={i.code} value={i.code}>
                    {i.name} {i.code !== 'ALL' ? `(${i.code})` : ''}
                  </option>
                ))}
              </select>
            </div>
            
            {/* Date Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500"
              />
            </div>
            
            {/* Limit Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Limit</label>
              <select
                value={limit}
                onChange={(e) => setLimit(parseInt(e.target.value))}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500"
              >
                <option value={20}>20 records</option>
                <option value={50}>50 records</option>
                <option value={100}>100 records</option>
                <option value={200}>200 records</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <div className="text-2xl font-bold text-gray-900">{transactions.length}</div>
          <div className="text-sm text-gray-500">Total Transactions</div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <div className="text-2xl font-bold text-blue-600">
            {formatVolume(transactions.reduce((sum, tx) => {
              const txVolume = typeof tx.volume === 'string' ? parseFloat(tx.volume) : (tx.volume || 0);
              return sum + (isNaN(txVolume) ? 0 : txVolume);
            }, 0))}
          </div>
          <div className="text-sm text-gray-500">Total Volume</div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <div className="text-2xl font-bold text-green-600">
            {formatCurrency(transactions.reduce((sum, tx) => sum + (tx.total_amount || 0), 0))}
          </div>
          <div className="text-sm text-gray-500">Total Sales</div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <div className="text-2xl font-bold text-purple-600">
            {transactions.filter(tx => tx.interface_source === 'NPGIS').length}
          </div>
          <div className="text-sm text-gray-500">NPGIS Transactions</div>
        </div>
      </div>

      {/* Transactions Table */}
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
                    Transaction
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Station
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Volume
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Interface
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date/Time
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {transactions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                      No transactions found for the selected filters.
                    </td>
                  </tr>
                ) : (
                  transactions.map((transaction) => (
                    <tr key={transaction.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <Activity className="w-8 h-8 text-gray-400 mr-3" />
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              #{transaction.transaction_id}
                            </div>
                            <div className="text-sm text-gray-500">
                              {transaction.customer_name || 'N/A'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <Building className="w-5 h-5 text-gray-400 mr-2" />
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {transaction.station?.name || 'Unknown'}
                            </div>
                            <div className="text-sm text-gray-500">
                              {transaction.station?.code || 'N/A'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {formatVolume(transaction.volume)}
                        </div>
                        <div className="text-sm text-gray-500">
                          {transaction.fuel_grade_name || 'Unknown Grade'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {formatCurrency(transaction.total_amount)}
                        </div>
                        <div className="text-sm text-gray-500">
                          @ {formatCurrency(transaction.unit_price)}/L
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getInterfaceColor(transaction.interface_source)}`}>
                          {transaction.interface_source || 'Unknown'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="flex items-center">
                          <Calendar className="w-4 h-4 text-gray-400 mr-2" />
                          <div>
                            <div>{transaction.transaction_date}</div>
                            <div className="text-gray-500">{transaction.transaction_time}</div>
                          </div>
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
    </div>
  );
};

export default Transactions;
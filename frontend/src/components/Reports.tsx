import React, { useState, useEffect } from 'react';
import { Download, Filter, Clock, X, Calendar, ChevronDown, FileText, TrendingUp, Plus,AlertTriangle } from 'lucide-react';
import apiService from '../services/api';
import { toast } from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';

interface ReportData {
  id: string;
  stationId: string;
  stationName: string;
  reportDate: string;
  reportNo: string;
  generatedAt: string;
  numberOfTransactions: number;
  totalAmount: number;
  totalDiscount: number;
  totalVolume: number;
  status: 'PROCESSED' | 'PENDING' | 'FAILED';
  ewuraSent: boolean;
  ewuraSentAt?: string;
  interfaceSource: string;
}

interface Station {
  id: string;
  name: string;
  code: string;
  interface_code: string;
}

const Reports: React.FC = () => {
  const [reports, setReports] = useState<ReportData[]>([]);
  const [stations, setStations] = useState<Station[]>([]);
  const [loading, setLoading] = useState(true);
  const [showTimeModal, setShowTimeModal] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [entriesPerPage, setEntriesPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedStation, setSelectedStation] = useState('');
  const { user } = useAuth();

  const isAdmin = user?.role === 'admin' || user?.user_role?.code === 'ADMIN';

  const [timeSettings, setTimeSettings] = useState({
    generationTime: '07:30',
    ewuraSendTime: '08:00',
    timezone: 'Africa/Dar_es_Salaam'
  });

  const [filterSettings, setFilterSettings] = useState({
    fromDate: '',
    toDate: '',
    status: '',
    stationId: '',
    interfaceType: ''
  });

  const [generateSettings, setGenerateSettings] = useState({
    stationId: '',
    reportDate: new Date().toISOString().split('T')[0],
    includeTransactions: true,
    includeTankReadings: true,
    sendToEwura: false
  });

  useEffect(() => {
    fetchStations();
    fetchReports();
    fetchReportSettings();
  }, []);

  useEffect(() => {
    fetchReports();
  }, [selectedStation]);

  const fetchStations = async () => {
    try {
      const response = await apiService.getAccessibleStations();
      if (!response.error && response.data?.stations) {
        setStations(response.data.stations);
        
        // Set default station for non-admin users
        if (!isAdmin && response.data.stations.length > 0) {
          setSelectedStation(response.data.stations[0].id);
        }
      }
    } catch (error) {
      console.error('Error fetching stations:', error);
      toast.error('Failed to fetch stations');
    }
  };

  const fetchReports = async () => {
    try {
      const params: any = {};
      if (selectedStation) params.stationId = selectedStation;
      if (filterSettings.fromDate) params.fromDate = filterSettings.fromDate;
      if (filterSettings.toDate) params.toDate = filterSettings.toDate;
      if (filterSettings.status) params.status = filterSettings.status;

      const response = await apiService.getReports(params);
      if (!response.error && response.data?.reports) {
        setReports(response.data.reports);
      } else {
        // Generate sample data for demonstration
        const sampleReports: ReportData[] = [
          {
            id: '1',
            stationId: selectedStation || 'sample-1',
            stationName: 'Sample Station 1',
            reportDate: '2025-01-17',
            reportNo: '20250117',
            generatedAt: '2025-01-17T07:30:00Z',
            numberOfTransactions: 333,
            totalAmount: 3989942,
            totalDiscount: 0,
            totalVolume: 1393.13,
            status: 'PROCESSED',
            ewuraSent: true,
            ewuraSentAt: '2025-01-17T08:00:00Z',
            interfaceSource: 'NPGIS'
          },
          {
            id: '2',
            stationId: selectedStation || 'sample-2',
            stationName: 'Sample Station 2',
            reportDate: '2025-01-16',
            reportNo: '20250116',
            generatedAt: '2025-01-16T07:30:00Z',
            numberOfTransactions: 615,
            totalAmount: 7120544,
            totalDiscount: 0,
            totalVolume: 2435.26,
            status: 'PROCESSED',
            ewuraSent: false,
            interfaceSource: 'NFPP'
          }
        ];
        setReports(sampleReports);
      }
    } catch (error) {
      console.error('Error fetching reports:', error);
      toast.error('Failed to fetch reports');
    } finally {
      setLoading(false);
    }
  };

  const fetchReportSettings = async () => {
    try {
      const response = await apiService.getReportGenerationSettings();
      if (!response.error && response.data?.settings) {
        setTimeSettings(response.data.settings);
      }
    } catch (error) {
      console.error('Error fetching report settings:', error);
    }
  };

  const handleTimeSubmit = async () => {
    try {
      const response = await apiService.updateReportGenerationSettings(timeSettings);
      if (!response.error) {
        toast.success('Report generation time updated successfully');
        setShowTimeModal(false);
      } else {
        toast.error(response.message || 'Failed to update settings');
      }
    } catch (error) {
      console.error('Error updating time settings:', error);
      toast.error('Failed to update time settings');
    }
  };

  const handleFilterSubmit = () => {
    setShowFilterModal(false);
    fetchReports();
    toast.success('Filters applied successfully');
  };

  const handleGenerateReport = async () => {
    try {
      const response = await apiService.generateDailyReport({
        stationId: generateSettings.stationId,
        date: generateSettings.reportDate
      });

      if (!response.error) {
        toast.success('Report generated successfully');
        setShowGenerateModal(false);
        fetchReports();
      } else {
        toast.error(response.message || 'Failed to generate report');
      }
    } catch (error) {
      console.error('Error generating report:', error);
      toast.error('Failed to generate report');
    }
  };

  const handleExport = async (reportId: string, format: string = 'pdf') => {
    try {
      const response = await apiService.exportReport(reportId, format);
      if (!response.error) {
        toast.success(`Report exported as ${format.toUpperCase()}`);
        // Handle file download here
      } else {
        toast.error('Failed to export report');
      }
    } catch (error) {
      console.error('Error exporting report:', error);
      toast.error('Failed to export report');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PROCESSED':
        return <FileText className="w-5 h-5 text-green-500" />;
      case 'PENDING':
        return <Clock className="w-5 h-5 text-yellow-500" />;
      case 'FAILED':
        return <AlertTriangle className="w-5 h-5 text-red-500" />;
      default:
        return <FileText className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PROCESSED':
        return 'bg-green-100 text-green-800';
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800';
      case 'FAILED':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredReports = reports.filter(report =>
    report.reportNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    report.stationName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPages = Math.ceil(filteredReports.length / entriesPerPage);
  const startIndex = (currentPage - 1) * entriesPerPage;
  const paginatedReports = filteredReports.slice(startIndex, startIndex + entriesPerPage);

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
          <h1 className="text-2xl font-bold text-gray-900">Tank Reports</h1>
          <p className="text-gray-600">Generate and manage daily tank reports</p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowGenerateModal(true)}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center space-x-2 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Generate Report</span>
          </button>
          <button
            onClick={() => setShowFilterModal(true)}
            className="bg-black text-white px-4 py-2 rounded-lg hover:bg-gray-900 flex items-center space-x-2 transition-colors"
          >
            <Filter className="w-4 h-4" />
            <span>Filter Report</span>
          </button>
          <button
            onClick={() => setShowTimeModal(true)}
            className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 flex items-center space-x-2 transition-colors"
          >
            <Clock className="w-4 h-4" />
            <span>Report Settings</span>
            <ChevronDown className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Station Filter for Admin */}
      {isAdmin && (
        <div className="bg-white p-4 rounded-lg shadow-sm">
          <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Station</label>
          <select
            value={selectedStation}
            onChange={(e) => setSelectedStation(e.target.value)}
            className="w-full max-w-md rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500"
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

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <div className="text-2xl font-bold text-gray-900">{reports.length}</div>
          <div className="text-sm text-gray-500">Total Reports</div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <div className="text-2xl font-bold text-green-600">
            {reports.filter(r => r.status === 'PROCESSED').length}
          </div>
          <div className="text-sm text-gray-500">Processed</div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <div className="text-2xl font-bold text-blue-600">
            {reports.filter(r => r.ewuraSent).length}
          </div>
          <div className="text-sm text-gray-500">Sent to EWURA</div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <div className="text-2xl font-bold text-yellow-600">
            {reports.filter(r => r.status === 'PENDING').length}
          </div>
          <div className="text-sm text-gray-500">Pending</div>
        </div>
      </div>

      {/* Search Controls */}
      <div className="bg-white p-4 rounded-lg shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">Show</span>
              <select
                value={entriesPerPage}
                onChange={(e) => setEntriesPerPage(Number(e.target.value))}
                className="px-3 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
              <span className="text-sm text-gray-600">entries</span>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600">Search:</span>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="px-3 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Search reports..."
            />
          </div>
        </div>
      </div>

      {/* Reports Table */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 border-r border-gray-200">
                  Station
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 border-r border-gray-200">
                  Report Date
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 border-r border-gray-200">
                  Report No.
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 border-r border-gray-200">
                  Transactions
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 border-r border-gray-200">
                  Total Amount
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 border-r border-gray-200">
                  Total Volume
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 border-r border-gray-200">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 border-r border-gray-200">
                  EWURA
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {paginatedReports.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-8 text-center text-gray-500">
                    No reports found. Click "Generate Report" to create a new report.
                  </td>
                </tr>
              ) : (
                paginatedReports.map((report, index) => (
                  <tr key={report.id} className={index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                    <td className="px-4 py-3 text-sm border-r border-gray-200">
                      <div className="flex items-center">
                        <FileText className="w-5 h-5 text-gray-400 mr-2" />
                        <div>
                          <div className="font-medium text-gray-900">{report.stationName}</div>
                          <div className="text-gray-500 text-xs">{report.interfaceSource}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 border-r border-gray-200">
                      {new Date(report.reportDate).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 border-r border-gray-200">
                      {report.reportNo}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 border-r border-gray-200">
                      {report.numberOfTransactions.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 border-r border-gray-200">
                      {new Intl.NumberFormat('en-TZ', {
                        style: 'currency',
                        currency: 'TZS'
                      }).format(report.totalAmount)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 border-r border-gray-200">
                      {report.totalVolume.toFixed(2)} L
                    </td>
                    <td className="px-4 py-3 text-sm border-r border-gray-200">
                      <div className="flex items-center">
                        {getStatusIcon(report.status)}
                        <span className={`ml-2 px-2 py-1 text-xs font-medium rounded ${getStatusColor(report.status)}`}>
                          {report.status}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm border-r border-gray-200">
                      <span className={`px-2 py-1 text-xs font-medium rounded ${
                        report.ewuraSent ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {report.ewuraSent ? 'SENT' : 'NOT SENT'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleExport(report.id, 'pdf')}
                          className="bg-blue-500 text-white p-2 rounded hover:bg-blue-600"
                          title="Export as PDF"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleExport(report.id, 'excel')}
                          className="bg-green-500 text-white p-2 rounded hover:bg-green-600"
                          title="Export as Excel"
                        >
                          <TrendingUp className="w-4 h-4" />
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

      {/* Pagination */}
      <div className="flex items-center justify-between bg-white px-4 py-3 rounded-lg shadow-sm">
        <div className="text-sm text-gray-700">
          Showing {startIndex + 1} to {Math.min(startIndex + entriesPerPage, filteredReports.length)} of {filteredReports.length} entries
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-red-600 hover:text-white transition-colors"
          >
            Previous
          </button>
          <span className="text-sm text-gray-700">
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-red-600 hover:text-white transition-colors"
          >
            Next
          </button>
        </div>
      </div>

      {/* Generate Report Modal */}
      {showGenerateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-black">Generate Daily Report</h2>
              <button
                onClick={() => setShowGenerateModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              {isAdmin && (
                <div>
                  <label className="block text-sm font-medium text-black mb-1">
                    Station <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={generateSettings.stationId}
                    onChange={(e) => setGenerateSettings({ ...generateSettings, stationId: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                    required
                  >
                    <option value="">Select Station</option>
                    {stations.map(station => (
                      <option key={station.id} value={station.id}>
                        {station.name} ({station.interface_code})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-black mb-1">
                  Report Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={generateSettings.reportDate}
                  onChange={(e) => setGenerateSettings({ ...generateSettings, reportDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={generateSettings.includeTransactions}
                    onChange={(e) => setGenerateSettings({ ...generateSettings, includeTransactions: e.target.checked })}
                    className="rounded border-gray-300 text-red-600 focus:ring-red-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">Include Transactions</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={generateSettings.includeTankReadings}
                    onChange={(e) => setGenerateSettings({ ...generateSettings, includeTankReadings: e.target.checked })}
                    className="rounded border-gray-300 text-red-600 focus:ring-red-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">Include Tank Readings</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={generateSettings.sendToEwura}
                    onChange={(e) => setGenerateSettings({ ...generateSettings, sendToEwura: e.target.checked })}
                    className="rounded border-gray-300 text-red-600 focus:ring-red-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">Send to EWURA</span>
                </label>
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowGenerateModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-black hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleGenerateReport}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                Generate
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Report Generation Time Modal */}
      {showTimeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-black">Report Generation Settings</h2>
              <button
                onClick={() => setShowTimeModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-black mb-1">
                  Report Generation Time <span className="text-red-500">*</span>
                </label>
                <input
                  type="time"
                  value={timeSettings.generationTime}
                  onChange={(e) => setTimeSettings({ ...timeSettings, generationTime: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">Time when daily reports are automatically generated</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-black mb-1">
                  EWURA Send Time <span className="text-red-500">*</span>
                </label>
                <input
                  type="time"
                  value={timeSettings.ewuraSendTime}
                  onChange={(e) => setTimeSettings({ ...timeSettings, ewuraSendTime: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">Time when reports are automatically sent to EWURA</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-black mb-1">Timezone</label>
                <select
                  value={timeSettings.timezone}
                  onChange={(e) => setTimeSettings({ ...timeSettings, timezone: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Africa/Dar_es_Salaam">Africa/Dar_es_Salaam (EAT)</option>
                  <option value="UTC">UTC</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowTimeModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-black hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleTimeSubmit}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Save Settings
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Filter Modal */}
      {showFilterModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-black">Filter Reports</h2>
              <button
                onClick={() => setShowFilterModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-black mb-1">Date Range</label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="date"
                    value={filterSettings.fromDate}
                    onChange={(e) => setFilterSettings({ ...filterSettings, fromDate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="From Date"
                  />
                  <input
                    type="date"
                    value={filterSettings.toDate}
                    onChange={(e) => setFilterSettings({ ...filterSettings, toDate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="To Date"
                  />
                </div>
              </div>

              {isAdmin && (
                <div>
                  <label className="block text-sm font-medium text-black mb-1">Station</label>
                  <select
                    value={filterSettings.stationId}
                    onChange={(e) => setFilterSettings({ ...filterSettings, stationId: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">All Stations</option>
                    {stations.map(station => (
                      <option key={station.id} value={station.id}>
                        {station.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-black mb-1">Status</label>
                <select
                  value={filterSettings.status}
                  onChange={(e) => setFilterSettings({ ...filterSettings, status: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Status</option>
                  <option value="PROCESSED">Processed</option>
                  <option value="PENDING">Pending</option>
                  <option value="FAILED">Failed</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-black mb-1">Interface Type</label>
                <select
                  value={filterSettings.interfaceType}
                  onChange={(e) => setFilterSettings({ ...filterSettings, interfaceType: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Interfaces</option>
                  <option value="NPGIS">NPGIS (ATG)</option>
                  <option value="NFPP">NFPP (PTS/VFD)</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowFilterModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-black hover:bg-gray-50"
              >
                Close
              </button>
              <button
                onClick={handleFilterSubmit}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Apply Filters
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Reports
import React, { useState, useEffect } from 'react';
import { Download, Filter, Clock, X, Calendar, ChevronDown } from 'lucide-react';
import apiService from '../services/api';

interface ReportData {
  id: string;
  date: string;
  report_no: string;
  number_of_transactions: number;
  total_amount: number;
  total_discount: number;
  total_volume: number;
  status: 'PROCESSED' | 'PENDING';
}

const Reports: React.FC = () => {
  const [reports, setReports] = useState<ReportData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showTimeModal, setShowTimeModal] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [entriesPerPage, setEntriesPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  
  const [timeSettings, setTimeSettings] = useState({
    generationTime: '07:30',
    updateTime: '00:00'
  });

  const [filterSettings, setFilterSettings] = useState({
    fromDate: '',
    toDate: '',
    status: '',
    reportType: ''
  });

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      // Generate sample data that matches the image structure
      const sampleReports: ReportData[] = [
        {
          id: '1',
          date: '01-02-2025, 07:02:04',
          report_no: '20250201',
          number_of_transactions: 333,
          total_amount: 3989942,
          total_discount: 0,
          total_volume: 1393.13,
          status: 'PROCESSED'
        },
        {
          id: '2',
          date: '01-03-2025, 07:30:11',
          report_no: '20250301',
          number_of_transactions: 615,
          total_amount: 7120544,
          total_discount: 0,
          total_volume: 2435.26,
          status: 'PROCESSED'
        },
        {
          id: '3',
          date: '01-04-2025, 07:30:19',
          report_no: '20250401',
          number_of_transactions: 313,
          total_amount: 5905221,
          total_discount: 0,
          total_volume: 1924.33,
          status: 'PROCESSED'
        },
        {
          id: '4',
          date: '01-06-2025, 07:30:27',
          report_no: '20250601',
          number_of_transactions: 0,
          total_amount: 0,
          total_discount: 0,
          total_volume: 0.00,
          status: 'PENDING'
        },
        {
          id: '5',
          date: '01-07-2025, 07:30:12',
          report_no: '20250701',
          number_of_transactions: 0,
          total_amount: 0,
          total_discount: 0,
          total_volume: 0.00,
          status: 'PENDING'
        },
        {
          id: '6',
          date: '02-02-2025, 07:01:55',
          report_no: '20250202',
          number_of_transactions: 0,
          total_amount: 0,
          total_discount: 0,
          total_volume: 0.00,
          status: 'PROCESSED'
        },
        {
          id: '7',
          date: '02-03-2025, 07:30:30',
          report_no: '20250302',
          number_of_transactions: 204,
          total_amount: 4687232,
          total_discount: 0,
          total_volume: 1591.65,
          status: 'PROCESSED'
        },
        {
          id: '8',
          date: '02-04-2025, 07:31:43',
          report_no: '20250402',
          number_of_transactions: 0,
          total_amount: 0,
          total_discount: 0,
          total_volume: 0.00,
          status: 'PROCESSED'
        }
      ];
      setReports(sampleReports);
    } catch (error) {
      console.error('Error fetching reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTimeSubmit = () => {
    console.log('Time settings updated:', timeSettings);
    setShowTimeModal(false);
    // Here you would typically send the time settings to the backend
  };

  const handleFilterSubmit = () => {
    console.log('Filter settings applied:', filterSettings);
    setShowFilterModal(false);
    // Here you would typically filter the reports based on the settings
  };

  const handleExport = (reportId: string) => {
    console.log('Exporting report:', reportId);
    // Implement export functionality
  };

  const filteredReports = reports.filter(report =>
    report.report_no.toLowerCase().includes(searchTerm.toLowerCase()) ||
    report.date.toLowerCase().includes(searchTerm.toLowerCase())
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
        <h1 className="text-2xl font-bold text-black">Tank Reports</h1>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowFilterModal(true)}
            className="bg-black text-white px-4 py-2 rounded hover:bg-gray-900 flex items-center space-x-2 transition-colors"
          >
            <Filter className="w-4 h-4" />
            <span>Filter Report</span>
          </button>
          <button
            onClick={() => setShowTimeModal(true)}
            className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 flex items-center space-x-2 transition-colors"
          >
            <Clock className="w-4 h-4" />
            <span>+ Report Generation Time</span>
            <ChevronDown className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Controls */}
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
                  Date
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 border-r border-gray-200">
                  Report No.
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 border-r border-gray-200">
                  Number of Transaction
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 border-r border-gray-200">
                  Total Amount
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 border-r border-gray-200">
                  Total Discount
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 border-r border-gray-200">
                  Total Volume
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 border-r border-gray-200">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {paginatedReports.map((report, index) => (
                <tr key={report.id} className={index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                  <td className="px-4 py-3 text-sm text-gray-900 border-r border-gray-200">
                    {report.date}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900 border-r border-gray-200">
                    {report.report_no}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900 border-r border-gray-200">
                    {report.number_of_transactions}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900 border-r border-gray-200">
                    {report.total_amount.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900 border-r border-gray-200">
                    {report.total_discount}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900 border-r border-gray-200">
                    {report.total_volume.toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-sm border-r border-gray-200">
                    <span className={`px-2 py-1 text-xs font-medium rounded ${
                      report.status === 'PROCESSED' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {report.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <button
                      onClick={() => handleExport(report.id)}
                      className="bg-blue-500 text-white p-2 rounded hover:bg-blue-600"
                      title="Export Report"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
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

      {/* Report Generation Time Modal */}
      {showTimeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-black">Report Generation Time</h2>
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
                  Generation Time <span className="text-red-500">*</span>
                </label>
                <input
                  type="time"
                  value={timeSettings.generationTime}
                  onChange={(e) => setTimeSettings({ ...timeSettings, generationTime: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-black mb-1">
                  Update Time <span className="text-red-500">*</span>
                </label>
                <input
                  type="time"
                  value={timeSettings.updateTime}
                  onChange={(e) => setTimeSettings({ ...timeSettings, updateTime: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
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
                SUBMIT
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Filter Report Modal */}
      {showFilterModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-black">Filter Report</h2>
              <button
                onClick={() => setShowFilterModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-black mb-1">
                  Report Date <span className="text-red-500">*</span>
                </label>
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
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-black mb-1">Report Type</label>
                <select
                  value={filterSettings.reportType}
                  onChange={(e) => setFilterSettings({ ...filterSettings, reportType: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Types</option>
                  <option value="daily">Daily Report</option>
                  <option value="weekly">Weekly Report</option>
                  <option value="monthly">Monthly Report</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowFilterModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-black hover:bg-gray-50"
              >
                CLOSE
              </button>
              <button
                onClick={handleFilterSubmit}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                SUBMIT
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Reports;
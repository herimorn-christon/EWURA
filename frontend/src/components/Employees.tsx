import React, { useState } from 'react';
import { Search, Plus, Edit, MoreHorizontal, ChevronDown } from 'lucide-react';

interface Employee {
  id: number;
  nickname: string;
  role: string;
  company: string;
  companyCode: string;
  nozzleManagement: string;
  email: string;
  phone: string;
  status: 'Enable' | 'Disable';
}

const Employees: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [phoneFilter, setPhoneFilter] = useState('');
  const [promoterFilter, setPromoterFilter] = useState('');

  const employees: Employee[] = [
    {
      id: 1,
      nickname: '员工0714',
      role: 'Cashier (英高能源集团)',
      company: '英高能源',
      companyCode: '1',
      nozzleManagement: '',
      email: '',
      phone: '18890000714',
      status: 'Enable'
    },
    {
      id: 2,
      nickname: '员工手环R888800...',
      role: 'Cashier (英高能源集团)',
      company: '英高能源',
      companyCode: '1',
      nozzleManagement: '',
      email: '',
      phone: '88880002',
      status: 'Enable'
    },
    {
      id: 3,
      nickname: '员工手环R888800...',
      role: 'Cashier (英高能源集团)',
      company: '英高能源',
      companyCode: '1',
      nozzleManagement: '',
      email: '',
      phone: '88880001',
      status: 'Enable'
    },
    {
      id: 4,
      nickname: '0205',
      role: 'Cashier (英高能源集团)',
      company: '英高能源',
      companyCode: '1',
      nozzleManagement: '',
      email: '',
      phone: '18890000205',
      status: 'Enable'
    },
    {
      id: 5,
      nickname: '0203',
      role: 'Cashier (英高能源集团)',
      company: '英高能源',
      companyCode: '1',
      nozzleManagement: '',
      email: '',
      phone: '18890000203',
      status: 'Enable'
    },
    {
      id: 6,
      nickname: '演示账号',
      role: 'Station manager (英高能源集团)',
      company: '英高能源',
      companyCode: '1',
      nozzleManagement: '',
      email: '',
      phone: '1001',
      status: 'Enable'
    },
    {
      id: 7,
      nickname: 'Tyu-yg',
      role: 'Station manager (英高能源集团)',
      company: '英高能源',
      companyCode: '1',
      nozzleManagement: '',
      email: '',
      phone: '18566662025',
      status: 'Enable'
    },
    {
      id: 8,
      nickname: 'Tyu-sy2',
      role: 'Cashier (英高能源集团)',
      company: '英高能源',
      companyCode: '1',
      nozzleManagement: '',
      email: '',
      phone: '15920240629',
      status: 'Enable'
    },
    {
      id: 9,
      nickname: '13662511800',
      role: 'Station manager (英高能源集团)',
      company: '英高能源',
      companyCode: '1',
      nozzleManagement: '',
      email: '',
      phone: '13662511800',
      status: 'Enable'
    }
  ];

  const filteredEmployees = employees.filter(employee => {
    return (
      employee.nickname.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.phone.includes(searchTerm)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Employee Management</h1>
        <button className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 flex items-center space-x-2">
          <Plus className="w-4 h-4" />
          <span>Add</span>
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white p-6 rounded-lg shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <select className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent appearance-none">
              <option value="">Please choose the type</option>
              <option value="cashier">Cashier</option>
              <option value="manager">Station Manager</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          </div>
          
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Please enter a nickname"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
            />
          </div>
          
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Please enter the phone number"
              value={phoneFilter}
              onChange={(e) => setPhoneFilter(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
            />
          </div>
          
          <div className="relative">
            <select className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent appearance-none">
              <option value="">Please select a promoter</option>
              <option value="promoter1">Promoter 1</option>
              <option value="promoter2">Promoter 2</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          </div>
        </div>
        
        <div className="flex justify-end mt-4">
          <button className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 flex items-center space-x-2">
            <Search className="w-4 h-4" />
            <span>Search</span>
          </button>
        </div>
      </div>

      {/* Employee Table */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  S/N
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Nickname
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Company
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Company Code
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Nozzle Management
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Phone Number
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Operate
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredEmployees.map((employee, index) => (
                <tr key={employee.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {index + 1}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {employee.nickname}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                      {employee.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {employee.company}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {employee.companyCode}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {employee.nozzleManagement}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {employee.email}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {employee.phone}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      employee.status === 'Enable' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {employee.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button className="text-blue-600 hover:text-blue-900">
                        Edit
                      </button>
                      <button className="text-gray-600 hover:text-gray-900">
                        <MoreHorizontal className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Employees;
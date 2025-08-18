import React from 'react';
import { TrendingUp, TrendingDown, Fuel, Calendar, Briefcase } from 'lucide-react';

const Dashboard: React.FC = () => {
  const statistics = [
    {
      title: 'Refueling amount',
      value: 'Tsh 19000.10',
      icon: Fuel,
      color: 'orange'
    },
    {
      title: 'Refueling litres',
      value: '20000.76',
      icon: Fuel,
      color: 'blue'
    },
    {
      title: 'Refueling counts',
      value: '100000',
      icon: Briefcase,
      color: 'blue'
    }
  ];

  const pumpData = [
    { id: 1, number: '1 / 92#', status: 'OFFLINE', price: 'Tsh6.92', amount: '0.00', volume: '0.00' },
    { id: 2, number: '2 / 95#', status: 'OFFLINE', price: 'Tsh7.00', amount: '0.00', volume: '0.00' },
    { id: 3, number: '3 / 92#', status: 'OFFLINE', price: 'Tsh6.92', amount: '0.00', volume: '0.00' },
    { id: 4, number: '4 / 0#', status: 'OFFLINE', price: 'Tsh6.00', amount: '0.00', volume: '0.00' }
  ];

  const tabs = [
    { id: 'device', label: 'Device Monitor', active: true },
    // { id: 'sales', label: 'Sales Data', active: false },
    // { id: 'customer', label: 'Customer Data', active: false },
    // { id: 'store', label: 'Convenience Store Data', active: false }
  ];

  return (
    <div className="space-y-6">
      {/* Header with Tabs */}
      <div className="bg-white rounded-lg shadow-sm">
        <div className="flex justify-between items-center p-6 border-b">
          <div className="flex space-x-8">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                className={`pb-4 px-1 relative ${
                  tab.active 
                    ? 'text-red-600 border-b-2 border-red-600' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <div className="flex space-x-2">
            <button className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">
              <Calendar className="w-4 h-4 inline mr-2" />
              Calendar Day
            </button>
            <button className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">
              <Briefcase className="w-4 h-4 inline mr-2" />
              Business Day
            </button>
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {statistics.map((stat, index) => (
          <div key={index} className="bg-white p-6 rounded-lg shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center space-x-3">
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                    stat.color === 'orange' ? 'bg-orange-100' : 'bg-blue-100'
                  }`}>
                    <stat.icon className={`w-6 h-6 ${
                      stat.color === 'orange' ? 'text-orange-600' : 'text-blue-600'
                    }`} />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
                    <div className="text-sm text-gray-600">{stat.title}</div>
                  </div>
                </div>
              </div>
              <div className="text-right">
                
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Fuel Pumps Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {pumpData.map((pump) => (
          <div key={pump.id} className="bg-white p-6 rounded-lg shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <Fuel className="w-8 h-8 text-gray-600" />
                <div>
                  <div className="font-medium text-gray-900">{pump.number}</div>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-gray-500 rounded-full"></div>
                    <span className="text-sm text-gray-600">{pump.status}</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Price</span>
                <span className="font-medium">{pump.price}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Amount</span>
                <span className="font-medium">{pump.amount}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Volume</span>
                <span className="font-medium">{pump.volume}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Status Indicator */}
      <div className="flex justify-center">
        <div className="w-2 h-2 bg-red-600 rounded-full"></div>
      </div>
    </div>
  );
};

export default Dashboard;
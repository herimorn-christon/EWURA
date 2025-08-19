import React, { useState, useEffect } from 'react';
import { Save, Clock, Database, Shield, Bell, Monitor, AlertTriangle, CheckCircle, RefreshCw } from 'lucide-react';
import apiService from '../services/api';
import { toast } from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';

interface SystemSettings {
  reportGeneration: {
    generationTime: string;
    ewuraSendTime: string;
    timezone: string;
    autoGenerate: boolean;
    autoSendToEwura: boolean;
  };
  monitoring: {
    tankPollInterval: number;
    transactionPollInterval: number;
    anomalyThreshold: number;
    refillThreshold: number;
    enableAnomalyDetection: boolean;
  };
  interface: {
    npgisEnabled: boolean;
    nfppEnabled: boolean;
    simulationMode: boolean;
    connectionTimeout: number;
  };
  notifications: {
    emailEnabled: boolean;
    smsEnabled: boolean;
    lowLevelAlerts: boolean;
    anomalyAlerts: boolean;
    systemAlerts: boolean;
  };
  backup: {
    autoBackup: boolean;
    backupTime: string;
    retentionDays: number;
    backupLocation: string;
  };
}

const Settings: React.FC = () => {
  const [settings, setSettings] = useState<SystemSettings>({
    reportGeneration: {
      generationTime: '07:30',
      ewuraSendTime: '08:00',
      timezone: 'Africa/Dar_es_Salaam',
      autoGenerate: true,
      autoSendToEwura: true
    },
    monitoring: {
      tankPollInterval: 10,
      transactionPollInterval: 300,
      anomalyThreshold: 100,
      refillThreshold: 500,
      enableAnomalyDetection: true
    },
    interface: {
      npgisEnabled: true,
      nfppEnabled: true,
      simulationMode: false,
      connectionTimeout: 30
    },
    notifications: {
      emailEnabled: true,
      smsEnabled: false,
      lowLevelAlerts: true,
      anomalyAlerts: true,
      systemAlerts: true
    },
    backup: {
      autoBackup: true,
      backupTime: '02:00',
      retentionDays: 30,
      backupLocation: '/backups'
    }
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('report');
  const [testResults, setTestResults] = useState<any>({});
  const { user } = useAuth();

  const isAdmin = user?.role === 'admin' || user?.role_code === 'ADMIN';

  useEffect(() => {
    if (isAdmin) {
      fetchSettings();
    } else {
      setLoading(false);
    }
  }, [isAdmin]);

  const fetchSettings = async () => {
    try {
      const response = await apiService.getSystemSettings();
      if (!response.error && response.data?.settings) {
        setSettings(response.data.settings);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
      toast.error('Failed to fetch system settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    if (!isAdmin) {
      toast.error('Only administrators can modify system settings');
      return;
    }

    setSaving(true);
    try {
      const response = await apiService.updateSystemSettings(settings);
      if (!response.error) {
        toast.success('Settings saved successfully');
      } else {
        toast.error(response.message || 'Failed to save settings');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const testConnection = async (interfaceType: string) => {
    try {
      const response = await apiService.getInterfaceStatus({ interfaceCode: interfaceType });
      if (!response.error && response.data?.statuses) {
        const status = response.data.statuses[interfaceType];
        setTestResults({
          ...testResults,
          [interfaceType]: {
            success: status?.isConnected || false,
            message: status?.isConnected ? 'Connection successful' : 'Connection failed',
            details: status
          }
        });
        toast.success(`${interfaceType} connection test completed`);
      }
    } catch (error) {
      setTestResults({
        ...testResults,
        [interfaceType]: {
          success: false,
          message: 'Connection test failed',
          error: error.message
        }
      });
      toast.error(`${interfaceType} connection test failed`);
    }
  };

  const triggerBackup = async () => {
    try {
      const response = await apiService.createBackup();
      if (!response.error) {
        toast.success('Backup created successfully');
      } else {
        toast.error('Failed to create backup');
      }
    } catch (error) {
      console.error('Error creating backup:', error);
      toast.error('Failed to create backup');
    }
  };

  const tabs = [
    { id: 'report', name: 'Report Generation', icon: Clock },
    { id: 'monitoring', name: 'Monitoring', icon: Monitor },
    { id: 'interface', name: 'Interfaces', icon: Database },
    { id: 'notifications', name: 'Notifications', icon: Bell },
    { id: 'backup', name: 'Backup & Security', icon: Shield }
  ];

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertTriangle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Restricted</h2>
          <p className="text-gray-600">Only administrators can access system settings.</p>
        </div>
      </div>
    );
  }

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
          <h1 className="text-2xl font-bold text-gray-900">System Settings</h1>
          <p className="text-gray-600">Configure system behavior and preferences</p>
        </div>
        <button
          onClick={handleSaveSettings}
          disabled={saving}
          className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 flex items-center space-x-2 transition-colors disabled:opacity-50"
        >
          {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          <span>{saving ? 'Saving...' : 'Save All Settings'}</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-sm">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                  activeTab === tab.id
                    ? 'border-red-500 text-red-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                <span>{tab.name}</span>
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {/* Report Generation Settings */}
          {activeTab === 'report' && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-900">Report Generation Settings</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Daily Report Generation Time
                  </label>
                  <input
                    type="time"
                    value={settings.reportGeneration.generationTime}
                    onChange={(e) => setSettings({
                      ...settings,
                      reportGeneration: { ...settings.reportGeneration, generationTime: e.target.value }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">Time when daily reports are automatically generated</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    EWURA Send Time
                  </label>
                  <input
                    type="time"
                    value={settings.reportGeneration.ewuraSendTime}
                    onChange={(e) => setSettings({
                      ...settings,
                      reportGeneration: { ...settings.reportGeneration, ewuraSendTime: e.target.value }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">Time when reports are sent to EWURA</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Timezone</label>
                  <select
                    value={settings.reportGeneration.timezone}
                    onChange={(e) => setSettings({
                      ...settings,
                      reportGeneration: { ...settings.reportGeneration, timezone: e.target.value }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  >
                    <option value="Africa/Dar_es_Salaam">Africa/Dar_es_Salaam (EAT)</option>
                    <option value="UTC">UTC</option>
                  </select>
                </div>
              </div>

              <div className="space-y-3">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={settings.reportGeneration.autoGenerate}
                    onChange={(e) => setSettings({
                      ...settings,
                      reportGeneration: { ...settings.reportGeneration, autoGenerate: e.target.checked }
                    })}
                    className="rounded border-gray-300 text-red-600 focus:ring-red-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">Auto-generate daily reports</span>
                </label>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={settings.reportGeneration.autoSendToEwura}
                    onChange={(e) => setSettings({
                      ...settings,
                      reportGeneration: { ...settings.reportGeneration, autoSendToEwura: e.target.checked }
                    })}
                    className="rounded border-gray-300 text-red-600 focus:ring-red-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">Auto-send reports to EWURA</span>
                </label>
              </div>
            </div>
          )}

          {/* Monitoring Settings */}
          {activeTab === 'monitoring' && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-900">Monitoring Settings</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tank Poll Interval (seconds)
                  </label>
                  <input
                    type="number"
                    min="5"
                    max="300"
                    value={settings.monitoring.tankPollInterval}
                    onChange={(e) => setSettings({
                      ...settings,
                      monitoring: { ...settings.monitoring, tankPollInterval: parseInt(e.target.value) }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Transaction Poll Interval (seconds)
                  </label>
                  <input
                    type="number"
                    min="30"
                    max="3600"
                    value={settings.monitoring.transactionPollInterval}
                    onChange={(e) => setSettings({
                      ...settings,
                      monitoring: { ...settings.monitoring, transactionPollInterval: parseInt(e.target.value) }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Anomaly Threshold (Liters)
                  </label>
                  <input
                    type="number"
                    min="10"
                    max="1000"
                    value={settings.monitoring.anomalyThreshold}
                    onChange={(e) => setSettings({
                      ...settings,
                      monitoring: { ...settings.monitoring, anomalyThreshold: parseInt(e.target.value) }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">Minimum volume decrease to flag as anomaly</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Refill Threshold (Liters)
                  </label>
                  <input
                    type="number"
                    min="100"
                    max="5000"
                    value={settings.monitoring.refillThreshold}
                    onChange={(e) => setSettings({
                      ...settings,
                      monitoring: { ...settings.monitoring, refillThreshold: parseInt(e.target.value) }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">Minimum volume increase to detect as refill</p>
                </div>
              </div>

              <div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={settings.monitoring.enableAnomalyDetection}
                    onChange={(e) => setSettings({
                      ...settings,
                      monitoring: { ...settings.monitoring, enableAnomalyDetection: e.target.checked }
                    })}
                    className="rounded border-gray-300 text-red-600 focus:ring-red-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">Enable automatic anomaly detection</span>
                </label>
              </div>
            </div>
          )}

          {/* Interface Settings */}
          {activeTab === 'interface' && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-900">Interface Settings</h3>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Database className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">NPGIS (ATG) Interface</h4>
                      <p className="text-sm text-gray-500">National Petroleum GIS Interface</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={() => testConnection('NPGIS')}
                      className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                      Test Connection
                    </button>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={settings.interface.npgisEnabled}
                        onChange={(e) => setSettings({
                          ...settings,
                          interface: { ...settings.interface, npgisEnabled: e.target.checked }
                        })}
                        className="rounded border-gray-300 text-red-600 focus:ring-red-500"
                      />
                      <span className="ml-2 text-sm text-gray-700">Enabled</span>
                    </label>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                      <Database className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">NFPP (PTS/VFD) Interface</h4>
                      <p className="text-sm text-gray-500">National Fuel Price Platform Interface</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={() => testConnection('NFPP')}
                      className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700"
                    >
                      Test Connection
                    </button>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={settings.interface.nfppEnabled}
                        onChange={(e) => setSettings({
                          ...settings,
                          interface: { ...settings.interface, nfppEnabled: e.target.checked }
                        })}
                        className="rounded border-gray-300 text-red-600 focus:ring-red-500"
                      />
                      <span className="ml-2 text-sm text-gray-700">Enabled</span>
                    </label>
                  </div>
                </div>

                {/* Test Results */}
                {Object.keys(testResults).length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-medium text-gray-900">Connection Test Results</h4>
                    {Object.entries(testResults).map(([interfaceType, result]: [string, any]) => (
                      <div key={interfaceType} className={`p-3 rounded-lg border ${
                        result.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
                      }`}>
                        <div className="flex items-center space-x-2">
                          {result.success ? (
                            <CheckCircle className="w-4 h-4 text-green-600" />
                          ) : (
                            <AlertTriangle className="w-4 h-4 text-red-600" />
                          )}
                          <span className="font-medium">{interfaceType}</span>
                          <span className={`text-sm ${result.success ? 'text-green-600' : 'text-red-600'}`}>
                            {result.message}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Connection Timeout (seconds)
                    </label>
                    <input
                      type="number"
                      min="5"
                      max="120"
                      value={settings.interface.connectionTimeout}
                      onChange={(e) => setSettings({
                        ...settings,
                        interface: { ...settings.interface, connectionTimeout: parseInt(e.target.value) }
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={settings.interface.simulationMode}
                      onChange={(e) => setSettings({
                        ...settings,
                        interface: { ...settings.interface, simulationMode: e.target.checked }
                      })}
                      className="rounded border-gray-300 text-red-600 focus:ring-red-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">Enable simulation mode (for development)</span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Monitoring Settings */}
          {activeTab === 'monitoring' && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-900">Monitoring Configuration</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tank Poll Interval (seconds)
                  </label>
                  <input
                    type="number"
                    min="5"
                    max="300"
                    value={settings.monitoring.tankPollInterval}
                    onChange={(e) => setSettings({
                      ...settings,
                      monitoring: { ...settings.monitoring, tankPollInterval: parseInt(e.target.value) }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">How often to read tank levels</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Transaction Poll Interval (seconds)
                  </label>
                  <input
                    type="number"
                    min="30"
                    max="3600"
                    value={settings.monitoring.transactionPollInterval}
                    onChange={(e) => setSettings({
                      ...settings,
                      monitoring: { ...settings.monitoring, transactionPollInterval: parseInt(e.target.value) }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">How often to check for new transactions</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Anomaly Threshold (Liters)
                  </label>
                  <input
                    type="number"
                    min="10"
                    max="1000"
                    value={settings.monitoring.anomalyThreshold}
                    onChange={(e) => setSettings({
                      ...settings,
                      monitoring: { ...settings.monitoring, anomalyThreshold: parseInt(e.target.value) }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">Volume decrease threshold for anomaly detection</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Refill Threshold (Liters)
                  </label>
                  <input
                    type="number"
                    min="100"
                    max="5000"
                    value={settings.monitoring.refillThreshold}
                    onChange={(e) => setSettings({
                      ...settings,
                      monitoring: { ...settings.monitoring, refillThreshold: parseInt(e.target.value) }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">Volume increase threshold for refill detection</p>
                </div>
              </div>

              <div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={settings.monitoring.enableAnomalyDetection}
                    onChange={(e) => setSettings({
                      ...settings,
                      monitoring: { ...settings.monitoring, enableAnomalyDetection: e.target.checked }
                    })}
                    className="rounded border-gray-300 text-red-600 focus:ring-red-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">Enable automatic anomaly detection</span>
                </label>
              </div>
            </div>
          )}

          {/* Notifications Settings */}
          {activeTab === 'notifications' && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-900">Notification Settings</h3>
              
              <div className="space-y-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={settings.notifications.emailEnabled}
                    onChange={(e) => setSettings({
                      ...settings,
                      notifications: { ...settings.notifications, emailEnabled: e.target.checked }
                    })}
                    className="rounded border-gray-300 text-red-600 focus:ring-red-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">Enable email notifications</span>
                </label>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={settings.notifications.smsEnabled}
                    onChange={(e) => setSettings({
                      ...settings,
                      notifications: { ...settings.notifications, smsEnabled: e.target.checked }
                    })}
                    className="rounded border-gray-300 text-red-600 focus:ring-red-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">Enable SMS notifications</span>
                </label>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={settings.notifications.lowLevelAlerts}
                    onChange={(e) => setSettings({
                      ...settings,
                      notifications: { ...settings.notifications, lowLevelAlerts: e.target.checked }
                    })}
                    className="rounded border-gray-300 text-red-600 focus:ring-red-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">Low fuel level alerts</span>
                </label>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={settings.notifications.anomalyAlerts}
                    onChange={(e) => setSettings({
                      ...settings,
                      notifications: { ...settings.notifications, anomalyAlerts: e.target.checked }
                    })}
                    className="rounded border-gray-300 text-red-600 focus:ring-red-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">Anomaly detection alerts</span>
                </label>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={settings.notifications.systemAlerts}
                    onChange={(e) => setSettings({
                      ...settings,
                      notifications: { ...settings.notifications, systemAlerts: e.target.checked }
                    })}
                    className="rounded border-gray-300 text-red-600 focus:ring-red-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">System status alerts</span>
                </label>
              </div>
            </div>
          )}

          {/* Backup Settings */}
          {activeTab === 'backup' && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-900">Backup & Security Settings</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Backup Time
                  </label>
                  <input
                    type="time"
                    value={settings.backup.backupTime}
                    onChange={(e) => setSettings({
                      ...settings,
                      backup: { ...settings.backup, backupTime: e.target.value }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Retention Period (days)
                  </label>
                  <input
                    type="number"
                    min="7"
                    max="365"
                    value={settings.backup.retentionDays}
                    onChange={(e) => setSettings({
                      ...settings,
                      backup: { ...settings.backup, retentionDays: parseInt(e.target.value) }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={settings.backup.autoBackup}
                    onChange={(e) => setSettings({
                      ...settings,
                      backup: { ...settings.backup, autoBackup: e.target.checked }
                    })}
                    className="rounded border-gray-300 text-red-600 focus:ring-red-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">Enable automatic daily backups</span>
                </label>

                <div className="flex items-center space-x-4">
                  <button
                    onClick={triggerBackup}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center space-x-2"
                  >
                    <Database className="w-4 h-4" />
                    <span>Create Backup Now</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Settings;
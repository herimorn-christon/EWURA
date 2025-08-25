import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

interface ApiResponse<T> {
  error: boolean;
  message?: string;
  data?: T;
  warn?: string;
}

class ApiService {
  private token: string | null = localStorage.getItem('token') || null;

  private async request<T>(arg1: string, arg2?: any, arg3?: any): Promise<ApiResponse<T>> {
    // Supports:
    // 1) request(endpoint)
    // 2) request(endpoint, { method, body })
    // 3) request(method, endpoint, data?)  <-- method first
    let method = 'GET';
    let endpoint = '';
    let data: any = undefined;

    if (typeof arg2 === 'string') {
      method = arg1;
      endpoint = arg2;
      data = arg3;
    } else {
      endpoint = arg1;
      if (arg2) {
        if (arg2.method) method = arg2.method;
        if (arg2.body !== undefined) data = arg2.body;
        else data = arg2;
      }
    }

    try {
      const token = this.token || localStorage.getItem('token');
      const response = await axios({
        method,
        url: `${API_URL}${endpoint}`,
        data,
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        withCredentials: true,
      });

      return response.data;
    } catch (error: any) {
      console.error('API Error:', error);
      return {
        error: true,
        message: error.response?.data?.message || error.message || 'An error occurred',
      } as ApiResponse<T>;
    }
  }

  setToken(token: string | null) {
    this.token = token;
    if (token) localStorage.setItem('token', token);
    else localStorage.removeItem('token');
  }

  // ========= Auth =========
  async login(deviceSerial: string, password: string) {
    const response = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ deviceSerial, password }),
    });

    console.log('API login response:', response);

    if (response.error) return { error: true, message: response.message } as any;

    if ((response as any)?.data?.token) this.setToken((response as any).data.token);
    return response;
  }

  async logout() {
    this.setToken(null);
    localStorage.removeItem('user');
  }

  // ========= Users =========
  async getUsers(params?: any) {
    const query = params ? `?${new URLSearchParams(params)}` : '';
    return this.request(`/users${query}`);
  }
  async getUser(id: string) { return this.request(`/users/${id}`); }
  async createUser(userData: any) {
    return this.request('/auth/register', { method: 'POST', body: JSON.stringify(userData) });
  }
  async updateUser(id: string, userData: any) {
    return this.request(`/users/${id}`, { method: 'PUT', body: JSON.stringify(userData) });
  }
  async deleteUser(id: string) { return this.request(`/users/${id}`, { method: 'DELETE' }); }

  // ========= Roles =========
  async getRoles() { return this.request('/roles'); }
  async getRole(id: string) { return this.request(`/roles/${id}`); }
  async createRole(roleData: any) {
    return this.request('/roles', { method: 'POST', body: JSON.stringify(roleData) });
  }
  async updateRole(id: string, roleData: any) {
    return this.request(`/roles/${id}`, { method: 'PUT', body: JSON.stringify(roleData) });
  }
  async deleteRole(id: string) { return this.request(`/roles/${id}`, { method: 'DELETE' }); }

  // ========= Backup =========
  async createBackup() { return this.request('/backup/create', { method: 'POST' }); }
  async getBackups() { return this.request('/backup/list'); }
  async downloadBackup(filename: string) {
    const response = await fetch(`${API_URL}/backup/download/${filename}`, {
      headers: { Authorization: `Bearer ${this.token || localStorage.getItem('token') || ''}` },
    });
    return response.blob();
  }
  async deleteBackup(filename: string) { return this.request(`/backup/${filename}`, { method: 'DELETE' }); }

  // ========= Taxpayers =========
  async getTaxpayers(params?: any) {
    const query = params ? `?${new URLSearchParams(params)}` : '';
    return this.request(`/taxpayers${query}`);
  }
  async createTaxpayer(taxpayerData: any) {
    return this.request('/taxpayers', { method: 'POST', body: JSON.stringify(taxpayerData) });
  }
  async updateTaxpayer(id: string, taxpayerData: any) {
    return this.request(`/taxpayers/${id}`, { method: 'PUT', body: JSON.stringify(taxpayerData) });
  }
  async deleteTaxpayer(id: string) { return this.request(`/taxpayers/${id}`, { method: 'DELETE' }); }
  async setTaxpayerActiveStatus(id: string, isActive: boolean) {
    return this.request(`/taxpayers/${id}`, { method: 'PUT', body: JSON.stringify({ isActive }) });
  }
  async getBusinessTypes() { return this.request('/taxpayers/business-types'); }

  // ========= Locations =========
  async getCountries() { return this.request('/locations/countries'); }
  async getRegions() { return this.request('/locations/regions'); }
  async getDistricts(params?: any) {
    return this.request(`/locations/districts${params?.regionId ? `?regionId=${params.regionId}` : ''}`);
  }
  async getWards(params?: any) {
    return this.request(`/locations/wards${params?.districtId ? `?districtId=${params.districtId}` : ''}`);
  }
  async getStreets(params?: any) {
    const query = params?.wardId ? `?wardId=${params.wardId}` : '';
    return this.request(`/locations/streets${query}`);
  }
  async getStreet(id: string) { return this.request(`/locations/streets/${id}`); }
  async createStreet(streetData: { code: string; name: string; wardId: string }) {
    return this.request('/locations/streets', { method: 'POST', body: JSON.stringify(streetData) });
  }
  async updateStreet(id: string, streetData: { name?: string; code?: string; wardId?: string }) {
    return this.request(`/locations/streets/${id}`, { method: 'PUT', body: JSON.stringify(streetData) });
  }
  async createRegion(data: any) {
    return this.request('/locations/regions', { method: 'POST', body: JSON.stringify(data) });
  }
  async updateRegion(id: string, data: any) {
    return this.request(`/locations/regions/${id}`, { method: 'PUT', body: JSON.stringify(data) });
  }
  async createDistrict(data: any) {
    return this.request('/locations/districts', { method: 'POST', body: JSON.stringify(data) });
  }
  async updateDistrict(id: string, data: any) {
    return this.request(`/locations/districts/${id}`, { method: 'PUT', body: JSON.stringify(data) });
  }
  async createWard(data: any) {
    return this.request('/locations/wards', { method: 'POST', body: JSON.stringify(data) });
  }
  async updateWard(id: string, data: any) {
    return this.request(`/locations/wards/${id}`, { method: 'PUT', body: JSON.stringify(data) });
  }

  // ========= Search =========
  async searchTaxpayers(query: string) {
    return this.request(`/taxpayers/search?query=${encodeURIComponent(query)}`);
  }

  // ========= Transactions =========
  async getTransactions(params?: any) {
    const query = params ? `?${new URLSearchParams(params)}` : '';
    return this.request(`/transactions${query}`);
  }
  async createTransaction(transactionData: any) {
    return this.request('/transactions', { method: 'POST', body: JSON.stringify(transactionData) });
  }
  async updateTransactionStatus(id: string, status: string) {
    return this.request(`/transactions/${id}/status`, { method: 'PUT', body: JSON.stringify({ status }) });
  }

  // ========= Tanks =========
  async getTanks(params?: any) {
    const query = params ? `?${new URLSearchParams(params)}` : '';
    return this.request(`/tanks${query}`);
  }
  async getTank(id: string) { return this.request(`/tanks/${id}`); }
  async createTank(tankData: any) {
    return this.request('/tanks', { method: 'POST', body: JSON.stringify(tankData) });
  }
  async updateTank(id: string, tankData: any) {
    return this.request(`/tanks/${id}`, { method: 'PUT', body: JSON.stringify(tankData) });
  }
  async deleteTank(id: string) { return this.request(`/tanks/${id}`, { method: 'DELETE' }); }
  async updateTankSensorData(id: string, sensorData: any) {
    return this.request(`/tanks/${id}/sensor-data`, { method: 'POST', body: JSON.stringify(sensorData) });
  }
  async assignProductToTank(assignmentData: any) {
    return this.request('/tanks/assign-product', { method: 'POST', body: JSON.stringify(assignmentData) });
  }
  async getTankProductAssignment(tankId: string) { return this.request(`/tanks/${tankId}/product`); }
  async updateTankProductAssignment(tankId: string, assignmentData: any) {
    return this.request(`/tanks/${tankId}/product`, { method: 'PUT', body: JSON.stringify(assignmentData) });
  }
  async removeTankProductAssignment(tankId: string) {
    return this.request(`/tanks/${tankId}/product`, { method: 'DELETE' });
  }

  // ========= Alerts =========
  async getAlerts(params?: any) {
    const query = params ? `?${new URLSearchParams(params)}` : '';
    return this.request(`/alerts${query}`);
  }
  async createAlert(alertData: any) {
    return this.request('/alerts', { method: 'POST', body: JSON.stringify(alertData) });
  }
  async acknowledgeAlert(id: string) { return this.request(`/alerts/${id}/acknowledge`, { method: 'POST' }); }
  async resolveAlert(id: string) { return this.request(`/alerts/${id}/resolve`, { method: 'POST' }); }

  // ========= Stations =========
  async getStations() { return this.request('/stations'); }
  async getStation(id: string) { return this.request(`/stations/${id}`); }

  async createStation(stationData: any) {
    const payload = {
      code: stationData.code,
      name: stationData.name,
      taxpayerId: stationData.taxpayerId || stationData.taxpayer_id,
      streetId: stationData.streetId || stationData.street_id,
      address: stationData.address,
      ewuraLicenseNo: stationData.ewuraLicenseNo || stationData.ewura_license_no,
      interfaceTypeId: stationData.interfaceTypeId || stationData.interface_type_id,
      operationalHours: stationData.operationalHours || stationData.operational_hours || null,
      coordinates: stationData.coordinates || null,
    };
    const response = await this.request('/stations', { method: 'POST', body: JSON.stringify(payload) });
    if (response.error) {
      return { success: false, error: true, message: response.message || 'Failed to create station', errors: (response as any).errors } as any;
    }
    return { success: true, data: (response as any).data, message: 'Station created successfully' } as any;
  }

  async updateStation(id: string, stationData: any) {
    const payload: any = {
      code: stationData.code,
      name: stationData.name,
      taxpayer_id: stationData.taxpayerId,
      street_id: stationData.streetId,
      address: stationData.address,
      ewura_license_no: stationData.ewuraLicenseNo,
      interface_type_id: stationData.interfaceTypeId,
      operational_hours: stationData.operationalHours || null,
      coordinates: stationData.coordinates || null,
      is_active: stationData.isActive,
    };
    Object.keys(payload).forEach((k) => (payload[k] == null ? delete payload[k] : null));
    const response = await this.request(`/stations/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
    return response.error
      ? { success: false, error: true, message: response.message || 'Failed to update station', errors: (response as any).errors } as any
      : { success: true, data: (response as any).data, message: (response as any).message || 'Station updated successfully' } as any;
  }

  async deleteStation(id: string) { return this.request(`/stations/${id}`, { method: 'DELETE' }); }

  // ========= Reports =========
  async getDashboardStats(params?: any) {
    const query = params ? `?${new URLSearchParams(params)}` : '';
    return this.request(`/reports/dashboard${query}`);
  }
  async getTankMonitoringReport(params?: any) {
    const query = params ? `?${new URLSearchParams(params)}` : '';
    return this.request(`/reports/tank-monitoring${query}`);
  }
  async getAlertsReport(params?: any) {
    const query = params ? `?${new URLSearchParams(params)}` : '';
    return this.request(`/reports/alerts${query}`);
  }
  async getMaintenanceReport(params?: any) {
    const query = params ? `?${new URLSearchParams(params)}` : '';
    return this.request(`/reports/maintenance${query}`);
  }
  async getReports(params?: any) {
    const query = params ? `?${new URLSearchParams(params)}` : '';
    return this.request(`/reports${query}`);
  }

  // ========= EWURA =========
  // --- EWURA section ---
  // ========= EWURA =========
  async getManagers() { return this.request('/users/managers'); }

  async getEwuraRegistrationData(managerId: string) {
    return this.request(`/ewura/registration-data/${managerId}`);
  }

  // ✅ Fixed path to match backend: /registration/manager/:managerId
  async registerWithManager(
    managerId: string,
    data: { tranId: string; brandName: string; receiptCode: string }
  ) {
     console.log('Registering with manager:', managerId, data);
    return this.request(`/ewura/registration/manager/${managerId}`, {
     
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getEwuraSubmissionHistory(params?: any) {
    const query = params ? `?${new URLSearchParams(params)}` : '';
    return this.request(`/ewura/history${query}`);
  }

  async validateEwuraCertificate() {
    return this.request('/ewura/certificate/validate');
  }


  async changePassword(currentPassword: string, newPassword: string) {
    return this.request('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword }),
    });
  }

  // ========= Settings =========
  async getProfile() { return this.request('/settings/profile'); }
  async updateProfile(profileData: any) {
    return this.request('/settings/profile', { method: 'PUT', body: JSON.stringify(profileData) });
  }

  async getSystemSettings() {
    // explicit GET avoids the alt signature
    return this.request('/settings/system');
  }

  /**
   * PUT settings, then GET the canonical copy so UI always reflects persisted values.
   */
  async updateSystemSettings(settings: any) {
    const putRes = await this.request('/settings/system', {
      method: 'PUT',
      body: JSON.stringify(settings),
    });

    if (putRes?.error) return putRes;

    const getRes = await this.getSystemSettings();
    if (getRes?.error) {
      return { ...putRes, warn: 'Settings saved but refresh failed; UI may show stale values.' } as any;
    }
    return getRes;
  }

  async getNotificationSettings() { return this.request('/settings/notifications'); }
  async updateNotificationSettings(settings: any) {
    return this.request('/settings/notifications', { method: 'PUT', body: JSON.stringify(settings) });
  }

  async getReportGenerationSettings() { return this.request('/settings/report-generation'); }
  async updateReportGenerationSettings(settings: any) {
    return this.request('/settings/report-generation', { method: 'PUT', body: JSON.stringify(settings) });
  }

  // ========= Interface / Monitoring =========
  async getInterfaceTypes() { return this.request('/interface-types'); }

  async getCurrentTankDataUnified(params?: any) {
    const query = params ? `?${new URLSearchParams(params)}` : '';
    return this.request(`/interface/tanks/current${query}`);
  }

  async getTransactionsUnified(params?: {
    date?: string;
    limit?: string;
    stationId?: string;
    interfaceCode?: string;
  }) {
    const queryParams = new URLSearchParams();
    if (params?.date) queryParams.append('date', params.date);
    if (params?.limit) queryParams.append('limit', params.limit);
    if (params?.stationId) queryParams.append('stationId', params.stationId);
    if (params?.interfaceCode) queryParams.append('interfaceCode', params.interfaceCode);
    const qs = queryParams.toString();
    return this.request(`/interface/transactions${qs ? `?${qs}` : ''}`);
  }

  async getAccessibleStations() {
    return this.request<{
      stations: Array<{ id: string; name: string; code: string; interface_code: string; interface_name: string }>;
    }>('GET', '/interface/stations');
  }

  async startInterfaceMonitoring(data: { stationId?: string; interfaceCode?: string }) {
    return this.request('/interface/monitoring/start', { method: 'POST', body: JSON.stringify(data) });
  }
  async stopInterfaceMonitoring(data: { stationId?: string; interfaceCode?: string }) {
    return this.request('/interface/monitoring/stop', { method: 'POST', body: JSON.stringify(data) });
  }
  async getInterfaceStatus(params?: any) {
    const query = params ? `?${new URLSearchParams(params)}` : '';
    return this.request(`/interface/status${query}`);
  }

  // ========= ATG =========
  async startATGMonitoring() { return this.request('/tanks/atg/start', { method: 'POST' }); }
  async stopATGMonitoring() { return this.request('/tanks/atg/stop', { method: 'POST' }); }
  async getATGStatus() { return this.request('/tanks/atg/status'); }
  async getCurrentTankData() { return this.request('/tanks/current/data'); }
  async getTanksDailySummary() { return this.request('/tanks/daily-summary'); }
  async getTanksHourlyReadings() { return this.request('/tanks/hourly-readings'); }
  async getTankReadingsForPeriod(tankId: string, startDate: string, endDate: string) {
    return this.request(`/tanks/${tankId}/readings/period?startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`);
  }

  // ========= Analytics =========
  async detectAnomalies(data: { stationId?: string; date?: string }) {
    return this.request('/analytics/anomalies/detect', { method: 'POST', body: JSON.stringify(data) });
  }
  async getRefillEvents(params?: any) {
    const query = params ? `?${new URLSearchParams(params)}` : '';
    return this.request(`/analytics/refills${query}`);
  }
  async getDailyLossAnalysis(params?: any) {
    const query = params ? `?${new URLSearchParams(params)}` : '';
    return this.request(`/analytics/daily-loss${query}`);
  }

  // ======== Misc ========
  async exportReport(reportId: string, format: string = 'pdf') {
    return this.request(`/reports/${reportId}/export?format=${format}`);
  }
  async generateDailyReport(data: { stationId: string; date: string }) {
    return this.request('/reports/daily/generate', { method: 'POST', body: JSON.stringify(data) });
  }
  
  
}

export default new ApiService();

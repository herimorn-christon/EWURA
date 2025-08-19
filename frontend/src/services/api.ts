import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

interface ApiResponse<T> {
  error: boolean;
  message?: string;
  data?: T;
}

class ApiService {
  private token: string | null = localStorage.getItem('token') || null;

  private async request<T>(arg1: string, arg2?: any, arg3?: any): Promise<ApiResponse<T>> {
    // Supports multiple call patterns used in the codebase:
    // 1) request(endpoint)                          -> GET endpoint
    // 2) request(endpoint, { method, body })       -> custom method + body
    // 3) request(method, endpoint, data?)          -> method first, endpoint second (used in some places)
    let method = 'GET';
    let endpoint = '';
    let data: any = undefined;

    if (typeof arg2 === 'string') {
      // pattern: request(method, endpoint, data?)
      method = arg1;
      endpoint = arg2;
      data = arg3;
    } else {
      // pattern: request(endpoint, options?)
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
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        withCredentials: true
      });

      return response.data;
    } catch (error: any) {
      console.error('API Error:', error);
      return {
        error: true,
        message: error.response?.data?.message || error.message || 'An error occurred'
      };
    }
  }

  setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem('token', token);
    } else {
      localStorage.removeItem('token');
    }
  }

  // Auth methods
  async login(deviceSerial: string, password: string) {
    const response = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ deviceSerial, password }),
    });

    // Debug log
    console.log('API login response:', response);

    if (response.error) {
      console.error('Login failed:', response.message);
      return { error: true, message: response.message };
    }

    if (response?.data?.token) {
      this.setToken(response.data.token);
    }

    return response;
  }

  async logout() {
    this.setToken(null);
    localStorage.removeItem('user');
  }

  // Users methods
  async getUsers(params?: any) {
    const query = params ? `?${new URLSearchParams(params)}` : '';
    return this.request(`/users${query}`);
  }

  async getUser(id: string) {
    return this.request(`/users/${id}`);
  }

  async createUser(userData: any) {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  async updateUser(id: string, userData: any) {
    return this.request(`/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(userData),
    });
  }

  async deleteUser(id: string) {
    return this.request(`/users/${id}`, { method: 'DELETE' });
  }

  // Roles methods
  async getRoles() {
    return this.request('/roles');
  }

  async getRole(id: string) {
    return this.request(`/roles/${id}`);
  }

  async createRole(roleData: any) {
    return this.request('/roles', {
      method: 'POST',
      body: JSON.stringify(roleData),
    });
  }

  async updateRole(id: string, roleData: any) {
    return this.request(`/roles/${id}`, {
      method: 'PUT',
      body: JSON.stringify(roleData),
    });
  }

  async deleteRole(id: string) {
    return this.request(`/roles/${id}`, { method: 'DELETE' });
  }

  // Backup methods
  async createBackup() {
    return this.request('/backup/create', { method: 'POST' });
  }

  async getBackups() {
    return this.request('/backup/list');
  }

  async downloadBackup(filename: string) {
    const response = await fetch(`${API_URL}/backup/download/${filename}`, {
      headers: {
        Authorization: `Bearer ${this.token || localStorage.getItem('token') || ''}`,
      },
    });
    return response.blob();
  }

  async deleteBackup(filename: string) {
    return this.request(`/backup/${filename}`, { method: 'DELETE' });
  }
  // Users methods
  // Taxpayers methods
  async getTaxpayers(params?: any) {
    const query = params ? `?${new URLSearchParams(params)}` : '';
    return this.request(`/taxpayers${query}`);
  }

  async createTaxpayer(taxpayerData: any) {
    return this.request('/taxpayers', {
      method: 'POST',
      body: JSON.stringify(taxpayerData),
    });
  }

  async updateTaxpayer(id: string, taxpayerData: any) {
    return this.request(`/taxpayers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(taxpayerData),
    });
  }

  async deleteTaxpayer(id: string) {
    return this.request(`/taxpayers/${id}`, { method: 'DELETE' });
  }

  async setTaxpayerActiveStatus(id: string, isActive: boolean) {
    return this.request(`/taxpayers/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ isActive }),
    });
  }

  async getBusinessTypes() {
    return this.request('/taxpayers/business-types');
  }

  async getCountries() {
    return this.request("/locations/countries");
  }
  async getRegions() { return this.request("/locations/regions"); }
  async getDistricts(params?: any) { return this.request(`/locations/districts${params?.regionId ? '?regionId=' + params.regionId : ''}`); }
  async getWards(params?: any) { return this.request(`/locations/wards${params?.districtId ? '?districtId=' + params.districtId : ''}`); }
  async getStreets(params?: any) {
    // Supports: GET /api/locations/streets and GET /api/locations/streets?wardId=...
    const query = params?.wardId ? `?wardId=${params.wardId}` : '';
    return this.request(`/locations/streets${query}`);
  }

  async searchTaxpayers(query: string) {
    return this.request(`/taxpayers/search?query=${encodeURIComponent(query)}`);
  }

  // Transactions methods
  async getTransactions(params?: any) {
    const query = params ? `?${new URLSearchParams(params)}` : '';
    return this.request(`/transactions${query}`);
  }

  async createTransaction(transactionData: any) {
    return this.request('/transactions', {
      method: 'POST',
      body: JSON.stringify(transactionData),
    });
  }

  async updateTransactionStatus(id: string, status: string) {
    return this.request(`/transactions/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
  }

  // Tanks methods
  async getTanks(params?: any) {
    const query = params ? `?${new URLSearchParams(params)}` : '';
    return this.request(`/tanks${query}`);
  }

  async getTank(id: string) {
    return this.request(`/tanks/${id}`);
  }

  async createTank(tankData: any) {
    return this.request('/tanks', {
      method: 'POST',
      body: JSON.stringify(tankData),
    });
  }

  async updateTank(id: string, tankData: any) {
    return this.request(`/tanks/${id}`, {
      method: 'PUT',
      body: JSON.stringify(tankData),
    });
  }

  async deleteTank(id: string) {
    return this.request(`/tanks/${id}`, { method: 'DELETE' });
  }

  async updateTankSensorData(id: string, sensorData: any) {
    return this.request(`/tanks/${id}/sensor-data`, {
      method: 'POST',
      body: JSON.stringify(sensorData),
    });
  }

  // Tank Assignment methods
  async assignProductToTank(assignmentData: any) {
    return this.request('/tanks/assign-product', {
      method: 'POST',
      body: JSON.stringify(assignmentData),
    });
  }

  async getTankProductAssignment(tankId: string) {
    return this.request(`/tanks/${tankId}/product`);
  }

  async updateTankProductAssignment(tankId: string, assignmentData: any) {
    return this.request(`/tanks/${tankId}/product`, {
      method: 'PUT',
      body: JSON.stringify(assignmentData),
    });
  }

  async removeTankProductAssignment(tankId: string) {
    return this.request(`/tanks/${tankId}/product`, {
      method: 'DELETE'
    });
  }

  // Alerts methods
  async getAlerts(params?: any) {
    const query = params ? `?${new URLSearchParams(params)}` : '';
    return this.request(`/alerts${query}`);
  }

  async createAlert(alertData: any) {
    return this.request('/alerts', {
      method: 'POST',
      body: JSON.stringify(alertData),
    });
  }

  async acknowledgeAlert(id: string) {
    return this.request(`/alerts/${id}/acknowledge`, { method: 'POST' });
  }

  async resolveAlert(id: string) {
    return this.request(`/alerts/${id}/resolve`, { method: 'POST' });
  }

  // Maintenance methods
  async getMaintenance(params?: any) {
    const query = params ? `?${new URLSearchParams(params)}` : '';
    return this.request(`/maintenance${query}`);
  }

  async createMaintenance(maintenanceData: any) {
    return this.request('/maintenance', {
      method: 'POST',
      body: JSON.stringify(maintenanceData),
    });
  }

  async updateMaintenance(id: string, maintenanceData: any) {
    return this.request(`/maintenance/${id}`, {
      method: 'PUT',
      body: JSON.stringify(maintenanceData),
    });
  }

  // Stations methods
  async getStations() {
    return this.request('/stations');
  }

  async getStation(id: string) {
    return this.request(`/stations/${id}`);
  }

  // Products methods
  async getProducts(params?: any) {
    const query = params ? `?${new URLSearchParams(params)}` : '';
    return this.request(`/products${query}`);
  }

  async getProduct(id: string) {
    return this.request(`/products/${id}`);
  }

  async createProduct(productData: any) {
    return this.request('/products', {
      method: 'POST',
      body: JSON.stringify(productData),
    });
  }

  async updateProduct(id: string, productData: any) {
    return this.request(`/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(productData),
    });
  }

  async deleteProduct(id: string) {
    return this.request(`/products/${id}`, { method: 'DELETE' });
  }
  
  async createStation(stationData: any) {
    console.log('Creating station with data:', stationData);

    // Format payload with camelCase for backend
    const payload = {
      code: stationData.code,
      name: stationData.name,
      taxpayerId: stationData.taxpayerId || stationData.taxpayer_id, // Ensure camelCase
      streetId: stationData.streetId || stationData.street_id,       // Ensure camelCase
      address: stationData.address,
      ewuraLicenseNo: stationData.ewuraLicenseNo || stationData.ewura_license_no, // Ensure camelCase
      interfaceTypeId: stationData.interfaceTypeId || stationData.interface_type_id, // Ensure camelCase
      operationalHours: stationData.operationalHours || stationData.operational_hours || null,
      coordinates: stationData.coordinates || null
    };

    console.log('API createStation payload:', payload);

    try {
      const response = await this.request('/stations', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      if (response.error) {
        console.error('Station creation failed:', response);
        return {
          success: false,
          error: true,
          message: response.message || 'Failed to create station',
          errors: response.errors
        };
      }

      return {
        success: true,
        data: response.data,
        message: 'Station created successfully'
      };

    } catch (error: any) {
      console.error('Station creation error:', error);
      return {
        success: false,
        error: true,
        message: error.message || 'Failed to create station',
        errors: [{ msg: error.message }]
      };
    }
  }

  async updateStation(id: string, stationData: any) {
    console.log('Updating station with data:', stationData);

    // Format payload with snake_case for backend
    const payload = {
      code: stationData.code,
      name: stationData.name,
      taxpayer_id: stationData.taxpayerId,
      street_id: stationData.streetId,
      address: stationData.address,
      ewura_license_no: stationData.ewuraLicenseNo, // Changed to snake_case
      interface_type_id: stationData.interfaceTypeId,
      operational_hours: stationData.operationalHours || null,
      coordinates: stationData.coordinates || null,
      is_active: stationData.isActive
    };

    // Only include fields that have values
    Object.keys(payload).forEach(key => {
      if (payload[key] === undefined || payload[key] === null) {
        delete payload[key];
      }
    });

    console.log('API updateStation payload:', payload);

    try {
      const response = await this.request(`/stations/${id}`, {
        method: 'PUT',
        body: JSON.stringify(payload)
      });

      return response.error ?
        {
          success: false,
          error: true,
          message: response.message || 'Failed to update station',
          errors: response.errors
        } :
        {
          success: true,
          data: response.data,
          message: response.message || 'Station updated successfully'
        };
    } catch (error: any) {
      console.error('Station update error:', error);
      return {
        success: false,
        error: true,
        message: error.message || 'Failed to update station',
        errors: [{ msg: error.message }]
      };
    }
  }

  async deleteStation(id: string) {
    return this.request(`/stations/${id}`, { method: 'DELETE' });
  }
  // Reports methods
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

  // Settings methods
  async getProfile() {
    return this.request('/settings/profile');
  }

  async updateProfile(profileData: any) {
    return this.request('/settings/profile', {
      method: 'PUT',
      body: JSON.stringify(profileData),
    });
  }

  async getReports(params?: any) {
    const query = params ? `?${new URLSearchParams(params)}` : '';
    return this.request(`/reports${query}`);
  }

  // EWURA Registration Methods
  async getManagers() {
    return this.request('/users/managers');
  }

  async getEwuraRegistrationData(managerId: string) {
    return this.request(`/ewura/registration-data/${managerId}`);
  }

  async registerWithManager(managerId: string, data: { tranId: string; brandName: string; receiptCode: string }) {
    return this.request(`/ewura/register-with-manager/${managerId}`, {
      method: 'POST',
      body: JSON.stringify(data)
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
      method: 'POST', // <-- Change to POST if backend expects POST
      body: JSON.stringify({ currentPassword, newPassword }),
    });
  }

  async getSystemSettings() {
    return this.request('/settings/system');
  }

  async updateSystemSettings(settings: any) {
    return this.request('/settings/system', {
      method: 'PUT',
      body: JSON.stringify(settings),
    });
  }

  async getNotificationSettings() {
    return this.request('/settings/notifications');
  }

  async updateNotificationSettings(settings: any) {
    return this.request('/settings/notifications', {
      method: 'PUT',
      body: JSON.stringify(settings),
    });
  }

  async createRegion(data: any) {
    return this.request("/locations/regions", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }
  async updateRegion(id: string, data: any) {
    return this.request(`/locations/regions/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }
  async createDistrict(data: any) {
    return this.request("/locations/districts", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }
  async updateDistrict(id: string, data: any) {
    return this.request(`/locations/districts/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }
  async createWard(data: any) {
    return this.request("/locations/wards", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }
  async updateWard(id: string, data: any) {
    return this.request(`/locations/wards/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  async registerWithManager(managerId: string, data: { tranId: string; brandName: string; receiptCode: string }) {
    return this.request(`/ewura/register-with-manager/${managerId}`, {
      method: "POST",
      body: JSON.stringify({
        tranId: data.tranId,
        brandName: data.brandName,
        receiptCode: data.receiptCode,
      }),
    });
  }

  async getManagers() {
    return this.request('/users/managers');
  }

  async getEwuraRegistrationData(managerId: string) {
    return this.request(`/ewura/registration-data/${managerId}`);
  }

  
  async getStreet(id: string) {
    // Supports: GET /api/locations/streets/{id}
    return this.request(`/locations/streets/${id}`);
  }

  async createStreet(streetData: { code: string; name: string; wardId: string }) {
    // Supports: POST /api/locations/streets
    return this.request('/locations/streets', {
      method: 'POST',
      body: JSON.stringify(streetData),
    });
  }

  async updateStreet(id: string, streetData: { name?: string; code?: string; wardId?: string }) {
    // Supports: PUT /api/locations/streets/{id}
    return this.request(`/locations/streets/${id}`, {
      method: 'PUT',
      body: JSON.stringify(streetData),
    });
  }

  // ATG Tank Monitoring Methods

  async startATGMonitoring() {
    return this.request('/tanks/atg/start', {
      method: 'POST',
    });
  }

  async stopATGMonitoring() {
    return this.request('/tanks/atg/stop', {
      method: 'POST',
    });
  }

  async getATGStatus() {
    return this.request('/tanks/atg/status');
  }

  async getCurrentTankData() {
    return this.request('/tanks/current/data');
  }

  // Get today's daily summary
  async getTanksDailySummary() {
    return this.request('/tanks/daily-summary');
  }

  // Get hourly readings for today
  async getTanksHourlyReadings() {
    return this.request('/tanks/hourly-readings');
  }

  // Get specific tank readings for date range
  async getTankReadingsForPeriod(tankId: string, startDate: string, endDate: string) {
    return this.request(`/tanks/${tankId}/readings/period?startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`);
  }

  // New Interface & Monitoring Methods
  async getInterfaceTypes() {
    return this.request('/interface-types');
  }

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

    return this.request(`/interface/transactions${queryParams.toString() ? `?${queryParams.toString()}` : ''}`);
  }

  async getAccessibleStations() {
    return this.request<{
      stations: Array<{
        id: string;
        name: string;
        code: string;
        interface_code: string;
        interface_name: string;
      }>;
    }>('GET', '/interface/stations');
  }

  async startInterfaceMonitoring(data: { stationId?: string; interfaceCode?: string }) {
    return this.request('/interface/monitoring/start', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async stopInterfaceMonitoring(data: { stationId?: string; interfaceCode?: string }) {
    return this.request('/interface/monitoring/stop', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async getInterfaceStatus(params?: any) {
    const query = params ? `?${new URLSearchParams(params)}` : '';
    return this.request(`/interface/status${query}`);
  }

  // Station API Key Management (New)
  async getStationApiKey(stationId: string) {
    return this.request(`/stations/${stationId}/api-key`);
  }

  async regenerateStationApiKey(stationId: string) {
    return this.request(`/stations/${stationId}/regenerate-api-key`, {
      method: 'POST'
    });
  }

  // Analytics Methods (New)
  async detectAnomalies(data: { stationId?: string; date?: string }) {
    return this.request('/analytics/anomalies/detect', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async getRefillEvents(params?: any) {
    const query = params ? `?${new URLSearchParams(params)}` : '';
    return this.request(`/analytics/refills${query}`);
  }

  async getDailyLossAnalysis(params?: any) {
    const query = params ? `?${new URLSearchParams(params)}` : '';
    return this.request(`/analytics/daily-loss${query}`);
  }

  // Report Generation Methods (New)
  async generateDailyReport(data: { stationId: string; date: string }) {
    return this.request('/reports/daily/generate', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async exportReport(reportId: string, format: string = 'pdf') {
    return this.request(`/reports/${reportId}/export?format=${format}`);
  }

  async getReportGenerationSettings() {
    return this.request('/settings/report-generation');
  }

  async updateReportGenerationSettings(settings: any) {
    return this.request('/settings/report-generation', {
      method: 'PUT',
      body: JSON.stringify(settings)
    });
  }
}

export default new ApiService();
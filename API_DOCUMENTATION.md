# Gas Station Management System - Complete API Documentation

## 🌐 Base Information
```
Base URL: http://YOUR_SERVER_IP:3001/api
WebSocket: ws://YOUR_SERVER_IP:3001
Documentation: http://YOUR_SERVER_IP:3001/api-docs
```

## 🔐 Authentication
All protected endpoints require JWT token authentication:
```
Authorization: Bearer <your_jwt_token>
Content-Type: application/json
```

---

## 🔑 AUTHENTICATION ENDPOINTS

### 1. Register User
**POST** `/auth/register`

**Request Body:**
```json
{
  "email": "user@example.com",
  "username": "username",
  "password": "password123",
  "firstName": "John",
  "lastName": "Doe",
  "roleCode": "OPERATOR",
  "stationId": "station-uuid-here"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user-uuid",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "role": "OPERATOR"
    },
    "token": "jwt-token-here"
  },
  "message": "Registration successful"
}
```

### 2. Login User
**POST** `/auth/login`

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user-uuid",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "role": "OPERATOR",
      "stationId": "station-uuid"
    },
    "token": "jwt-token-here"
  },
  "message": "Login successful"
}
```

### 3. Get User Profile
**GET** `/auth/profile` 🔒

### 4. Update Profile
**PUT** `/auth/profile` 🔒

### 5. Change Password
**POST** `/auth/change-password` 🔒

### 6. Logout
**POST** `/auth/logout` 🔒

---

## 👥 USER MANAGEMENT ENDPOINTS

### 1. Get All Users
**GET** `/users?page=1&limit=10&roleCode=OPERATOR&isActive=true` 🔒

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)
- `roleCode` (optional): Filter by role
- `stationId` (optional): Filter by station
- `isActive` (optional): Filter by active status

### 2. Get User by ID
**GET** `/users/{userId}` 🔒

### 3. Create User
**POST** `/users` 🔒

**Request Body:**
```json
{
  "email": "newuser@example.com",
  "username": "newuser",
  "password": "password123",
  "firstName": "New",
  "lastName": "User",
  "userRoleId": "role-uuid",
  "stationId": "station-uuid"
}
```

### 4. Update User
**PUT** `/users/{userId}` 🔒

### 5. Delete User
**DELETE** `/users/{userId}` 🔒

### 6. Update User Role
**PUT** `/users/{userId}/role` 🔒

### 7. Update User Status
**PUT** `/users/{userId}/status` 🔒

---

## 🏪 STATION MANAGEMENT ENDPOINTS

### 1. Get All Stations
**GET** `/stations?isActive=true&regionId=region-uuid` 🔒

**Response:**
```json
{
  "success": true,
  "data": {
    "stations": [
      {
        "id": "station-uuid",
        "code": "STN001",
        "name": "Main Station",
        "address": "123 Main St",
        "isActive": true,
        "taxpayerName": "Company Name",
        "wardName": "Ward Name",
        "districtName": "District Name",
        "regionName": "Region Name"
      }
    ]
  }
}
```

### 2. Get Station by ID
**GET** `/stations/{stationId}` 🔒

### 3. Create Station
**POST** `/stations` 🔒

**Request Body:**
```json
{
  "code": "STN002",
  "name": "New Station",
  "taxpayerId": "taxpayer-uuid",
  "wardId": "ward-uuid",
  "address": "Station Address",
  "ewuraLicenseNo": "PRL-2024-123",
  "operationalHours": {
    "monday": "06:00-22:00",
    "tuesday": "06:00-22:00",
    "wednesday": "06:00-22:00",
    "thursday": "06:00-22:00",
    "friday": "06:00-22:00",
    "saturday": "06:00-22:00",
    "sunday": "07:00-21:00"
  },
  "interfaceTypeId": "interface-uuid"
}
```

### 4. Update Station
**PUT** `/stations/{stationId}` 🔒

### 5. Delete Station
**DELETE** `/stations/{stationId}` 🔒

### 6. Get Station Summary
**GET** `/stations/{stationId}/summary` 🔒

---

## ⛽ TANK MANAGEMENT ENDPOINTS

### 1. Get All Tanks
**GET** `/tanks?stationId=station-uuid` 🔒

**Response:**
```json
{
  "success": true,
  "data": {
    "tanks": [
      {
        "id": "tank-uuid",
        "tankNumber": "01",
        "capacity": 30000.00,
        "currentLevel": 25000.50,
        "temperature": 28.5,
        "productName": "PETROL",
        "productColor": "#FF6B6B",
        "stationName": "Main Station",
        "lastReadingAt": "2024-01-15T10:30:00Z"
      }
    ]
  }
}
```

### 2. Get Tank by ID
**GET** `/tanks/{tankId}` 🔒

### 3. Create Tank
**POST** `/tanks` 🔒

**Request Body:**
```json
{
  "stationId": "station-uuid",
  "tankNumber": "05",
  "productId": "product-uuid",
  "capacity": 30000.00,
  "safeLevel": 5000.00,
  "criticalLevel": 2000.00
}
```

### 4. Update Tank
**PUT** `/tanks/{tankId}` 🔒

### 5. Delete Tank
**DELETE** `/tanks/{tankId}` 🔒

### 6. Get Tank Readings
**GET** `/tanks/{tankId}/readings?startDate=2024-01-01&endDate=2024-01-31&limit=100` 🔒

### 7. Get Current Tank Data (Real-time)
**GET** `/tanks/current/data` 🔒

### 8. ATG Control Endpoints
**POST** `/tanks/atg/start` 🔒 - Start ATG monitoring
**POST** `/tanks/atg/stop` 🔒 - Stop ATG monitoring  
**GET** `/tanks/atg/status` 🔒 - Get ATG status

---

## 🛍️ PRODUCT MANAGEMENT ENDPOINTS

### 1. Get All Products
**GET** `/products` 🔒

**Response:**
```json
{
  "success": true,
  "data": {
    "products": [
      {
        "id": "product-uuid",
        "code": "PET",
        "name": "PETROL",
        "category": "FUEL",
        "color": "#FF6B6B",
        "currentPrice": 2700.00,
        "effectiveDate": "2024-01-01"
      }
    ]
  }
}
```

### 2. Create Product
**POST** `/products` 🔒

**Request Body:**
```json
{
  "code": "DSL",
  "name": "DIESEL",
  "category": "FUEL",
  "unit": "LITERS",
  "color": "#4ECDC4",
  "description": "Automotive Gas Oil"
}
```

### 3. Update Product Pricing
**POST** `/products/{productId}/pricing` 🔒

**Request Body:**
```json
{
  "price": 2750.00,
  "effectiveDate": "2024-02-01",
  "stationId": "station-uuid"
}
```

---

## 🏛️ EWURA INTEGRATION ENDPOINTS

### 1. Register Station with EWURA
**POST** `/ewura/register-station` 🔒

**Request Body:**
```json
{
  "stationId": "station-uuid",
  "tranId": "1",
  "apiSourceId": "109272930_SPAdv2023T",
  "retailStationName": "ADVATECH FILLING STATION",
  "ewuraLicenseNo": "PRL-2010-715",
  "operatorTin": "109272930",
  "operatorVrn": "40005334W",  
  "operatorName": "OMBOZA",
  "licenseeTraSerialNo": "10TZ176715",
  "regionName": "Dar es Salaam",
  "districtName": "KINONDONI",
  "wardName": "KINONDONI",
  "zone": "EAST",
  "contactPersonEmailAddress": "ericprosper5@gmail.com",
  "contactPersonPhone": "0754100300"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "result": {
      "success": true,
      "xml": "<?xml version=\"1.0\" encoding=\"UTF-8\"?><NPGIS>...",
      "submissionId": "submission-uuid",
      "message": "Station registration XML generated successfully"
    }
  },
  "message": "Station registered with EWURA successfully"
}
```

### 2. Submit Transaction to EWURA
**POST** `/ewura/submit-transaction` 🔒

**Request Body:**
```json
{
  "tranId": "1",
  "apiSourceId": "109272930_SPAdv2023T",
  "rctVerificationCode": "5EC70419851",
  "ewuraLicenseNo": "PRL-2010-715",
  "rctDate": "18/07/2025",
  "rctTime": "11:08:18",
  "operatorTin": "109272930",
  "operatorVrn": "40005334W",
  "operatorName": "OMBOZA",
  "retailStationName": "ADVATECH FILLING STATION",
  "traSerialNo": "10TZ176714",
  "productName": "PETROL",
  "unitPrice": "2700",
  "volume": "3.5",
  "amount": "9450",
  "discountAmount": "0",
  "amountNew": "9450",
  "buyerName": "JUMA",
  "cardDesc": "NMB BANK CARD"
}
```

### 3. Submit Daily Summary to EWURA
**POST** `/ewura/submit-daily-summary` 🔒

**Request Body:**
```json
{
  "stationId": "station-uuid",
  "date": "2024-01-15"
}
```

### 4. Get EWURA Submission History
**GET** `/ewura/submission-history?stationId=station-uuid&type=transaction&startDate=2024-01-01&endDate=2024-01-31` 🔒

### 5. Validate EWURA Certificate
**GET** `/ewura/validate-certificate` 🔒

---

## 📊 REPORTS & ANALYTICS ENDPOINTS

### 1. Get Daily Report
**GET** `/reports/daily?date=2024-01-15&stationId=station-uuid` 🔒

### 2. Get Monthly Report
**GET** `/reports/monthly?year=2024&month=01&stationId=station-uuid` 🔒

### 3. Get Tank Performance Report
**GET** `/reports/tank-performance?startDate=2024-01-01&endDate=2024-01-31&tankId=tank-uuid` 🔒

### 4. Get Sales Summary Report
**GET** `/reports/sales-summary?startDate=2024-01-01&endDate=2024-01-31&stationId=station-uuid` 🔒

### 5. Get Inventory Report
**GET** `/reports/inventory?stationId=station-uuid` 🔒

### 6. Get Dashboard Analytics
**GET** `/analytics/dashboard?stationId=station-uuid` 🔒

### 7. Get Trends
**GET** `/analytics/trends?startDate=2024-01-01&endDate=2024-01-31&stationId=station-uuid&type=sales` 🔒

### 8. Get Efficiency Metrics
**GET** `/analytics/efficiency?startDate=2024-01-01&endDate=2024-01-31&stationId=station-uuid` 🔒

### 9. Get Alerts
**GET** `/analytics/alerts?stationId=station-uuid&severity=critical` 🔒

---

## 🔌 WEBSOCKET ENDPOINTS (Real-time Data)

### Connection
```javascript
const socket = io('ws://YOUR_SERVER_IP:3001');

// Listen for real-time tank data
socket.on('tankData', (data) => {
  console.log('Real-time tank data:', data);
});

// Join station-specific room
socket.emit('join-station', 'station-uuid');

// Listen for station-specific updates
socket.on('station-update', (data) => {
  console.log('Station update:', data);
});
```

### Available Events:
- `tankData` - Real-time tank readings from ATG
- `station-update` - Station-specific updates
- `alert` - System alerts and notifications
- `transaction` - Real-time transaction data

---

## ⚡ HEALTH & SYSTEM ENDPOINTS

### 1. Health Check
**GET** `/health`

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00Z",
  "uptime": 86400,
  "services": {
    "database": {
      "status": "healthy",
      "connections": {
        "total_connections": 5,
        "active_connections": 2,
        "idle_connections": 3
      }
    },
    "redis": {
      "status": "healthy",
      "usingInMemoryCache": false
    },
    "atg": {
      "status": "healthy",
      "isMonitoring": true,
      "simulationMode": false
    },
    "websocket": {
      "status": "healthy", 
      "connectedClients": 12
    }
  }
}
```

---

## 🔧 ERROR RESPONSES

All API endpoints return consistent error responses:

```json
{
  "success": false,
  "message": "Error description",
  "errors": ["Detailed error messages"],
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### Common HTTP Status Codes:
- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `422` - Validation Error
- `500` - Internal Server Error

---

## 🚀 QUICK START EXAMPLES

### Frontend JavaScript Examples:

#### 1. Login User
```javascript
const response = await fetch('http://YOUR_SERVER_IP:3001/api/auth/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'password123'
  })
});

const data = await response.json();
const token = data.data.token;
```

#### 2. Get Tank Data with Authentication
```javascript
const response = await fetch('http://YOUR_SERVER_IP:3001/api/tanks/current/data', {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
});

const tankData = await response.json();
```

#### 3. Submit EWURA Transaction
```javascript
const response = await fetch('http://YOUR_SERVER_IP:3001/api/ewura/submit-transaction', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    tranId: '1',
    apiSourceId: '109272930_SPAdv2023T',
    rctVerificationCode: '5EC70419851',
    ewuraLicenseNo: 'PRL-2010-715',
    rctDate: '18/07/2025',
    rctTime: '11:08:18',
    operatorTin: '109272930',
    operatorVrn: '40005334W',
    operatorName: 'OMBOZA',
    retailStationName: 'ADVATECH FILLING STATION',
    traSerialNo: '10TZ176714',
    productName: 'PETROL',
    unitPrice: '2700',
    volume: '3.5',
    amount: '9450',
    discountAmount: '0',
    amountNew: '9450',
    buyerName: 'JUMA',
    cardDesc: 'NMB BANK CARD'
  })
});

const ewuraResult = await response.json();
```

#### 4. Connect to WebSocket for Real-time Data
```javascript
import io from 'socket.io-client';

const socket = io('ws://YOUR_SERVER_IP:3001');

socket.on('connect', () => {
  console.log('Connected to server');
  
  // Join station room for specific updates
  socket.emit('join-station', 'your-station-id');
});

socket.on('tankData', (data) => {
  console.log('Real-time tank readings:', data);
  // Update your UI with latest tank data
});

socket.on('alert', (alert) => {
  console.log('System alert:', alert);
  // Show alert to user
});
```

---

## 📝 NOTES

1. **Replace `YOUR_SERVER_IP:3001`** with your actual server IP and port
2. **JWT tokens expire** - implement token refresh logic
3. **WebSocket connection** provides real-time tank readings every 5 seconds  
4. **EWURA certificate** must be placed in `src/certs/advatech.pfx`
5. **Environment variables** must be set for database, EWURA password, etc.
6. **Rate limiting** is applied - max 1000 requests per 15 minutes per IP
7. **All timestamps** are in ISO 8601 format
8. **Pagination** is available on list endpoints
9. **Filtering and sorting** supported on most GET endpoints
10. **API documentation** available at `/api-docs` endpoint

---

This API provides complete backend functionality for gas station management including user authentication, tank monitoring, EWURA compliance, reporting, and real-time data streaming via WebSocket.
import { logger } from '../utils/logger.js';

export async function initializeSchema(pool) {
  try {
    // Core tables first
    await pool.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');

    // Create base tables
    await createCoreTables(pool);
    
    // Create partitioned tables
    await createPartitionedTables(pool);
    
    // Add interface-specific columns and indexes
    await addInterfaceColumns(pool);
    
    // Create monitoring tables
    await createMonitoringTables(pool);

    logger.info('✅ Database schema initialized successfully');
  } catch (error) {
    logger.error('❌ Database schema initialization failed:', error);
    throw error;
  }
}

async function createCoreTables(pool) {
  // User roles and permissions
  await pool.query(`
    CREATE TABLE IF NOT EXISTS user_roles (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      code VARCHAR(20) UNIQUE NOT NULL,
      name VARCHAR(50) NOT NULL,
      permissions JSONB NOT NULL DEFAULT '[]',
      description TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `);

  // Interface types
  await pool.query(`
    CREATE TABLE IF NOT EXISTS interface_types (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      code VARCHAR(20) UNIQUE NOT NULL,
      name VARCHAR(50) NOT NULL,
      description TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);

  // Geographic hierarchy tables
  await pool.query(`
    CREATE TABLE IF NOT EXISTS countries (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      code VARCHAR(3) UNIQUE NOT NULL,
      name VARCHAR(100) NOT NULL,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS regions (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      code VARCHAR(10) UNIQUE NOT NULL,
      name VARCHAR(100) NOT NULL,
      country_id UUID REFERENCES countries(id),
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS districts (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      code VARCHAR(10) UNIQUE NOT NULL,
      name VARCHAR(100) NOT NULL,
      region_id UUID REFERENCES regions(id),
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS wards (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      code VARCHAR(10) UNIQUE NOT NULL,
      name VARCHAR(100) NOT NULL,
      district_id UUID REFERENCES districts(id),
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `);

  // Streets
  await pool.query(`
    CREATE TABLE IF NOT EXISTS streets (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      code VARCHAR(10) UNIQUE NOT NULL,
      name VARCHAR(100) NOT NULL,
      ward_id UUID REFERENCES wards(id),
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `);

  // Taxpayers
  await pool.query(`
    CREATE TABLE IF NOT EXISTS taxpayers (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      tin VARCHAR(20) UNIQUE NOT NULL,
      vrn VARCHAR(20),
      business_name VARCHAR(200) NOT NULL,
      trade_name VARCHAR(200),
      business_type VARCHAR(50),
      registration_date DATE,
      street_id UUID REFERENCES streets(id),
      address TEXT,
      phone VARCHAR(20),
      email VARCHAR(100),
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `);

  // Stations
  await pool.query(`
    CREATE TABLE IF NOT EXISTS stations (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      code VARCHAR(20) UNIQUE NOT NULL,
      name VARCHAR(200) NOT NULL,
      taxpayer_id UUID REFERENCES taxpayers(id),
      street_id UUID REFERENCES streets(id),
      address TEXT,
      coordinates POINT,
      ewura_license_no VARCHAR(50),
      operational_hours JSONB,
      interface_type_id UUID REFERENCES interface_types(id),
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `);

  // Add stations table with api_key
  await pool.query(`
    ALTER TABLE stations 
    ADD COLUMN IF NOT EXISTS api_key VARCHAR(100) UNIQUE
  `);

  // Add index for api_key
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_stations_api_key 
    ON stations(api_key)
    WHERE api_key IS NOT NULL
  `);

  // Users
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      device_serial VARCHAR(100) UNIQUE NOT NULL,
      email VARCHAR(255),
      username VARCHAR(100) UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      first_name VARCHAR(100) NOT NULL,
      last_name VARCHAR(100) NOT NULL,
      phone VARCHAR(20),
      user_role_id UUID REFERENCES user_roles(id),
      station_id UUID REFERENCES stations(id),
      interface_type_id UUID REFERENCES interface_types(id),
      last_login_at TIMESTAMP,
      password_changed_at TIMESTAMP DEFAULT NOW(),
      is_active BOOLEAN DEFAULT true,
      email_verified BOOLEAN DEFAULT false,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `);

  // Create additional indexes for performance
  await pool.query('CREATE UNIQUE INDEX IF NOT EXISTS idx_users_device_serial_unique ON users(device_serial)');
  // Products
  await pool.query(`
    CREATE TABLE IF NOT EXISTS products (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      code VARCHAR(20) UNIQUE NOT NULL,
      name VARCHAR(100) NOT NULL,
      category VARCHAR(50),
      unit VARCHAR(20) DEFAULT 'LITERS',
      color VARCHAR(7) DEFAULT '#3B82F6',
      description TEXT,
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `);

  // Product pricing
  await pool.query(`
    CREATE TABLE IF NOT EXISTS product_pricing (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      product_id UUID REFERENCES products(id),
      price DECIMAL(10,2) NOT NULL,
      effective_date DATE NOT NULL,
      expiry_date DATE,
      station_id UUID REFERENCES stations(id),
      created_by UUID REFERENCES users(id),
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);

  // Tanks
  await pool.query(`
    CREATE TABLE IF NOT EXISTS tanks (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      station_id UUID REFERENCES stations(id),
      tank_number VARCHAR(10) NOT NULL,
      product_id UUID REFERENCES products(id),
      capacity DECIMAL(10,2) NOT NULL,
      safe_level DECIMAL(10,2),
      critical_level DECIMAL(10,2),
      current_level DECIMAL(10,2) DEFAULT 0,
      temperature DECIMAL(5,2),
      last_reading_at TIMESTAMP,
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(station_id, tank_number)
    )
  `);

  // Backwards-compatibility: add legacy `stationid` column (some code uses stationid)
  await pool.query(`
    ALTER TABLE tanks
    ADD COLUMN IF NOT EXISTS stationid UUID
  `);

  // Populate legacy column for existing rows
  await pool.query(`
    UPDATE tanks
    SET stationid = station_id
    WHERE stationid IS NULL
  `);

  // Create trigger function to keep stationid synced with station_id on insert/update
  await pool.query(`
    CREATE OR REPLACE FUNCTION sync_tanks_stationid()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.stationid := NEW.station_id;
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql
  `);

  await pool.query(`DROP TRIGGER IF EXISTS trg_sync_tanks_stationid ON tanks`);
  await pool.query(`
    CREATE TRIGGER trg_sync_tanks_stationid
    BEFORE INSERT OR UPDATE ON tanks
    FOR EACH ROW EXECUTE PROCEDURE sync_tanks_stationid()
  `);

  // Backwards-compatibility: add legacy `tanknumber` column (some code/queries use tanknumber)
  await pool.query(`
    ALTER TABLE tanks
    ADD COLUMN IF NOT EXISTS tanknumber VARCHAR(10)
  `);

  // Populate legacy tanknumber for existing rows
  await pool.query(`
    UPDATE tanks
    SET tanknumber = tank_number
    WHERE tanknumber IS NULL
  `);

  // Create trigger function to keep tanknumber synced with tank_number on insert/update
  await pool.query(`
    CREATE OR REPLACE FUNCTION sync_tanks_tanknumber()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.tanknumber := NEW.tank_number;
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql
  `);

  await pool.query(`DROP TRIGGER IF EXISTS trg_sync_tanks_tanknumber ON tanks`);
  await pool.query(`
    CREATE TRIGGER trg_sync_tanks_tanknumber
    BEFORE INSERT OR UPDATE ON tanks
    FOR EACH ROW EXECUTE PROCEDURE sync_tanks_tanknumber()
  `);

  // Backwards-compatibility: add legacy `productid` column (some code/queries use productid)
  await pool.query(`
    ALTER TABLE tanks
    ADD COLUMN IF NOT EXISTS productid UUID
  `);

  // Populate legacy productid for existing rows
  await pool.query(`
    UPDATE tanks
    SET productid = product_id
    WHERE productid IS NULL
  `);

  // Create trigger function to keep productid synced with product_id on insert/update
  await pool.query(`
    CREATE OR REPLACE FUNCTION sync_tanks_productid()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.productid := NEW.product_id;
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql
  `);

  await pool.query(`DROP TRIGGER IF EXISTS trg_sync_tanks_productid ON tanks`);
  await pool.query(`
    CREATE TRIGGER trg_sync_tanks_productid
    BEFORE INSERT OR UPDATE ON tanks
    FOR EACH ROW EXECUTE PROCEDURE sync_tanks_productid()
  `);

  // Backwards-compatibility: add legacy `safelevel`, `criticallevel`, `currentlevel` columns
  await pool.query(`
    ALTER TABLE tanks
    ADD COLUMN IF NOT EXISTS safelevel DECIMAL(10,2)
  `);

  await pool.query(`
    ALTER TABLE tanks
    ADD COLUMN IF NOT EXISTS criticallevel DECIMAL(10,2)
  `);

  await pool.query(`
    ALTER TABLE tanks
    ADD COLUMN IF NOT EXISTS currentlevel DECIMAL(10,2)
  `);

  // Populate legacy numeric columns for existing rows
  await pool.query(`
    UPDATE tanks
    SET safelevel = safe_level
    WHERE safelevel IS NULL
  `);

  await pool.query(`
    UPDATE tanks
    SET criticallevel = critical_level
    WHERE criticallevel IS NULL
  `);

  await pool.query(`
    UPDATE tanks
    SET currentlevel = current_level
    WHERE currentlevel IS NULL
  `);

  // Create trigger functions to keep legacy numeric columns in sync
  await pool.query(`
    CREATE OR REPLACE FUNCTION sync_tanks_safelevel()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.safelevel := NEW.safe_level;
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql
  `);

  await pool.query(`
    CREATE OR REPLACE FUNCTION sync_tanks_criticallevel()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.criticallevel := NEW.critical_level;
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql
  `);

  await pool.query(`
    CREATE OR REPLACE FUNCTION sync_tanks_currentlevel()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.currentlevel := NEW.current_level;
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql
  `);

  await pool.query(`DROP TRIGGER IF EXISTS trg_sync_tanks_safelevel ON tanks`);
  await pool.query(`
    CREATE TRIGGER trg_sync_tanks_safelevel
    BEFORE INSERT OR UPDATE ON tanks
    FOR EACH ROW EXECUTE PROCEDURE sync_tanks_safelevel()
  `);

  await pool.query(`DROP TRIGGER IF EXISTS trg_sync_tanks_criticallevel ON tanks`);
  await pool.query(`
    CREATE TRIGGER trg_sync_tanks_criticallevel
    BEFORE INSERT OR UPDATE ON tanks
    FOR EACH ROW EXECUTE PROCEDURE sync_tanks_criticallevel()
  `);

  await pool.query(`DROP TRIGGER IF EXISTS trg_sync_tanks_currentlevel ON tanks`);
  await pool.query(`
    CREATE TRIGGER trg_sync_tanks_currentlevel
    BEFORE INSERT OR UPDATE ON tanks
    FOR EACH ROW EXECUTE PROCEDURE sync_tanks_currentlevel()
  `);

  // Pumps
  await pool.query(`
    CREATE TABLE IF NOT EXISTS pumps (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      station_id UUID REFERENCES stations(id),
      pump_number VARCHAR(10) NOT NULL,
      tank_id UUID REFERENCES tanks(id),
      nozzle_count INTEGER DEFAULT 1,
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(station_id, pump_number)
    )
  `);
}

async function createPartitionedTables(pool) {
  // Tank readings with interface fields
  await pool.query(`
    CREATE TABLE IF NOT EXISTS tank_readings (
      id UUID DEFAULT uuid_generate_v4(),
      tank_id UUID NOT NULL REFERENCES tanks(id),
      reading_timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
      reading_type VARCHAR(20) DEFAULT 'REAL_TIME',
      interface_source VARCHAR(20),
      raw_data JSONB,
      density DECIMAL(6,4),
      mass DECIMAL(12,2),
      total_volume DECIMAL(10,2),
      oil_volume DECIMAL(10,2),
      water_volume DECIMAL(10,2),
      tc_volume DECIMAL(10,2),
      ullage DECIMAL(10,2),
      oil_height DECIMAL(10,2),
      water_height DECIMAL(10,2),
      temperature DECIMAL(5,2),
      created_at TIMESTAMP DEFAULT NOW(),
      PRIMARY KEY (id, reading_timestamp),
      UNIQUE (tank_id, reading_timestamp)
    ) PARTITION BY RANGE (reading_timestamp)
  `);

  // Sales transactions with interface fields
  await pool.query(`
    CREATE TABLE IF NOT EXISTS sales_transactions (
      id UUID DEFAULT uuid_generate_v4(),
      station_id UUID NOT NULL REFERENCES stations(id),
      pump_id UUID REFERENCES pumps(id),
      tank_id UUID REFERENCES tanks(id),
      product_id UUID REFERENCES products(id),
      user_id UUID REFERENCES users(id),
      interface_source VARCHAR(20),
      transaction_id VARCHAR(100),
      sent_to_ewura BOOLEAN DEFAULT FALSE,
      ewura_sent_at TIMESTAMP,
      tc_volume DECIMAL(10,3),
      fuel_grade_name VARCHAR(50),
      efd_serial_number VARCHAR(100),
      transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
      transaction_time TIME NOT NULL DEFAULT CURRENT_TIME,
      volume DECIMAL(10,3) NOT NULL,
      unit_price DECIMAL(10,2) NOT NULL,
      total_amount DECIMAL(12,2) NOT NULL,
      discount_amount DECIMAL(10,2) DEFAULT 0,
      payment_method VARCHAR(50),
      receipt_number VARCHAR(100),
      customer_name VARCHAR(200),
      card_description VARCHAR(100),
      created_at TIMESTAMP DEFAULT NOW(),
      PRIMARY KEY (id, transaction_date)
    ) PARTITION BY RANGE (transaction_date)
  `);

  // Create yearly partitions
  const currentYear = new Date().getFullYear();
  for (let year = currentYear - 1; year <= currentYear + 1; year++) {
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS tank_readings_${year} 
        PARTITION OF tank_readings 
        FOR VALUES FROM ('${year}-01-01') TO ('${year + 1}-01-01')
      `);
      await pool.query(`
        CREATE TABLE IF NOT EXISTS sales_transactions_${year} 
        PARTITION OF sales_transactions 
        FOR VALUES FROM ('${year}-01-01') TO ('${year + 1}-01-01')
      `);
    } catch (partitionError) {
      // Partition might already exist, continue
    }
  }
}

async function addInterfaceColumns(pool) {
  // Add interface-specific columns and indexes
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_tank_readings_interface_source 
    ON tank_readings(interface_source, reading_timestamp DESC);
    
    CREATE INDEX IF NOT EXISTS idx_tank_readings_tank_time 
    ON tank_readings(tank_id, reading_timestamp DESC);
    
    CREATE INDEX IF NOT EXISTS idx_sales_station_date 
    ON sales_transactions(station_id, transaction_date);
    
    CREATE UNIQUE INDEX IF NOT EXISTS ux_sales_txid_per_day
    ON sales_transactions (station_id, transaction_id, transaction_date)
    WHERE transaction_id IS NOT NULL;
  `);
}

async function createMonitoringTables(pool) {
  // Create monitoring tables (interface_status, refill_events, transaction_counts)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS interface_status (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      station_id UUID REFERENCES stations(id),
      interface_type VARCHAR(20) NOT NULL,
      is_connected BOOLEAN DEFAULT FALSE,
      last_communication TIMESTAMP,
      error_count INTEGER DEFAULT 0,
      last_error TEXT,
      configuration JSONB,
      updated_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(station_id, interface_type)
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS refill_events (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      tank_id UUID REFERENCES tanks(id),
      detected_at TIMESTAMP DEFAULT NOW(),
      volume_added DECIMAL(10,2),
      volume_before DECIMAL(10,2),
      volume_after DECIMAL(10,2),
      estimated_cost DECIMAL(12,2),
      temperature_before DECIMAL(5,2),
      temperature_after DECIMAL(5,2),
      delivery_receipt_no VARCHAR(100),
      supplier VARCHAR(200),
      notes TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS transaction_counts (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      station_id UUID REFERENCES stations(id),
      hour_start TIMESTAMP NOT NULL,
      count INTEGER DEFAULT 0,
      total_volume DECIMAL(12,2) DEFAULT 0,
      total_amount DECIMAL(15,2) DEFAULT 0,
      anomaly_detected BOOLEAN DEFAULT FALSE,
      z_score DECIMAL(5,2),
      created_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(station_id, hour_start)
    )
  `);
}
import { logger } from '../utils/logger.js';

export async function initializeSchema(pool) {
  try {
    // Enable UUID extension
    await pool.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');

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

    // Tank readings (partitioned)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS tank_readings (
        id UUID DEFAULT uuid_generate_v4(),
        tank_id UUID NOT NULL REFERENCES tanks(id),
        reading_timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
        total_volume DECIMAL(10,2),
        oil_volume DECIMAL(10,2),
        water_volume DECIMAL(10,2),
        tc_volume DECIMAL(10,2),
        ullage DECIMAL(10,2),
        oil_height DECIMAL(10,2),
        water_height DECIMAL(10,2),
        temperature DECIMAL(5,2),
        created_at TIMESTAMP DEFAULT NOW(),
        PRIMARY KEY (id, reading_timestamp)
      ) PARTITION BY RANGE (reading_timestamp)
    `);

    // Sales transactions (partitioned)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS sales_transactions (
        id UUID DEFAULT uuid_generate_v4(),
        station_id UUID NOT NULL REFERENCES stations(id),
        pump_id UUID REFERENCES pumps(id),
        tank_id UUID REFERENCES tanks(id),
        product_id UUID REFERENCES products(id),
        user_id UUID REFERENCES users(id),
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

    // EWURA submissions
    await pool.query(`
      CREATE TABLE IF NOT EXISTS ewura_submissions (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        station_id UUID REFERENCES stations(id),
        submission_type VARCHAR(50) NOT NULL,
        transaction_id VARCHAR(100),
        xml_data TEXT NOT NULL,
        response_data TEXT,
        status VARCHAR(20) DEFAULT 'pending',
        submitted_at TIMESTAMP DEFAULT NOW(),
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // User sessions
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_sessions (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        token_hash TEXT NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Create partitions for current year
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

    // Create indexes
    await pool.query('CREATE INDEX IF NOT EXISTS idx_users_device_serial ON users(device_serial)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_users_station ON users(station_id)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_tanks_station ON tanks(station_id)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_tank_readings_tank_time ON tank_readings(tank_id, reading_timestamp DESC)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_sales_station_date ON sales_transactions(station_id, transaction_date)');

    logger.info('✅ Database schema initialized successfully');
  } catch (error) {
    logger.error('❌ Database schema initialization failed:', error);
    throw error;
  }
}
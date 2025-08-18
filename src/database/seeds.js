import { logger } from '../utils/logger.js';

export async function seedDefaultData(pool) {
  try {
    // Check all main tables for existing data
    const tables = [
      'countries', 'regions', 'districts', 'wards', 'streets',
      'interface_types', 'user_roles', 'products', 'taxpayers', 'stations', 'users'
    ];
    for (const table of tables) {
      const result = await pool.query(`SELECT COUNT(*) FROM ${table}`);
      if (parseInt(result.rows[0].count, 10) > 0) {
        logger.info(`✅ Data already exists in table "${table}", skipping seeding.`);
        return;
      }
    }

    // Seed Countries
    await pool.query(`
      INSERT INTO countries (code, name) VALUES 
      ('TZ', 'Tanzania'),
      ('KE', 'Kenya'),
      ('UG', 'Uganda')
      ON CONFLICT (code) DO NOTHING
    `);

    // Seed Regions for Tanzania
    const tanzaniaResult = await pool.query("SELECT id FROM countries WHERE code = 'TZ'");
    const tanzaniaId = tanzaniaResult.rows[0].id;

    await pool.query(`
      INSERT INTO regions (code, name, country_id) VALUES 
      ('DSM', 'Dar es Salaam', $1),
      ('PWN', 'Pwani', $1),
      ('MTW', 'Mtwara', $1),
      ('LND', 'Lindi', $1),
      ('RUV', 'Ruvuma', $1)
      ON CONFLICT (code) DO NOTHING
    `, [tanzaniaId]);

    // Seed Districts for Dar es Salaam
    const dsmResult = await pool.query("SELECT id FROM regions WHERE code = 'DSM'");
    const dsmId = dsmResult.rows[0].id;

    await pool.query(`
      INSERT INTO districts (code, name, region_id) VALUES 
      ('KIN', 'Kinondoni', $1),
      ('ILA', 'Ilala', $1),
      ('TMK', 'Temeke', $1),
      ('UBU', 'Ubungo', $1),
      ('KIG', 'Kigamboni', $1)
      ON CONFLICT (code) DO NOTHING
    `, [dsmId]);

    // Seed Wards for Kinondoni
    const kinResult = await pool.query("SELECT id FROM districts WHERE code = 'KIN'");
    const kinId = kinResult.rows[0].id;

    await pool.query(`
      INSERT INTO wards (code, name, district_id) VALUES 
      ('MSA', 'Msasani', $1),
      ('OST', 'Oysterbay', $1),
      ('KIN', 'Kinondoni', $1),
      ('MKU', 'Mikocheni', $1),
      ('MAS', 'Masaki', $1)
      ON CONFLICT (code) DO NOTHING
    `, [kinId]);

    // Seed Streets for Msasani Ward
    const msasaniResult = await pool.query("SELECT id FROM wards WHERE code = 'MSA'");
    const msasaniId = msasaniResult.rows[0].id;

    await pool.query(`
      INSERT INTO streets (code, name, ward_id) VALUES 
      ('MSA01', 'Msasani Peninsula Street', $1),
      ('MSA02', 'Haile Selassie Road', $1),
      ('MSA03', 'Toure Drive', $1),
      ('MSA04', 'Slipway Road', $1),
      ('MSA05', 'Peninsula Road', $1)
      ON CONFLICT (code) DO NOTHING
    `, [msasaniId]);

    // Seed Interface Types
    await pool.query(`
      INSERT INTO interface_types (code, name, description) VALUES 
      ('NFPP', 'NFPP Interface', 'National Fuel Price Platform Interface'),
      ('NPGIS', 'NPGIS Interface', 'National Petroleum GIS Interface')
      ON CONFLICT (code) DO NOTHING
    `);

    // Seed User Roles
    await pool.query(`
      INSERT INTO user_roles (code, name, permissions, description) VALUES 
      ('ADMIN', 'System Administrator', '["*"]', 'Full system access'),
      ('MANAGER', 'Station Manager', '["stations.manage", "users.view", "reports.view", "tanks.manage"]', 'Station management access'),
      ('OPERATOR', 'Station Operator', '["tanks.view", "sales.create", "reports.view"]', 'Daily operations access'),
      ('VIEWER', 'Report Viewer', '["reports.view", "tanks.view"]', 'Read-only access')
      ON CONFLICT (code) DO NOTHING
    `);

    // Seed Products
    await pool.query(`
      INSERT INTO products (code, name, category, color, description) VALUES 
      ('PET', 'PETROL', 'FUEL', '#FF6B6B', 'Premium Motor Spirit'),
      ('DSL', 'DIESEL', 'FUEL', '#4ECDC4', 'Automotive Gas Oil'),
      ('KER', 'KEROSENE', 'FUEL', '#45B7D1', 'Illuminating Kerosene'),
      ('LPG', 'LPG', 'GAS', '#96CEB4', 'Liquefied Petroleum Gas')
      ON CONFLICT (code) DO NOTHING
    `);

    // Seed sample Taxpayer
    const streetResult = await pool.query("SELECT id FROM streets WHERE code = 'MSA01'");
    const streetId = streetResult.rows[0].id;

    await pool.query(`
      INSERT INTO taxpayers (tin, vrn, business_name, trade_name, business_type, street_id, address, phone, email) VALUES 
      ('109272930', '40005334W', 'ADVATECH SOLUTIONS LTD', 'ADVATECH FILLING STATION', 'RETAIL_FUEL', $1, 'Msasani Peninsula Street, Msasani, Dar es Salaam', '+255754100300', 'info@advafuel.com')
      ON CONFLICT (tin) DO NOTHING
    `, [streetId]);

    // Seed sample Station
    const taxpayerResult = await pool.query("SELECT id FROM taxpayers WHERE tin = '109272930'");
    const taxpayerId = taxpayerResult.rows[0].id;

    const interfaceResult = await pool.query("SELECT id FROM interface_types WHERE code = 'NPGIS'");
    const interfaceId = interfaceResult.rows[0].id;

    await pool.query(`
      INSERT INTO stations (code, name, taxpayer_id, street_id, address, ewura_license_no, interface_type_id, operational_hours) VALUES 
      ('ADV001', 'ADVATECH FILLING STATION', $1, $2, 'Msasani Peninsula Street, Msasani, Kinondoni, Dar es Salaam', 'PRL-2010-715', $3, '{"monday": "06:00-22:00", "tuesday": "06:00-22:00", "wednesday": "06:00-22:00", "thursday": "06:00-22:00", "friday": "06:00-22:00", "saturday": "06:00-22:00", "sunday": "07:00-21:00"}')
      ON CONFLICT (code) DO NOTHING
    `, [taxpayerId, streetId, interfaceId]);

    // Seed default admin user
    const adminRoleResult = await pool.query("SELECT id FROM user_roles WHERE code = 'ADMIN'");
    const adminRoleId = adminRoleResult.rows[0].id;

    const stationResult = await pool.query("SELECT id FROM stations WHERE code = 'ADV001'");
    const stationId = stationResult.rows[0].id;

    // Check if admin user exists by device_serial AND username
    const existingAdmin = await pool.query("SELECT id FROM users WHERE device_serial = '02TZ994528'");
    const existingAdminByUsername = await pool.query("SELECT id FROM users WHERE username = 'admin'");
    
    if (existingAdmin.rows.length === 0) {
      // Check if username 'admin' already exists
      if (existingAdminByUsername.rows.length === 0) {
        const bcrypt = await import('bcrypt');
        const hashedPassword = await bcrypt.hash('Adm1n@2024!', 12);
        
        await pool.query(`
          INSERT INTO users (device_serial, email, username, password_hash, first_name, last_name, phone, user_role_id, station_id, interface_type_id, email_verified) VALUES 
          ('02TZ994528', 'admin@advafuel.com', 'admin', $1, 'System', 'Administrator', '+255754100300', $2, $3, $4, true)
        `, [hashedPassword, adminRoleId, stationId, interfaceId]);
        
        logger.info('✅ Default admin user created successfully');
      } else {
        // Update existing user with device_serial if username exists but device_serial doesn't
        await pool.query(`
          UPDATE users 
          SET device_serial = '02TZ994528', 
              user_role_id = $1, 
              station_id = $2, 
              interface_type_id = $3,
              updated_at = NOW()
          WHERE username = 'admin'
        `, [adminRoleId, stationId, interfaceId]);
        
        logger.info('✅ Updated existing admin user with device_serial');
      }
    } else {
      logger.info('✅ Admin user already exists, skipping creation');
    }

    logger.info('✅ Default data seeded successfully');
  } catch (error) {
    logger.error('❌ Error seeding default data:', error);
    throw error;
  }
}
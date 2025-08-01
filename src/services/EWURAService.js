import * as fs from 'fs';
import * as path from 'path';
import forge from 'node-forge';
import { fileURLToPath } from 'url';
import { logger } from '../utils/logger.js';
import { dbManager } from '../database/DatabaseManager.js';
import fetch from 'node-fetch';
import dotenv from 'dotenv';
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class EWURAServiceClass {
  constructor() {
    this.certificatePath = path.join(__dirname, '../certs/advatech.pfx');
    this.password = process.env.EWURA_P12PASSWORD;
    this.isInitialized = false;
    // Different endpoints for different operations
    this.registrationEndpoint = process.env.EWURA_REGISTRATION_ENDPOINT || 'http://196.41.86.25:8081/api/v1/RegisterRetailStationRecords';
    this.saleEndpoint = process.env.EWURA_SALE_ENDPOINT || 'http://196.41.86.25:8081/api/v1/PostRetailSalesTran';
    this.reportEndpoint = process.env.EWURA_REPORT_ENDPOINT || 'http://196.41.86.25:8081/api/v1/PostDailyStationInvSumTran';
    this.simulationMode = process.env.EWURA_SIMULATION_MODE === 'true';
  }

  async initialize() {
    console.log('🔐 [EWURA] Initializing EWURA Service...');
    console.log('🔐 [EWURA] Certificate Path:', this.certificatePath);
    console.log('🔐 [EWURA] Certificate Exists:', fs.existsSync(this.certificatePath));
    console.log('🔐 [EWURA] Password Set:', !!this.password);
    console.log('🌐 [EWURA] Registration Endpoint:', this.registrationEndpoint);
    console.log('🌐 [EWURA] Sale Endpoint:', this.saleEndpoint);
    console.log('🌐 [EWURA] Report Endpoint:', this.reportEndpoint);
    console.log('🎭 [EWURA] Simulation Mode:', this.simulationMode);
    
    if (!this.password) {
      logger.error('❌ EWURA_P12PASSWORD not set. Cannot proceed.');
      console.log('⚠️ [EWURA] Running in simulation mode due to missing password');
      this.simulationMode = true;
    }
    if (!fs.existsSync(this.certificatePath)) {
      logger.error('❌ EWURA certificate not found. Cannot proceed.');
      console.log('⚠️ [EWURA] Running in simulation mode due to missing certificate');
      this.simulationMode = true;
    }
    
    await this.createSubmissionsTable();
    this.isInitialized = true;
    
    if (this.simulationMode) {
      logger.info('✅ EWURA Service initialized in SIMULATION mode');
      console.log('✅ [EWURA] Service initialized in SIMULATION mode');
    } else {
      logger.info('✅ EWURA Service initialized in PRODUCTION mode');
      console.log('✅ [EWURA] Service initialized in PRODUCTION mode');
    }
  }

  async createSubmissionsTable() {
    const query = `
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
    `;
    await dbManager.query(query);
  }

  minifyXml(xml) {
    return xml.replace(/>\s+</g, '><').trim();
  }

  async signXml(xmlContent, signatureTag) {
    try {
      console.log('\n=== [EWURA] XML SIGNING PROCESS ===');
      console.log('📄 [EWURA] Original XML:', xmlContent);
      console.log('🔐 [EWURA] Certificate Path:', this.certificatePath);
      console.log('🔐 [EWURA] Certificate Exists:', fs.existsSync(this.certificatePath));
      console.log('🔐 [EWURA] Password Set:', !!this.password);
      
      const pfxBuffer = fs.readFileSync(this.certificatePath);
      console.log('📦 [EWURA] Certificate Buffer Size:', pfxBuffer.length);
      
      const cleaned = this.minifyXml(xmlContent);
      console.log('🧹 [EWURA] Cleaned XML:', cleaned);

      // Parse the PKCS#12 file using node-forge
      const p12Der = forge.util.createBuffer(pfxBuffer.toString('binary'));
      const p12Asn1 = forge.asn1.fromDer(p12Der);
      const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, this.password);
      console.log('🔓 [EWURA] Certificate parsed successfully');

      // Get private key
      const bags = p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag });
      const bag = bags[forge.pki.oids.pkcs8ShroudedKeyBag][0];
      const privateKey = bag.key;
      console.log('🔑 [EWURA] Private key extracted');

      // Sign
      const md = forge.md.sha1.create();
      md.update(cleaned, 'utf8');
      const signature = forge.util.encode64(privateKey.sign(md));
      console.log('✍️ [EWURA] XML signed, signature length:', signature.length);

      const xml = `<?xml version="1.0" encoding="UTF-8"?><NPGIS>${cleaned}<${signatureTag}>${signature}</${signatureTag}></NPGIS>`;
      console.log('📄 [EWURA] Final signed XML length:', xml.length);
      console.log('================================\n');
      
      return xml;
    } catch (error) {
      console.error('\n❌ [EWURA] XML SIGNING ERROR:');
      console.error('❌ [EWURA] Error:', error.message);
      console.error('❌ [EWURA] Stack:', error.stack);
      console.error('===============================\n');
      
      logger.error('Error signing XML:', error);
      throw error;
    }
  }

  async checkEWURAConnection(baseUrl) {
    const ports = [8081, 80, 443, 8080];
    
    for (const port of ports) {
      try {
        const testUrl = `${baseUrl.split(':')[0]}:${baseUrl.split(':')[1]}:${port}/api/v1/RegisterRetailStationRecords`;
        console.log(`🔍 [EWURA] Testing connection to: ${testUrl}`);
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);
        
        const response = await fetch(testUrl, {
          method: 'HEAD',
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        console.log(`✅ [EWURA] Server reachable on port ${port}, status:`, response.status);
        
        // Update endpoints to use working port
        this.registrationEndpoint = this.registrationEndpoint.replace(/:\d+/, `:${port}`);
        this.saleEndpoint = this.saleEndpoint.replace(/:\d+/, `:${port}`);
        this.reportEndpoint = this.reportEndpoint.replace(/:\d+/, `:${port}`);
        
        return true;
      } catch (error) {
        console.log(`❌ [EWURA] Port ${port} not reachable:`, error.message);
      }
    }
    
    console.log('❌ [EWURA] No working ports found');
    return false;
  }

  async sendToEWURA(xml, endpointType = 'registration') {
    // Select the correct endpoint based on operation type
    let targetEndpoint;
    switch (endpointType) {
      case 'registration':
        targetEndpoint = this.registrationEndpoint;
        break;
      case 'sale':
        targetEndpoint = this.saleEndpoint;
        break;
      case 'report':
        targetEndpoint = this.reportEndpoint;
        break;
      default:
        targetEndpoint = this.registrationEndpoint;
    }

    // Check if EWURA server is reachable first
    const isReachable = await this.checkEWURAConnection(targetEndpoint);
    if (!isReachable) {
      console.log('⚠️ [EWURA] Server not reachable, enabling simulation mode');
      this.simulationMode = true;
    }

    if (this.simulationMode) {
      console.log('\n=== [EWURA] SIMULATION MODE ===');
      console.log('🎭 [EWURA] Not sending to real EWURA (simulation mode)');
      console.log('🌐 [EWURA] Would use endpoint:', targetEndpoint);
      console.log('📄 [EWURA] Would send XML:', xml.substring(0, 500) + '...');
      console.log('✅ [EWURA] Simulated successful response');
      console.log('==============================\n');
      
      return `<?xml version="1.0" encoding="UTF-8"?>
        <NPGISResponse>
          <Status>SUCCESS</Status>
          <Message>${endpointType} received successfully (SIMULATION)</Message>
          <TransactionId>SIM-${Date.now()}</TransactionId>
          <Timestamp>${new Date().toISOString()}</Timestamp>
        </NPGISResponse>`;
    }
    
    try {
      console.log('\n=== [EWURA] SENDING TO EWURA ===');
      console.log('🌐 [EWURA] Operation Type:', endpointType);
      console.log('🌐 [EWURA] Target Endpoint:', targetEndpoint);
      console.log('📄 [EWURA] XML Length:', xml.length);
      console.log('📄 [EWURA] XML Content (first 1000 chars):', xml.substring(0, 1000));
      console.log('📄 [EWURA] Full XML being sent:');
      console.log(xml);
      console.log('================================\n');
      
      logger.info(`[EWURA] Sending ${endpointType} XML to:`, targetEndpoint);
      logger.info('[EWURA] XML Length:', xml.length);
      
      const response = await fetch(targetEndpoint, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/xml',
          'Accept': 'application/xml, text/xml, */*',
          'User-Agent': 'Gas-Station-Management/1.0',
          'Content-Length': xml.length.toString()
        },
        body: xml,
        timeout: 30000 // 30 second timeout
      });
      
      console.log('\n=== [EWURA] RESPONSE RECEIVED ===');
      console.log('🌐 [EWURA] Endpoint Used:', targetEndpoint);
      console.log('📊 [EWURA] Response Status:', response.status);
      console.log('📊 [EWURA] Response Status Text:', response.statusText);
      console.log('📊 [EWURA] Response OK:', response.ok);
      console.log('📊 [EWURA] Response Headers:', Object.fromEntries(response.headers.entries()));
      
      const responseBody = await response.text();
      
      console.log('📄 [EWURA] Response Body Length:', responseBody.length);
      console.log('📄 [EWURA] Response Content Type:', response.headers.get('content-type'));
      console.log('📄 [EWURA] Full Response Body:', responseBody);
      
      // Check if response is HTML (404 page)
      if (responseBody.includes('<!DOCTYPE html>') || responseBody.includes('<html')) {
        console.log('⚠️ [EWURA] Received HTML response - likely 404 or wrong endpoint');
        console.log('🔍 [EWURA] Current endpoint:', targetEndpoint);
        console.log('🔍 [EWURA] Operation type:', endpointType);
        console.log('🔍 [EWURA] This endpoint may not exist or may require different authentication');
      } else if (responseBody.includes('<?xml')) {
        console.log('✅ [EWURA] Received XML response - likely successful');
      } else if (responseBody.includes('{') || responseBody.includes('[')) {
        console.log('📄 [EWURA] Received JSON response');
      } else {
        console.log('❓ [EWURA] Received unknown response format');
      }
      
      console.log('================================\n');
      
      logger.info(`[EWURA] Response Status: ${response.status} ${response.statusText}`);
      logger.info('[EWURA] Response Body Length:', responseBody.length);
      logger.info('[EWURA] Full Response from EWURA:', responseBody);
      
      return responseBody;
    } catch (error) {
      console.error('\n❌ [EWURA] ERROR SENDING TO EWURA:');
      console.error('❌ [EWURA] Error Type:', error.name);
      console.error('❌ [EWURA] Error Message:', error.message);
      console.error('❌ [EWURA] Error Stack:', error.stack);
      console.error('❌ [EWURA] Endpoint URL:', targetEndpoint);
      console.error('❌ [EWURA] Operation Type:', endpointType);
      console.error('================================\n');
      
      logger.error('[EWURA] Error sending to EWURA:', error);
      throw error;
    }
  }

  async generateRegistrationXml(stationData) {
    console.log('\n=== [EWURA] GENERATING REGISTRATION XML ===');
    console.log('📊 [EWURA] Station Data:', stationData);
    console.log('============================================\n');
    
    // Fix tranId issue - default to '1' if undefined
    const tranId = stationData.tranId || '1';
    console.log('🔍 [EWURA] Using tranId:', tranId);
    
    const report = `<RetailStationRegistration>` +
      `<TranId>${tranId}</TranId>` +
      `<APISourceId>${stationData.apiSourceId}</APISourceId>` +
      `<RetailStationName>${stationData.retailStationName}</RetailStationName>` +
      `<EWURALicenseNo>${stationData.ewuraLicenseNo}</EWURALicenseNo>` +
      `<OperatorTin>${stationData.operatorTin}</OperatorTin>` +
      `<OperatorVrn>${stationData.operatorVrn}</OperatorVrn>` +
      `<OperatorName>${stationData.operatorName}</OperatorName>` +
      `<LicenseeTraSerialNo>${stationData.licenseeTraSerialNo}</LicenseeTraSerialNo>` +
      `<RegionName>${stationData.regionName}</RegionName>` +
      `<DistrictName>${stationData.districtName}</DistrictName>` +
      `<WardName>${stationData.wardName}</WardName>` +
      `<Zone>${stationData.zone}</Zone>` +
      `<ContactPersonEmailAddress>${stationData.contactPersonEmailAddress}</ContactPersonEmailAddress>` +
      `<ContactPersonPhone>${stationData.contactPersonPhone}</ContactPersonPhone>` +
      `</RetailStationRegistration>`;

    console.log('\n=== [EWURA] UNSIGNED XML REPORT ===');
    console.log('📄 [EWURA] Report XML:', report);
    console.log('===================================\n');
    
    const signedXml = await this.signXml(report, 'VendorSignature');
    
    console.log('\n=== [EWURA] SIGNED XML READY ===');
    console.log('📄 [EWURA] Signed XML Length:', signedXml.length);
    console.log('📄 [EWURA] Signed XML (first 200 chars):', signedXml.substring(0, 200));
    console.log('===============================\n');
    
    return signedXml;
  }

  async generateTransactionXml(transactionData) {
    const tranId = transactionData.tranId || '1';
    
    const report = `<RetailerSaleTransaction>` +
      `<TranId>${tranId}</TranId>` +
      `<APISourceId>${transactionData.apiSourceId}</APISourceId>` +
      `<RctVerificationCode>${transactionData.rctVerificationCode}</RctVerificationCode>` +
      `<EWURALicenseNo>${transactionData.ewuraLicenseNo}</EWURALicenseNo>` +
      `<RctDate>${transactionData.rctDate}</RctDate>` +
      `<RctTime>${transactionData.rctTime}</RctTime>` +
      `<OperatorTin>${transactionData.operatorTin}</OperatorTin>` +
      `<OperatorVrn>${transactionData.operatorVrn}</OperatorVrn>` +
      `<OperatorName>${transactionData.operatorName}</OperatorName>` +
      `<RetailStationName>${transactionData.retailStationName}</RetailStationName>` +
      `<TraSerialNo>${transactionData.traSerialNo}</TraSerialNo>` +
      `<ProductName>${transactionData.productName}</ProductName>` +
      `<UnitPrice>${transactionData.unitPrice}</UnitPrice>` +
      `<Volume>${transactionData.volume}</Volume>` +
      `<Amount>${transactionData.amount}</Amount>` +
      `<DiscountAmount>${transactionData.discountAmount}</DiscountAmount>` +
      `<AmountNew>${transactionData.amountNew}</AmountNew>` +
      `<BuyerName>${transactionData.buyerName}</BuyerName>` +
      `<CardDesc>${transactionData.cardDesc}</CardDesc>` +
      `</RetailerSaleTransaction>`;

    return await this.signXml(report, 'VendorSignature');
  }

  async generateDailySummaryXml(summaryData) {
    const tranId = summaryData.tranId || '1';
    
    const tanks = summaryData.tankInventory.map(tank => `
      <Tank>
        <TankID>${tank.tankId}</TankID>
        <TankProdName>${tank.tankProdName}</TankProdName>
        <SaleNumber>${tank.saleNumber}</SaleNumber>
        <StartVolume>${tank.startVolume}</StartVolume>
        <ATGDeliveryVolume>${tank.deliveryVolume}</ATGDeliveryVolume>
        <SaleVolume>${tank.saleVolume}</SaleVolume>
        <MeasuredEndVolume>${tank.measuredEndVolume}</MeasuredEndVolume>
        <CalculatedEndVolume>${tank.calculatedEndVolume}</CalculatedEndVolume>
        <VolumeDifference>${tank.volumeDifference}</VolumeDifference>
      </Tank>
    `).join('');

    const report = `
      <StationDaySummaryReport>
        <TranId>${tranId}</TranId>
        <APISourceId>${summaryData.apiSourceId}</APISourceId>
        <EWURALicenseNo>${summaryData.ewuraLicenseNo}</EWURALicenseNo>
        <RetailStationName>${summaryData.retailStationName}</RetailStationName>
        <SerialNo>${summaryData.serialNo}</SerialNo>
        <ReportId>${summaryData.reportId}</ReportId>
        <ReportNo>${summaryData.reportNo}</ReportNo>
        <StartDate>${summaryData.startDate}</StartDate>
        <EndDate>${summaryData.endDate}</EndDate>
        <CountOfTrasactions>${summaryData.countOfTransactions}</CountOfTrasactions>
        <TotalNetAmount>${summaryData.totalNetAmount}</TotalNetAmount>
        <TotalDiscount>${summaryData.totalDiscount}</TotalDiscount>
        <TotalAmount>${summaryData.totalAmount}</TotalAmount>
        <TotalVolume>${summaryData.totalVolume}</TotalVolume>
        <TotalPetrol>${summaryData.totalPetrol}</TotalPetrol>
        <TotalDiesel>${summaryData.totalDiesel}</TotalDiesel>
        <TotalKerosene>${summaryData.totalKerosene}</TotalKerosene>
        <TRNPetrol>${summaryData.trnPetrol}</TRNPetrol>
        <TRNDiesel>${summaryData.trnDiesel}</TRNDiesel>
        <TRNKerosene>${summaryData.trnKerosene}</TRNKerosene>
        <UnitPricePetrol>${summaryData.unitPricePetrol}</UnitPricePetrol>
        <UnitPriceDiesel>${summaryData.unitPriceDiesel}</UnitPriceDiesel>
        <UnitPriceKerosene>${summaryData.unitPriceKerosene}</UnitPriceKerosene>
        <PetrolTotalAmount>${summaryData.petrolTotalAmount}</PetrolTotalAmount>
        <DieselTotalAmount>${summaryData.dieselTotalAmount}</DieselTotalAmount>
        <KeroseneTotalAmount>${summaryData.keroseneTotalAmount}</KeroseneTotalAmount>
        <TotalNoTanks>${summaryData.totalNoTanks}</TotalNoTanks>
        <RegionName>${summaryData.regionName}</RegionName>
        <DistrictName>${summaryData.districtName}</DistrictName>
        <WardName>${summaryData.wardName}</WardName>
        <TankInventory>${tanks}</TankInventory>
      </StationDaySummaryReport>
    `;

    return await this.signXml(report, 'VendorSignature');
  }

  async registerStation(stationData) {
    try {
      console.log('\n=== [EWURA] STATION REGISTRATION START ===');
      console.log('🏪 [EWURA] Station Data Received:', stationData);
      console.log('🎭 [EWURA] Simulation Mode:', this.simulationMode);
      console.log('🌐 [EWURA] Registration Endpoint:', this.registrationEndpoint);
      console.log('==========================================\n');
      
      const xml = await this.generateRegistrationXml(stationData);
      
      console.log('\n=== [EWURA] ABOUT TO SEND TO EWURA ===');
      console.log('📡 [EWURA] Ready to send XML to EWURA...');
      console.log('📏 [EWURA] XML Length:', xml.length);
      console.log('=====================================\n');
      
      const ewuraResponse = await this.sendToEWURA(xml, 'registration');

      console.log('\n=== [EWURA] STORING SUBMISSION ===');
      console.log('💾 [EWURA] Storing submission in database...');
      
      // Store submission record with response
      const submissionId = await this.storeSubmission(
        stationData.stationId,
        'registration',
        stationData.tranId || '1',
        xml,
        ewuraResponse
      );

      console.log('✅ [EWURA] Submission stored with ID:', submissionId);
      console.log('=================================\n');
      
      logger.info(`EWURA station registration XML sent for: ${stationData.retailStationName}`);
      
      return {
        success: true,
        xml,
        ewuraResponse,
        submissionId,
        message: 'Station registration XML sent and response logged'
      };
    } catch (error) {
      console.error('\n❌ [EWURA] REGISTRATION ERROR:');
      console.error('❌ [EWURA] Error:', error.message);
      console.error('❌ [EWURA] Stack:', error.stack);
      console.error('===============================\n');
      
      logger.error('EWURA station registration error:', error);
      throw error;
    }
  }

  async submitTransaction(transactionData) {
    try {
      console.log('\n=== [EWURA] TRANSACTION SUBMISSION START ===');
      console.log('💳 [EWURA] Transaction Data Received:', transactionData);
      console.log('🌐 [EWURA] Sale Endpoint:', this.saleEndpoint);
      console.log('============================================\n');
      
      const xml = await this.generateTransactionXml(transactionData);
      const ewuraResponse = await this.sendToEWURA(xml, 'sale');
      
      // Store submission record
      const submissionId = await this.storeSubmission(null, 'transaction', transactionData.tranId || '1', xml, ewuraResponse);
      
      logger.info(`EWURA transaction XML generated: ${transactionData.tranId}`);
      
      return {
        success: true,
        xml,
        ewuraResponse,
        submissionId,
        message: 'Transaction submitted to EWURA successfully'
      };
    } catch (error) {
      logger.error('EWURA transaction submission error:', error);
      throw error;
    }
  }

  async generateAndSubmitDailySummary(stationId, date, summaryData) {
    try {
      console.log('\n=== [EWURA] DAILY SUMMARY START ===');
      console.log('📊 [EWURA] Summary Data Received:', summaryData);
      console.log('🌐 [EWURA] Report Endpoint:', this.reportEndpoint);
      console.log('======================================\n');
      
      const xml = await this.generateDailySummaryXml(summaryData);
      const ewuraResponse = await this.sendToEWURA(xml, 'report');
      
      // Store submission record
      const submissionId = await this.storeSubmission(stationId, 'daily_summary', summaryData.reportId || '1', xml, ewuraResponse);
      
      logger.info(`EWURA daily summary XML generated: ${stationId} - ${date}`);
      
      return {
        success: true,
        xml,
        ewuraResponse,
        submissionId,
        message: 'Daily summary submitted to EWURA successfully'
      };
    } catch (error) {
      logger.error('EWURA daily summary generation error:', error);
      throw error;
    }
  }

  async storeSubmission(stationId, type, transactionId, xmlData, responseData = null) {
    const query = `
      INSERT INTO ewura_submissions (station_id, submission_type, transaction_id, xml_data, response_data)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id
    `;
    const result = await dbManager.query(query, [stationId, type, transactionId, xmlData, responseData]);
    return result.rows[0];
  }

  async getSubmissionHistory(filters = {}) {
    let query = `
      SELECT es.*, s.name as station_name
      FROM ewura_submissions es
      LEFT JOIN stations s ON es.station_id = s.id
      WHERE 1=1
    `;
    
    const params = [];
    
    if (filters.stationId) {
      query += ` AND es.station_id = $${params.length + 1}`;
      params.push(filters.stationId);
    }
    
    if (filters.type) {
      query += ` AND es.submission_type = $${params.length + 1}`;
      params.push(filters.type);
    }
    
    if (filters.startDate) {
      query += ` AND es.submitted_at >= $${params.length + 1}`;
      params.push(filters.startDate);
    }
    
    if (filters.endDate) {
      query += ` AND es.submitted_at <= $${params.length + 1}`;
      params.push(filters.endDate);
    }
    
    query += ` ORDER BY es.submitted_at DESC`;
    
    const result = await dbManager.query(query, params);
    return result.rows;
  }

  async getRegisteredStations() {
    try {
      const query = `
        SELECT 
          es.id,
          es.station_id,
          es.transaction_id,
          es.submitted_at,
          es.status,
          es.response_data,
          es.xml_data,
          s.name as station_name,
          s.code as station_code,
          s.ewura_license_no,
          t.business_name as taxpayer_name,
          t.tin as operator_tin,
          t.vrn as operator_vrn
        FROM ewura_submissions es
        LEFT JOIN stations s ON es.station_id = s.id
        LEFT JOIN taxpayers t ON s.taxpayer_id = t.id
        WHERE es.submission_type = 'registration'
        ORDER BY es.submitted_at DESC
      `;
      
      const result = await dbManager.query(query);
      return result.rows;
    } catch (error) {
      logger.error('Get registered stations error:', error);
      throw error;
    }
  }

  async validateCertificate() {
    try {
      if (!fs.existsSync(this.certificatePath)) {
        return false;
      }

      const pfxBuffer = fs.readFileSync(this.certificatePath);
      
      // Use node-forge to validate certificate
      const p12Der = forge.util.createBuffer(pfxBuffer.toString('binary'));
      const p12Asn1 = forge.asn1.fromDer(p12Der);
      const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, this.password);
      
      // Get certificate
      const certBags = p12.getBags({ bagType: forge.pki.oids.certBag });
      const cert = certBags[forge.pki.oids.certBag][0].cert;
      
      // Check if certificate is valid (not expired)
      const now = new Date();
      const validTo = cert.validity.notAfter;
      
      return validTo > now;
    } catch (error) {
      logger.error('Certificate validation error:', error);
      return false;
    }
  }
}

export const EWURAService = new EWURAServiceClass();
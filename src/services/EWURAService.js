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

class EwuraHttpError extends Error {
  constructor(message, { status, statusText, body, endpoint, endpointType }) {
    super(message);
    this.name = 'EwuraHttpError';
    this.status = status;
    this.statusText = statusText;
    this.body = body;
    this.endpoint = endpoint;
    this.endpointType = endpointType;
  }
}

class EwuraNetworkError extends Error {
  constructor(message, { endpoint, endpointType, cause }) {
    super(message);
    this.name = 'EwuraNetworkError';
    this.endpoint = endpoint;
    this.endpointType = endpointType;
    this.cause = cause;
  }
}

class EWURAServiceClass {
  constructor() {
    this.certificatePath = path.join(__dirname, '../certs/advatech.pfx');
    this.password = process.env.EWURA_P12PASSWORD;
    this.isInitialized = false;

    this.registrationEndpoint =
      process.env.EWURA_REGISTRATION_ENDPOINT ||
      'http://196.41.86.25:8081/api/v1/RegisterRetailStationRecords';
    this.saleEndpoint =
      process.env.EWURA_SALE_ENDPOINT ||
      'http://196.41.86.25:8081/api/v1/PostRetailSalesTran';
    this.reportEndpoint =
      process.env.EWURA_REPORT_ENDPOINT ||
      'http://196.41.86.25:8081/api/v1/PostDailyStationInvSumTran';

    // IMPORTANT: no auto-fallback — only use env to control simulation.
    this.simulationMode = process.env.EWURA_SIMULATION_MODE === 'true';
  }

  async initialize() {
    if (!this.password || !fs.existsSync(this.certificatePath)) {
      logger.warn('EWURA cert or password missing. Running in simulation mode.');
      this.simulationMode = true;
    }
    await this.createSubmissionsTable();
    this.isInitialized = true;
    logger.info(`EWURA Service initialized in ${this.simulationMode ? 'SIMULATION' : 'PRODUCTION'} mode`);
  }

  async createSubmissionsTable() {
    const ddl = `
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
      );
      -- prevent duplicate successful registrations for the same station
      CREATE UNIQUE INDEX IF NOT EXISTS uq_ewura_reg_success
      ON ewura_submissions (station_id)
      WHERE submission_type = 'registration' AND status = 'success';
    `;
    await dbManager.query(ddl);
  }

  minifyXml(xml) {
    return xml.replace(/>\s+</g, '><').trim();
  }

  async signXml(xmlContent, signatureTag) {
    const pfxBuffer = fs.readFileSync(this.certificatePath);
    const cleaned = this.minifyXml(xmlContent);

    const p12Der = forge.util.createBuffer(pfxBuffer.toString('binary'));
    const p12Asn1 = forge.asn1.fromDer(p12Der);
    const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, this.password);

    const bags = p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag });
    const bag = bags[forge.pki.oids.pkcs8ShroudedKeyBag][0];
    const privateKey = bag.key;

    const md = forge.md.sha1.create();
    md.update(cleaned, 'utf8');
    const signature = forge.util.encode64(privateKey.sign(md));

    return `<?xml version="1.0" encoding="UTF-8"?><NPGIS>${cleaned}<${signatureTag}>${signature}</${signatureTag}></NPGIS>`;
  }

  // ---------- Response parsing ----------
  parseEwuraResponse(body) {
    const text = body || '';
    const isSimulation = /SIMULATION|SIM-\d+/i.test(text);

    let success = false;
    const statusMatch = text.match(/<Status>\s*([^<]+)\s*<\/Status>/i);
    if (statusMatch) {
      const val = statusMatch[1].trim().toUpperCase();
      success = ['SUCCESS', '1', 'SUCCESSFUL', 'SUCCESSFULLY', 'OK'].includes(val);
    } else {
      success = /\bsuccess\b/i.test(text) || /<Status>.*SUCCESS/i.test(text);
    }

    const txMatch = text.match(/<TransactionId>\s*([^<]+)\s*<\/TransactionId>/i);
    const transactionId = txMatch ? txMatch[1] : null;

    return { success, isSimulation, transactionId, raw: text };
  }

  async hasSuccessfulRegistration(stationId) {
    const q = `
      SELECT 1
      FROM ewura_submissions
      WHERE station_id = $1
        AND submission_type = 'registration'
        AND status = 'success'
      LIMIT 1
    `;
    const r = await dbManager.query(q, [stationId]);
    return r.rowCount > 0;
  }

  // ---------- Send to EWURA (no auto-sim fallback) ----------
  async sendToEWURA(xml, endpointType = 'registration') {
    const targetEndpoint =
      endpointType === 'sale' ? this.saleEndpoint :
      endpointType === 'report' ? this.reportEndpoint :
      this.registrationEndpoint;

    if (this.simulationMode) {
      return `<?xml version="1.0" encoding="UTF-8"?>
        <NPGISResponse>
          <Status>SUCCESS</Status>
          <Message>${endpointType} received successfully (SIMULATION)</Message>
          <TransactionId>SIM-${Date.now()}</TransactionId>
          <Timestamp>${new Date().toISOString()}</Timestamp>
        </NPGISResponse>`;
    }

    try {
      const res = await fetch(targetEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/xml',
          'Accept': 'application/xml, text/xml, */*',
          'User-Agent': 'Gas-Station-Management/1.0',
          'Content-Length': Buffer.byteLength(xml).toString()
        },
        body: xml,
        timeout: 30000
      });

      const body = await res.text();

      // If EWURA returns non-2xx, throw with the actual response body
      if (!res.ok) {
        throw new EwuraHttpError('EWURA returned non-OK status', {
          status: res.status,
          statusText: res.statusText,
          body,
          endpoint: targetEndpoint,
          endpointType
        });
      }

      return body;
    } catch (err) {
      if (err instanceof EwuraHttpError) {
        // Bubble up with full context
        throw err;
      }
      // Network / timeout or other errors
      throw new EwuraNetworkError(err.message || 'Failed to reach EWURA', {
        endpoint: targetEndpoint,
        endpointType,
        cause: err
      });
    }
  }

  // ---------- XML generators ----------
  async generateRegistrationXml(stationData) {
    const tranId = stationData.tranId || '1';
    const report =
      `<RetailStationRegistration>` +
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
    return await this.signXml(report, 'VendorSignature');
  }

  async generateTransactionXml(transactionData) {
    const tranId = transactionData.tranId || '1';
    const report =
      `<RetailerSaleTransaction>` +
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
    const tanks = (summaryData.tankInventory || []).map(tank => `
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

  // ---------- Operations ----------
  async registerStation(stationData) {
    try {
      // 1) Block duplicates
      if (await this.hasSuccessfulRegistration(stationData.stationId)) {
        return {
          success: true,
          alreadyRegistered: true,
          persisted: true,
          message: 'Station already registered with EWURA.'
        };
      }

      // 2) Generate & send
      const xml = await this.generateRegistrationXml(stationData);
      const body = await this.sendToEWURA(xml, 'registration');
      const parsed = this.parseEwuraResponse(body);

      // 3) Persist only on real success (not simulation)
      let submissionId = null;
      const persisted = parsed.success && !parsed.isSimulation;
      if (persisted) {
        submissionId = await this.storeSubmission(
          stationData.stationId, 'registration', stationData.tranId || '1', xml, body, 'success'
        );
      }

      return {
        success: parsed.success,
        isSimulation: parsed.isSimulation,
        persisted,
        transactionId: parsed.transactionId,
        xml,
        ewuraResponse: parsed.raw,
        message: persisted
          ? 'EWURA confirmed SUCCESS. Submission stored.'
          : parsed.isSimulation
            ? 'Simulation response — not stored.'
            : 'EWURA returned non-success status — not stored.'
      };
    } catch (error) {
      // Bubble the actual EWURA error details up
      if (error instanceof EwuraHttpError) {
        logger.error('[EWURA] HTTP error', { status: error.status, statusText: error.statusText });
        return {
          success: false,
          persisted: false,
          errorType: 'HTTP',
          http: { status: error.status, statusText: error.statusText },
          ewuraResponse: error.body,          // <- actual body from EWURA
          endpoint: error.endpoint,
          message: 'EWURA HTTP error'
        };
      }
      if (error instanceof EwuraNetworkError) {
        logger.error('[EWURA] Network error', { endpoint: error.endpoint, cause: error.cause?.message });
        return {
          success: false,
          persisted: false,
          errorType: 'NETWORK',
          ewuraResponse: null,
          endpoint: error.endpoint,
          message: `Network/timeout contacting EWURA: ${error.cause?.message || error.message}`
        };
      }
      logger.error('EWURA station registration unexpected error:', error);
      return {
        success: false,
        persisted: false,
        errorType: 'UNKNOWN',
        message: error.message || 'Unknown error'
      };
    }
  }

  async submitTransaction(transactionData) {
    try {
      const xml = await this.generateTransactionXml(transactionData);
      const body = await this.sendToEWURA(xml, 'sale');
      const parsed = this.parseEwuraResponse(body);

      let submissionId = null;
      const persisted = parsed.success && !parsed.isSimulation;
      if (persisted) {
        submissionId = await this.storeSubmission(
          null, 'transaction', transactionData.tranId || '1', xml, body, 'success'
        );
      }

      return {
        success: parsed.success,
        isSimulation: parsed.isSimulation,
        persisted,
        transactionId: parsed.transactionId,
        xml,
        ewuraResponse: parsed.raw,
        message: persisted
          ? 'Transaction submitted to EWURA successfully'
          : parsed.isSimulation
            ? 'Transaction simulated — not stored.'
            : 'EWURA returned non-success status — not stored.'
      };
    } catch (error) {
      if (error instanceof EwuraHttpError) {
        return {
          success: false,
          persisted: false,
          errorType: 'HTTP',
          http: { status: error.status, statusText: error.statusText },
          ewuraResponse: error.body,
          endpoint: error.endpoint,
          message: 'EWURA HTTP error'
        };
      }
      if (error instanceof EwuraNetworkError) {
        return {
          success: false,
          persisted: false,
          errorType: 'NETWORK',
          ewuraResponse: null,
          endpoint: error.endpoint,
          message: `Network/timeout contacting EWURA: ${error.cause?.message || error.message}`
        };
      }
      return { success: false, persisted: false, errorType: 'UNKNOWN', message: error.message };
    }
  }

  async generateAndSubmitDailySummary(stationId, date, summaryData) {
    try {
      const xml = await this.generateDailySummaryXml(summaryData);
      const body = await this.sendToEWURA(xml, 'report');
      const parsed = this.parseEwuraResponse(body);

      let submissionId = null;
      const persisted = parsed.success && !parsed.isSimulation;
      if (persisted) {
        submissionId = await this.storeSubmission(
          stationId, 'daily_summary', summaryData.reportId || '1', xml, body, 'success'
        );
      }

      return {
        success: parsed.success,
        isSimulation: parsed.isSimulation,
        persisted,
        transactionId: parsed.transactionId,
        xml,
        ewuraResponse: parsed.raw,
        message: persisted
          ? 'Daily summary submitted to EWURA successfully'
          : parsed.isSimulation
            ? 'Daily summary simulated — not stored.'
            : 'EWURA returned non-success status — not stored.'
      };
    } catch (error) {
      if (error instanceof EwuraHttpError) {
        return {
          success: false,
          persisted: false,
          errorType: 'HTTP',
          http: { status: error.status, statusText: error.statusText },
          ewuraResponse: error.body,
          endpoint: error.endpoint,
          message: 'EWURA HTTP error'
        };
      }
      if (error instanceof EwuraNetworkError) {
        return {
          success: false,
          persisted: false,
          errorType: 'NETWORK',
          ewuraResponse: null,
          endpoint: error.endpoint,
          message: `Network/timeout contacting EWURA: ${error.cause?.message || error.message}`
        };
      }
      return { success: false, persisted: false, errorType: 'UNKNOWN', message: error.message };
    }
  }

  async storeSubmission(stationId, type, transactionId, xmlData, responseData = null, status = 'pending') {
    const query = `
      INSERT INTO ewura_submissions (station_id, submission_type, transaction_id, xml_data, response_data, status)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id
    `;
    const result = await dbManager.query(query, [stationId, type, transactionId, xmlData, responseData, status]);
    return result.rows[0]?.id || null;
  }

  async getSubmissionHistory(filters = {}) {
    let query = `
      SELECT es.*, s.name as station_name
      FROM ewura_submissions es
      LEFT JOIN stations s ON es.station_id = s.id
      WHERE 1=1
    `;
    const params = [];

    if (filters.stationId) { query += ` AND es.station_id = $${params.length + 1}`; params.push(filters.stationId); }
    if (filters.type)      { query += ` AND es.submission_type = $${params.length + 1}`; params.push(filters.type); }
    if (filters.startDate) { query += ` AND es.submitted_at >= $${params.length + 1}`; params.push(filters.startDate); }
    if (filters.endDate)   { query += ` AND es.submitted_at <= $${params.length + 1}`; params.push(filters.endDate); }

    query += ` ORDER BY es.submitted_at DESC`;
    const result = await dbManager.query(query, params);
    return result.rows;
  }

  async getRegisteredStations() {
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
        AND es.status = 'success'
      ORDER BY es.submitted_at DESC
    `;
    const result = await dbManager.query(query);
    return result.rows;
  }

  async getSubmissionStatus(stationId, transactionId) {
    const q = `
      SELECT *
      FROM ewura_submissions
      WHERE station_id = $1
        AND transaction_id = $2
      ORDER BY submitted_at DESC
      LIMIT 1
    `;
    const r = await dbManager.query(q, [stationId, transactionId]);
    return r.rows[0] || null;
  }

  async validateCertificate() {
    try {
      if (!fs.existsSync(this.certificatePath)) return false;

      const pfxBuffer = fs.readFileSync(this.certificatePath);
      const p12Der = forge.util.createBuffer(pfxBuffer.toString('binary'));
      const p12Asn1 = forge.asn1.fromDer(p12Der);
      const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, this.password);

      const certBags = p12.getBags({ bagType: forge.pki.oids.certBag });
      const cert = certBags[forge.pki.oids.certBag][0].cert;

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

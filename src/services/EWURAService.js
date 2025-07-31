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
    this.endpointUrl = process.env.EWURA_ENDPOINT || 'https://npgis.ewura.go.tz/api';
  }

  async initialize() {
    console.log('the password is.', this.password);
    if (!this.password) {
      logger.error('❌ EWURA_P12PASSWORD not set. Cannot proceed.');
      throw new Error('EWURA_P12PASSWORD not set');
    }
    if (!fs.existsSync(this.certificatePath)) {
      logger.error('❌ EWURA certificate not found. Cannot proceed.');
      throw new Error('EWURA certificate not found');
    }
    await this.createSubmissionsTable();
    this.isInitialized = true;
    logger.info('✅ EWURA Service initialized');
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
      const pfxBuffer = fs.readFileSync(this.certificatePath);
      const cleaned = this.minifyXml(xmlContent);

      // Parse the PKCS#12 file using node-forge
      const p12Der = forge.util.createBuffer(pfxBuffer.toString('binary'));
      const p12Asn1 = forge.asn1.fromDer(p12Der);
      const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, this.password);

      // Get private key
      const bags = p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag });
      const bag = bags[forge.pki.oids.pkcs8ShroudedKeyBag][0];
      const privateKey = bag.key;

      // Sign
      const md = forge.md.sha1.create();
      md.update(cleaned, 'utf8');
      const signature = forge.util.encode64(privateKey.sign(md));

      const xml = `<?xml version="1.0" encoding="UTF-8"?><NPGIS>${cleaned}<${signatureTag}>${signature}</${signatureTag}></NPGIS>`;
      return xml;
    } catch (error) {
      logger.error('Error signing XML:', error);
      throw error;
    }
  }

  async sendToEWURA(xml) {
    try {
      const response = await fetch(this.endpointUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/xml' },
        body: xml
      });
      const responseBody = await response.text();
      logger.info('[EWURA] Response from EWURA:', responseBody);
      return responseBody;
    } catch (error) {
      logger.error('[EWURA] Error sending to EWURA:', error);
      throw error;
    }
  }

  async generateRegistrationXml(stationData) {
    const report = `<RetailStationRegistration>` +
      `<TranId>${stationData.tranId}</TranId>` +
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
    const report = `<RetailerSaleTransaction>` +
      `<TranId>${transactionData.tranId}</TranId>` +
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
        <TranId>${summaryData.tranId}</TranId>
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
      const xml = await this.generateRegistrationXml(stationData);
      const ewuraResponse = await this.sendToEWURA(xml);

      // Store submission record with response
      const submissionId = await this.storeSubmission(
        stationData.stationId,
        'registration',
        stationData.tranId,
        xml,
        ewuraResponse
      );

      logger.info(`EWURA station registration XML sent for: ${stationData.retailStationName}`);
      return {
        success: true,
        xml,
        ewuraResponse,
        submissionId,
        message: 'Station registration XML sent and response logged'
      };
    } catch (error) {
      logger.error('EWURA station registration error:', error);
      throw error;
    }
  }

  async submitTransaction(transactionData) {
    try {
      const xml = await this.generateTransactionXml(transactionData);
      
      // Store submission record
      const submissionId = await this.storeSubmission(null, 'transaction', transactionData.tranId, xml);
      
      logger.info(`EWURA transaction XML generated: ${transactionData.tranId}`);
      
      return {
        success: true,
        xml,
        submissionId,
        message: 'Transaction XML generated successfully'
      };
    } catch (error) {
      logger.error('EWURA transaction submission error:', error);
      throw error;
    }
  }

  async generateAndSubmitDailySummary(stationId, date, summaryData) {
    try {
      const xml = await this.generateDailySummaryXml(summaryData);
      
      // Store submission record
      const submissionId = await this.storeSubmission(stationId, 'daily_summary', summaryData.reportId, xml);
      
      logger.info(`EWURA daily summary XML generated: ${stationId} - ${date}`);
      
      return {
        success: true,
        xml,
        submissionId,
        message: 'Daily summary XML generated successfully'
      };
    } catch (error) {
      logger.error('EWURA daily summary generation error:', error);
      throw error;
    }
  }

  // Update storeSubmission to accept response_data
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
    return result.rows[0];
  }

  async validateCertificate() {
    if (this.simulationMode) {
      return true;
    }

    try {
      if (!fs.existsSync(this.certificatePath)) {
        return false;
      }

      const pfxBuffer = fs.readFileSync(this.certificatePath);
      
      return new Promise((resolve) => {
        pem.readPkcs12(pfxBuffer, { p12Password: this.password }, (err, cert) => {
          if (err) {
            resolve(false);
          } else {
            // Check if certificate is valid (not expired)
            try {
              const certInfo = pem.readCertificateInfo(cert.cert);
              const now = new Date();
              const validTo = new Date(certInfo.validity.end);
              resolve(validTo > now);
            } catch (parseError) {
              resolve(false);
            }
          }
        });
      });
    } catch (error) {
      logger.error('Certificate validation error:', error);
      return false;
    }
  }
}

export const EWURAService = new EWURAServiceClass();
// src/models/transactionModel.js
import { BaseModel } from './BaseModel.js';

export class TransactionModel extends BaseModel {
  constructor() {
    super('sales_transactions');
  }

  async getRecentTransactionsByStation(stationId, limit = 10) {
    const query = `
      SELECT *
      FROM sales_transactions
      WHERE station_id = $1
      ORDER BY transaction_date DESC, transaction_time DESC
      LIMIT $2
    `;
    const result = await this.db.query(query, [stationId, limit]);
    return result.rows;
  }

  async getDailySales(stationId, date) {
    const query = `
      SELECT 
        SUM(volume) AS total_volume,
        SUM(total_amount) AS total_sales
      FROM sales_transactions
      WHERE station_id = $1 AND transaction_date = $2
    `;
    const result = await this.db.query(query, [stationId, date]);
    return result.rows[0];
  }
}

export const transactionModel = new TransactionModel();

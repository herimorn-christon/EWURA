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

  async insertMany(transactions) {
    const query = `
      INSERT INTO sales_transactions (
        station_license, pump, nozzle, volume, price, amount,
        transaction_id, discount_amount, total_volume, total_amount,
        customer_name, fuel_grade_name, efd_serial_number,
        datetime_start, datetime_end
      )
      VALUES
        ${transactions.map(
          (_, i) =>
            `($${i * 15 + 1}, $${i * 15 + 2}, $${i * 15 + 3}, $${i * 15 + 4}, $${i * 15 + 5}, $${i * 15 + 6},
              $${i * 15 + 7}, $${i * 15 + 8}, $${i * 15 + 9}, $${i * 15 + 10},
              $${i * 15 + 11}, $${i * 15 + 12}, $${i * 15 + 13}, $${i * 15 + 14}, $${i * 15 + 15})`
        ).join(',')}
    `;

    const values = transactions.flatMap(tx => [
      tx.station_license,
      tx.pump,
      tx.nozzle,
      tx.volume,
      tx.price,
      tx.amount,
      tx.transaction_id,
      tx.discount_amount,
      tx.total_volume,
      tx.total_amount,
      tx.customer_name,
      tx.fuel_grade_name,
      tx.efd_serial_number,
      tx.datetime_start,
      tx.datetime_end
    ]);

    await this.db.query(query, values);
  }
}

export const transactionModel = new TransactionModel();

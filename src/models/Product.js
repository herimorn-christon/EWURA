import { BaseModel } from './BaseModel.js';

export class Product extends BaseModel {
  constructor() {
    super('products');
  }

  async getProductsWithCurrentPricing() {
    try {
      const query = `
        SELECT p.*, pp.price as current_price, pp.effective_date
        FROM products p
        LEFT JOIN LATERAL (
          SELECT price, effective_date
          FROM product_pricing pp_sub
          WHERE pp_sub.product_id = p.id
            AND pp_sub.effective_date <= CURRENT_DATE
            AND (pp_sub.expiry_date IS NULL OR pp_sub.expiry_date > CURRENT_DATE)
          ORDER BY pp_sub.effective_date DESC
          LIMIT 1
        ) pp ON true
        WHERE p.is_active = true
        ORDER BY p.name
      `;
      
      const result = await this.db.query(query);
      return result.rows;
    } catch (error) {
      throw error;
    }
  }

  async updateProductPricing(productId, price, effectiveDate, stationId = null) {
    try {
      const query = `
        INSERT INTO product_pricing (product_id, price, effective_date, station_id)
        VALUES ($1, $2, $3, $4)
        RETURNING *
      `;
      
      const result = await this.db.query(query, [productId, price, effectiveDate, stationId]);
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }
}

export const productModel = new Product();
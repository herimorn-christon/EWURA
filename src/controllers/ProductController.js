import { productModel } from '../models/Product.js';
import { ApiResponse } from '../views/ApiResponse.js';
import { logger } from '../utils/logger.js';

export class ProductController {
  static async getAllProducts(req, res, next) {
    try {
      const products = await productModel.getProductsWithCurrentPricing();
      ApiResponse.success(res, { products });
    } catch (error) {
      logger.error('Get all products error:', error);
      next(error);
    }
  }

  static async getProductById(req, res, next) {
    try {
      const { id } = req.params;
      const product = await productModel.findById(id);
      
      if (!product) {
        return ApiResponse.notFound(res, 'Product not found');
      }
      
      ApiResponse.success(res, { product });
    } catch (error) {
      logger.error('Get product by ID error:', error);
      next(error);
    }
  }

  static async createProduct(req, res, next) {
    try {
      const productData = req.body;
      const product = await productModel.create(productData);
      
      logger.info(`Product created: ${product.name}`);
      ApiResponse.created(res, { product });
    } catch (error) {
      logger.error('Create product error:', error);
      next(error);
    }
  }

  static async updateProduct(req, res, next) {
    try {
      const { id } = req.params;
      const updateData = req.body;
      
      const product = await productModel.update(id, updateData);
      if (!product) {
        return ApiResponse.notFound(res, 'Product not found');
      }
      
      logger.info(`Product updated: ${product.name}`);
      ApiResponse.updated(res, { product });
    } catch (error) {
      logger.error('Update product error:', error);
      next(error);
    }
  }

  static async deleteProduct(req, res, next) {
    try {
      const { id } = req.params;
      
      const product = await productModel.delete(id);
      if (!product) {
        return ApiResponse.notFound(res, 'Product not found');
      }
      
      logger.info(`Product deleted: ${product.name}`);
      ApiResponse.deleted(res);
    } catch (error) {
      logger.error('Delete product error:', error);
      next(error);
    }
  }

  static async getCurrentPricing(req, res, next) {
    try {
      const products = await productModel.getProductsWithCurrentPricing();
      ApiResponse.success(res, { products });
    } catch (error) {
      logger.error('Get current pricing error:', error);
      next(error);
    }
  }

  static async updatePricing(req, res, next) {
    try {
      const { id } = req.params;
      const { price, effectiveDate, stationId } = req.body;
      
      const pricing = await productModel.updateProductPricing(id, price, effectiveDate, stationId);
      
      logger.info(`Product pricing updated: ${price}`);
      ApiResponse.success(res, { pricing }, 'Pricing updated successfully');
    } catch (error) {
      logger.error('Update pricing error:', error);
      next(error);
    }
  }
}
import { InterfaceTypeModel } from '../models/InterfaceTypeModel.js';
import { logger } from '../utils/logger.js';

class InterfaceTypeControllerClass {
  async getAllTypes(req, res) {
    try {
      const types = await InterfaceTypeModel.getAllTypes();
      res.json({
        success: true,
        data: types
      });
    } catch (error) {
      logger.error('❌ Error in getAllTypes controller:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch interface types'
      });
    }
  }

  async getTypeByCode(req, res) {
    try {
      const { code } = req.params;
      const type = await InterfaceTypeModel.getTypeByCode(code);
      
      if (!type) {
        return res.status(404).json({
          success: false,
          error: `Interface type with code ${code} not found`
        });
      }

      res.json({
        success: true,
        data: type
      });
    } catch (error) {
      logger.error('❌ Error in getTypeByCode controller:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch interface type'
      });
    }
  }
}

export const InterfaceTypeController = new InterfaceTypeControllerClass();
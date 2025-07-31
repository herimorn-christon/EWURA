export class ApiResponse {
  static success(res, data, statusCode = 200, message = 'Success') {
    return res.status(statusCode).json({
      success: true,
      message,
      data,
      timestamp: new Date().toISOString()
    });
  }

  static error(res, message, statusCode = 500, errors = null) {
    return res.status(statusCode).json({
      success: false,
      message,
      errors,
      timestamp: new Date().toISOString()
    });
  }

  static paginated(res, data, pagination, message = 'Success') {
    return res.status(200).json({
      success: true,
      message,
      data,
      pagination: {
        page: pagination.page,
        limit: pagination.limit,
        total: pagination.total,
        pages: Math.ceil(pagination.total / pagination.limit)
      },
      timestamp: new Date().toISOString()
    });
  }

  static created(res, data, message = 'Resource created successfully') {
    return this.success(res, data, 201, message);
  }

  static updated(res, data, message = 'Resource updated successfully') {
    return this.success(res, data, 200, message);
  }

  static deleted(res, message = 'Resource deleted successfully') {
    return this.success(res, null, 200, message);
  }

  static notFound(res, message = 'Resource not found') {
    return this.error(res, message, 404);
  }

  static unauthorized(res, message = 'Unauthorized access') {
    return this.error(res, message, 401);
  }

  static forbidden(res, message = 'Access forbidden') {
    return this.error(res, message, 403);
  }

  static validationError(res, errors, message = 'Validation failed') {
    return this.error(res, message, 400, errors);
  }
}
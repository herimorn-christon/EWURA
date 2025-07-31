export const rateLimitConfig = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Limit each IP to 1000 requests per windowMs
  message: {
    error: 'Too many requests',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Skip rate limiting for health checks
  skip: (req) => req.path === '/health'
};

export const authRateLimitConfig = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit auth attempts to 5 per windowMs
  message: {
    error: 'Too many authentication attempts',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false
};
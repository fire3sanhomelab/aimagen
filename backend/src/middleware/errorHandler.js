/**
 * Error-handling middleware — catches all thrown/next(err) errors
 * and returns a consistent JSON error response.
 * Must be registered LAST in the middleware chain.
 */
export function errorHandler(err, req, res, _next) {
  const status = err.status || err.statusCode || 500
  const message = err.expose ? err.message : (status < 500 ? err.message : 'Internal Server Error')

  if (status >= 500) {
    console.error(`[${req.method}] ${req.path} → ${status}:`, err.stack || err.message)
  }

  res.status(status).json({
    error: message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack?.split('\n').slice(0, 3) })
  })
}

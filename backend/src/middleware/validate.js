/**
 * Simple request validation middleware factory.
 * Usage: app.post('/api/chat', validate(['messages']), handler)
 *
 * @param {string[]} requiredFields - Fields that must be present in req.body
 * @returns {Function} Express middleware
 */
export function validate(requiredFields = []) {
  return (req, res, next) => {
    if (!req.body || typeof req.body !== 'object') {
      const err = new Error('Request body must be valid JSON')
      err.status = 400
      err.expose = true
      return next(err)
    }

    const missing = requiredFields.filter(f => req.body[f] === undefined)
    if (missing.length > 0) {
      const err = new Error(`Missing required fields: ${missing.join(', ')}`)
      err.status = 400
      err.expose = true
      return next(err)
    }

    next()
  }
}

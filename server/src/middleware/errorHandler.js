/**
 * Centralized Error Handling Middleware
 */
export function errorHandler(err, req, res, next) {
  console.error('[Error] An unhandled error occurred:', err);

  const statusCode = err.statusCode || (res.statusCode && res.statusCode !== 200 ? res.statusCode : 500);

  // Prisma unique constraint violation
  if (err.code === 'P2002') {
    const fields = err.meta?.target ? err.meta.target.join(', ') : 'fields';
    return res.status(409).json({
      success: false,
      message: `A record with the specified ${fields} already exists.`,
      code: 'DUPLICATE_ENTRY'
    });
  }

  // Prisma record not found
  if (err.code === 'P2025') {
    return res.status(404).json({
      success: false,
      message: 'The requested resource was not found.',
      code: 'NOT_FOUND'
    });
  }

  // Multer file upload errors
  if (err.name === 'MulterError') {
    return res.status(400).json({
      success: false,
      message: `File upload error: ${err.message}`,
      code: err.code
    });
  }

  return res.status(statusCode).json({
    success: false,
    message: err.message || 'An unexpected internal server error occurred.',
    errors: err.errors || null,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
}

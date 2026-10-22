import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import routes from './routes/index.js';
import { errorHandler } from './middleware/errorHandler.js';

const app = express();

// 1. Helmet Security Headers
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));

// 2. CORS Configuration (Supports Vercel production/preview domains and local development)
const allowedOrigin = process.env.CLIENT_URL || 'http://localhost:5173';
const allowedOriginsList = allowedOrigin.split(',').map(item => item.trim());

app.use(cors({
  origin: (origin, callback) => {
    if (
      !origin ||
      allowedOriginsList.includes(origin) ||
      /^http:\/\/localhost(:\d+)?$/.test(origin) ||
      /\.vercel\.app$/.test(origin)
    ) {
      callback(null, true);
    } else {
      callback(new Error('CORS blocked by ResolveIQ security policy'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// 3. Body Parsing & Cookies
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// 4. Rate Limiting for Authentication Endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many authentication attempts from this IP. Please try again after 15 minutes.'
  }
});

app.use('/api/v1/auth/login', authLimiter);
app.use('/api/v1/auth/register', authLimiter);

// 5. Root & Health Check Routes
app.get(['/', '/health'], (req, res) => {
  res.json({
    success: true,
    message: '🚀 ResolveIQ API Server is running smoothly',
    status: 'healthy',
    version: '1.0.0',
    apiBase: '/api/v1',
    timestamp: new Date().toISOString()
  });
});

// 6. API Routes
app.use('/api/v1', routes);

// 7. 404 Handler for undefined API routes
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    message: `API endpoint ${req.method} ${req.originalUrl} not found.`
  });
});

// 7. Centralized Error Handler
app.use(errorHandler);

export default app;

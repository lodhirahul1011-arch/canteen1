import express from 'express';
import cookieParser from 'cookie-parser';
import crypto from 'node:crypto';
import pinoHttp from 'pino-http';
import env from './config/env.js';
import logger from './config/logger.js';
import { securityMiddleware, apiLimiter } from './middleware/security.js';
import authRoutes from './routes/authRoutes.js';
import systemRoutes from './routes/systemRoutes.js';
import categoryRoutes from './routes/categoryRoutes.js';
import foodRoutes from './routes/foodRoutes.js';
import memberRoutes from './routes/memberRoutes.js';
import staffRoutes from './routes/staffRoutes.js';
import supplierRoutes from './routes/supplierRoutes.js';
import purchaseRoutes from './routes/purchaseRoutes.js';
import inventoryRoutes from './routes/inventoryRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import reportRoutes from './routes/reportRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import invoiceRoutes from './routes/invoiceRoutes.js';
import { notFound, errorHandler } from './middleware/errorHandler.js';

const app = express();

app.disable('x-powered-by');
app.set('trust proxy', 1);

app.use((req, res, next) => {
  req.id = req.get('x-request-id') || crypto.randomUUID();
  res.setHeader('x-request-id', req.id);
  next();
});

app.use(pinoHttp({ logger }));

for (const middleware of securityMiddleware) app.use(middleware);

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false, limit: '1mb' }));
app.use(cookieParser());

app.get('/', (req, res) => {
  res.json({
    success: true,
    service: 'canteen-erp-api',
    message: 'Canteen ERP API is running',
    health: '/health',
    api: '/api/v1'
  });
});

app.use(systemRoutes);
app.use('/api/v1', apiLimiter);
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/categories', categoryRoutes);
app.use('/api/v1/foods', foodRoutes);
app.use('/api/v1/members', memberRoutes);
app.use('/api/v1/staff', staffRoutes);
app.use('/api/v1/suppliers', supplierRoutes);
app.use('/api/v1/purchases', purchaseRoutes);
app.use('/api/v1/inventory', inventoryRoutes);
app.use('/api/v1/orders', orderRoutes);
app.use('/api/v1/payments', paymentRoutes);
app.use('/api/v1/reports', reportRoutes);
app.use('/api/v1/notifications', notificationRoutes);
app.use('/api/v1/invoices', invoiceRoutes);

app.get('/api/v1', (req, res) => {
  res.json({
    success: true,
    service: 'canteen-erp-api',
    version: 'v1'
  });
});

app.use(notFound);
app.use(errorHandler);

export default app;

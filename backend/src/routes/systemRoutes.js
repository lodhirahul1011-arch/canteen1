import { Router } from 'express';
import mongoose from 'mongoose';

const router = Router();

router.get('/health', (req, res) => {
  res.json({
    success: true,
    service: 'canteen-erp-api',
    status: 'ok',
    timestamp: new Date().toISOString()
  });
});

router.get('/ready', (req, res) => {
  const ready = mongoose.connection.readyState === 1;
  res.status(ready ? 200 : 503).json({
    success: ready,
    status: ready ? 'ready' : 'not-ready',
    database: ready ? 'connected' : 'disconnected'
  });
});

export default router;

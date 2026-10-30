import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import healthRoutes from './routes/health.routes';
import authRoutes from './routes/auth.routes';
import { requireAuth, requireAdmin } from './middleware/auth.middleware';

const app: Application = express();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Base routes
app.use('/api', healthRoutes);
app.use('/api', authRoutes);

// Protected Admin Role Verification Route (used to test RBAC)
app.get('/api/admin/ping', requireAuth, requireAdmin, (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    message: 'Admin access verified',
    user: (req as any).user.company_email
  });
});

// Root greeting / API descriptor
app.get('/', (req: Request, res: Response) => {
  res.json({
    name: 'Employee Attendance Automation API',
    version: '1.0.0',
    documentation: 'See BRD v1.1 for endpoints',
    healthCheck: '/api/health'
  });
});

// 404 Catch-all handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: 'Not Found',
    path: req.originalUrl,
    message: 'The requested API route does not exist.'
  });
});

// Central error handler
app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'production' ? 'An unexpected error occurred.' : err.message
  });
});

export default app;


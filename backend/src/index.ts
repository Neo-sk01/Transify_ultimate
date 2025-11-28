import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config';
import { healthRouter } from './routes/health';
import { authRouter } from './routes/auth';
import { institutionRouter } from './routes/institution';
import { errorHandler } from './middleware/errorHandler';

const app = express();

// Security middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Routes
app.use('/health', healthRouter);
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/institution', institutionRouter);

// Error handling
app.use(errorHandler);

// Start server
if (require.main === module) {
  app.listen(config.port, () => {
    console.log(`TRANSRIFY backend running on port ${config.port}`);
  });
}

export { app };

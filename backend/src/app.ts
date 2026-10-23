import express from 'express';
import cors from 'cors';
import path from 'path';
import { routes } from './routes';
import { config } from './config/env';
import { notFoundHandler, errorHandler } from './middlewares/error.middleware';

const app = express();

// Standard middlewares
app.use(cors());
app.use(express.json());

// Serve static uploads
app.use('/uploads', express.static(path.resolve(config.uploadDir)));

// API Base Path
app.use('/api', routes);

// 404 & Centralized Error Handling
app.use(notFoundHandler);
app.use(errorHandler);

export { app };

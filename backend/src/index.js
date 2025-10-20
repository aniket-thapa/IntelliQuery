// src/index.js
import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import { connectDB } from './config/db.js';
import authRoutes from './routes/auth.js';
import onboardingRoutes from './routes/onboarding.js';
import integrationRoutes from './routes/integration.js';
import userRoutes from './routes/user.js';
import tenantRoutes from './routes/tenant.js';
import searchRoutes from './routes/search.js';
import chatRoutes from './routes/chat.js';

dotenv.config();
const app = express();

// --- CORS Middleware ---
app.use(
  cors({
    origin: [
      'https://intelli-query.vercel.app',
      'http://localhost:4173',
      'http://localhost:3000',
      'http://localhost:5173',
    ],
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

await connectDB(process.env.PLATFORM_MONGO_URI);

app.use('/api/auth', authRoutes);
app.use('/api/onboarding', onboardingRoutes);
app.use('/api/integration', integrationRoutes);
app.use('/api/tenant', tenantRoutes);
app.use('/api/user', userRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/chat', chatRoutes);

app.get('/', (req, res) => res.send('IntelliQuery backend running...'));

const port = process.env.PORT || 4000;
app.listen(port, () => console.log(`Server running on port ${port}`));

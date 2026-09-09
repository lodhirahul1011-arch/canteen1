import dns from 'node:dns';
import mongoose from 'mongoose';
import env from './env.js';

dns.setServers(['1.1.1.1', '8.8.8.8']);

export async function connectDB() {
  mongoose.set('strictQuery', true);
  await mongoose.connect(env.mongoUri, {
    serverSelectionTimeoutMS: 5000,
    maxPoolSize: 20,
    minPoolSize: 2
  });
}

export async function disconnectDB() {
  await mongoose.disconnect();
}

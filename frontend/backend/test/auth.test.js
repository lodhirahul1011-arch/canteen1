import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import mongoose from 'mongoose';
import app from '../src/app.js';
import { connectDB, disconnectDB } from '../src/config/db.js';
import { User } from '../src/models/User.js';

const email = `test-${Date.now()}@example.com`;

before(async () => {
  await connectDB();
});

after(async () => {
  await User.deleteOne({ email });
  await disconnectDB();
});

test('GET /health returns healthy', async () => {
  const res = await request(app).get('/health');
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.success, true);
});

test('GET / returns API information', async () => {
  const res = await request(app).get('/');
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.service, 'canteen-erp-api');
  assert.equal(res.body.api, '/api/v1');
});

test('POST /api/v1/auth/register creates a member', async () => {
  const res = await request(app).post('/api/v1/auth/register').send({
    name: 'Test Member',
    email,
    password: 'StrongPass@123'
  });

  assert.equal(res.statusCode, 201);
  assert.equal(res.body.data.user.role, 'MEMBER');
  assert.ok(res.body.data.accessToken);
});

test('POST /api/v1/auth/login rejects wrong password', async () => {
  const res = await request(app).post('/api/v1/auth/login').send({
    email,
    password: 'WrongPass@123'
  });

  assert.equal(res.statusCode, 401);
});

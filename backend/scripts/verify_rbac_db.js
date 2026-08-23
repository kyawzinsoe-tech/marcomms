require('dotenv').config();
const mongoose = require('mongoose');
const http = require('http');
const jwt = require('jsonwebtoken');
const app = require('../src/app');
const connectDB = require('../src/config/db');
const User = require('../src/models/User');
const { ROLES } = require('../src/config/rbac');

async function runTests() {
  console.log('--- STARTING RBAC & REAL MONGODB AUDIT AND VERIFICATION ---');

  // 1. Connect to Real MongoDB with retry
  for (let attempt = 1; attempt <= 3; attempt++) {
    console.log(`Connecting to MongoDB (attempt ${attempt}/3)...`);
    await connectDB();
    if (mongoose.connection.readyState === 1) break;
    await new Promise((r) => setTimeout(r, 2000));
  }
  if (mongoose.connection.readyState !== 1) {
    console.error('Failed to connect to MongoDB after multiple attempts');
    process.exit(1);
  }
  console.log('MongoDB connection active.');

  // Clean up any old test records first
  const initialClean = await User.deleteMany({ email: { $regex: /^test\.temp\./ } });
  console.log(`Pre-test cleanup: removed ${initialClean.deletedCount} old test records.`);

  // Start temporary local HTTP server
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;
  console.log(`Test server running on port ${port}`);

  const results = [];

  async function apiCall(method, path, body = null, token = null) {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const options = {
      method,
      headers
    };
    if (body) options.body = JSON.stringify(body);

    const res = await fetch(`${baseUrl}${path}`, options);
    let data = null;
    try {
      data = await res.json();
    } catch {}
    return { status: res.status, data };
  }

  try {
    // Locate existing Super Admin
    const superAdmin = await User.findOne({ role: ROLES.SUPER_ADMIN });
    if (!superAdmin) {
      throw new Error('No Super Admin found in MongoDB.');
    }
    console.log('Super Admin found for test suite authorization.');

    // Generate Super Admin Token
    const superAdminToken = jwt.sign({ id: superAdmin._id }, process.env.JWT_SECRET, { expiresIn: '1h' });

    // TEST 1: Super Admin -> create temporary Admin
    console.log('Running Test 1: Super Admin -> create temporary Admin...');
    const tempAdminPayload = {
      name: 'Temp Test Admin',
      email: 'test.temp.admin@kbzbank.com',
      password: 'testpassword123',
      role: 'admin'
    };
    const t1Res = await apiCall('POST', '/api/users', tempAdminPayload, superAdminToken);
    const t1Db = await User.findOne({ email: 'test.temp.admin@kbzbank.com' });
    const t1Pass = t1Res.status === 201 && t1Db && t1Db.role === 'admin' && t1Db.password !== 'testpassword123';
    results.push({
      test: 'Super Admin -> create temporary Admin',
      expected: 'HTTP 201 & Admin created in MongoDB',
      actual: `HTTP ${t1Res.status} & Admin exists in DB (hashed password)`,
      status: t1Res.status,
      mongoVerified: !!t1Db,
      pass: t1Pass
    });

    const tempAdminId = t1Db ? String(t1Db._id) : null;
    const tempAdminToken = tempAdminId ? jwt.sign({ id: tempAdminId }, process.env.JWT_SECRET, { expiresIn: '1h' }) : null;

    // TEST 2: Super Admin -> create temporary Viewer (dedicated viewer for RBAC testing)
    console.log('Running Test 2: Super Admin -> create temporary dedicated Viewer...');
    const tempViewerPayload = {
      name: 'Temp Dedicated Viewer',
      email: 'test.temp.dedicated.viewer@kbzbank.com',
      password: 'testpassword123',
      role: 'viewer'
    };
    const t2Res = await apiCall('POST', '/api/users', tempViewerPayload, superAdminToken);
    const t2Db = await User.findOne({ email: 'test.temp.dedicated.viewer@kbzbank.com' });
    const t2Pass = t2Res.status === 201 && t2Db && t2Db.role === 'viewer';
    const dedicatedViewerId = t2Db ? String(t2Db._id) : null;
    const dedicatedViewerToken = dedicatedViewerId ? jwt.sign({ id: dedicatedViewerId }, process.env.JWT_SECRET, { expiresIn: '1h' }) : null;
    results.push({
      test: 'Super Admin -> create temporary User/Viewer',
      expected: 'HTTP 201 & Viewer created in MongoDB',
      actual: `HTTP ${t2Res.status} & Viewer exists in DB`,
      status: t2Res.status,
      mongoVerified: !!t2Db,
      pass: t2Pass
    });

    // TEST 3: Super Admin -> create temporary user for role modification test
    console.log('Running Test 3: Super Admin -> change user role to Admin...');
    const tempRoleUserPayload = {
      name: 'Temp Role Change User',
      email: 'test.temp.rolechange.user@kbzbank.com',
      password: 'testpassword123',
      role: 'viewer'
    };
    const t3CreateRes = await apiCall('POST', '/api/users', tempRoleUserPayload, superAdminToken);
    const tempRoleUserId = t3CreateRes.data?.user?.id;
    const t3Res = await apiCall('PUT', `/api/users/${tempRoleUserId}`, { role: 'admin' }, superAdminToken);
    const t3Db = await User.findById(tempRoleUserId);
    const t3Pass = t3Res.status === 200 && t3Db && t3Db.role === 'admin';
    results.push({
      test: 'Super Admin -> change user role to Admin',
      expected: 'HTTP 200 & role updated in MongoDB',
      actual: `HTTP ${t3Res.status} & role in DB is ${t3Db?.role}`,
      status: t3Res.status,
      mongoVerified: t3Db?.role === 'admin',
      pass: t3Pass
    });

    // TEST 4: Super Admin -> attempt self-deletion
    console.log('Running Test 4: Super Admin -> attempt self-deletion...');
    const t4Res = await apiCall('DELETE', `/api/users/${superAdmin._id}`, null, superAdminToken);
    const t4Db = await User.findById(superAdmin._id);
    const t4Pass = t4Res.status === 400 && !!t4Db;
    results.push({
      test: 'Super Admin -> attempt self-deletion',
      expected: 'HTTP 400 & Super Admin not deleted',
      actual: `HTTP ${t4Res.status} & Super Admin preserved in DB`,
      status: t4Res.status,
      mongoVerified: !!t4Db,
      pass: t4Pass
    });

    // TEST 5: Admin -> attempt create Super Admin
    console.log('Running Test 5: Admin -> attempt create Super Admin...');
    const t5Res = await apiCall('POST', '/api/users', {
      name: 'Forbidden SA',
      email: 'test.temp.forbidden.sa@kbzbank.com',
      password: 'password123',
      role: 'super_admin'
    }, tempAdminToken);
    const t5Db = await User.findOne({ email: 'test.temp.forbidden.sa@kbzbank.com' });
    const t5Pass = t5Res.status === 403 && !t5Db;
    results.push({
      test: 'Admin -> attempt create Super Admin',
      expected: 'HTTP 403 Forbidden & Not in MongoDB',
      actual: `HTTP ${t5Res.status} & No record created in DB`,
      status: t5Res.status,
      mongoVerified: !t5Db,
      pass: t5Pass
    });

    // TEST 6: Admin -> attempt create Admin
    console.log('Running Test 6: Admin -> attempt create Admin...');
    const t6Res = await apiCall('POST', '/api/users', {
      name: 'Forbidden Admin',
      email: 'test.temp.forbidden.admin@kbzbank.com',
      password: 'password123',
      role: 'admin'
    }, tempAdminToken);
    const t6Db = await User.findOne({ email: 'test.temp.forbidden.admin@kbzbank.com' });
    const t6Pass = t6Res.status === 403 && !t6Db;
    results.push({
      test: 'Admin -> attempt create Admin',
      expected: 'HTTP 403 Forbidden & Not in MongoDB',
      actual: `HTTP ${t6Res.status} & No record created in DB`,
      status: t6Res.status,
      mongoVerified: !t6Db,
      pass: t6Pass
    });

    // TEST 7: Admin -> attempt promote user to Super Admin
    console.log('Running Test 7: Admin -> attempt promote user to Super Admin...');
    const t7Res = await apiCall('PUT', `/api/users/${dedicatedViewerId}`, { role: 'super_admin' }, tempAdminToken);
    const t7Db = await User.findById(dedicatedViewerId);
    const t7Pass = t7Res.status === 403 && t7Db?.role !== 'super_admin';
    results.push({
      test: 'Admin -> attempt promote user to Super Admin',
      expected: 'HTTP 403 Forbidden & Role unchanged in DB',
      actual: `HTTP ${t7Res.status} & Role in DB is ${t7Db?.role}`,
      status: t7Res.status,
      mongoVerified: t7Db?.role !== 'super_admin',
      pass: t7Pass
    });

    // TEST 8: Admin -> attempt delete Super Admin
    console.log('Running Test 8: Admin -> attempt delete Super Admin...');
    const t8Res = await apiCall('DELETE', `/api/users/${superAdmin._id}`, null, tempAdminToken);
    const t8Db = await User.findById(superAdmin._id);
    const t8Pass = t8Res.status === 403 && !!t8Db;
    results.push({
      test: 'Admin -> attempt delete Super Admin',
      expected: 'HTTP 403 Forbidden & Super Admin preserved',
      actual: `HTTP ${t8Res.status} & Super Admin remains in DB`,
      status: t8Res.status,
      mongoVerified: !!t8Db,
      pass: t8Pass
    });

    // TEST 9: Admin -> create temporary Viewer
    console.log('Running Test 9: Admin -> create temporary Viewer...');
    const t9Res = await apiCall('POST', '/api/users', {
      name: 'Admin Created Viewer',
      email: 'test.temp.admincreated.viewer@kbzbank.com',
      password: 'password123',
      role: 'viewer'
    }, tempAdminToken);
    const t9Db = await User.findOne({ email: 'test.temp.admincreated.viewer@kbzbank.com' });
    const t9Pass = t9Res.status === 201 && t9Db && t9Db.role === 'viewer';
    const adminCreatedViewerId = t9Db ? String(t9Db._id) : null;
    results.push({
      test: 'Admin -> create temporary Viewer',
      expected: 'HTTP 201 Created & Viewer in MongoDB',
      actual: `HTTP ${t9Res.status} & Viewer created in DB`,
      status: t9Res.status,
      mongoVerified: !!t9Db,
      pass: t9Pass
    });

    // TEST 10: Admin -> delete temporary Viewer
    console.log('Running Test 10: Admin -> delete temporary Viewer...');
    const t10Res = await apiCall('DELETE', `/api/users/${adminCreatedViewerId}`, null, tempAdminToken);
    const t10Db = await User.findById(adminCreatedViewerId);
    const t10Pass = t10Res.status === 200 && !t10Db;
    results.push({
      test: 'Admin -> delete temporary Viewer',
      expected: 'HTTP 200 OK & Deleted from MongoDB',
      actual: `HTTP ${t10Res.status} & Record removed from DB`,
      status: t10Res.status,
      mongoVerified: !t10Db,
      pass: t10Pass
    });

    // TEST 11: Unauthorized User (no token) -> Admin endpoint
    console.log('Running Test 11: Unauthorized User (no token) -> Admin endpoint...');
    const t11Res = await apiCall('GET', '/api/users');
    const t11Pass = t11Res.status === 401;
    results.push({
      test: 'Unauthorized (No Token) -> GET /api/users',
      expected: 'HTTP 401 Unauthorized',
      actual: `HTTP ${t11Res.status}`,
      status: t11Res.status,
      mongoVerified: true,
      pass: t11Pass
    });

    // TEST 12: Dedicated Viewer User -> Admin endpoint (GET /api/users)
    console.log('Running Test 12: Viewer User -> Admin endpoint (GET /api/users)...');
    const t12Res = await apiCall('GET', '/api/users', null, dedicatedViewerToken);
    const t12Pass = t12Res.status === 403;
    results.push({
      test: 'Viewer Role -> GET /api/users (Admin endpoint)',
      expected: 'HTTP 403 Forbidden',
      actual: `HTTP ${t12Res.status}`,
      status: t12Res.status,
      mongoVerified: true,
      pass: t12Pass
    });

    // TEST 13: Dedicated Viewer Role -> attempt POST /api/users
    console.log('Running Test 13: Viewer Role -> attempt POST /api/users...');
    const t13Res = await apiCall('POST', '/api/users', {
      name: 'Viewer Created',
      email: 'test.temp.viewercreated@kbzbank.com',
      password: 'password123'
    }, dedicatedViewerToken);
    const t13Db = await User.findOne({ email: 'test.temp.viewercreated@kbzbank.com' });
    const t13Pass = t13Res.status === 403 && !t13Db;
    results.push({
      test: 'Viewer Role -> attempt POST /api/users',
      expected: 'HTTP 403 Forbidden & Not in MongoDB',
      actual: `HTTP ${t13Res.status} & No record created in DB`,
      status: t13Res.status,
      mongoVerified: !t13Db,
      pass: t13Pass
    });

    // TEST 14: Dedicated Viewer Role -> attempt DELETE /api/users/:id
    console.log('Running Test 14: Viewer Role -> attempt DELETE /api/users/:id...');
    const t14Res = await apiCall('DELETE', `/api/users/${tempAdminId}`, null, dedicatedViewerToken);
    const t14Db = await User.findById(tempAdminId);
    const t14Pass = t14Res.status === 403 && !!t14Db;
    results.push({
      test: 'Viewer Role -> attempt DELETE /api/users/:id',
      expected: 'HTTP 403 Forbidden & Target preserved in MongoDB',
      actual: `HTTP ${t14Res.status} & Target preserved in DB`,
      status: t14Res.status,
      mongoVerified: !!t14Db,
      pass: t14Pass
    });

    // TEST 15: Duplicate email rejection
    console.log('Running Test 15: Duplicate email rejection...');
    const t15Res = await apiCall('POST', '/api/users', {
      name: 'Duplicate Test',
      email: 'test.temp.admin@kbzbank.com',
      password: 'password123',
      role: 'admin'
    }, superAdminToken);
    const t15Pass = t15Res.status === 400;
    results.push({
      test: 'Duplicate email -> POST /api/users',
      expected: 'HTTP 400 Bad Request (Duplicate rejected)',
      actual: `HTTP ${t15Res.status}`,
      status: t15Res.status,
      mongoVerified: true,
      pass: t15Pass
    });

    // TEST 16: Invalid ObjectId on PUT /api/users/:id
    console.log('Running Test 16: Invalid ObjectId on PUT /api/users/:id...');
    const t16Res = await apiCall('PUT', '/api/users/invalid-object-id', { name: 'Test' }, superAdminToken);
    const t16Pass = t16Res.status === 400;
    results.push({
      test: 'Invalid ObjectId -> PUT /api/users/:id',
      expected: 'HTTP 400 Bad Request',
      actual: `HTTP ${t16Res.status}`,
      status: t16Res.status,
      mongoVerified: true,
      pass: t16Pass
    });

    // TEST 17: Invalid ObjectId on DELETE /api/users/:id
    console.log('Running Test 17: Invalid ObjectId on DELETE /api/users/:id...');
    const t17Res = await apiCall('DELETE', '/api/users/invalid-object-id', null, superAdminToken);
    const t17Pass = t17Res.status === 400;
    results.push({
      test: 'Invalid ObjectId -> DELETE /api/users/:id',
      expected: 'HTTP 400 Bad Request',
      actual: `HTTP ${t17Res.status}`,
      status: t17Res.status,
      mongoVerified: true,
      pass: t17Pass
    });

    // TEST 18: Non-existent valid ObjectId -> 404
    console.log('Running Test 18: Non-existent valid ObjectId -> 404...');
    const fakeObjectId = new mongoose.Types.ObjectId().toString();
    const t18Res = await apiCall('DELETE', `/api/users/${fakeObjectId}`, null, superAdminToken);
    const t18Pass = t18Res.status === 404;
    results.push({
      test: 'Non-existent user -> DELETE /api/users/:id',
      expected: 'HTTP 404 Not Found',
      actual: `HTTP ${t18Res.status}`,
      status: t18Res.status,
      mongoVerified: true,
      pass: t18Pass
    });

    // TEST 19: Super Admin -> delete temporary Admin
    console.log('Running Test 19: Super Admin -> delete temporary Admin...');
    const t19Res = await apiCall('DELETE', `/api/users/${tempAdminId}`, null, superAdminToken);
    const t19Db = await User.findById(tempAdminId);
    const t19Pass = t19Res.status === 200 && !t19Db;
    results.push({
      test: 'Super Admin -> delete temporary Admin',
      expected: 'HTTP 200 OK & Deleted from MongoDB',
      actual: `HTTP ${t19Res.status} & Admin removed from DB`,
      status: t19Res.status,
      mongoVerified: !t19Db,
      pass: t19Pass
    });

    // TEST 20: Super Admin -> delete dedicated Viewer
    console.log('Running Test 20: Super Admin -> delete temporary User/Viewer...');
    const t20Res = await apiCall('DELETE', `/api/users/${dedicatedViewerId}`, null, superAdminToken);
    const t20Db = await User.findById(dedicatedViewerId);
    const t20Pass = t20Res.status === 200 && !t20Db;
    results.push({
      test: 'Super Admin -> delete temporary User/Viewer',
      expected: 'HTTP 200 OK & Deleted from MongoDB',
      actual: `HTTP ${t20Res.status} & Record removed from DB`,
      status: t20Res.status,
      mongoVerified: !t20Db,
      pass: t20Pass
    });

    // TEST 21: Super Admin -> delete role change test user
    console.log('Running Test 21: Super Admin -> delete role change test user...');
    const t21Res = await apiCall('DELETE', `/api/users/${tempRoleUserId}`, null, superAdminToken);
    const t21Db = await User.findById(tempRoleUserId);
    const t21Pass = t21Res.status === 200 && !t21Db;
    results.push({
      test: 'Super Admin -> delete role change test user',
      expected: 'HTTP 200 OK & Deleted from MongoDB',
      actual: `HTTP ${t21Res.status} & Record removed from DB`,
      status: t21Res.status,
      mongoVerified: !t21Db,
      pass: t21Pass
    });

  } finally {
    // Clean up ALL temporary test records
    console.log('Cleaning up all temporary test records from MongoDB...');
    const cleanupResult = await User.deleteMany({ email: { $regex: /^test\.temp\./ } });
    console.log(`Cleaned up ${cleanupResult.deletedCount} temporary test record(s).`);

    server.close();
    await mongoose.connection.close();
  }

  // Print results table
  console.log('\n--- VERIFICATION RESULTS ---');
  for (const r of results) {
    console.log(`[${r.pass ? 'PASS' : 'FAIL'}] ${r.test} | Status: ${r.status} | MongoVerified: ${r.mongoVerified}`);
  }

  const allPassed = results.every((r) => r.pass);
  console.log(`\nOVERALL STATUS: ${allPassed ? 'ALL TESTS PASSED' : 'SOME TESTS FAILED'}`);
  if (!allPassed) process.exit(1);
}

runTests().catch((err) => {
  console.error('Test execution error:', err.message);
  process.exit(1);
});

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const errorHandler = require('../middleware/errorHandler');

function createMockRes(initialStatusCode = 200) {
  const res = {
    statusCode: initialStatusCode,
    jsonData: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.jsonData = data;
      return this;
    }
  };
  return res;
}

describe('Backend Error Handling Middleware Suite', () => {
  it('maps Mongoose ValidationError to 400 Bad Request with formatted message', () => {
    const mockValidationError = {
      name: 'ValidationError',
      errors: {
        product: { message: 'Product name is required' },
        cost: { message: 'Cost must be positive' }
      }
    };
    const req = {};
    const res = createMockRes();

    errorHandler(mockValidationError, req, res, () => {});

    assert.equal(res.statusCode, 400);
    assert.equal(res.jsonData.error, 'Product name is required, Cost must be positive');
  });

  it('maps Mongoose duplicate key error (code 11000) to 400 with duplicate message', () => {
    const mockDuplicateKeyError = {
      code: 11000,
      keyValue: { email: 'test@kbzbank.com' }
    };
    const req = {};
    const res = createMockRes();

    errorHandler(mockDuplicateKeyError, req, res, () => {});

    assert.equal(res.statusCode, 400);
    assert.equal(res.jsonData.error, 'A record with this email already exists.');
  });

  it('maps Mongoose CastError (invalid ObjectId) to 400 with resource not found message', () => {
    const mockCastError = {
      name: 'CastError',
      value: 'invalid-id-123'
    };
    const req = {};
    const res = createMockRes();

    errorHandler(mockCastError, req, res, () => {});

    assert.equal(res.statusCode, 400);
    assert.equal(res.jsonData.error, 'Resource not found with ID: invalid-id-123');
  });

  it('maps generic runtime error to 500 Internal Server Error', () => {
    const mockGenericError = new Error('Database connection failed');
    const req = {};
    const res = createMockRes();

    errorHandler(mockGenericError, req, res, () => {});

    assert.equal(res.statusCode, 500);
    assert.equal(res.jsonData.error, 'Database connection failed');
  });

  it('redacts stack trace when NODE_ENV is production', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    const mockError = new Error('Sensitive crash detail');
    const req = {};
    const res = createMockRes();

    try {
      errorHandler(mockError, req, res, () => {});

      assert.equal(res.statusCode, 500);
      assert.equal(res.jsonData.stack, null);
    } finally {
      process.env.NODE_ENV = originalEnv;
    }
  });
});

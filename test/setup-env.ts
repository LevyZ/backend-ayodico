// Test environment variables for e2e tests
process.env.JWT_ACCESS_SECRET = 'test-access-secret-e2e';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-e2e';
process.env.JWT_ACCESS_TTL = '15m';
process.env.JWT_REFRESH_TTL = '7d';

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// Test setup file - runs before all tests
const dotenv_1 = require("dotenv");
// Load test environment variables
(0, dotenv_1.config)({ path: '.env.test' });
// Set test environment
process.env.NODE_ENV = 'test';
// Global test timeout
jest.setTimeout(10000);
// Suppress console logs during tests (comment out for debugging)
global.console = {
    ...console,
    log: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    // Keep error for important test failures
};
// Clean up after all tests
afterAll(async () => {
    // Close any open connections
    // Will add database cleanup here later
});
//# sourceMappingURL=setup.js.map
/* eslint-disable @typescript-eslint/no-require-imports */
import '@testing-library/jest-dom';

import crypto from 'crypto';

// TextEncoder/TextDecoder polyfills
global.TextEncoder = require('util').TextEncoder;
global.TextDecoder = require('util').TextDecoder;

// Mock crypto for browser APIs
Object.defineProperty(global, 'crypto', {
  value: {
    // Use Node.js crypto for digest
    subtle: {
      digest: (algorithm: string, data: Uint8Array) => {
        const algo = algorithm.toLowerCase().replace('-', '');
        const hash = crypto.createHash(algo);
        hash.update(data);
        return Promise.resolve(hash.digest());
      }
    }
  },
  writable: true
});

// Mock console to reduce noise
jest.spyOn(console, 'error').mockImplementation(() => {});
jest.spyOn(console, 'warn').mockImplementation(() => {});
jest.spyOn(console, 'log').mockImplementation(() => {});

afterEach(() => {
  jest.restoreAllMocks();
});

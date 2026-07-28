import { createRequire } from 'node:module';
import Module from 'node:module';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);
const originalRequire = Module.prototype.require;

// Intercept require('brace-expansion') calls from minimatch
Module.prototype.require = function (id: string) {
  const mod = originalRequire.call(this, id);
  if (
    id === 'brace-expansion' &&
    typeof mod !== 'function' &&
    typeof mod?.expand === 'function'
  ) {
    return Object.assign(mod.expand, mod);
  }
  return mod;
};

// Locate ESLint package root via its exported package.json
const eslintPkgPath = require.resolve('eslint/package.json');
const eslintBinPath = path.join(path.dirname(eslintPkgPath), 'bin/eslint.js');

// Try to execute ESLint
import(pathToFileURL(eslintBinPath).href).catch((err) => {
  console.error('Failed to run ESLint via wrapper:', err);
  process.exit(1);
});

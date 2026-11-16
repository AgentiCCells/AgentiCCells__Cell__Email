// The inbound firewall now lives in src/app/cell/clean.mjs, so the browser gateway and the
// Node tools run the same code. This file keeps the old import path working.
export * from '../../src/app/cell/clean.mjs';

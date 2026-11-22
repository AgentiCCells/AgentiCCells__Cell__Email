// The email policy checker, for the Node tools. The checker itself lives in
// src/app/cell/checker.mjs so the browser gateway runs the same code; this wrapper gives it the
// repository's leak scan as its data-loss scanner. By cell.email.d@AgentiCCells.dinis, 2026-11-22.
import { scanText } from '../../scripts/leak-scan.mjs';
import { check as pureCheck } from '../../src/app/cell/checker.mjs';
export { renderTemplate } from '../../src/app/cell/checker.mjs';

export const check = (p, ctx) => pureCheck(p, { ...ctx, scanText: ctx.scanText || scanText });

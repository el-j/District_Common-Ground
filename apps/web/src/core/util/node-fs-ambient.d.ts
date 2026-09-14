// Minimal ambient typing for the handful of Node.js `fs` calls used by
// build-time/test-time-only tooling (e.g. lexiconAudit.test.ts), since this
// project has no @types/node dependency (browser-only tsconfig lib).
declare module 'node:fs' {
	export function readFileSync(path: string, encoding: 'utf-8'): string;
	export function readdirSync(path: string): string[];
	export function statSync(path: string): { isDirectory(): boolean };
}

import { describe, it, expect } from 'vitest';
import { generateHandshakeToken, isTokenExpired, verifyHandshakeToken, secondsRemaining } from './PeerVerification';

describe('PeerVerification', () => {
	it('generates a 4-word hyphenated code valid for 60 seconds', () => {
		const now = 1_000_000;
		const token = generateHandshakeToken(now);
		expect(token.code.split('-')).toHaveLength(4);
		expect(token.expiresAt - token.issuedAt).toBe(60_000);
		expect(isTokenExpired(token, now)).toBe(false);
		expect(isTokenExpired(token, now + 61_000)).toBe(true);
	});

	it('verifies a matching code case-insensitively before expiry', () => {
		const now = 1_000_000;
		const token = generateHandshakeToken(now);
		expect(verifyHandshakeToken(token, token.code.toUpperCase(), now + 5_000)).toBe(true);
		expect(verifyHandshakeToken(token, `  ${token.code}  `, now + 5_000)).toBe(true);
	});

	it('rejects a wrong code and an expired code', () => {
		const now = 1_000_000;
		const token = generateHandshakeToken(now);
		expect(verifyHandshakeToken(token, 'wrong-code-here-nope', now + 1_000)).toBe(false);
		expect(verifyHandshakeToken(token, token.code, now + 61_000)).toBe(false);
	});

	it('counts down seconds remaining until expiry', () => {
		const now = 1_000_000;
		const token = generateHandshakeToken(now);
		expect(secondsRemaining(token, now)).toBe(60);
		expect(secondsRemaining(token, now + 55_000)).toBe(5);
		expect(secondsRemaining(token, now + 70_000)).toBe(0);
	});
});

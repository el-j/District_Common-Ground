/**
 * Local peer-verification handshake for IRL civic deeds.
 *
 * The planning doc (docs/planning/16-...) offers two equivalent mechanisms:
 * a QR code scan, or a short spoken/typed 4-word code
 * ("solar-bread-solidarity-tree"). This PoC implements the word-code path —
 * it needs no camera permission or QR encoder library, and is exactly as
 * strong a "two humans briefly agreed on a shared secret" proof. A future
 * QR transport can generate/consume the same HandshakeToken shape.
 */

const WORDS = [
	'solar', 'bread', 'solidarity', 'tree', 'anchor', 'harbor', 'lantern', 'meadow',
	'cobalt', 'copper', 'willow', 'ember', 'compass', 'garden', 'ripple', 'beacon',
];

const TOKEN_LIFETIME_MS = 60_000;

export interface HandshakeToken {
	code: string;
	issuedAt: number;
	expiresAt: number;
}

/** Generates a fresh 4-word code, valid for 60 seconds, for the initiating device to display. */
export function generateHandshakeToken(now: number = Date.now()): HandshakeToken {
	const code = Array.from({ length: 4 }, () => WORDS[Math.floor(Math.random() * WORDS.length)]).join('-');
	return { code, issuedAt: now, expiresAt: now + TOKEN_LIFETIME_MS };
}

export function isTokenExpired(token: HandshakeToken, now: number = Date.now()): boolean {
	return now > token.expiresAt;
}

/** The partner confirms by re-entering the code shown on the initiating device. */
export function verifyHandshakeToken(token: HandshakeToken, enteredCode: string, now: number = Date.now()): boolean {
	if (isTokenExpired(token, now)) return false;
	return enteredCode.trim().toLowerCase() === token.code.toLowerCase();
}

export function secondsRemaining(token: HandshakeToken, now: number = Date.now()): number {
	return Math.max(0, Math.ceil((token.expiresAt - now) / 1000));
}

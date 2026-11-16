import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { HandyClient } from '../src/handy-client';
import type { Transport, TransportRequest, TransportResponse } from '../src/handy-client';

async function mockTransport(req: TransportRequest): Promise<TransportResponse> {
	return { status: 200, json: { ok: true } };
}

describe('HandyClient integration with bun.serve', () => {
	let server: ReturnType<typeof Bun.serve>;
	let lastRequest: {
		method: string;
		path: string;
		headers: Record<string, string | undefined>;
		body: string;
	} | null;

	beforeEach(() => {
		lastRequest = null;
		server = Bun.serve({
			port: 0,
			fetch: async (request) => {
				const body = await request.text();
				lastRequest = {
					method: request.method,
					path: new URL(request.url).pathname,
					headers: Object.fromEntries(request.headers.entries()),
					body,
				};

				if (request.method !== 'GET' && request.url.endsWith('/health')) {
					return new Response(JSON.stringify({ error: 'wrong_method' }), { status: 405 });
				}

				if (request.url.endsWith('/health')) {
					return new Response(JSON.stringify({ ok: true, version: 1 }), { status: 200 });
				}

				const auth = request.headers.get('authorization');
				if (auth !== 'Bearer testsecret') {
					return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401 });
				}

				if (request.url.endsWith('/state')) {
					return new Response(JSON.stringify({ state: 'recording' }), { status: 200 });
				}

				if (request.url.endsWith('/insert')) {
					if (request.method !== 'POST') {
						return new Response(JSON.stringify({ error: 'wrong_method' }), { status: 405 });
					}
					try {
						const payload = JSON.parse(body);
						if (!payload.text) {
							return new Response(JSON.stringify({ error: 'missing_text' }), { status: 400 });
						}
						if (payload.text === 'full') {
							return new Response(JSON.stringify({ error: 'buffer_full' }), { status: 413 });
						}
						if (payload.text === '[[Conflict]]') {
							return new Response(JSON.stringify({ error: 'not_recording' }), { status: 409 });
						}
						return new Response(JSON.stringify({ ok: true }), { status: 200 });
					} catch {
						return new Response(JSON.stringify({ error: 'invalid_json' }), { status: 400 });
					}
				}

				return new Response(JSON.stringify({ error: 'not_found' }), { status: 404 });
			},
		});
	});

	afterEach(() => {
		server.stop(true);
	});

	it('sends POST /insert with Bearer header and exact body', async () => {
		const client = new HandyClient(server.port, 'testsecret', mockTransport);
		// Replace transport with one that hits the real bun server for this test.
		client.transport = async (req) => {
			const response = await fetch(req.url, {
				method: req.method,
				headers: req.headers,
				body: req.body,
			});
			const text = await response.text();
			let json: unknown = null;
			try {
				json = JSON.parse(text);
			} catch {
				json = null;
			}
			return { status: response.status, json };
		};

		const result = await client.insert('[[Foo]]');
		expect(result).toBe('ok');
		expect(lastRequest).not.toBeNull();
		expect(lastRequest?.method).toBe('POST');
		expect(lastRequest?.path).toBe('/insert');
		expect(lastRequest?.headers.authorization).toBe('Bearer testsecret');
		expect(lastRequest?.body).toBe('{"text":"[[Foo]]"}');
	});

	it('returns not_recording on 409', async () => {
		const client = new HandyClient(server.port, 'testsecret', async (req) => {
			const response = await fetch(req.url, {
				method: req.method,
				headers: req.headers,
				body: req.body,
			});
			const text = await response.text();
			let json: unknown = null;
			try {
				json = JSON.parse(text);
			} catch {
				json = null;
			}
			return { status: response.status, json };
		});
		const result = await client.insert('[[Conflict]]');
		expect(result).toBe('not_recording');
	});

	it('returns unauthorized on wrong secret', async () => {
		const client = new HandyClient(server.port, 'wrongsecret', async (req) => {
			const response = await fetch(req.url, {
				method: req.method,
				headers: req.headers,
				body: req.body,
			});
			return { status: response.status, json: await response.json().catch(() => null) };
		});
		const result = await client.state();
		expect(result).toBe('unauthorized');
	});

	it('returns recording state and requires auth', async () => {
		const client = new HandyClient(server.port, 'testsecret', async (req) => {
			const response = await fetch(req.url, {
				method: req.method,
				headers: req.headers,
				body: req.body,
			});
			return { status: response.status, json: await response.json().catch(() => null) };
		});
		expect(await client.state()).toBe('recording');
		expect(lastRequest?.headers.authorization).toBe('Bearer testsecret');
	});

	it('health requires no auth', async () => {
		const client = new HandyClient(server.port, '', async (req) => {
			const response = await fetch(req.url, {
				method: req.method,
				headers: req.headers,
			});
			return { status: response.status, json: await response.json().catch(() => null) };
		});
		expect(await client.health()).toBe('ok');
		expect(lastRequest?.headers.authorization).toBeUndefined();
	});
});

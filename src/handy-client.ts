export interface TransportRequest {
	method: string;
	url: string;
	headers?: Record<string, string>;
	body?: string;
}

export interface TransportResponse {
	status: number;
	json: unknown;
}

export type Transport = (req: TransportRequest) => Promise<TransportResponse>;

export class HandyClient {
	port: number;
	secret: string;
	transport: Transport;

	constructor(port: number, secret: string, transport: Transport) {
		this.port = port;
		this.secret = secret;
		this.transport = transport;
	}

	private baseUrl(): string {
		return `http://127.0.0.1:${this.port}`;
	}

	private authHeaders(): Record<string, string> {
		return {
			Authorization: `Bearer ${this.secret}`,
		};
	}

	async health(): Promise<'ok' | 'down'> {
		try {
			const response = await this.transport({
				method: 'GET',
				url: `${this.baseUrl()}/health`,
			});
			if (
				response.status === 200 &&
				typeof response.json === 'object' &&
				response.json !== null &&
				(response.json as Record<string, unknown>).ok === true
			) {
				return 'ok';
			}
			return 'down';
		} catch {
			return 'down';
		}
	}

	async state(): Promise<'recording' | 'idle' | 'unauthorized' | 'down'> {
		try {
			const response = await this.transport({
				method: 'GET',
				url: `${this.baseUrl()}/state`,
				headers: this.authHeaders(),
			});

			if (response.status === 401) {
				return 'unauthorized';
			}

			if (response.status !== 200) {
				return 'down';
			}

			if (
				typeof response.json === 'object' &&
				response.json !== null &&
				(response.json as Record<string, unknown>).state === 'recording'
			) {
				return 'recording';
			}

			return 'idle';
		} catch {
			return 'down';
		}
	}

	async insert(text: string): Promise<'ok' | 'not_recording' | 'unauthorized' | 'error'> {
		try {
			const response = await this.transport({
				method: 'POST',
				url: `${this.baseUrl()}/insert`,
				headers: {
					...this.authHeaders(),
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({ text }),
			});

			switch (response.status) {
				case 200:
					return 'ok';
				case 401:
					return 'unauthorized';
				case 409:
					return 'not_recording';
				default:
					return 'error';
			}
		} catch {
			return 'error';
		}
	}
}

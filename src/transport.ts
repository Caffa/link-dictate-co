import { requestUrl } from 'obsidian';
import type { Transport, TransportRequest, TransportResponse } from './handy-client';

export const requestUrlTransport: Transport = async (req: TransportRequest): Promise<TransportResponse> => {
	const response = await requestUrl({
		url: req.url,
		method: req.method,
		headers: req.headers,
		body: req.body,
	});

	let json: unknown = null;
	try {
		json = response.json;
	} catch {
		json = null;
	}

	return { status: response.status, json };
};

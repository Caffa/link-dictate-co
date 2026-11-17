export interface SentLink {
	token: string;
	at: number;
}

export class SentLinksTracker {
	private links: SentLink[] = [];
	private readonly cap: number;

	constructor(cap = 6) {
		this.cap = cap;
	}

	add(token: string): void {
		this.links.push({ token, at: Date.now() });
		if (this.links.length > this.cap) {
			this.links.shift();
		}
	}

	clear(): void {
		this.links = [];
	}

	list(): SentLink[] {
		return [...this.links];
	}
}

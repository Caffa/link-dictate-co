export interface PendingLink {
	token: string;
	at: number;
}

export class PendingLinksTracker {
	private links: PendingLink[] = [];
	private readonly cap: number;

	constructor(cap = 5) {
		this.cap = cap;
	}

	add(token: string): void {
		this.links.push({ token, at: Date.now() });
		if (this.links.length > this.cap) {
			this.links.shift();
		}
	}

	list(): PendingLink[] {
		return [...this.links];
	}

	clear(): void {
		this.links = [];
	}

	remove(token: string, at: number): boolean {
		const before = this.links.length;
		this.links = this.links.filter(
			(link) => link.token !== token || link.at !== at,
		);
		return this.links.length < before;
	}

	pruneExpired(now: number, timeoutMs: number): PendingLink[] {
		const expired: PendingLink[] = [];
		const survivors: PendingLink[] = [];
		for (const link of this.links) {
			if (now - link.at > timeoutMs) {
				expired.push(link);
			} else {
				survivors.push(link);
			}
		}
		this.links = survivors;
		return expired;
	}
}

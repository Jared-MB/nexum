export type RevalidateTags = string[] | "never";

export interface CacheAnalysis {
	status: "HIT" | "MISS" | "STALE" | "REVALIDATED";
	confidence: number;
	indicators: string[];
	metadata: {
		age?: number;
		tags: string[];
		revalidate?: number | false;
		duration: number;
		strategy?: RequestCache;
	};
}

import type { CacheAnalysis } from "../../interfaces/cache";

export const analyzeCacheStatus = (
	response: Response,
	requestInit: {
		tags?: string[];
		revalidate?: number | false;
		cache?: RequestCache;
	},
	timing: { start: number; end: number },
): CacheAnalysis => {
	const indicators: string[] = [];
	const duration = timing.end - timing.start;
	let status: CacheAnalysis["status"] = "MISS";
	let confidence = 0.5;

	const { tags = [], revalidate, cache } = requestInit;

	// Analyze headers
	const cacheControl = response.headers.get("cache-control");
	const age = response.headers.get("age");
	const xNextjsCache = response.headers.get("x-nextjs-cache");
	const xVercelCache = response.headers.get("x-vercel-cache");

	// Direct Next.js cache headers (most reliable)
	if (xNextjsCache) {
		status = xNextjsCache.toUpperCase() as any;
		confidence = 0.95;
		indicators.push(`x-nextjs-cache: ${xNextjsCache}`);
	} else if (xVercelCache) {
		status = xVercelCache.toUpperCase() as any;
		confidence = 0.9;
		indicators.push(`x-vercel-cache: ${xVercelCache}`);
	}

	// Timing analysis
	if (duration < 5) {
		status = "HIT";
		confidence = Math.max(confidence, 0.8);
		indicators.push(`very fast response (${duration}ms)`);
	} else if (duration < 20 && revalidate) {
		status = "HIT";
		confidence = Math.max(confidence, 0.7);
		indicators.push(`fast cached response (${duration}ms)`);
	}

	// Age header analysis
	if (age) {
		const ageSeconds = Number.parseInt(age);
		if (ageSeconds > 0) {
			status = "HIT";
			confidence = Math.max(confidence, 0.8);
			indicators.push(`age header: ${ageSeconds}s`);
		}
	}

	// Cache-Control analysis
	if (cacheControl) {
		const maxAgeMatch = cacheControl.match(/max-age=(\d+)/);
		const swr = cacheControl.includes("stale-while-revalidate");

		if (maxAgeMatch && swr) {
			indicators.push(`cache-control: ${cacheControl}`);
		}
	}

	// Stale detection
	if (status === "HIT" && age && cacheControl) {
		const ageSeconds = Number.parseInt(age);
		const maxAgeMatch = cacheControl.match(/max-age=(\d+)/);

		if (maxAgeMatch) {
			const maxAge = Number.parseInt(maxAgeMatch[1] ?? "0");
			if (ageSeconds > maxAge) {
				status = "STALE";
				indicators.push(`stale: age(${ageSeconds}) > max-age(${maxAge})`);
			}
		}
	}

	// If cache is 'no-store', it's always a miss
	if (cache === "no-store") {
		status = "MISS";
		confidence = 0.95;
		indicators.push("cache: no-store");
	}

	if (indicators.length === 0) {
		indicators.push("no indicators");
	}

	return {
		status,
		confidence,
		indicators,
		metadata: {
			age: age ? Number.parseInt(age) : undefined,
			tags,
			revalidate,
			duration,
			strategy: cache,
		},
	};
};

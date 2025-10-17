"use server";

import type { RevalidateTags } from "../interfaces/cache.js";

import { NEXUM_CONFIG } from "./config";
import { __IS__DEV__ } from "./env";
import { logger } from "./logs";

let revalidateTag: typeof import("next/cache").revalidateTag | undefined;
let updateTag: typeof import("next/cache").updateTag | undefined;

let nextCacheAvailable: boolean | undefined;

const isNextCacheAvailable = async () => {
	if (nextCacheAvailable !== undefined) return nextCacheAvailable;

	try {
		const nextCache = await import("next/cache");
		revalidateTag = nextCache.revalidateTag;
		updateTag = nextCache.updateTag;

		nextCacheAvailable =
			typeof revalidateTag === "function" && typeof updateTag === "function";

		if (nextCacheAvailable) {
			__IS__DEV__ &&
				logger.log(
					"[CACHE] NextJS cache revalidation is available. Cache revalidation will be performed",
				);
		}

		return nextCacheAvailable;
	} catch {
		nextCacheAvailable = false;
		__IS__DEV__ &&
			logger.warn(
				"[CACHE] NextJS cache revalidation is not available. Cache revalidation will be skipped",
			);

		return nextCacheAvailable;
	}
};

interface RevalidateCacheTagsOptions {
	url: string;
	revalidateFunction?: "revalidateTag" | "updateTag";
	profile?: Parameters<NonNullable<typeof revalidateTag>>[1];
}

export const revalidateCacheTags = async (
	tags: RevalidateTags | undefined,
	options: RevalidateCacheTagsOptions,
) => {
	const { revalidateFunction, url } = options;

	if (tags === "never") {
		__IS__DEV__ &&
			logger.log(`[CACHE] Skipping revalidation for POST request on ${url}`);
		return;
	}

	if (!(await isNextCacheAvailable())) {
		return;
	}

	if (!tags || tags.length === 0) {
		const showEmptyTagsWarning = NEXUM_CONFIG?.debug?.emptyMutationTagsWarning;

		if (showEmptyTagsWarning) {
			__IS__DEV__ &&
				logger.warn(
					`[POST] Empty or missing tags revalidation array passed to POST request on ${url}`,
				);
		}

		return;
	}

	const revalidationStrategy =
		revalidateFunction ??
		NEXUM_CONFIG?.defaultRevalidateFunction ??
		"revalidateTag";

	if (revalidationStrategy === "revalidateTag") {
		const profile = options.profile ?? "max";
		for (const tag of tags) {
			logger.log(`[CACHE] Revalidating tag [${tag}]`);
			// biome-ignore lint/style/noNonNullAssertion: This is always defined since we check if it's available before on the isNextCacheAvailable function
			revalidateTag!(tag, profile);
		}

		return;
	}

	for (const tag of tags) {
		logger.log(`[CACHE] Updating tag [${tag}]`);
		// biome-ignore lint/style/noNonNullAssertion: This is always defined since we check if it's available before on the isNextCacheAvailable function
		updateTag!(tag);
	}
};

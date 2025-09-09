"use server";

import type { Url } from "../interfaces/routes.js";
import type { ApiResponse } from "../interfaces/server.js";

import { tryCatch } from "@kristall/try-catch";
import { HTTP, type HttpOptions } from "../interfaces/methods.js";
import { analyzeCacheStatus } from "../utils/cache/cache-detector";
import { NEXUM_CONFIG } from "../utils/config";
import { NotDefinedError } from "../utils/errors";
import { getHeaders } from "../utils/headers";
import { __IS__DEV__ } from "../utils/isDev";
import { logger } from "../utils/logs";
import { parseErrorResponse } from "../utils/responses";

export interface GetOptions extends HttpOptions {
	/**
	 * **ONLY FOR NEXTJS**
	 *
	 * Tags to be used for the request cache.
	 */
	tags?: string[];
	/**
	 * Cache control strategy for the request.
	 * @default "default"
	 */
	cache?: RequestCache;
	/**
	 * **ONLY FOR NEXTJS**
	 *
	 * Revalidate the request if the cache is expired.
	 * @default false
	 */
	revalidate?: false | 0 | number | undefined;
}

export const GET = async <T = unknown, Routes extends Url = Url>(
	url: Routes,
	options?: GetOptions,
): Promise<ApiResponse<T>> => {
	const cacheStrategy = options?.cache ?? "default";
	const method = HTTP.GET;

	const SERVER_URL = options?.serverUrl ?? NEXUM_CONFIG?.serverUrl;
	if (__IS__DEV__ && !SERVER_URL) {
		throw new NotDefinedError({
			message: "Server URL is not defined",
			solution:
				"Make sure you have set the server URL in your config file or pass the serverUrl option to the request",
		});
	}

	const [error, headers] = await tryCatch(
		getHeaders({ auth: options?.auth, customHeaders: options?.headers }),
	);
	if (error) {
		throw error;
	}

	const showEmptyTagsWarning = NEXUM_CONFIG?.debug?.emptyTagsWarning;
	const tags = options?.tags;

	if (showEmptyTagsWarning && (!tags || tags?.length === 0)) {
		__IS__DEV__ &&
			logger.warn(
				`[GET] Empty or missing tags array passed to GET request to ${SERVER_URL}${url}`,
			);
	}

	const fetchStartTime = Date.now();

	const [responseError, response] = await tryCatch(
		fetch(`${SERVER_URL}${url}`, {
			method,
			headers,
			next: {
				tags: options?.tags,
				revalidate: options?.revalidate,
			},
			cache: cacheStrategy,
		}),
	);

	const fetchEndTime = Date.now();

	if (responseError) {
		logger.error(`[GET] Error fetching data at: ${url}`);
		console.log(`\t   └─ Name: ${responseError.name}`);
		console.log(`\t   └─ Reason: ${responseError.message}`);

		return {
			data: undefined,
			message: responseError?.message ?? "Internal server error",
			status: 500,
		};
	}

	const [parseError, payload] = await tryCatch<unknown>(response.json());

	let data: ApiResponse<T> | undefined;
	if (
		payload &&
		typeof payload === "object" &&
		"data" in payload &&
		"message" in payload &&
		"status" in payload
	) {
		data = payload as ApiResponse<T>;
	}

	if (!response.ok) {
		if (parseError) {
			logger.error(`[GET] Error parsing response at: ${url}`);
			return parseErrorResponse();
		}

		logger.error(`[GET] Error fetching data at: ${url} [${response.status}]`);
		console.log(`\t   └─ Status: ${response.statusText}`);
		console.log(`\t   └─ Reason: ${data?.message ?? response.statusText}`);

		return {
			data: undefined,
			message: data?.message ?? response.statusText,
			status: data?.status ?? response.status,
		};
	}

	if (parseError) {
		logger.error(`[GET] Error parsing response at: ${url}`);
		return parseErrorResponse();
	}

	logger.requestLog({ method, url, status: response.status });

	const cacheAnalysis = analyzeCacheStatus(
		response,
		{
			tags: options?.tags,
			revalidate: options?.revalidate,
			cache: cacheStrategy,
		},
		{ start: fetchStartTime, end: fetchEndTime },
	);

	logger.cacheStatus(cacheAnalysis, url, method);

	return {
		data: data?.data ?? (payload as T),
		message: data?.message ?? response.statusText ?? "Ok",
		status: data?.status ?? response.status ?? 200,
	};
};

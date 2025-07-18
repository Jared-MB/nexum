"use server";

import type { RevalidateTags } from "../interfaces/cache.js";
import type { Url } from "../interfaces/routes.js";
import type { ApiResponse } from "../interfaces/server.js";

import { HTTP, type HttpOptions } from "../interfaces/methods.js";
import { NEXUM_CONFIG } from "../utils/config";
import { NotDefinedError } from "../utils/errors";
import { getHeaders } from "../utils/headers";
import { logger } from "../utils/logs";
import { parseErrorResponse } from "../utils/responses";
import { revalidateCacheTags } from "../utils/revalidation";
import { tryCatch } from "../utils/tryCatch";

interface PatchOptions extends HttpOptions {
	/**
	 * **NEXTJS ONLY**
	 *
	 * Cache revalidation strategy after PATCH request:
	 * - string[]: Revalidate specific cache tags
	 * - "never": Skip all cache revalidation, even if NextJS cache is available.
	 * - undefined: Don't revalidate cache
	 */
	revalidateTags?: RevalidateTags;
}

export const PATCH = async <T = unknown, B = any>(
	url: Url,
	body: B,
	options?: PatchOptions,
): Promise<ApiResponse<T>> => {
	const method = HTTP.PATCH;

	const SERVER_URL = NEXUM_CONFIG?.serverUrl;
	if (!SERVER_URL) {
		throw new NotDefinedError({
			message: "Server URL is not defined",
			solution: "Make sure you have set the server URL in your config file",
		});
	}

	const [error, headers] = await tryCatch(getHeaders({ auth: options?.auth }));
	if (error) {
		throw error;
	}

	const [responseError, response] = await tryCatch(
		fetch(`${SERVER_URL}${url}`, {
			method,
			headers,
			body: JSON.stringify(body),
		}),
	);

	if (responseError) {
		logger.error(`[PATCH] Error pushing data at: ${url}`);

		return {
			data: undefined,
			message: responseError?.message ?? "Internal server error",
			status: 500,
		};
	}

	const [parseError, data] = await tryCatch(
		response.json() as Promise<ApiResponse<T>>,
	);

	if (!response.ok) {
		if (parseError) {
			logger.error(`[PATCH] Error parsing response at: ${url}`);
			return parseErrorResponse();
		}

		logger.error(`[PATCH] Error pushing data at: ${url} [${response.status}]`);

		return {
			data: undefined,
			message: data?.message ?? response.statusText,
			status: data?.status ?? response.status,
		};
	}

	if (parseError) {
		logger.error(`[PATCH] Error parsing response at: ${url}`);
		return parseErrorResponse();
	}

	logger.requestLog({ method, url, status: response.status });

	await revalidateCacheTags(options?.revalidateTags, url);

	return {
		data: data?.data,
		message: data.message ?? response.statusText ?? "Created",
		status: data.status ?? response.status ?? 201,
	};
};

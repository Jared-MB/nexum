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

export interface PostOptions extends HttpOptions {
	/**
	 * **NEXTJS ONLY**
	 *
	 * Cache revalidation strategy after POST request:
	 * - string[]: Revalidate specific cache tags
	 * - "never": Skip all cache revalidation, even if NextJS cache is available.
	 * - undefined: Don't revalidate cache
	 */
	revalidateTags?: RevalidateTags;
}

export const POST = async <T = unknown, B = any>(
	url: Url,
	body: B,
	options?: PostOptions,
): Promise<ApiResponse<T>> => {
	const method = HTTP.POST;

	const SERVER_URL = options?.serverUrl ?? NEXUM_CONFIG?.serverUrl;
	if (!SERVER_URL) {
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

	const bodyPayload = body instanceof FormData ? body : JSON.stringify(body);

	const [responseError, response] = await tryCatch(
		fetch(`${SERVER_URL}${url}`, {
			method,
			headers,
			body: bodyPayload,
		}),
	);

	if (responseError) {
		logger.error(`[POST] Error pushing data at: ${url}`);

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
			logger.error(`[POST] Error parsing response at: ${url}`);
			return parseErrorResponse();
		}

		logger.error(`[POST] Error pushing data at: ${url} [${response.status}]`);

		return {
			data: undefined,
			message: data?.message ?? response.statusText,
			status: data?.status ?? response.status,
		};
	}

	if (parseError) {
		logger.error(`[POST] Error parsing response at: ${url}`);
		return parseErrorResponse();
	}

	logger.requestLog({ method, url, status: response.status });

	await revalidateCacheTags(options?.revalidateTags, url);

	return {
		data: data?.data ?? (payload as T),
		message: data?.message ?? response.statusText ?? "Created",
		status: data?.status ?? response.status ?? 201,
	};
};

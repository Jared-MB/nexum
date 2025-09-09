import type { HttpOptions } from "../interfaces/methods";
import type { Url } from "../interfaces/routes";

import { DELETE as DELETE_METHOD, type DeleteOptions } from "../http/delete";
import { GET as GET_METHOD, type GetOptions } from "../http/get";
import { PATCH as PATCH_METHOD, type PatchOptions } from "../http/patch";
import { POST as POST_METHOD, type PostOptions } from "../http/post";
import { PUT as PUT_METHOD, type PutOptions } from "../http/put";
import { NotDefinedError } from "./errors";

type CreateHttpClientOptions = Pick<HttpOptions, "serverUrl"> & {
	serverUrl: string;
};

/**
 * Creates a client instance with the specified base URL.
 *
 * While using this function and its methods, the `serverUrl` option on `next.config.ts` will be ignored.
 * Other options passed to the config will be used.
 */
export const createHttpClient = <Routes extends Url>(
	options: CreateHttpClientOptions,
) => {
	const { serverUrl } = options;

	if (!serverUrl || typeof serverUrl !== "string" || !serverUrl.trim().length) {
		throw new NotDefinedError({
			message: "Base URL is required or is not a string",
			solution:
				"Make sure you have pass correctly the serverUrl option to the request",
		});
	}

	const GET = <T = unknown>(
		url: Routes,
		options?: Omit<GetOptions, "serverUrl">,
	) => {
		return GET_METHOD<T, Routes>(url, { ...options, serverUrl });
	};

	const POST = <T = unknown, B = any>(
		url: Routes,
		body: B,
		options?: Omit<PostOptions, "serverUrl">,
	) => {
		return POST_METHOD<T, B, Routes>(url, body, { ...options, serverUrl });
	};

	const PUT = <T = unknown, B = any>(
		url: Routes,
		body: B,
		options?: Omit<PutOptions, "serverUrl">,
	) => {
		return PUT_METHOD<T, B, Routes>(url, body, { ...options, serverUrl });
	};

	const DELETE = <T = unknown, B = any>(
		url: Routes,
		body: B,
		options?: Omit<DeleteOptions, "serverUrl">,
	) => {
		return DELETE_METHOD<T, B, Routes>(url, body, { ...options, serverUrl });
	};

	const PATCH = <T = unknown, B = any>(
		url: Routes,
		body: B,
		options?: Omit<PatchOptions, "serverUrl">,
	) => {
		return PATCH_METHOD<T, B, Routes>(url, body, { ...options, serverUrl });
	};

	return {
		GET,
		POST,
		PUT,
		DELETE,
		PATCH,
	};
};

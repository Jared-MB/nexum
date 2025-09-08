import type { Url } from "../interfaces/routes";

import { DELETE as DELETE_METHOD, type DeleteOptions } from "../http/delete";
import { GET as GET_METHOD, type GetOptions } from "../http/get";
import { PATCH as PATCH_METHOD, type PatchOptions } from "../http/patch";
import { POST as POST_METHOD, type PostOptions } from "../http/post";
import { PUT as PUT_METHOD, type PutOptions } from "../http/put";
import { NotDefinedError } from "./errors";

interface CreateHttpClientOptions {
	/**
	 * Base URL to be used for the requests.
	 */
	serverUrl: string;
}

/**
 * Creates a client instance with the specified base URL.
 *
 * While using this function and its methods, the `serverUrl` option on `next.config.ts` will be ignored.
 * Other options passed to the config will be used.
 */
export const createHttpClient = (options: CreateHttpClientOptions) => {
	const { serverUrl } = options;

	if (!serverUrl || typeof serverUrl !== "string" || !serverUrl.trim().length) {
		throw new NotDefinedError({
			message: "Base URL is required or is not a string",
			solution:
				"Make sure you have pass correctly the serverUrl option to the request",
		});
	}

	const GET = (url: Url, options?: GetOptions) => {
		const { serverUrl: _, ...rest } = options ?? {};
		return GET_METHOD(url, { ...rest, serverUrl });
	};

	const POST = (url: Url, options?: PostOptions) => {
		const { serverUrl: _, ...rest } = options ?? {};
		return POST_METHOD(url, { ...rest, serverUrl });
	};

	const PUT = (url: Url, options?: PutOptions) => {
		const { serverUrl: _, ...rest } = options ?? {};
		return PUT_METHOD(url, { ...rest, serverUrl });
	};

	const DELETE = (url: Url, options?: DeleteOptions) => {
		const { serverUrl: _, ...rest } = options ?? {};
		return DELETE_METHOD(url, { ...rest, serverUrl });
	};

	const PATCH = (url: Url, options?: PatchOptions) => {
		const { serverUrl: _, ...rest } = options ?? {};
		return PATCH_METHOD(url, { ...rest, serverUrl });
	};

	return {
		GET,
		POST,
		PUT,
		DELETE,
		PATCH,
	};
};

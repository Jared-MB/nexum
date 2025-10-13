import type { revalidateTag } from "next/cache";
import type { RevalidateTags } from "./cache";

export enum HTTP {
	GET = "GET",
	POST = "POST",
	PUT = "PUT",
	DELETE = "DELETE",
	PATCH = "PATCH",
}

export interface HttpOptions {
	/**
	 * If true, the request **NEEDS** to be authenticated, **AUTHORIZATION COOKIE AND HEADER ARE REQUIRED**.
	 *
	 * This option will override the defaultAuthRequests option.
	 */
	auth?: boolean;
	/**
	 * Custom headers to be used for the request.
	 */
	headers?: HeadersInit;
	/**
	 * Server URL to be used for the request.
	 *
	 * Its not necessary to use this option if you have set the `serverUrl` option in your config file.
	 *
	 * This option will override the `serverUrl` option.
	 */
	serverUrl?: string;
}

export interface HttpMutateOptions extends HttpOptions {
	/**
	 * **NEXTJS ONLY**
	 *
	 * Cache revalidation strategy after request:
	 * - string[]: Revalidate specific cache tags
	 * - "never": Skip all cache revalidation, even if NextJS cache is available.
	 * - undefined: Don't revalidate cache
	 */
	revalidateTags?: RevalidateTags;
	/**
	 * **NEXTJS ONLY**
	 *
	 * Profile strategy to be used for cache revalidation.
	 * 
	 * @default 'max'
	 * @see https://nextjs.org/docs/beta/app/api-reference/functions/cacheLife#reference
	 */
	profile?: Parameters<typeof revalidateTag>[1];
	/**
	 * **NEXTJS ONLY**
	 *
	 * Cache revalidation function to be used for cache revalidation.
	 * - 'revalidateTag': Revalidate cache tags using revalidateTag function.
	 * - 'updateTag': Update cache tags using updateTag function.
	 * - undefined: Use default cache revalidation function.
	 * 
	 * @default 'revalidateTag'
	 */
	revalidateFunction?: 'revalidateTag' | 'updateTag';
}
export interface NexumConfig {
	sessionCookieName?: string;
	defaultAuthRequests?: boolean;
	serverUrl?: string;
	tokenVerb?: string;
	/**
	 * Default revalidate function to use when revalidating cache tags.
	 * Defaults to 'revalidateTag'.
	 * 
	 * Use updateTag when:
	 *
	 * You're in a Server Action
	 * - You need immediate cache invalidation for read-your-own-writes
	 * - You want to ensure the next request sees updated data
	 * 
	 * Use revalidateTag instead when:
	 * - You're in a Route Handler or other non-action context
	 * - You want stale-while-revalidate semantics
	 * - You're building a webhook or API endpoint for cache invalidation
	 * 
	 * updateTag docs:
	 * @see https://nextjs.org/docs/beta/app/api-reference/functions/updateTag#usage
	 * 
	 * revalidateTag docs:
	 * @see https://nextjs.org/docs/beta/app/api-reference/functions/revalidateTag#usage
	 */
	defaultRevalidateFunction?: 'revalidateTag' | 'updateTag';
	debug?: {
		emptyTagsWarning?: boolean;
		emptyMutationTagsWarning?: boolean;
		cacheLogging?: {
			showCacheConfidence?: boolean;
			showCacheIndicators?: boolean;
			showCacheStrategy?: boolean;
		};
	};
}

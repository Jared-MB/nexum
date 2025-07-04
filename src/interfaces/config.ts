export interface NexumConfig {
	sessionCookieName?: string;
	defaultAuthRequests?: boolean;
	serverUrl?: string;
	tokenVerb?: string;
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

import type { NexumConfig } from "../interfaces/config.js";

export const __DEFAULT_CONFIG__ = {
	sessionCookieName: "session",
	defaultAuthRequests: true,
	serverUrl: process.env.SERVER_API,
	tokenVerb: "Bearer",
	debug: {
		emptyTagsWarning: true,
		emptyMutationTagsWarning: true,
		cacheLogging: true,
		showCacheConfidence: false,
		showCacheIndicators: false,
		showCacheStrategy: false,
	},
} as const satisfies NexumConfig;

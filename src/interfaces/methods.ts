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

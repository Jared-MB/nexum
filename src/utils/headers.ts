"use server";

import { NEXUM_CONFIG } from "./config";
import { getSessionCookie } from "./cookies";
import { NotDefinedError } from "./errors";

export const getHeaders = async ({
	auth,
}: { auth?: boolean }): Promise<HeadersInit> => {
	const defaultAuthRequests = NEXUM_CONFIG.defaultAuthRequests;
	if (typeof defaultAuthRequests !== "boolean") {
		throw new NotDefinedError({
			message: "Default auth requests is not defined",
			solution:
				"Make sure you have set the default auth requests in your config file",
		});
	}

	const needAuth = auth ?? defaultAuthRequests;

	const headers: HeadersInit = {
		"Content-Type": "application/json",
	};

	if (!needAuth) {
		return headers;
	}

	const sessionCookieName = NEXUM_CONFIG.sessionCookieName;

	if (typeof sessionCookieName !== "string") {
		throw new NotDefinedError({
			message: "Session cookie name is not defined",
			solution:
				"Make sure you have set the sessionCookieName in your config file",
		});
	}

	const accessToken = await getSessionCookie(sessionCookieName);
	if (!accessToken) {
		throw new NotDefinedError({
			message: "**Access token is not defined**",
			solution:
				"Is this a **non-authenticated request**? If yes pass the **auth** option to the request. \n If not, make sure your **sessionCookieName** in your config file is the same as your cookie name in your browser",
		});
	}

	const tokenVerb = NEXUM_CONFIG.tokenVerb;
	if (typeof tokenVerb !== "string") {
		throw new NotDefinedError({
			message: "Token verb is not defined",
			solution: "Make sure you have set the token verb in your config file",
		});
	}

	return {
		...headers,
		Authorization: `${tokenVerb} ${accessToken}`,
		Cookie: `${sessionCookieName}=${accessToken}`,
	};
};

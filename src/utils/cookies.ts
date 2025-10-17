"use server";

import { cookies } from "next/headers";
import { logger } from "./logs";
import { __IS__NEXT__BUILDING__ } from "./env";

export async function getSessionCookie(
	cookieName: string,
): Promise<string | undefined> {
	try {
		const cookie = (await cookies()).get(cookieName);
		return cookie?.value;
	} catch (error) {
		if (__IS__NEXT__BUILDING__) {
			logger.log(
				`[SKIP] Cookie ${cookieName} not found due to Next.js building.`,
			);
		}
		if (error instanceof Error) {
			logger.error(`Error reading cookie ${cookieName}: `, error.message);
		} else {
			logger.error(`Error reading cookie ${cookieName}: `, error);
		}
		return undefined;
	}
}

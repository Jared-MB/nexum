"use server";

import { cookies } from "next/headers";
import { logger } from "./logs";

export async function getSessionCookie(
	cookieName: string,
): Promise<string | undefined> {
	try {
		const cookie = (await cookies()).get(cookieName);
		return cookie?.value;
	} catch (error) {
		if (error instanceof Error) {
			logger.error(`Error reading cookie ${cookieName}: `, error.message);
		} else {
			logger.error(`Error reading cookie ${cookieName}: `, error);
		}
		return undefined;
	}
}

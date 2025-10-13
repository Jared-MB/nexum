import { beforeEach, describe, expect, it, vi } from "vitest";
import { NEXUM_CONFIG } from "../config";
import { logger } from "../logs";

// Dynamic mocks for next/cache so we can switch availability per-test
let revalidateTagMock: any;
let updateTagMock: any;
let nextCacheFactoryBehavior: "functions" | "undefined" = "functions";
vi.mock("next/cache", () => {
	if (nextCacheFactoryBehavior === "undefined") {
		return {
			revalidateTag: undefined,
			updateTag: undefined,
		};
	}
	return {
		revalidateTag: (...args: any[]) => revalidateTagMock?.(...args),
		updateTag: (...args: any[]) => updateTagMock?.(...args),
	};
});

// Mock config and isDev
vi.mock("../config", () => ({
	NEXUM_CONFIG: {
		debug: { emptyMutationTagsWarning: true },
		defaultRevalidateFunction: undefined,
	},
}));
vi.mock("../isDev", () => ({ __IS__DEV__: true }));

// Mock logger with spies
vi.mock("../logs", () => ({
	logger: {
		log: vi.fn(),
		warn: vi.fn(),
		error: vi.fn(),
		requestLog: vi.fn(),
		cacheStatus: vi.fn(),
	},
}));

const importRevalidation = async () => {
	const mod = await import("../revalidation");
	return mod.revalidateCacheTags;
};

describe("revalidateCacheTags", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.resetModules();
		// Ensure dev mode for __IS__DEV__ when real module is used
		revalidateTagMock = vi.fn();
		updateTagMock = vi.fn();
		nextCacheFactoryBehavior = "functions";
		if (NEXUM_CONFIG.debug) {
			NEXUM_CONFIG.debug.emptyMutationTagsWarning = true;
		}
		NEXUM_CONFIG.defaultRevalidateFunction = undefined as any;

		// Re-mock next/cache for each test to ensure fresh state
		vi.doMock("next/cache", () => {
			if (nextCacheFactoryBehavior === "undefined") {
				return {
					revalidateTag: undefined,
					updateTag: undefined,
				};
			}
			return {
				revalidateTag: (...args: any[]) => revalidateTagMock?.(...args),
				updateTag: (...args: any[]) => updateTagMock?.(...args),
			};
		});
	});

	it("should skip revalidation when tags is 'never' and log a dev message", async () => {
		const revalidateCacheTags = await importRevalidation();
		await revalidateCacheTags("never" as any, { url: "/post" });

		expect(logger.log).toHaveBeenCalledWith(
			"[CACHE] Skipping revalidation for POST request on /post",
		);
		expect(revalidateTagMock).not.toHaveBeenCalled();
		expect(updateTagMock).not.toHaveBeenCalled();
	});

	it("should return early when NextJS cache is not available", async () => {
		// Simulate next/cache exports not being functions
		nextCacheFactoryBehavior = "undefined";
		const revalidateCacheTags = await importRevalidation();

		await revalidateCacheTags(["t1"], { url: "/no-cache" });

		// No attempts to call either strategy
		expect(revalidateTagMock).not.toHaveBeenCalled();
		expect(updateTagMock).not.toHaveBeenCalled();
		// No tag-level logs
		expect(logger.log).not.toHaveBeenCalledWith(
			expect.stringContaining("Revalidating tag"),
		);
		expect(logger.log).not.toHaveBeenCalledWith(
			expect.stringContaining("Updating tag"),
		);
	});

	it("should warn when tags are empty and warning is enabled (dev)", async () => {
		const revalidateCacheTags = await importRevalidation();
		await revalidateCacheTags([], { url: "/empty" });

		expect(logger.warn).toHaveBeenCalledWith(
			"[POST] Empty or missing tags revalidation array passed to POST request on /empty",
		);
	});

	it("should not warn when tags are empty and warning is disabled", async () => {
		if (NEXUM_CONFIG.debug) {
			NEXUM_CONFIG.debug.emptyMutationTagsWarning = false;
		}
		const revalidateCacheTags = await importRevalidation();
		await revalidateCacheTags([], { url: "/empty" });

		expect(logger.warn).not.toHaveBeenCalled();
	});

	it("should use revalidateTag strategy by default with profile 'max'", async () => {
		const revalidateCacheTags = await importRevalidation();
		await revalidateCacheTags(["a", "b"], { url: "/default" });

		expect(revalidateTagMock).toHaveBeenCalledTimes(2);
		expect(revalidateTagMock).toHaveBeenNthCalledWith(1, "a", "max");
		expect(revalidateTagMock).toHaveBeenNthCalledWith(2, "b", "max");
		expect(updateTagMock).not.toHaveBeenCalled();
		// Logs for each tag
		expect(logger.log).toHaveBeenCalledWith("[CACHE] Revalidating tag [a]");
		expect(logger.log).toHaveBeenCalledWith("[CACHE] Revalidating tag [b]");
	});

	it("should use provided profile when revalidating tags", async () => {
		const revalidateCacheTags = await importRevalidation();
		await revalidateCacheTags(["x"], {
			url: "/profile",
			profile: "no-store" as any,
		});

		expect(revalidateTagMock).toHaveBeenCalledWith("x", "no-store");
	});

	it("should use updateTag strategy when option revalidateFunction='updateTag'", async () => {
		const revalidateCacheTags = await importRevalidation();
		await revalidateCacheTags(["t1", "t2"], {
			url: "/update",
			revalidateFunction: "updateTag",
		});

		expect(updateTagMock).toHaveBeenCalledTimes(2);
		expect(updateTagMock).toHaveBeenNthCalledWith(1, "t1");
		expect(updateTagMock).toHaveBeenNthCalledWith(2, "t2");
		expect(revalidateTagMock).not.toHaveBeenCalled();
		// Logs for each tag
		expect(logger.log).toHaveBeenCalledWith("[CACHE] Updating tag [t1]");
		expect(logger.log).toHaveBeenCalledWith("[CACHE] Updating tag [t2]");
	});

	it("should use default strategy from config when provided (updateTag)", async () => {
		// Ensure mocks are functions at import time
		revalidateTagMock = vi.fn();
		updateTagMock = vi.fn();
		NEXUM_CONFIG.defaultRevalidateFunction = "updateTag" as any;
		const revalidateCacheTags = await importRevalidation();
		await revalidateCacheTags(["c"], { url: "/config-default" });

		expect(updateTagMock).toHaveBeenCalledTimes(1);
		expect(updateTagMock).toHaveBeenCalledWith("c");
		expect(revalidateTagMock).not.toHaveBeenCalled();
	});

	it("should log availability message when NextJS cache is available (dev)", async () => {
		const revalidateCacheTags = await importRevalidation();
		await revalidateCacheTags(["avail"], { url: "/avail" });

		// Characterize availability by ensuring revalidateTag was called for provided tag
		expect(revalidateTagMock).toHaveBeenCalledWith("avail", "max");
	});

	it("should warn when NextJS cache is not available (dev)", async () => {
		// Simulate next/cache exports not being functions
		nextCacheFactoryBehavior = "undefined";
		const revalidateCacheTags = await importRevalidation();

		await revalidateCacheTags(["x"], { url: "/unavailable" });

		// Characterize unavailability by absence of tag-level logs
		expect(logger.log).not.toHaveBeenCalledWith(
			expect.stringContaining("Revalidating tag"),
		);
		expect(logger.log).not.toHaveBeenCalledWith(
			expect.stringContaining("Updating tag"),
		);
	});
});

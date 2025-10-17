import { tryCatch } from "@kristall/try-catch";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CacheAnalysis } from "../../interfaces/cache";
import type { ApiResponse } from "../../interfaces/server";
import { analyzeCacheStatus } from "../../utils/cache/cache-detector";
import { NEXUM_CONFIG } from "../../utils/config";
import { NotDefinedError } from "../../utils/errors";
import { getHeaders } from "../../utils/headers";
import { logger } from "../../utils/logs";
import { parseErrorResponse } from "../../utils/responses";
import { GET } from "../get";

// Mock external modules
vi.mock("../../utils/config", () => ({
	NEXUM_CONFIG: {
		serverUrl: "http://api.test.com",
		debug: { emptyTagsWarning: true },
	},
}));
vi.mock("../../utils/headers");
vi.mock("../../utils/logs");
vi.mock("../../utils/responses");
vi.mock("@kristall/try-catch");
vi.mock("../../utils/cache/cache-detector");
vi.mock("../../utils/env", () => ({ __IS__DEV__: true }));

// Mock global fetch and console
global.fetch = vi.fn();
vi.spyOn(console, "log").mockImplementation(() => {});
vi.spyOn(Date, "now").mockReturnValue(new Date().getTime());

// Helper to create a mock Response object
const createMockResponse = (
	body: any,
	options: { ok: boolean; status: number; statusText: string },
) => {
	return {
		...options,
		headers: new Headers(),
		redirected: false,
		type: "default",
		url: "",
		clone: () => this,
		body: null,
		bodyUsed: false,
		arrayBuffer: async () => new ArrayBuffer(0),
		blob: async () => new Blob(),
		formData: async () => new FormData(),
		text: async () => JSON.stringify(body),
		json: async () => body,
	} as unknown as Response;
};

const mockTryCatchChain = (promise: Promise<any>) => ({
	// biome-ignore lint/suspicious/noThenProperty: This is a deliberate mock of a PromiseLike object.
	then: (onfulfilled: any, onrejected: any) =>
		promise
			.then((data) => onfulfilled([undefined, data]))
			.catch((error) => onfulfilled([error, undefined])),
	andThen: vi.fn(),
	map: vi.fn(),
});

describe("GET function", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		NEXUM_CONFIG.serverUrl = "http://api.test.com";
		if (NEXUM_CONFIG.debug) {
			NEXUM_CONFIG.debug.emptyTagsWarning = true;
		}
		vi.mocked(tryCatch).mockImplementation(mockTryCatchChain as any);
	});

	it("should throw an error if serverUrl is not defined", async () => {
		NEXUM_CONFIG.serverUrl = undefined;
		await expect(GET("/test")).rejects.toThrowError(NotDefinedError);
	});

	it("should return data on successful fetch", async () => {
		const mockData = { message: "Success" };
		const mockApiResponse: ApiResponse<typeof mockData> = {
			data: mockData,
			status: 200,
			message: "OK",
		};
		const mockResponse = createMockResponse(mockApiResponse, {
			ok: true,
			status: 200,
			statusText: "OK",
		});

		vi.mocked(getHeaders).mockResolvedValue({
			"Content-Type": "application/json",
		});
		vi.mocked(fetch).mockResolvedValue(mockResponse);

		const result = await GET("/test");

		expect(result).toEqual(mockApiResponse);
		expect(fetch).toHaveBeenCalledWith(
			"http://api.test.com/test",
			expect.any(Object),
		);
	});

	it("should throw an error if getHeaders fails", async () => {
		const error = new Error("Header error");
		vi.mocked(getHeaders).mockRejectedValue(error);

		await expect(GET("/test")).rejects.toThrowError(error);
	});

	it("should handle fetch errors", async () => {
		const error = new Error("Network error");
		vi.mocked(getHeaders).mockResolvedValue({
			"Content-Type": "application/json",
		});
		vi.mocked(fetch).mockRejectedValue(error);

		const result = await GET("/test");

		expect(result).toEqual({
			data: undefined,
			message: "Network error",
			status: 500,
		});
		expect(logger.error).toHaveBeenCalledWith(
			"[GET] Error fetching data at: /test",
		);
	});

	it("should handle non-ok responses", async () => {
		const errorResponse = { message: "Not found", status: 404 };
		const mockResponse = createMockResponse(errorResponse, {
			ok: false,
			status: 404,
			statusText: "Not Found",
		});

		vi.mocked(getHeaders).mockResolvedValue({
			"Content-Type": "application/json",
		});
		vi.mocked(fetch).mockResolvedValue(mockResponse);

		const result = await GET("/test");

		expect(result).toEqual({
			data: undefined,
			message: "Not Found",
			status: 404,
		});
		expect(logger.error).toHaveBeenCalledWith(
			"[GET] Error fetching data at: /test [404]",
		);
	});

	it("should handle parsing errors for non-ok responses", async () => {
		const mockResponse = createMockResponse(null, {
			ok: false,
			status: 500,
			statusText: "Internal Server Error",
		});
		vi.spyOn(mockResponse, "json").mockRejectedValue(
			new Error("JSON parse error"),
		);

		vi.mocked(getHeaders).mockResolvedValue({
			"Content-Type": "application/json",
		});
		vi.mocked(fetch).mockResolvedValue(mockResponse);
		vi.mocked(parseErrorResponse).mockReturnValue({
			data: undefined,
			message: "Parse error",
			status: 500,
		});

		const result = await GET("/test");

		expect(result).toEqual({
			data: undefined,
			message: "Parse error",
			status: 500,
		});
		expect(parseErrorResponse).toHaveBeenCalled();
	});

	it("should return response payload on data if it is not an like an ApiResponse format", async () => {
		const mockResponse = createMockResponse(
			{ messageText: "Success", session: { user: "1" } },
			{
				ok: true,
				status: 200,
				statusText: "Ok",
			},
		);

		vi.mocked(getHeaders).mockResolvedValue({
			"Content-Type": "application/json",
		});
		vi.mocked(fetch).mockResolvedValue(mockResponse);

		const result = await GET("/test");

		expect(result).toEqual({
			data: { messageText: "Success", session: { user: "1" } },
			message: "Ok",
			status: 200,
		});
	});

	it("should handle parsing errors for ok responses", async () => {
		const mockResponse = createMockResponse(null, {
			ok: true,
			status: 200,
			statusText: "OK",
		});
		vi.spyOn(mockResponse, "json").mockRejectedValue(
			new Error("JSON parse error"),
		);

		vi.mocked(getHeaders).mockResolvedValue({
			"Content-Type": "application/json",
		});
		vi.mocked(fetch).mockResolvedValue(mockResponse);
		vi.mocked(parseErrorResponse).mockReturnValue({
			data: undefined,
			message: "Parse error",
			status: 500,
		});

		const result = await GET("/test");

		expect(result).toEqual({
			data: undefined,
			message: "Parse error",
			status: 500,
		});
		expect(logger.error).toHaveBeenCalledWith(
			"[GET] Error parsing response at: /test",
		);
		expect(parseErrorResponse).toHaveBeenCalled();
	});

	it("should log a warning if tags are missing and warning is enabled (dev)", async () => {
		const mockApiResponse = {
			data: { message: "Success" },
			status: 200,
			message: "OK",
		};
		const mockResponse = createMockResponse(mockApiResponse, {
			ok: true,
			status: 200,
			statusText: "OK",
		});

		vi.mocked(getHeaders).mockResolvedValue({
			"Content-Type": "application/json",
		});
		vi.mocked(fetch).mockResolvedValue(mockResponse);

		await GET("/test", { tags: [] });

		expect(logger.warn).toHaveBeenCalledWith(
			"[GET] Empty or missing tags array passed to GET request to http://api.test.com/test",
		);
	});

	it("should not log a warning if tags are missing and warning is disabled", async () => {
		if (NEXUM_CONFIG.debug) {
			NEXUM_CONFIG.debug.emptyTagsWarning = false;
		}
		const mockApiResponse = {
			data: { message: "Success" },
			status: 200,
			message: "OK",
		};
		const mockResponse = createMockResponse(mockApiResponse, {
			ok: true,
			status: 200,
			statusText: "OK",
		});

		vi.mocked(getHeaders).mockResolvedValue({});
		vi.mocked(fetch).mockResolvedValue(mockResponse);

		await GET("/test", { tags: [] });

		expect(logger.warn).not.toHaveBeenCalled();
	});

	it("should call fetch with the correct cache options", async () => {
		const mockApiResponse = {
			data: { message: "Success" },
			status: 200,
			message: "OK",
		};
		const mockResponse = createMockResponse(mockApiResponse, {
			ok: true,
			status: 200,
			statusText: "OK",
		});

		vi.mocked(getHeaders).mockResolvedValue({});
		vi.mocked(fetch).mockResolvedValue(mockResponse);

		await GET("/test", {
			tags: ["tag1"],
			revalidate: 3600,
			cache: "force-cache",
		});

		expect(fetch).toHaveBeenCalledWith(
			"http://api.test.com/test",
			expect.objectContaining({
				next: {
					tags: ["tag1"],
					revalidate: 3600,
				},
				cache: "force-cache",
			}),
		);
	});

	it("should call logger and cache analysis on successful fetch", async () => {
		const mockApiResponse = {
			data: { message: "Success" },
			status: 200,
			message: "OK",
		};
		const mockResponse = createMockResponse(mockApiResponse, {
			ok: true,
			status: 200,
			statusText: "OK",
		});

		vi.mocked(getHeaders).mockResolvedValue({});
		vi.mocked(fetch).mockResolvedValue(mockResponse);
		const mockCacheAnalysis: CacheAnalysis = {
			status: "HIT",
			confidence: 1,
			indicators: ["mocked"],
			metadata: {
				tags: [],
				duration: 1,
				strategy: "default",
			},
		};
		vi.mocked(analyzeCacheStatus).mockReturnValue(mockCacheAnalysis);

		await GET("/test");

		expect(logger.requestLog).toHaveBeenCalledWith({
			method: "GET",
			url: "/test",
			status: 200,
		});
		expect(analyzeCacheStatus).toHaveBeenCalled();
		expect(logger.cacheStatus).toHaveBeenCalledWith(
			mockCacheAnalysis,
			"/test",
			"GET",
		);
	});
});

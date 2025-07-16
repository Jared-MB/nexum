import { tryCatch } from "@kristall/try-catch";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ApiResponse } from "../../interfaces/server";
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
vi.mock("../../utils/isDev", () => ({ __IS__DEV__: true }));

// Mock global fetch and console
global.fetch = vi.fn();
vi.spyOn(console, "log").mockImplementation(() => {});

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
			message: "Not found",
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

	it.skip("should log a warning if tags are missing and warning is enabled (dev)", async () => {
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
});

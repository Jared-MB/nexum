import { tryCatch } from "@kristall/try-catch";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ApiResponse } from "../../interfaces/server";
import { NEXUM_CONFIG } from "../../utils/config";
import { NotDefinedError } from "../../utils/errors";
import { getHeaders } from "../../utils/headers";
import { logger } from "../../utils/logs";
import { parseErrorResponse } from "../../utils/responses";
import { revalidateCacheTags } from "../../utils/revalidation";
import { POST } from "../post";

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
vi.mock("../../utils/revalidation");

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
	then: (onfulfilled: any, _onrejected: any) =>
		promise
			.then((data) => onfulfilled([undefined, data]))
			.catch((error) => onfulfilled([error, undefined])),
	andThen: vi.fn(),
	map: vi.fn(),
});

describe("POST function", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		NEXUM_CONFIG.serverUrl = "http://api.test.com";
		vi.mocked(tryCatch).mockImplementation(mockTryCatchChain as any);
	});

	it("should throw an error if serverUrl is not defined", async () => {
		NEXUM_CONFIG.serverUrl = undefined;
		await expect(POST("/test", { a: 1 })).rejects.toThrowError(NotDefinedError);
	});

	it("should return data on successful fetch (ApiResponse)", async () => {
		const body = { name: "X" };
		const mockApiResponse: ApiResponse<typeof body> = {
			data: body,
			status: 201,
			message: "Created",
		};
		const mockResponse = createMockResponse(mockApiResponse, {
			ok: true,
			status: 201,
			statusText: "Created",
		});

		vi.mocked(getHeaders).mockResolvedValue({
			"Content-Type": "application/json",
		});
		vi.mocked(fetch).mockResolvedValue(mockResponse);

		const result = await POST("/test", body);

		expect(result).toEqual(mockApiResponse);
		expect(fetch).toHaveBeenCalledWith(
			"http://api.test.com/test",
			expect.objectContaining({
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(body),
			}),
		);
		expect(logger.requestLog).toHaveBeenCalledWith({
			method: "POST",
			url: "/test",
			status: 201,
		});
	});

	it("should throw an error if getHeaders fails", async () => {
		const error = new Error("Header error");
		vi.mocked(getHeaders).mockRejectedValue(error);

		await expect(POST("/test", { foo: "bar" })).rejects.toThrowError(error);
	});

	it("should handle fetch errors", async () => {
		const error = new Error("Network error");
		vi.mocked(getHeaders).mockResolvedValue({
			"Content-Type": "application/json",
		});
		vi.mocked(fetch).mockRejectedValue(error);

		const result = await POST("/test", { foo: "bar" });

		expect(result).toEqual({
			data: undefined,
			message: "Network error",
			status: 500,
		});
		expect(logger.error).toHaveBeenCalledWith(
			"[POST] Error pushing data at: /test",
		);
	});

	it("should handle non-ok responses and use statusText and status", async () => {
		const errorResponse = { message: "Not found", status: 404 };
		const mockResponse = createMockResponse(errorResponse, {
			ok: false,
			status: 404,
			statusText: "Not Found",
		});

		vi.mocked(getHeaders).mockResolvedValue({});
		vi.mocked(fetch).mockResolvedValue(mockResponse);

		const result = await POST("/test", {});

		expect(result).toEqual({
			data: undefined,
			message: "Not Found",
			status: 404,
		});
		expect(logger.error).toHaveBeenCalledWith(
			"[POST] Error pushing data at: /test [404]",
		);
	});

	it("should prefer ApiResponse message/status for non-ok responses when available", async () => {
		const apiResponse: ApiResponse<null> = {
			data: null,
			status: 422,
			message: "Unprocessable",
		};
		const mockResponse = createMockResponse(apiResponse, {
			ok: false,
			status: 422,
			statusText: "Unprocessable Entity",
		});

		vi.mocked(getHeaders).mockResolvedValue({});
		vi.mocked(fetch).mockResolvedValue(mockResponse);

		const result = await POST("/test", {});

		expect(result).toEqual({
			data: undefined,
			message: "Unprocessable",
			status: 422,
		});
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

		vi.mocked(getHeaders).mockResolvedValue({});
		vi.mocked(fetch).mockResolvedValue(mockResponse);
		vi.mocked(parseErrorResponse).mockReturnValue({
			data: undefined,
			message: "Parse error",
			status: 500,
		});

		const result = await POST("/test", {});

		expect(result).toEqual({
			data: undefined,
			message: "Parse error",
			status: 500,
		});
		expect(logger.error).toHaveBeenCalledWith(
			"[POST] Error parsing response at: /test",
		);
		expect(parseErrorResponse).toHaveBeenCalled();
	});

	it("should return response payload on data if it is not an ApiResponse format (ok)", async () => {
		const mockResponse = createMockResponse(
			{ messageText: "Success", session: { user: "1" } },
			{
				ok: true,
				status: 200,
				statusText: "OK",
			},
		);

		vi.mocked(getHeaders).mockResolvedValue({});
		vi.mocked(fetch).mockResolvedValue(mockResponse);

		const result = await POST("/test", {});

		expect(result).toEqual({
			data: { messageText: "Success", session: { user: "1" } },
			message: "OK",
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

		vi.mocked(getHeaders).mockResolvedValue({});
		vi.mocked(fetch).mockResolvedValue(mockResponse);
		vi.mocked(parseErrorResponse).mockReturnValue({
			data: undefined,
			message: "Parse error",
			status: 500,
		});

		const result = await POST("/test", {});

		expect(result).toEqual({
			data: undefined,
			message: "Parse error",
			status: 500,
		});
		expect(logger.error).toHaveBeenCalledWith(
			"[POST] Error parsing response at: /test",
		);
		expect(parseErrorResponse).toHaveBeenCalled();
	});

	it("should send FormData as body without stringifying", async () => {
		const fd = new FormData();
		fd.append("file", new Blob(["abc"]), "file.txt");

		const mockApiResponse: ApiResponse<any> = {
			data: { ok: true },
			status: 201,
			message: "Created",
		};
		const mockResponse = createMockResponse(mockApiResponse, {
			ok: true,
			status: 201,
			statusText: "Created",
		});

		vi.mocked(getHeaders).mockResolvedValue({});
		vi.mocked(fetch).mockResolvedValue(mockResponse);

		await POST("/upload", fd);

		expect(fetch).toHaveBeenCalledWith(
			"http://api.test.com/upload",
			expect.objectContaining({
				method: "POST",
				body: fd,
			}),
		);
	});

	it("should call revalidateCacheTags with provided tags and options on success", async () => {
		const mockApiResponse = {
			data: { ok: true },
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

		const revalidateFn = vi.fn();
		const options = {
			revalidateTags: ["a", "b"],
			profile: "default",
			revalidateFunction: revalidateFn,
		} as const;

		await POST("/test", {}, options as any);

		expect(revalidateCacheTags).toHaveBeenCalledWith(options.revalidateTags, {
			url: "/test",
			profile: options.profile,
			revalidateFunction: options.revalidateFunction,
		});
	});
});

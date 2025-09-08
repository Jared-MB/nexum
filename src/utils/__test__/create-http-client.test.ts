import { beforeEach, describe, expect, it, vi } from "vitest";
import { createHttpClient } from "../create-http-client";
import { NotDefinedError } from "../errors";

// Mock the HTTP methods
vi.mock("../../http/get", () => ({
	GET: vi.fn(),
}));
vi.mock("../../http/post", () => ({
	POST: vi.fn(),
}));
vi.mock("../../http/put", () => ({
	PUT: vi.fn(),
}));
vi.mock("../../http/delete", () => ({
	DELETE: vi.fn(),
}));
vi.mock("../../http/patch", () => ({
	PATCH: vi.fn(),
}));

import { DELETE as DELETE_METHOD } from "../../http/delete";
// Import the mocked modules after mocking
import { GET as GET_METHOD } from "../../http/get";
import { PATCH as PATCH_METHOD } from "../../http/patch";
import { POST as POST_METHOD } from "../../http/post";
import { PUT as PUT_METHOD } from "../../http/put";

describe("createHttpClient", () => {
	const mockServerUrl = "https://api.example.com";
	const mockUrl = "/test-endpoint" as const;
	const mockOptions = { headers: { "X-Test": "test" } };
	const mockResponse = {
		data: "test data",
		message: "test message",
		status: 200,
	};
	const mockBody = { test: "test" };

	beforeEach(() => {
		vi.clearAllMocks();

		// Reset all mock implementations
		vi.mocked(GET_METHOD).mockResolvedValue(mockResponse);
		vi.mocked(POST_METHOD).mockResolvedValue(mockResponse);
		vi.mocked(PUT_METHOD).mockResolvedValue(mockResponse);
		vi.mocked(DELETE_METHOD).mockResolvedValue(mockResponse);
		vi.mocked(PATCH_METHOD).mockResolvedValue(mockResponse);
	});

	it("should throw NotDefinedError when serverUrl is not provided", () => {
		// @ts-expect-error: Testing invalid input
		expect(() => createHttpClient({})).toThrow(NotDefinedError);
		expect(() => createHttpClient({ serverUrl: "" })).toThrow(NotDefinedError);
		// @ts-expect-error: Testing invalid input
		expect(() => createHttpClient({ serverUrl: 123 })).toThrow(NotDefinedError);
	});

	it("should create an HTTP client with all HTTP methods", () => {
		const client = createHttpClient({ serverUrl: mockServerUrl });

		expect(client).toHaveProperty("GET");
		expect(client).toHaveProperty("POST");
		expect(client).toHaveProperty("PUT");
		expect(client).toHaveProperty("DELETE");
		expect(client).toHaveProperty("PATCH");
	});

	it("should call GET with the correct parameters", async () => {
		const client = createHttpClient({ serverUrl: mockServerUrl });
		await client.GET(mockUrl, mockOptions);

		expect(GET_METHOD).toHaveBeenCalledWith(mockUrl, {
			...mockOptions,
			serverUrl: mockServerUrl,
		});
	});

	it("should call POST with the correct parameters", async () => {
		const client = createHttpClient({ serverUrl: mockServerUrl });
		await client.POST(mockUrl, mockBody, mockOptions);

		expect(POST_METHOD).toHaveBeenCalledWith(mockUrl, mockBody, {
			...mockOptions,
			serverUrl: mockServerUrl,
		});
	});

	it("should call PUT with the correct parameters", async () => {
		const client = createHttpClient({ serverUrl: mockServerUrl });
		await client.PUT(mockUrl, mockBody, mockOptions);

		expect(PUT_METHOD).toHaveBeenCalledWith(mockUrl, mockBody, {
			...mockOptions,
			serverUrl: mockServerUrl,
		});
	});

	it("should call DELETE with the correct parameters", async () => {
		const client = createHttpClient({ serverUrl: mockServerUrl });
		await client.DELETE(mockUrl, mockBody, mockOptions);

		expect(DELETE_METHOD).toHaveBeenCalledWith(mockUrl, mockBody, {
			...mockOptions,
			serverUrl: mockServerUrl,
		});
	});

	it("should call PATCH with the correct parameters", async () => {
		const client = createHttpClient({ serverUrl: mockServerUrl });
		await client.PATCH(mockUrl, mockBody, mockOptions);

		expect(PATCH_METHOD).toHaveBeenCalledWith(mockUrl, mockBody, {
			...mockOptions,
			serverUrl: mockServerUrl,
		});
	});

	it("should override serverUrl from options if provided", async () => {
		const customServerUrl = "https://custom-api.example.com";
		const client = createHttpClient({ serverUrl: mockServerUrl });

		// Call with custom serverUrl in options
		await client.GET(mockUrl, { ...mockOptions, serverUrl: customServerUrl });

		// The custom serverUrl should be overridden by the one from createHttpClient
		expect(GET_METHOD).toHaveBeenCalledWith(mockUrl, {
			...mockOptions,
			serverUrl: mockServerUrl, // Should use the one from createHttpClient
		});
	});

	it("should pass through the response from the HTTP methods", async () => {
		const client = createHttpClient({ serverUrl: mockServerUrl });
		const response = await client.GET(mockUrl);

		expect(response).toBe(mockResponse);
	});
});

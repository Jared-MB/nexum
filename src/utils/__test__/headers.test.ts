import { beforeEach, describe, expect, it, vi } from "vitest";
import { NEXUM_CONFIG } from "../config";
import { getSessionCookie } from "../cookies";
import { getHeaders } from "../headers";

// Mock the config and cookies modules
vi.mock("../config", () => ({
	NEXUM_CONFIG: {
		defaultAuthRequests: true,
		sessionCookieName: "test-session",
		tokenVerb: "Bearer",
	},
}));

vi.mock("../cookies", () => ({
	getSessionCookie: vi.fn(),
}));

describe("getHeaders", () => {
	const mockToken = "test-token-123";

	beforeEach(() => {
		vi.clearAllMocks();
		// Reset config to default values
		NEXUM_CONFIG.defaultAuthRequests = true;
		NEXUM_CONFIG.sessionCookieName = "test-session";
		NEXUM_CONFIG.tokenVerb = "Bearer";
	});

	it("should return headers with content type when no auth is required", async () => {
		const result = await getHeaders({ auth: false });

		expect(result).toEqual({
			"Content-Type": "application/json",
		});
		expect(getSessionCookie).not.toHaveBeenCalled();
	});

	it("should include custom headers when provided", async () => {
		const customHeaders = { "X-Custom-Header": "value" };
		const result = await getHeaders({ auth: false, customHeaders });

		expect(result).toEqual({
			"Content-Type": "application/json",
			"X-Custom-Header": "value",
		});
	});

	it("should include authorization header when auth is required and token exists", async () => {
		vi.mocked(getSessionCookie).mockResolvedValueOnce(mockToken);

		const result = await getHeaders({ auth: true });

		expect(getSessionCookie).toHaveBeenCalledWith("test-session");
		expect(result).toEqual({
			"Content-Type": "application/json",
			Authorization: "Bearer test-token-123",
			Cookie: "test-session=test-token-123",
		});
	});

	it("should throw error when auth is required but sessionCookieName is not defined", async () => {
		NEXUM_CONFIG.sessionCookieName = undefined as any;

		await expect(getHeaders({ auth: true })).rejects.toThrow(
			"Session cookie name is not defined",
		);
	});

	it("should throw error when auth is required but token is not available", async () => {
		vi.mocked(getSessionCookie).mockResolvedValueOnce(undefined);

		await expect(getHeaders({ auth: true })).rejects.toThrow(
			"Access token is not defined",
		);
	});

	it("should use defaultAuthRequests when auth is not explicitly provided", async () => {
		vi.mocked(getSessionCookie).mockResolvedValueOnce(mockToken);
		NEXUM_CONFIG.defaultAuthRequests = true;

		await getHeaders({});

		expect(getSessionCookie).toHaveBeenCalled();
	});

	it("should use custom token verb from config", async () => {
		NEXUM_CONFIG.tokenVerb = "Token";
		vi.mocked(getSessionCookie).mockResolvedValueOnce(mockToken);

		const result = await getHeaders({ auth: true });

		expect(result).toMatchObject({
			Authorization: "Token test-token-123",
		});
	});

	it("should merge custom headers with auth headers", async () => {
		vi.mocked(getSessionCookie).mockResolvedValueOnce(mockToken);
		const customHeaders = { "X-Request-ID": "12345" };

		const result = await getHeaders({ auth: true, customHeaders });

		expect(result).toMatchObject({
			"Content-Type": "application/json",
			Authorization: "Bearer test-token-123",
			Cookie: "test-session=test-token-123",
			"X-Request-ID": "12345",
		});
	});

	it("should return headers without content type when body is FormData", async () => {
		const result = await getHeaders({
			auth: false,
			__asFormData__: true,
			customHeaders: {
				"X-Request-ID": "12345",
			},
		});

		expect(result).toEqual({
			"X-Request-ID": "12345",
		});

		expect(result).not.toHaveProperty("Content-Type");
	});
});

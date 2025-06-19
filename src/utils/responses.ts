import type { ApiResponse } from "../interfaces/server";

export const parseErrorResponse = <T>(): ApiResponse<T> => ({
	data: undefined,
	message: "Error parsing response",
	status: 500,
});

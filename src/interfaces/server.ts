export interface ApiResponse<T> {
	message: string;
	status: number;
	data: T | undefined;
}

export class NotDefinedError extends Error {
	constructor({ message, solution }: { message: string; solution?: string }) {
		super(`${message}. ${solution}`);
	}
}

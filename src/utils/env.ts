export const __IS__DEV__ = process.env.NODE_ENV === "development";
export const __IS__NEXT__BUILDING__ =
	process.env?.NEXT_PHASE === "phase-production-build";

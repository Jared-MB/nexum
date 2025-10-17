import type { CacheAnalysis } from "../interfaces/cache.js";

import chalk from "chalk";
import pino from "pino";
import pinoPretty from "pino-pretty";

import { HTTP } from "../interfaces/methods";
import { NEXUM_CONFIG } from "./config";
import { __IS__DEV__ } from "./env";

const stream = pinoPretty({
	colorize: true,
});

const pinoLogger = pino(stream);

interface RequestLog {
	method: HTTP;
	url: string;
	status: number;
}

export class NexumLogger {
	private readonly NEXUM_COLOR = chalk.hex("#a855f7");
	private readonly NEXUM_LOGO = this.NEXUM_COLOR("[NEXUM] ");

	private RED_LOG = chalk.red;
	private GREEN_LOG = chalk.green;
	private YELLOW_LOG = chalk.yellow;
	private BLUE_LOG = chalk.blue;

	public requestLog({ method, url, status }: RequestLog) {
		if (!__IS__DEV__) {
			return;
		}

		const message = `[${method}] ${url} [${status}]`;

		if (method === HTTP.GET) {
			pinoLogger.info(this.NEXUM_LOGO + this.BLUE_LOG(message));
			return;
		}
		if (method === HTTP.POST) {
			pinoLogger.info(this.NEXUM_LOGO + this.GREEN_LOG(message));
			return;
		}
		if (method === HTTP.PUT) {
			pinoLogger.info(this.NEXUM_LOGO + this.YELLOW_LOG(message));
			return;
		}
		if (method === HTTP.PATCH) {
			pinoLogger.info(this.NEXUM_LOGO + chalk.magenta(message));
			return;
		}
		if (method === HTTP.DELETE) {
			pinoLogger.info(this.NEXUM_LOGO + this.RED_LOG(message));
		}
	}

	public log(message: string, ...args: any[]) {
		pinoLogger.info(this.NEXUM_LOGO + message, ...args);
	}

	public error(message: string, ...args: any[]) {
		pinoLogger.error(this.NEXUM_LOGO + chalk.red(message, ...args));
	}

	public warn(message: string, ...args: any[]) {
		pinoLogger.warn(this.NEXUM_LOGO + chalk.yellow(message, ...args));
	}

	public cacheStatus(analysis: CacheAnalysis, url: string, method: string) {
		if (!NEXUM_CONFIG?.debug?.cacheLogging) return;

		const status = {
			HIT: this.GREEN_LOG,
			MISS: this.RED_LOG,
			STALE: this.YELLOW_LOG,
			REVALIDATED: this.BLUE_LOG,
		};

		const cacheStatusColor = status[analysis.status];

		pinoLogger.info(
			`${this.NEXUM_LOGO}[CACHE] ${cacheStatusColor(
				`[${analysis.status}]`,
			)}: ${method} ${url} (${analysis.metadata.duration}ms)`,
		);

		analysis.metadata.tags.length > 0 &&
			pinoLogger.info(
				`\t\t\t   | Tags: [${analysis.metadata.tags.join(", ")}]`,
			);

		NEXUM_CONFIG?.debug?.cacheLogging?.showCacheConfidence &&
			pinoLogger.info(
				`\t\t\t   | Confidence: (${Math.round(analysis.confidence * 100)}%)`,
			);

		if (
			NEXUM_CONFIG?.debug?.cacheLogging?.showCacheStrategy &&
			analysis.metadata.strategy
		) {
			pinoLogger.info(`\t\t\t   | Strategy: ${analysis.metadata.strategy}`);
		}

		if (
			NEXUM_CONFIG?.debug?.cacheLogging?.showCacheIndicators &&
			analysis.indicators.length > 0
		) {
			pinoLogger.info(
				`\t\t\t   | Indicators: ${analysis.indicators.join(", ")}`,
			);
		}
	}
}

export const logger = new NexumLogger();

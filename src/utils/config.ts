import type { NexumConfig } from "../interfaces/config.js";

import { cosmiconfig } from "cosmiconfig";
import { TypeScriptLoader } from "cosmiconfig-typescript-loader";

import { __DEFAULT_CONFIG__ } from "../constants/config";

const __MODULE_NAME__ = "nexum";

let configCache: NexumConfig | null = null;
let configPromise: Promise<NexumConfig> | null = null;

async function loadConfig(): Promise<NexumConfig> {
	if (configCache) {
		return configCache;
	}

	// Si ya hay una promesa de carga en curso, esperar a que termine
	if (configPromise) {
		return configPromise;
	}

	configPromise = (async (): Promise<NexumConfig> => {
		try {
			const explorer = cosmiconfig(__MODULE_NAME__, {
				searchPlaces: [
					`${__MODULE_NAME__}.config.ts`,
					`${__MODULE_NAME__}.config.js`,
					`${__MODULE_NAME__}.config.json`,
					`.${__MODULE_NAME__}rc`,
					`.${__MODULE_NAME__}rc.json`,
					`.${__MODULE_NAME__}rc.js`,
					`.${__MODULE_NAME__}rc.ts`,
				],
				loaders: {
					".ts": TypeScriptLoader(),
				},
			});

			const result = await explorer.search();

			let finalConfig: NexumConfig;

			if (result?.config) {
				finalConfig = mergeDeepConfig(__DEFAULT_CONFIG__, result.config);
			} else {
				finalConfig = __DEFAULT_CONFIG__;
			}

			configCache = finalConfig;
			return finalConfig;
		} catch (error: unknown) {
			const errorMessage =
				error instanceof Error ? error.message : String(error);
			console.warn(
				`Warning: Error loading ${__MODULE_NAME__} configuration: ${errorMessage}. Using default configuration.`,
			);

			configCache = __DEFAULT_CONFIG__;
			return __DEFAULT_CONFIG__;
		} finally {
			configPromise = null;
		}
	})();

	return configPromise;
}

function mergeDeepConfig(
	defaultConfig: NexumConfig,
	userConfig: Partial<NexumConfig>,
): NexumConfig {
	const result = { ...defaultConfig };

	for (const key in userConfig) {
		const userValue = userConfig[key as keyof NexumConfig];
		const defaultValue = defaultConfig[key as keyof NexumConfig];

		if (userValue !== undefined) {
			if (
				typeof userValue === "object" &&
				userValue !== null &&
				!Array.isArray(userValue) &&
				typeof defaultValue === "object" &&
				defaultValue !== null &&
				!Array.isArray(defaultValue)
			) {
				// Merge profundo para objetos anidados
				(result as any)[key] = { ...defaultValue, ...userValue };
			} else {
				// Sobrescribir directamente para valores primitivos y arrays
				(result as any)[key] = userValue;
			}
		}
	}

	return result;
}

export function getConfig(): NexumConfig {
	return configCache || __DEFAULT_CONFIG__;
}

// Función para obtener la configuración de forma asíncrona (garantiza carga completa)
export async function getConfigAsync(): Promise<NexumConfig> {
	return await loadConfig();
}

// Función para recargar la configuración
export async function reloadConfig(): Promise<NexumConfig> {
	configCache = null;
	configPromise = null;
	return await loadConfig();
}

// Función para verificar si la configuración está cargada
export function isConfigLoaded(): boolean {
	return configCache !== null;
}

// Inicializar la carga de configuración de forma asíncrona
const initPromise = loadConfig();

// Exportar la configuración - se inicializa automáticamente
export const NEXUM_CONFIG = new Proxy({} as NexumConfig, {
	get(target, prop) {
		const config = getConfig();
		return config[prop as keyof NexumConfig];
	},
	set(target, prop, value) {
		// Prevenir modificaciones directas
		console.warn(
			`Cannot modify NEXUM_CONFIG.${String(
				prop,
			)} directly. Use reloadConfig() to update configuration.`,
		);
		return false;
	},
	ownKeys(target) {
		const config = getConfig();
		return Reflect.ownKeys(config);
	},
	has(target, prop) {
		const config = getConfig();
		return prop in config;
	},
	getOwnPropertyDescriptor(target, prop) {
		const config = getConfig();
		return Reflect.getOwnPropertyDescriptor(config, prop);
	},
});

export const CONFIG_READY = initPromise;

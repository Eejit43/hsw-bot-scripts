import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';

/**
 * Caches data to a JSON file in the "cache" directory, and returns the data that was cached.
 * @param cacheName The name of the cache (without file extension).
 * @param cacheData The data to cache, which will be serialized to JSON.
 */
export function cacheData<CacheData>(cacheName: string, cacheData: CacheData): CacheData {
    const cacheFilePath = `./cache/${cacheName}.json`;

    mkdirSync('./cache', { recursive: true });

    writeFileSync(cacheFilePath, JSON.stringify(cacheData), 'utf8');

    return cacheData;
}

/**
 * Retrieves cached data from a JSON file in the "cache" directory.
 * @param cacheName The name of the cache to retrieve (without file extension).
 * @returns The cached data, or null if the cache file does not exist.
 */
// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters
export function getCache<CacheData>(cacheName: string): CacheData | null {
    const cacheFilePath = `./cache/${cacheName}.json`;

    if (existsSync(cacheFilePath)) {
        const data = readFileSync(cacheFilePath, 'utf8');
        return JSON.parse(data) as CacheData;
    }

    return null;
}

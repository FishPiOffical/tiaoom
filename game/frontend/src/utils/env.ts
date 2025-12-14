/**
 * @description: Is it a development mode
 */
export function isDevMode(): boolean {
  return import.meta.env.DEV;
}

/**
 * @description: Is it a production mode
 */
export function isProdMode(): boolean {
  return import.meta.env.PROD;
}

declare const __APP_VERSION__: string;
/** Versión de la app (de desktop/package.json). Las 0.x son betas; 1.0.0 = lanzamiento oficial. */
export const APP_VERSION: string = __APP_VERSION__;
export const IS_BETA = /^0\./.test(APP_VERSION);
export const VERSION_LABEL = IS_BETA ? `Beta ${APP_VERSION}` : APP_VERSION;
export const APP_TITLE = `AndromedaVideoCut · ${VERSION_LABEL}`;

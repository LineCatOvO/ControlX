/**
 * Auth module index
 *
 * Centralized export of authentication module components
 * Includes AuthManager class, interfaces, and default instance
 */

export {
    AuthManager,
    authManager,
    DEFAULT_CONFIG
} from './auth';

export type {
    AuthConfig,
    AuthResult,
    TokenInfo
} from './auth';

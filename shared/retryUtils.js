"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RETRY_CONFIGS = exports.DEFAULT_RETRY_CONFIG = void 0;
exports.withRetry = withRetry;
exports.Retry = Retry;
exports.DEFAULT_RETRY_CONFIG = {
    maxAttempts: 3,
    baseDelay: 1000,
    maxDelay: 10000,
    backoffFactor: 2,
    retryCondition: (error) => {
        if (typeof window !== 'undefined') {
            if (!error.response) {
                return true;
            }
            const status = error.response.status;
            return status >= 500 || status === 408 || status === 429;
        }
        else {
            return (error.code === 'ECONNRESET' ||
                error.code === 'ENOTFOUND' ||
                error.code === 'ECONNREFUSED' ||
                error.code === 'ETIMEDOUT' ||
                (error.response && error.response.status >= 500));
        }
    }
};
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
function calculateDelay(attempt, config) {
    const exponentialDelay = config.baseDelay * Math.pow(config.backoffFactor, attempt - 1);
    const jitter = Math.random() * 0.1 * exponentialDelay;
    const delay = Math.min(exponentialDelay + jitter, config.maxDelay);
    return Math.floor(delay);
}
async function withRetry(operation, config = {}) {
    const finalConfig = { ...exports.DEFAULT_RETRY_CONFIG, ...config };
    let lastError;
    for (let attempt = 1; attempt <= finalConfig.maxAttempts; attempt++) {
        try {
            return await operation();
        }
        catch (error) {
            lastError = error;
            if (!finalConfig.retryCondition || !finalConfig.retryCondition(error)) {
                throw error;
            }
            if (attempt === finalConfig.maxAttempts) {
                break;
            }
            const delay = calculateDelay(attempt, finalConfig);
            console.warn(`Operation failed (attempt ${attempt}/${finalConfig.maxAttempts}), retrying in ${delay}ms:`, error.message);
            await sleep(delay);
        }
    }
    throw lastError;
}
exports.RETRY_CONFIGS = {
    api: {
        maxAttempts: 3,
        baseDelay: 1000,
        maxDelay: 8000,
        backoffFactor: 2,
        retryCondition: (error) => {
            if (typeof window !== 'undefined') {
                if (!error.response)
                    return true;
                const status = error.response.status;
                return status >= 500 || status === 408 || status === 429;
            }
            else {
                return (error.code === 'ECONNRESET' ||
                    error.code === 'ENOTFOUND' ||
                    error.code === 'ETIMEDOUT' ||
                    (error.response && error.response.status >= 500));
            }
        }
    },
    email: {
        maxAttempts: 3,
        baseDelay: 2000,
        maxDelay: 15000,
        backoffFactor: 2,
        retryCondition: (error) => {
            return (error.code === 'ECONNRESET' ||
                error.code === 'ENOTFOUND' ||
                error.code === 'ETIMEDOUT' ||
                error.responseCode === 421 ||
                error.responseCode === 450 ||
                error.responseCode === 451);
        }
    },
    database: {
        maxAttempts: 2,
        baseDelay: 500,
        maxDelay: 2000,
        backoffFactor: 2,
        retryCondition: (error) => {
            return (error.code === 'SQLITE_BUSY' ||
                error.code === 'SQLITE_LOCKED');
        }
    },
    fileOperation: {
        maxAttempts: 3,
        baseDelay: 1000,
        maxDelay: 5000,
        backoffFactor: 1.5,
        retryCondition: (error) => {
            return (error.code === 'EBUSY' ||
                error.code === 'EMFILE' ||
                error.code === 'ENFILE' ||
                error.code === 'EACCES');
        }
    },
    fileUpload: {
        maxAttempts: 2,
        baseDelay: 2000,
        maxDelay: 10000,
        backoffFactor: 2,
        retryCondition: (error) => {
            if (!error.response)
                return true;
            const status = error.response.status;
            return status >= 500;
        }
    }
};
function Retry(config = {}) {
    return function (_target, _propertyName, descriptor) {
        const method = descriptor.value;
        descriptor.value = async function (...args) {
            return withRetry(() => method.apply(this, args), config);
        };
    };
}

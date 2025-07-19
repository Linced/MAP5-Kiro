"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ERROR_MESSAGES = exports.ErrorCodes = void 0;
var ErrorCodes;
(function (ErrorCodes) {
    ErrorCodes["INVALID_CREDENTIALS"] = "INVALID_CREDENTIALS";
    ErrorCodes["TOKEN_EXPIRED"] = "TOKEN_EXPIRED";
    ErrorCodes["TOKEN_INVALID"] = "TOKEN_INVALID";
    ErrorCodes["EMAIL_NOT_VERIFIED"] = "EMAIL_NOT_VERIFIED";
    ErrorCodes["USER_NOT_FOUND"] = "USER_NOT_FOUND";
    ErrorCodes["EMAIL_ALREADY_EXISTS"] = "EMAIL_ALREADY_EXISTS";
    ErrorCodes["VALIDATION_ERROR"] = "VALIDATION_ERROR";
    ErrorCodes["INVALID_INPUT"] = "INVALID_INPUT";
    ErrorCodes["MISSING_REQUIRED_FIELD"] = "MISSING_REQUIRED_FIELD";
    ErrorCodes["FILE_TOO_LARGE"] = "FILE_TOO_LARGE";
    ErrorCodes["INVALID_FILE_TYPE"] = "INVALID_FILE_TYPE";
    ErrorCodes["FILE_UPLOAD_FAILED"] = "FILE_UPLOAD_FAILED";
    ErrorCodes["CSV_PARSE_ERROR"] = "CSV_PARSE_ERROR";
    ErrorCodes["DATABASE_ERROR"] = "DATABASE_ERROR";
    ErrorCodes["RECORD_NOT_FOUND"] = "RECORD_NOT_FOUND";
    ErrorCodes["DUPLICATE_ENTRY"] = "DUPLICATE_ENTRY";
    ErrorCodes["FOREIGN_KEY_CONSTRAINT"] = "FOREIGN_KEY_CONSTRAINT";
    ErrorCodes["INSUFFICIENT_PERMISSIONS"] = "INSUFFICIENT_PERMISSIONS";
    ErrorCodes["RESOURCE_NOT_FOUND"] = "RESOURCE_NOT_FOUND";
    ErrorCodes["OPERATION_NOT_ALLOWED"] = "OPERATION_NOT_ALLOWED";
    ErrorCodes["INTERNAL_SERVER_ERROR"] = "INTERNAL_SERVER_ERROR";
    ErrorCodes["SERVICE_UNAVAILABLE"] = "SERVICE_UNAVAILABLE";
    ErrorCodes["NETWORK_ERROR"] = "NETWORK_ERROR";
    ErrorCodes["TIMEOUT_ERROR"] = "TIMEOUT_ERROR";
    ErrorCodes["CONNECTION_ERROR"] = "CONNECTION_ERROR";
    ErrorCodes["RATE_LIMIT_EXCEEDED"] = "RATE_LIMIT_EXCEEDED";
    ErrorCodes["EMAIL_SEND_FAILED"] = "EMAIL_SEND_FAILED";
    ErrorCodes["EMAIL_SERVICE_UNAVAILABLE"] = "EMAIL_SERVICE_UNAVAILABLE";
    ErrorCodes["COMPONENT_ERROR"] = "COMPONENT_ERROR";
    ErrorCodes["RENDER_ERROR"] = "RENDER_ERROR";
})(ErrorCodes || (exports.ErrorCodes = ErrorCodes = {}));
exports.ERROR_MESSAGES = {
    [ErrorCodes.NETWORK_ERROR]: 'Unable to connect to the server. Please check your internet connection and try again.',
    [ErrorCodes.TIMEOUT_ERROR]: 'The request took too long to complete. Please try again.',
    [ErrorCodes.CONNECTION_ERROR]: 'Connection lost. Please check your internet connection.',
    [ErrorCodes.INVALID_CREDENTIALS]: 'Invalid email or password. Please check your credentials and try again.',
    [ErrorCodes.EMAIL_NOT_VERIFIED]: 'Please verify your email address before logging in.',
    [ErrorCodes.EMAIL_ALREADY_EXISTS]: 'An account with this email already exists.',
    [ErrorCodes.FILE_TOO_LARGE]: 'The file is too large. Please select a file smaller than 10MB.',
    [ErrorCodes.INVALID_FILE_TYPE]: 'Invalid file type. Please select a CSV file.',
    [ErrorCodes.CSV_PARSE_ERROR]: 'Unable to parse the CSV file. Please check the file format and try again.',
    [ErrorCodes.VALIDATION_ERROR]: 'Please check your input and try again.',
    [ErrorCodes.RATE_LIMIT_EXCEEDED]: 'Too many requests. Please wait a moment and try again.',
    [ErrorCodes.SERVICE_UNAVAILABLE]: 'The service is temporarily unavailable. Please try again later.',
    [ErrorCodes.INTERNAL_SERVER_ERROR]: 'Something went wrong on our end. Please try again later.'
};

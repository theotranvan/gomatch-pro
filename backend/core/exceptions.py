"""
Custom exception handler for GoMatch API.
Returns a consistent JSON format:
{
    "error": "Human-readable message",
    "code": "ERROR_CODE",
    "details": {}
}
"""

from rest_framework.views import exception_handler
from rest_framework import exceptions, status


def custom_exception_handler(exc, context):
    """
    Override DRF's default exception handler to return a uniform
    JSON error envelope for all API errors.
    """
    response = exception_handler(exc, context)

    if response is None:
        return None

    # --- Map exception types to error codes ---
    code_map = {
        exceptions.ValidationError: "VALIDATION_ERROR",
        exceptions.NotFound: "NOT_FOUND",
        exceptions.PermissionDenied: "PERMISSION_DENIED",
        exceptions.NotAuthenticated: "NOT_AUTHENTICATED",
        exceptions.AuthenticationFailed: "AUTHENTICATION_FAILED",
        exceptions.MethodNotAllowed: "METHOD_NOT_ALLOWED",
        exceptions.Throttled: "THROTTLED",
    }

    error_code = code_map.get(type(exc), "ERROR")

    # Build the details dict from the original response data
    original = response.data

    if isinstance(exc, exceptions.ValidationError):
        # ValidationError → keep field-level details
        if isinstance(original, dict):
            message = "Validation failed."
            details = original
        elif isinstance(original, list):
            message = original[0] if original else "Validation failed."
            details = {"non_field_errors": original}
        else:
            message = str(original)
            details = {}
    else:
        # Other exceptions → single message
        message = original.get("detail", str(exc)) if isinstance(original, dict) else str(exc)
        details = {}

    response.data = {
        "error": message,
        "code": error_code,
        "details": details,
    }

    return response

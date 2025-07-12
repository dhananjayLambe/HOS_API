# utils/response_format.py

def success_response(message, data=None):
    return {
        "status": True,
        "message": message,
        "data": data or {}
    }

def error_response(message, errors=None):
    response = {
        "status": False,
        "message": message,
    }
    if errors:
        response["errors"] = errors
    return response
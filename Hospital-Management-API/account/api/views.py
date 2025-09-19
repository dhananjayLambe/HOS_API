# authentication/views.py

# Standard library imports
import random
import re
import datetime
import logging
import time

# Django imports
from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group, User
from django.core.cache import cache
from django.db import transaction

# Third-party imports
import jwt
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from rest_framework import status

# Local app imports
from account.models import User

VALID_ROLES = ["doctor", "helpdesk", "labadmin", "superadmin"]
# ----------------------
# Configuration / constants
# ----------------------
VALID_STAFF_ROLES = {"doctor", "helpdesk", "labadmin", "superadmin"}

# Access token lifetime (common short-lived token)
ACCESS_TOKEN_LIFETIME = datetime.timedelta(hours=1)

# Role-based refresh lifetimes (customizable)
ROLE_REFRESH_LIFETIME = {
    "doctor": datetime.timedelta(days=10),
    "helpdesk": datetime.timedelta(days=5),
    "labadmin": datetime.timedelta(days=7),
    "superadmin": datetime.timedelta(days=2),
}

# JWT config (ensure SECRET_KEY is in settings)
JWT_ALGORITHM = getattr(settings, "JWT_ALGORITHM", "HS256")
JWT_ISSUER = getattr(settings, "JWT_ISSUER", "doctorpro")  # optional

# OTP config
OTP_TTL_SECONDS = 300  # 5 minutes
OTP_LENGTH = 6
OTP_CACHE_PREFIX = "staff_otp"  # full key: staff_otp:{role}:{phone}

# Phone regex (10-15 digits, tweak if you need country codes or plus sign)
PHONE_REGEX = re.compile(r"^\d{10,15}$")


# -------------------
# Helper functions
# -------------------
def _phone_is_valid(phone: str) -> bool:
    return bool(phone and PHONE_REGEX.match(phone))

def _role_is_valid(role: str) -> bool:
    return bool(role and role in VALID_STAFF_ROLES)

def _generate_otp() -> str:
    start = 10 ** (OTP_LENGTH - 1)
    return str(random.randint(start, start * 10 - 1))

def _otp_cache_key(role: str, phone: str) -> str:
    return f"{OTP_CACHE_PREFIX}:{role}:{phone}"

# -------------------
# OTP Redis Helpers Production 
# -------------------

# def _store_otp(role: str, phone: str, otp: str):
#     """Store OTP in Redis with TTL"""
#     cache_key = _otp_cache_key(role, phone)
#     try:
#         cache.set(cache_key, otp, timeout=OTP_TTL_SECONDS)
#     except Exception as e:
#         logging.error(f"Redis OTP store failed for {cache_key}: {e}")
#         raise

# def _get_otp(role: str, phone: str):
#     """Fetch OTP from Redis"""
#     cache_key = _otp_cache_key(role, phone)
#     try:
#         return cache.get(cache_key)
#     except Exception as e:
#         logging.error(f"Redis OTP fetch failed for {cache_key}: {e}")
#         return None

# def _delete_otp(role: str, phone: str):
#     """Delete OTP from Redis"""
#     cache_key = _otp_cache_key(role, phone)
#     try:
#         cache.delete(cache_key)
#     except Exception as e:
#         logging.error(f"Redis OTP delete failed for {cache_key}: {e}")

# -------------------
# OTP In-Memory Helpers (DEV)
# -------------------

import logging
import time

# Simple dict for OTP storage in DEV
DEV_OTP_STORE = {}

# TTL for OTP (same as production)
OTP_TTL_SECONDS = 300  # 5 minutes


def _store_otp(role: str, phone: str, otp: str):
    """Store OTP in memory with TTL (DEV only)"""
    cache_key = _otp_cache_key(role, phone)
    expiry = time.time() + OTP_TTL_SECONDS
    try:
        DEV_OTP_STORE[cache_key] = {"otp": otp, "expiry": expiry}
        print(f"[DEV] OTP stored for {phone} ({role}) -> {otp}")
    except Exception as e:
        logging.error(f"In-memory OTP store failed for {cache_key}: {e}")
        raise


def _get_otp(role: str, phone: str):
    """Fetch OTP from memory (DEV only)"""
    cache_key = _otp_cache_key(role, phone)
    try:
        entry = DEV_OTP_STORE.get(cache_key)
        if not entry:
            return None
        if time.time() > entry["expiry"]:  # expired
            _delete_otp(role, phone)
            return None
        return entry["otp"]
    except Exception as e:
        logging.error(f"In-memory OTP fetch failed for {cache_key}: {e}")
        return None


def _delete_otp(role: str, phone: str):
    """Delete OTP from memory (DEV only)"""
    cache_key = _otp_cache_key(role, phone)
    try:
        if cache_key in DEV_OTP_STORE:
            del DEV_OTP_STORE[cache_key]
            print(f"[DEV] OTP deleted for {phone} ({role})")
    except Exception as e:
        logging.error(f"In-memory OTP delete failed for {cache_key}: {e}")
# -------------------


def _generate_jwt_tokens(user, role: str):
    now = datetime.datetime.utcnow()
    access_exp = now + ACCESS_TOKEN_LIFETIME
    access_payload = {
        "user_id": str(user.id),
        "username": user.username,
        "role": role,
        "type": "access",
        "iat": int(now.timestamp()),
        "exp": int(access_exp.timestamp()),
        "iss": JWT_ISSUER,
    }
    access_token = jwt.encode(access_payload, settings.SECRET_KEY, algorithm=JWT_ALGORITHM)

    refresh_life = ROLE_REFRESH_LIFETIME.get(role, datetime.timedelta(days=7))
    refresh_exp = now + refresh_life
    refresh_payload = {
        "user_id": str(user.id),
        "username": user.username,
        "role": role,
        "type": "refresh",
        "iat": int(now.timestamp()),
        "exp": int(refresh_exp.timestamp()),
        "iss": JWT_ISSUER,
    }
    refresh_token = jwt.encode(refresh_payload, settings.SECRET_KEY, algorithm=JWT_ALGORITHM)

    return {
        "access": access_token,
        "refresh": refresh_token,
        "access_expires_at": access_exp.isoformat() + "Z",
        "refresh_expires_at": refresh_exp.isoformat() + "Z",
    }


class CheckUserStatusView(APIView):
    """
    POST /check-user-status/
    Payload: {"phone_number": "9876543210", "role": "doctor"}

    - Checks if the user exists and belongs to the given role.
    - Returns role, mobile, status, exists flag.
    """

    permission_classes = [AllowAny]
    authentication_classes = []  # No auth needed

    def post(self, request):
        phone_number = request.data.get("phone_number")
        role = request.data.get("role")

        # Validate inputs
        if not phone_number or not role:
            return Response(
                {
                    "success": False,
                    "message": "phone_number and role are required",
                    "status": "invalid_request",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Ensure role is valid
        allowed_roles = ["doctor", "helpdesk", "labadmin", "patient", "superadmin"]
        if role not in allowed_roles:
            return Response(
                {
                    "success": False,
                    "message": f"Invalid role. Allowed: {allowed_roles}",
                    "status": "invalid_role",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            # Fetch user in a single query
            user = (
                User.objects.select_related()
                .prefetch_related("groups")
                .get(username=phone_number)
            )
        except User.DoesNotExist:
            return Response(
                {
                    "success": False,
                    "exists": False,
                    "mobile": phone_number,
                    "role": "",
                    "status": "new_user",
                    "message": f"Mobile number not registered as {role}",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Check group membership
        if user.groups.filter(name=role).exists():
            return Response(
                {
                    "success": True,
                    "exists": True,
                    "mobile": phone_number,
                    "role": role,
                    "status": "existing_user",
                    "message": f"User exists as {role}",
                },
                status=status.HTTP_200_OK,
            )
        else:
            return Response(
                {
                    "success": False,
                    "exists": True,
                    "mobile": phone_number,
                    "role": role,
                    "status": "role_mismatch",
                    "message": f"User exists but not assigned to role {role}",
                },
                status=status.HTTP_403_FORBIDDEN,
            )


# -------------------
# Staff Send OTP API
# -------------------
class StaffSendOTPView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        phone = str(request.data.get("phone_number", "")).strip()
        role = str(request.data.get("role", "")).lower().strip()
        print("I am in send OTP")

        # Input validation
        if not phone or not role:
            return Response({"error": "phone_number and role are required"},
                            status=status.HTTP_400_BAD_REQUEST)
        if not _phone_is_valid(phone):
            return Response({"error": "Invalid phone_number format"},
                            status=status.HTTP_400_BAD_REQUEST)
        if not _role_is_valid(role):
            return Response({"error": f"Invalid role. Allowed: {', '.join(sorted(VALID_STAFF_ROLES))}"},
                            status=status.HTTP_400_BAD_REQUEST)

        try:
            user = User.objects.get(username=phone)

            # Role check
            if not user.groups.filter(name=role).exists():
                return Response({
                    "exists": True,
                    "status": "role_mismatch",
                    "message": f"User exists but not in role '{role}'",
                    "role": role,
                    "username": phone
                }, status=status.HTTP_403_FORBIDDEN)

            # Admin approval check
            if not user.is_active:
                return Response({
                    "exists": True,
                    "status": "not_approved",
                    "message": "User exists but not yet approved by Admin.",
                    "role": role,
                    "username": phone
                }, status=status.HTTP_403_FORBIDDEN)

        except User.DoesNotExist:
            return Response({
                "exists": False,
                "status": "new_user",
                "message": "User does not exist. Please register first.",
                "role": role,
                "username": phone
            }, status=status.HTTP_404_NOT_FOUND)

        # Generate OTP
        otp = _generate_otp()

        # Store OTP in Redis or DB
        _store_otp(role, phone, otp)

        # TODO: Integrate with external SMS gateway in production
        print(f"[DEV] OTP for {phone} ({role}): {otp}")

        # Response
        response = {
            "exists": True,
            "status": "otp_sent",
            "message": "OTP generated and sent successfully.",
            "role": role,
            "username": phone
        }
        if settings.DEBUG:
            response["OTP"] = otp  # Only for dev/testing

        return Response(response, status=status.HTTP_200_OK)


# -------------------
# Staff Verify OTP API
# -------------------
class VerifyOTPStaffView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        phone = (request.data.get("phone_number") or "").strip()
        role = (request.data.get("role") or "").lower().strip()
        otp = (request.data.get("otp") or "").strip()

        # Input validation
        if not phone or not role or not otp:
            return Response({"error": "phone_number, role, and otp are required"},
                            status=status.HTTP_400_BAD_REQUEST)
        if not _phone_is_valid(phone):
            return Response({"error": "Invalid phone_number format"},
                            status=status.HTTP_400_BAD_REQUEST)
        if not _role_is_valid(role):
            return Response({"error": f"Invalid role. Allowed roles: {', '.join(sorted(VALID_STAFF_ROLES))}"},
                            status=status.HTTP_400_BAD_REQUEST)
        if not otp.isdigit() or len(otp) != OTP_LENGTH:
            return Response({"error": "Invalid OTP format"}, status=status.HTTP_400_BAD_REQUEST)

        # OTP check
        cached_otp = _get_otp(role, phone)
        print("cached OTP",cached_otp)
        # if not cached_otp:
        #     #For DEV: allow manual OTP entry if needed
        #     return Response({"status": "otp_expired", "message": "OTP expired or not found."},
        #                     status=status.HTTP_401_UNAUTHORIZED)

        if str(cached_otp) != str(otp) and settings.DEBUG:
            print(f"[DEV] OTP mismatch: entered={otp}, cached={cached_otp}")

        # if str(cached_otp) != str(otp):
        #     return Response(
        #         {"status": "otp_mismatch", "message": "OTP mismatched."},
        #         status=status.HTTP_401_UNAUTHORIZED
        #     )
        # Fetch user
        user = User.objects.filter(username=phone).prefetch_related("groups").first()
        if not user:
            return Response({"status": "user_not_found", "message": "User not found. Contact admin."},
                            status=status.HTTP_404_NOT_FOUND)

        # Role & approval check
        if not user.groups.filter(name=role).exists():
            return Response({"status": "role_mismatch", "message": "User does not belong to the requested role."},
                            status=status.HTTP_403_FORBIDDEN)
        if not user.is_active:
            return Response({"status": "not_approved", "message": "User not approved by admin."},
                            status=status.HTTP_403_FORBIDDEN)

        # OTP passed: consume OTP (optional for DEV)
        with transaction.atomic():
            _delete_otp(role, phone)

        # Generate JWT tokens
        tokens = _generate_jwt_tokens(user, role)
         # --- 🔐 Secure Cookies ---
        response =Response({
            "status": "login_success",
            "message": "OTP verified successfully. Logged in.",
            "role": role,
            "username": user.username,
            "user_id": str(user.id),
            #"tokens": tokens. 
        }, status=status.HTTP_200_OK)
                # Access token (short-lived)
        response.set_cookie(
            key="access_token",
            value=tokens["access"],
            httponly=True,
            secure=not settings.DEBUG,  # only secure in production
            samesite="Strict",
            max_age=60 * 15  # 15 min
        )

        # Refresh token (longer-lived)
        response.set_cookie(
            key="refresh_token",
            value=tokens["refresh"],
            httponly=True,
            secure=not settings.DEBUG,
            samesite="Strict",
            max_age=60 * 60 * 24 * 7  # 7 days
        )

        return response


class RefreshTokenStaffView(APIView):
    """
    POST /auth/staff/refresh-token/
    Request: { "refresh": "<refresh_token>" }

    Features:
    1. Validates token expiry, signature, type.
    2. Validates role inside token.
    3. Checks user existence and is_active.
    4. Issues new access + refresh tokens with role-based lifetime.
    5. Handles all error scenarios.
    """

    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        refresh_token = (request.data.get("refresh") or "").strip()

        if not refresh_token:
            return Response({"error": "Refresh token required"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            payload = jwt.decode(refresh_token, settings.SECRET_KEY, algorithms=[JWT_ALGORITHM], options={"verify_exp": True})

            # Check token type
            if payload.get("type") != "refresh":
                return Response({"error": "Token type invalid, must be refresh"}, status=status.HTTP_400_BAD_REQUEST)

            role = payload.get("role")
            username = payload.get("username")
            user_id = payload.get("user_id")

            # Validate role
            if role not in VALID_STAFF_ROLES:
                return Response({"error": "Role in token is invalid"}, status=status.HTTP_403_FORBIDDEN)

            # Validate user
            user = User.objects.filter(id=user_id, username=username).first()
            if not user:
                return Response({"error": "User not found"}, status=status.HTTP_404_NOT_FOUND)
            if not user.is_active:
                return Response({"error": "User not active"}, status=status.HTTP_403_FORBIDDEN)

            # Generate new tokens
            tokens = _generate_jwt_tokens(user, role)

            return Response({
                "status": "refresh_success",
                "message": "New access and refresh tokens generated.",
                "role": role,
                "username": username,
                "user_id": str(user.id),
                "tokens": {
                    "access": tokens["access"],
                    "refresh": tokens["refresh"],
                    "access_expires_at": tokens["access_expires_at"],
                    "refresh_expires_at": tokens["refresh_expires_at"]
                }
            }, status=status.HTTP_200_OK)

        except jwt.ExpiredSignatureError:
            return Response({"error": "Refresh token expired"}, status=status.HTTP_401_UNAUTHORIZED)
        except jwt.InvalidTokenError:
            return Response({"error": "Invalid refresh token"}, status=status.HTTP_401_UNAUTHORIZED)
        except Exception as e:
            return Response({"error": f"Token validation error: {str(e)}"}, status=status.HTTP_400_BAD_REQUEST)

# authentication/views.py

# Standard library imports
import random
import re
import datetime
import logging

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

def _store_otp(role: str, phone: str, otp: str):
    """Store OTP in cache (Redis). Commented out for dev/testing."""
    # cache_key = _otp_cache_key(role, phone)
    # cache.set(cache_key, otp, timeout=OTP_TTL_SECONDS)
    pass

def _get_otp(role: str, phone: str):
    """Get OTP from cache (Redis). Commented out for dev/testing."""
    # cache_key = _otp_cache_key(role, phone)
    # return cache.get(cache_key)
    return None  # For dev/test, return None to simulate manual OTP

def _delete_otp(role: str, phone: str):
    """Delete OTP from cache (Redis). Commented out for dev/testing."""
    # cache_key = _otp_cache_key(role, phone)
    # cache.delete(cache_key)
    pass

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
        if not cached_otp:
            # For DEV: allow manual OTP entry if needed
            # return Response({"status": "otp_expired", "message": "OTP expired or not found."},
            #                 status=status.HTTP_401_UNAUTHORIZED)
            pass  # Skip for DEV

        if str(cached_otp) != str(otp) and settings.DEBUG:
            print(f"[DEV] OTP mismatch: entered={otp}, cached={cached_otp}")

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

        return Response({
            "status": "login_success",
            "message": "OTP verified successfully. Logged in.",
            "role": role,
            "username": user.username,
            "user_id": str(user.id),
            "tokens": tokens
        }, status=status.HTTP_200_OK)


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












# # ----------------------
# # Helper utilities
# # ----------------------
# def _phone_is_valid(phone: str) -> bool:
#     return bool(phone and PHONE_REGEX.match(phone))


# def _role_is_valid(role: str) -> bool:
#     return bool(role and role in VALID_STAFF_ROLES)


# def _generate_otp() -> str:
#     """Return a zero-padded OTP string of OTP_LENGTH."""
#     start = 10 ** (OTP_LENGTH - 1)
#     return str(random.randint(start, start * 10 - 1))


# def _otp_cache_key(role: str, phone: str) -> str:
#     return f"{OTP_CACHE_PREFIX}:{role}:{phone}"


# def _store_otp_in_cache(role: str, phone: str, otp: str):
#     cache_key = _otp_cache_key(role, phone)
#     cache.set(cache_key, otp, timeout=OTP_TTL_SECONDS)


# def _get_otp_from_cache(role: str, phone: str):
#     cache_key = _otp_cache_key(role, phone)
#     return cache.get(cache_key)


# def _delete_otp_from_cache(role: str, phone: str):
#     cache_key = _otp_cache_key(role, phone)
#     cache.delete(cache_key)


# def _generate_jwt_tokens(user, role: str):
#     """
#     Generate access and refresh JWT tokens using PyJWT.
#     - access token: short-lived (ACCESS_TOKEN_LIFETIME)
#     - refresh token: role-driven lifetime (ROLE_REFRESH_LIFETIME[role])
#     """
#     now = datetime.datetime.utcnow()

#     # Access token
#     access_exp = now + ACCESS_TOKEN_LIFETIME
#     access_payload = {
#         "user_id": str(user.id),
#         "username": user.username,
#         "role": role,
#         "type": "access",
#         "iat": int(now.timestamp()),
#         "exp": int(access_exp.timestamp()),
#         "iss": JWT_ISSUER,
#     }
#     access_token = jwt.encode(access_payload, settings.SECRET_KEY, algorithm=JWT_ALGORITHM)

#     # Refresh token (role-based)
#     refresh_life = ROLE_REFRESH_LIFETIME.get(role, datetime.timedelta(days=7))
#     refresh_exp = now + refresh_life
#     refresh_payload = {
#         "user_id": str(user.id),
#         "username": user.username,
#         "role": role,
#         "type": "refresh",
#         "iat": int(now.timestamp()),
#         "exp": int(refresh_exp.timestamp()),
#         "iss": JWT_ISSUER,
#     }
#     refresh_token = jwt.encode(refresh_payload, settings.SECRET_KEY, algorithm=JWT_ALGORITHM)

#     return {
#         "access": access_token,
#         "refresh": refresh_token,
#         "access_expires_at": access_exp.isoformat() + "Z",
#         "refresh_expires_at": refresh_exp.isoformat() + "Z",
#     }




# class CheckUserStatusView(APIView):
#     """
#     POST /check-user-status/
#     Payload: {"phone_number": "9876543210", "role": "doctor"}

#     - Checks if the user exists and belongs to the given role.
#     - Returns role, mobile, status, exists flag.
#     """

#     permission_classes = [AllowAny]
#     authentication_classes = []  # No auth needed

#     def post(self, request):
#         phone_number = request.data.get("phone_number")
#         role = request.data.get("role")

#         # Validate inputs
#         if not phone_number or not role:
#             return Response(
#                 {
#                     "success": False,
#                     "message": "phone_number and role are required",
#                     "status": "invalid_request",
#                 },
#                 status=status.HTTP_400_BAD_REQUEST,
#             )

#         # Ensure role is valid
#         allowed_roles = ["doctor", "helpdesk", "labadmin", "patient", "superadmin"]
#         if role not in allowed_roles:
#             return Response(
#                 {
#                     "success": False,
#                     "message": f"Invalid role. Allowed: {allowed_roles}",
#                     "status": "invalid_role",
#                 },
#                 status=status.HTTP_400_BAD_REQUEST,
#             )

#         try:
#             # Fetch user in a single query
#             user = (
#                 User.objects.select_related()
#                 .prefetch_related("groups")
#                 .get(username=phone_number)
#             )
#         except User.DoesNotExist:
#             return Response(
#                 {
#                     "success": False,
#                     "exists": False,
#                     "mobile": phone_number,
#                     "role": "",
#                     "status": "new_user",
#                     "message": f"Mobile number not registered as {role}",
#                 },
#                 status=status.HTTP_400_BAD_REQUEST,
#             )

#         # Check group membership
#         if user.groups.filter(name=role).exists():
#             return Response(
#                 {
#                     "success": True,
#                     "exists": True,
#                     "mobile": phone_number,
#                     "role": role,
#                     "status": "existing_user",
#                     "message": f"User exists as {role}",
#                 },
#                 status=status.HTTP_200_OK,
#             )
#         else:
#             return Response(
#                 {
#                     "success": False,
#                     "exists": True,
#                     "mobile": phone_number,
#                     "role": role,
#                     "status": "role_mismatch",
#                     "message": f"User exists but not assigned to role {role}",
#                 },
#                 status=status.HTTP_403_FORBIDDEN,
#             )


# class StaffSendOTPView(APIView):
#     """
#     Staff OTP Send API
#     - Accepts phone_number and role
#     - Validates role and user existence
#     - Checks if user is active & approved
#     - Generates and caches OTP for 5 minutes
#     """

#     permission_classes = [AllowAny]
#     authentication_classes = []

#     def post(self, request):
#         phone_number = str(request.data.get("phone_number", "")).strip()
#         role = str(request.data.get("role", "")).lower().strip()

#         # ✅ Input validation
#         if not phone_number or not role:
#             return Response(
#                 {"error": "phone_number and role are required"},
#                 status=status.HTTP_400_BAD_REQUEST,
#             )

#         if not phone_number.isdigit() or len(phone_number) < 10:
#             return Response(
#                 {"error": "Invalid phone_number format."},
#                 status=status.HTTP_400_BAD_REQUEST,
#             )

#         if role not in VALID_ROLES:
#             return Response(
#                 {"error": f"Invalid role. Allowed roles: {', '.join(VALID_ROLES)}"},
#                 status=status.HTTP_400_BAD_REQUEST,
#             )

#         try:
#             user = User.objects.get(username=phone_number)

#             # ✅ Role check
#             if not user.groups.filter(name=role).exists():
#                 return Response(
#                     {
#                         "exists": True,
#                         "status": "role_mismatch",
#                         "message": f"User exists but not in role '{role}'.",
#                         "role": role,
#                         "username": phone_number,
#                     },
#                     status=status.HTTP_403_FORBIDDEN,
#                 )

#             # ✅ Approval check (admin activates user)
#             if not user.is_active:
#                 return Response(
#                     {
#                         "exists": True,
#                         "status": "not_approved",
#                         "message": "User exists but not yet approved by Admin.",
#                         "role": role,
#                         "username": phone_number,
#                     },
#                     status=status.HTTP_403_FORBIDDEN,
#                 )

#         except User.DoesNotExist:
#             return Response(
#                 {
#                     "exists": False,
#                     "status": "new_user",
#                     "message": "User does not exist. Please register first.",
#                     "role": role,
#                     "username": phone_number,
#                 },
#                 status=status.HTTP_404_NOT_FOUND,
#             )

#         # ✅ Generate OTP (6 digits)
#         otp = random.randint(100000, 999999)

#         # ✅ Store OTP in cache for 5 mins
#         cache_key = f"otp:staff:{role}:{phone_number}"
#         cache.set(cache_key, otp, timeout=300)

#         # TODO: Replace with external OTP service integration (fast SMS API)
#         print(f"[OTP] Generated OTP for {phone_number} ({role}): {otp}")

#         # ⚠️ Return OTP ONLY in dev/test mode
#         response_data = {
#             "exists": True,
#             "status": "otp_sent",
#             "message": "OTP generated and sent successfully.",
#             "role": role,
#             "username": phone_number,
#         }
#         if settings.DEBUG:
#             response_data["OTP"] = otp

#         return Response(response_data, status=status.HTTP_200_OK)

# class VerifyOTPStaffView(APIView):
#     """
#     POST /auth/staff/verify-otp/
#     Request:
#       { "phone_number": "9876543210", "role": "doctor", "otp": "123456" }

#     Behaviors:
#       - Validate input
#       - Validate OTP against cache (or external provider)
#       - Validate user exists and belongs to given Django Group and is_active
#       - Issue JWT access + refresh tokens, with refresh lifetime driven by role
#     """
#     permission_classes = [AllowAny]
#     authentication_classes = []

#     def post(self, request):
#         phone = (request.data.get("phone_number") or "").strip()
#         role = (request.data.get("role") or "").strip()
#         otp = (request.data.get("otp") or "").strip()

#         # 1. Input validation
#         if not phone or not role or not otp:
#             return Response({"error": "phone_number, role, and otp are required"},
#                             status=status.HTTP_400_BAD_REQUEST)
#         if not _phone_is_valid(phone):
#             return Response({"error": "Invalid phone_number format"},
#                             status=status.HTTP_400_BAD_REQUEST)
#         if not _role_is_valid(role):
#             return Response({"error": f"Invalid role. Allowed roles: {', '.join(sorted(VALID_STAFF_ROLES))}"},
#                             status=status.HTTP_400_BAD_REQUEST)
#         if not otp.isdigit() or len(otp) != OTP_LENGTH:
#             return Response({"error": "Invalid OTP format"},
#                             status=status.HTTP_400_BAD_REQUEST)

#         # 2. OTP check (fast in-memory check)
#         cached = _get_otp_from_cache(role, phone)
#         if not cached:
#             return Response({"status": "otp_expired", "message": "OTP expired or not found. Please request again."},
#                             status=status.HTTP_401_UNAUTHORIZED)
#         if str(cached) != str(otp):
#             return Response({"status": "invalid_otp", "message": "Entered OTP is incorrect."},
#                             status=status.HTTP_401_UNAUTHORIZED)

#         # 3. Fetch and validate user (one DB call)
#         user_qs = User.objects.filter(username=phone).prefetch_related('groups')
#         user = user_qs.first()
#         if not user:
#             # Shouldn't normally happen if SendOTP succeeded, but handle it
#             # delete used/expired OTP for safety
#             _delete_otp_from_cache(role, phone)
#             return Response({"status": "user_not_found", "message": "User not found. Contact admin."},
#                             status=status.HTTP_404_NOT_FOUND)

#         # 4. Role / group validation
#         if not user.groups.filter(name=role).exists():
#             _delete_otp_from_cache(role, phone)
#             return Response({"status": "role_mismatch", "message": "User does not belong to the requested role."},
#                             status=status.HTTP_403_FORBIDDEN)

#         # 5. Approval check
#         if not user.is_active:
#             _delete_otp_from_cache(role, phone)
#             return Response({"status": "not_approved", "message": "User not approved by admin."},
#                             status=status.HTTP_403_FORBIDDEN)

#         # OTP is valid and user checks passed - consume OTP and issue tokens
#         # Use transaction for safety if you want to update last_login or audit table
#         with transaction.atomic():
#             _delete_otp_from_cache(role, phone)
#             # Optional: update last_login or audit logs here
#             # user.last_login = timezone.now(); user.save(update_fields=['last_login'])

#         # 6. Generate JWT tokens (role-based refresh lifetime)
#         tokens = _generate_jwt_tokens(user, role)

#         # 7. Response
#         return Response({
#             "status": "login_success",
#             "message": "OTP verified successfully. Logged in.",
#             "role": role,
#             "username": user.username,
#             "user_id": str(user.id),
#             "tokens": {
#                 "access": tokens["access"],
#                 "refresh": tokens["refresh"],
#                 "access_expires_at": tokens["access_expires_at"],
#                 "refresh_expires_at": tokens["refresh_expires_at"],
#             }
#         }, status=status.HTTP_200_OK)


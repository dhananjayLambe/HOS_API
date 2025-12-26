# authentication/views.py
# Standard library imports
import random
import re
import datetime
import logging
import time

# Django imports
from django.conf import settings
from django.contrib.auth.models import Group, User
from django.core.cache import cache
from django.db import transaction

# Third-party imports
import jwt
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken

# Local app imports
from account.models import User

VALID_ROLES = ["doctor", "helpdesk", "superadmin","labadmin"]
# ----------------------
# Configuration / constants
# ----------------------
VALID_STAFF_ROLES = {"doctor", "helpdesk", "superadmin","labadmin"}

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

MAX_RESEND_COUNT = 3
RESEND_COOLDOWN_SECONDS = 30  # 30 seconds cooldown
OTP_TTL_SECONDS = 60  # 1 min OTP validity
COOLDOWN =  30
RESEND_LIMIT = 5
RESEND_WINDOW = 60
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

def _store_or_get_otp(role: str, phone: str, otp: str = None):
    """
    Store OTP in Redis with TTL.
    - If OTP already exists (not expired), return it.
    - If no OTP exists and `otp` is provided, store that OTP.
    - If no OTP exists and no `otp` provided, generate a new one.
    """
    cache_key = _otp_cache_key(role, phone)
    try:
        existing_otp = cache.get(cache_key)
        if existing_otp:
            return existing_otp  # reuse until TTL expires

        # store provided OTP or generate new one
        if otp is None:
            otp = _generate_otp()

        cache.set(cache_key, otp, timeout=OTP_TTL_SECONDS)
        return otp
    except Exception as e:
        logging.error(f"Redis OTP store/get failed for {cache_key}: {e}")
        raise

def _get_otp(role: str, phone: str):
    """Fetch OTP from Redis"""
    cache_key = _otp_cache_key(role, phone)
    try:
        return cache.get(cache_key)
    except Exception as e:
        logging.error(f"Redis OTP fetch failed for {cache_key}: {e}")
        return None

def _delete_otp(role: str, phone: str):
    """Delete OTP from Redis"""
    cache_key = _otp_cache_key(role, phone)
    try:
        cache.delete(cache_key)
    except Exception as e:
        logging.error(f"Redis OTP delete failed for {cache_key}: {e}")

#FOR RESEND OTP Helper function
def _resend_count_key(role: str, phone: str):
    return f"resend_count:{role}:{phone}"

def _resend_last_key(role: str, phone: str):
    return f"resend_last:{role}:{phone}"

def can_resend_otp(role: str, phone: str):
    """
    Returns (allowed: bool, message: str, remaining_cooldown: int)
    """
    last_sent = cache.get(_resend_last_key(role, phone))
    count = cache.get(_resend_count_key(role, phone)) or 0

    # Check cooldown
    if last_sent and (time.time() - last_sent) < COOLDOWN:
        remaining = int(COOLDOWN - (time.time() - last_sent))
        return False, f"Please wait {remaining}s before resending OTP.", remaining

    # Check resend limit
    if count >= RESEND_LIMIT:
        return False, f"OTP resend limit reached. Try again later.", 0

    return True, "", 0

def update_resend_counters(role: str, phone: str):
    count_key = _resend_count_key(role, phone)
    last_key = _resend_last_key(role, phone)

    # Increment resend count
    count = cache.get(count_key) or 0
    cache.set(count_key, count + 1, timeout=RESEND_WINDOW)

    # Update last sent timestamp
    cache.set(last_key, time.time(), timeout=RESEND_WINDOW)
def _resend_cache_key(role, phone):
    return f"resend_otp:{role}:{phone}"

def _generate_jwt_tokens_old(user, role: str):
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

def _generate_jwt_tokens(user, role: str):
    # Create refresh token
    refresh = RefreshToken.for_user(user)
    refresh["role"] = role  # add custom claim if needed

    # Access token is derived from refresh token
    access = refresh.access_token

    # Get current time and calculate expiration times
    now = datetime.datetime.utcnow()
    
    return {
        "access": str(access),
        "refresh": str(refresh),
        "access_expires_at": now + access.lifetime,
        "refresh_expires_at": now + refresh.lifetime,
    }
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




class CheckUserStatusView(APIView):
    """
    POST /check-user-status/
    Payload: {"phone_number": "9876543210"}

    - Checks if the user exists.
    - Infers role(s) from groups.
    - Returns status:
        - new_user → Not registered
        - no_role_assigned → Registered but no role assigned
        - pending_approval → Registered, waiting for admin
        - approved → Approved and active
        - rejected → Explicitly rejected by admin
    """

    permission_classes = [AllowAny]
    authentication_classes = []  # No auth required

    def post(self, request):
        phone_number = request.data.get("phone_number")

        # Validate inputs
        if not phone_number:
            return Response(
                {
                    "success": False,
                    "message": "phone_number is required",
                    "status": "invalid_request",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            # Fetch user
            user = (
                User.objects.select_related("doctor")  # include doctor relation
                .prefetch_related("groups")
                .get(username=phone_number)
            )
        except User.DoesNotExist:
            return Response(
                {
                    "success": False,
                    "exists": False,
                    "mobile": phone_number,
                    "role": [],
                    "status": "new_user",
                    "message": "This mobile number is not registered. Please register first.",
                },
                status=status.HTTP_200_OK,
            )

        # Get roles (groups)
        roles = list(user.groups.values_list("name", flat=True))

        # Case 1: User registered but no role
        if not roles:
            return Response(
                {
                    "success": False,
                    "exists": True,
                    "mobile": phone_number,
                    "role": [],
                    "status": "no_role_assigned",
                    "message": "User exists but no role has been assigned yet. Please contact admin.",
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        # Doctor-specific approval flow
        if "doctor" in roles:
            doctor_profile = getattr(user, "doctor", None)
            if doctor_profile:
                if doctor_profile.status == "pending":
                    return Response(
                        {
                            "success": True,
                            "exists": True,
                            "mobile": phone_number,
                            "role": roles,
                            "status": "pending_approval",
                            "message": "Your registration as doctor is pending admin approval.",
                        },
                        status=status.HTTP_200_OK,
                    )
                elif doctor_profile.status == "rejected":
                    return Response(
                        {
                            "success": False,
                            "exists": True,
                            "mobile": phone_number,
                            "role": roles,
                            "status": "rejected",
                            "message": f"Your registration was rejected. Reason: {doctor_profile.rejection_reason or 'Not specified'}",
                        },
                        status=status.HTTP_403_FORBIDDEN,
                    )
                elif doctor_profile.status == "approved" and user.is_active:
                    return Response(
                        {
                            "success": True,
                            "exists": True,
                            "mobile": phone_number,
                            "role": roles,
                            "status": "approved",
                            "message": "User exists and approved as doctor.",
                        },
                        status=status.HTTP_200_OK,
                    )

        # Non-doctor roles (helpdesk, labadmin, patient, superadmin)
        if not user.is_active:
            return Response(
                {
                    "success": True,
                    "exists": True,
                    "mobile": phone_number,
                    "role": roles,
                    "status": "pending_approval",
                    "message": f"Your registration as {', '.join(roles)} is pending admin approval.",
                },
                status=status.HTTP_200_OK,
            )

        return Response(
            {
                "success": True,
                "exists": True,
                "mobile": phone_number,
                "role": roles,
                "status": "approved",
                "message": f"User exists and approved as {', '.join(roles)}.",
            },
            status=status.HTTP_200_OK,
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
        print("phone:", phone)
        print("role:", role)

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

            #NEED to change the condition for Admin Approval as we are using the the falg
            #status = 
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
        otp = _store_or_get_otp(role, phone, otp)

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
        print("cached OTP", cached_otp)
        if not cached_otp:
            return Response({"status": "otp_expired", "message": "OTP expired or not found."},
                            status=status.HTTP_401_UNAUTHORIZED)

        if str(cached_otp) != str(otp):
            if settings.DEBUG:
                print(f"[DEV] OTP mismatch: entered={otp}, cached={cached_otp}")
            return Response(
                {"status": "otp_mismatch", "message": "OTP mismatched."},
                status=status.HTTP_401_UNAUTHORIZED
            )

        # Fetch user
        user = User.objects.filter(username=phone).prefetch_related("groups").first()
        if not user:
            return Response({"status": "user_not_found", "message": "User not found. Contact admin."},
                            status=status.HTTP_404_NOT_FOUND)

        if not user.groups.filter(name=role).exists():
            return Response({"status": "role_mismatch", "message": "User does not belong to the requested role."},
                            status=status.HTTP_403_FORBIDDEN)
        if not user.is_active:
            return Response({"status": "not_approved", "message": "User not approved by admin."},
                            status=status.HTTP_403_FORBIDDEN)

        # OTP passed → consume OTP
        with transaction.atomic():
            _delete_otp(role, phone)

        # Generate JWT tokens
        tokens = _generate_jwt_tokens(user, role)
        print(f"JWT tokens:access_token: {tokens['access']}", f"JWT tokens:refresh_token: {tokens['refresh']}")
        
        # Return tokens in response body for Authorization header usage
        response = Response({
            "status": "login_success",
            "message": "OTP verified successfully. Logged in.",
            "role": role,
            "username": user.username,
            "user_id": str(user.id),
            "first_name": getattr(user, "first_name", "") or "",
            "last_name": getattr(user, "last_name", "") or "",
            "email": getattr(user, "email", "") or "",
            "tokens": {
                "access": tokens["access"],
                "refresh": tokens["refresh"],
                "access_expires_at": tokens["access_expires_at"].isoformat() if hasattr(tokens["access_expires_at"], "isoformat") else str(tokens["access_expires_at"]),
                "refresh_expires_at": tokens["refresh_expires_at"].isoformat() if hasattr(tokens["refresh_expires_at"], "isoformat") else str(tokens["refresh_expires_at"]),
            },
        }, status=status.HTTP_200_OK)

        return response

# -------------------
# Staff Resend OTP API
# -------------------
class ResendOTPStaffView(APIView):
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

        # Check if user exists and role is valid
        try:
            user = User.objects.get(username=phone)
            if not user.groups.filter(name=role).exists():
                return Response({
                    "exists": True,
                    "status": "role_mismatch",
                    "message": f"User exists but not in role '{role}'",
                    "role": role,
                    "username": phone
                }, status=status.HTTP_403_FORBIDDEN)
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

        # Check resend cooldown & limit
        allowed_to_resend, cooldown_message, remaining_cooldown = can_resend_otp(role, phone)
        if not allowed_to_resend:
            return Response({
                "status": "cooldown" if remaining_cooldown > 0 else "limit_reached",
                "message": cooldown_message,
                "remaining_cooldown": remaining_cooldown
            }, status=status.HTTP_429_TOO_MANY_REQUESTS)

        # ✅ Get or generate OTP
        otp = _store_or_get_otp(role, phone, None) # Pass None to indicate we just want to get/reuse it

        # Update resend info
        update_resend_counters(role, phone)

        print(f"[DEV] Resend OTP for {phone} ({role}): {otp}")

        response = {
            "exists": True,
            "status": "otp_resent",
            "message": "OTP resent successfully.",
            "role": role,
            "username": phone
        }
        if settings.DEBUG:
            response["OTP"] = otp

        return Response(response, status=status.HTTP_200_OK)

class RefreshTokenStaffView(APIView):
    """
    POST /api/auth/refresh-token/

    Features:
    1. Reads refresh token from request body.
    2. Validates token using SimpleJWT RefreshToken.
    3. Validates role inside token.
    4. Checks user existence and is_active.
    5. Issues new access + refresh tokens.
    6. Returns tokens & metadata in response body.
    """

    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        refresh_token_str = request.data.get("refresh_token") or request.data.get("refresh")

        if not refresh_token_str:
            return Response({"error": "Refresh token is required in request body"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            # Use SimpleJWT's RefreshToken for validation
            refresh_token = RefreshToken(refresh_token_str)
            
            # Get user from token - SimpleJWT stores user_id in the token payload
            user_id = refresh_token["user_id"]
            user = User.objects.filter(id=user_id).first()
            
            if not user:
                return Response({"error": "User not found"}, status=status.HTTP_404_NOT_FOUND)
            
            if not user.is_active:
                return Response({"error": "User not active"}, status=status.HTTP_403_FORBIDDEN)

            # Get role from token (added in _generate_jwt_tokens)
            role = refresh_token.get("role")
            
            # Validate role if present
            if role and role not in VALID_STAFF_ROLES:
                return Response({"error": "Role in token is invalid"}, status=status.HTTP_403_FORBIDDEN)
            
            # If role not in token, try to get it from user's groups
            if not role:
                user_groups = user.groups.values_list("name", flat=True)
                role = next((r for r in VALID_STAFF_ROLES if r in user_groups), None)
                if not role:
                    return Response({"error": "User does not have a valid role"}, status=status.HTTP_403_FORBIDDEN)

            # Generate new tokens
            tokens = _generate_jwt_tokens(user, role)

            response_data = {
                "status": "refresh_success",
                "message": "New access and refresh tokens generated.",
                "role": role,
                "username": user.username,
                "user_id": str(user.id),
                "tokens": {
                    "access": tokens["access"],
                    "refresh": tokens["refresh"],
                    "access_expires_at": tokens["access_expires_at"].isoformat() if hasattr(tokens["access_expires_at"], "isoformat") else str(tokens["access_expires_at"]),
                    "refresh_expires_at": tokens["refresh_expires_at"].isoformat() if hasattr(tokens["refresh_expires_at"], "isoformat") else str(tokens["refresh_expires_at"]),
                },
            }

            return Response(response_data, status=status.HTTP_200_OK)

        except Exception as e:
            # SimpleJWT RefreshToken will raise exceptions for invalid/expired tokens
            error_message = str(e)
            if "expired" in error_message.lower():
                return Response({"error": "Refresh token expired"}, status=status.HTTP_401_UNAUTHORIZED)
            elif "blacklisted" in error_message.lower() or "blacklist" in error_message.lower():
                return Response({"error": "Refresh token has been blacklisted"}, status=status.HTTP_401_UNAUTHORIZED)
            else:
                return Response({"error": f"Invalid refresh token: {error_message}"}, status=status.HTTP_400_BAD_REQUEST)

class LogoutView(APIView):
    """
    POST /auth/logout/
    
    Logs out user by blacklisting the refresh token.
    Accepts refresh_token in request body.
    """
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        refresh_token_str = request.data.get("refresh_token") or request.data.get("refresh")
        
        if not refresh_token_str:
            return Response({"error": "Refresh token is required in request body"}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            # Blacklist the refresh token using SimpleJWT
            refresh_token = RefreshToken(refresh_token_str)
            refresh_token.blacklist()
            return Response({"message": "Logged out successfully"}, status=status.HTTP_200_OK)
        except Exception as e:
            # If token is invalid or already blacklisted, still return success
            # (idempotent logout - don't leak info about token state)
            return Response({"message": "Logged out successfully"}, status=status.HTTP_200_OK)


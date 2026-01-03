from django.shortcuts import render
from rest_framework import  viewsets, status
from rest_framework.response import Response
from rest_framework.decorators import action
from django.contrib.auth import get_user_model
from rest_framework.permissions import AllowAny
from patient_account.models import PatientAccount
from account.models import User
from django.contrib.auth.models import Group
from django.core.cache import cache
import random
import time
import logging
from patient_account.models import OTP
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenRefreshView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework.permissions import IsAuthenticated
from rest_framework import generics, permissions
from django.contrib.postgres.search import TrigramSimilarity
from patient_account.api.serializers import(
PatientProfileSerializer, PatientProfileUpdateSerializer, PatientProfileDetailsSerializer,
PatientAccountSerializer,
PatientProfileSearchSerializer, CheckMobileSerializer, CreatePatientSerializer,
AddFamilyMemberSerializer, PatientProfileListSerializer, SelectPatientSerializer,
SelectedPatientSerializer)
from patient_account.models import PatientProfile,PatientProfileDetails
from account.permissions import IsDoctorOrHelpdesk
from patient_account.tasks import invalidate_patient_search_cache
from django.core.cache import cache
from django.db.models import Q
from rest_framework.generics import ListAPIView
from django.db import transaction
from django.db.models import F
from django.utils import timezone
import traceback

# Set up logger
logger = logging.getLogger(__name__)

#Determines if the user is new or existing.
class CheckUserStatusView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []
    def post(self, request):
        phone_number = request.data.get('phone_number')
        if User.objects.filter(username=phone_number).exists() or PatientAccount.objects.filter(user__username=phone_number).exists():
            return Response({"status": "existing_user"}, status=status.HTTP_200_OK)
        return Response({"status": "new_user"}, status=status.HTTP_200_OK)

#Send OTP to the user's phone number.
class SendOTPView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []
    def post(self, request):
        phone_number = request.data.get('phone_number')
        if not phone_number:
            return Response({"message": "Phone number is required"}, status=status.HTTP_400_BAD_REQUEST)
        # Check if an OTP already exists in cache
        existing_otp = cache.get(phone_number)
        otp_timestamp = cache.get(f"otp_timestamp_{phone_number}")
        # If OTP exists and is still within the valid time frame, return the same OTP
        if existing_otp and otp_timestamp and (time.time() - otp_timestamp) < 60:
            return Response({
                "message": "OTP already sent. Please wait before requesting a new one.",
                "otp": existing_otp  # Show only for debugging; remove in production
            }, status=status.HTTP_200_OK)
        # Generate a new OTP since no valid OTP exists
        new_otp = random.randint(100000, 999999)
        # Store the OTP and the current timestamp
        cache.set(phone_number, new_otp, timeout=60)  # OTP valid for 1 minute
        cache.set(f"otp_timestamp_{phone_number}", time.time(), timeout=60)
        return Response({
            "message": "OTP sent successfully",
            "otp": new_otp  # Show only for debugging; remove in production
        }, status=status.HTTP_200_OK)

class VerifyOTPView(APIView):
    #Permision need to handle the OTP verification
    permission_classes = [AllowAny]
    authentication_classes = []
    def post(self, request):
        phone_number = request.data.get('phone_number')
        otp = request.data.get('otp')
        cached_otp = cache.get(phone_number)
        if str(cached_otp) != str(otp):
            return Response({"message": "Invalid OTP"}, status=status.HTTP_400_BAD_REQUEST)
        user, created = User.objects.get_or_create(username=phone_number)
        user.is_active = True
        user.status = True
        # Add the user to the "patient" group
        patient_group, _ = Group.objects.get_or_create(name="patient")
        user.groups.add(patient_group)
        user.save()
        refresh = RefreshToken.for_user(user)
        access_token = str(refresh.access_token)      
        return Response(
            {
            "message": "Login successful",
            "access": access_token,  # Include access token
            "refresh": str(refresh),  # Include refresh token
            "user": {
                "id": user.id,
                "username": user.username,
                "phone_number": user.username,
                "is_active": user.is_active
                },
            "is_new": created,  # Returns True if the user was created now, False if already exists
        }, status=status.HTTP_200_OK)
    
class CustomTokenRefreshView(TokenRefreshView):
    pass

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_patient_account(request):
    try:
        patient_account = PatientAccount.objects.get(user=request.user)
        return Response({"id": patient_account.id})
    except PatientAccount.DoesNotExist:
        return Response({"error": "Patient account not found"}, status=404)

class RegisterPatientView(APIView):
    permission_classes = [IsAuthenticated]
    authentication_classes = [JWTAuthentication]
    def post(self, request):
        user = request.user
        if PatientAccount.objects.filter(user=user).exists():
            return Response(
                {"message": "Patient already registered"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        patient, created = PatientAccount.objects.get_or_create(user=user)
        return Response(
            {"message": "Patient registration successful",
            "patient_id": patient.id,
            "phone_number": user.username
            },
            status=status.HTTP_201_CREATED,
        )

class LogoutView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []
    def post(self, request):
        try:
            refresh_token = request.data.get('refresh')
            if not refresh_token:
                return Response({"message": "Refresh token is required"}, status=status.HTTP_400_BAD_REQUEST)
            token = RefreshToken(refresh_token)
            token.blacklist()  # Blacklist the refresh token
            return Response({"message": "Logged out successfully"}, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"message": "Invalid token", "error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

class AddPatientProfileView(APIView):
    """
    API to create a new patient profile under an authenticated patient's account.
    - Ensures only one profile for 'self', 'father', 'mother', 'spouse'.
    - Allows multiple 'child' profiles but prevents duplicate first_name + date_of_birth.
    """
    permission_classes = [IsAuthenticated]
    authentication_classes = [JWTAuthentication]
    def post(self, request):
        user = request.user
        try:
            # Ensure the patient account exists
            patient_account = PatientAccount.objects.get(user=user)
        except PatientAccount.DoesNotExist:
            return Response({"message": "Patient account not found"}, status=status.HTTP_404_NOT_FOUND)
        # Extract data from request
        first_name = request.data.get("first_name")
        date_of_birth = request.data.get("date_of_birth")
        relation = request.data.get("relation")
        # Check for duplicate profiles (for 'self', 'father', 'mother', 'spouse')
        if relation in ["self", "father", "mother", "spouse"]:
            existing_profile = PatientProfile.objects.filter(account=patient_account, relation=relation).exists()
            if existing_profile:
                return Response(
                    {"message": f"A profile for {relation} already exists."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        # Check for duplicate child profiles (same first_name + date_of_birth)
        if relation == "child":
            duplicate_child = PatientProfile.objects.filter(
                account=patient_account, relation="child", first_name=first_name, date_of_birth=date_of_birth
            ).exists()
            if duplicate_child:
                return Response(
                    {"message": "A child profile with the same first name and date of birth already exists."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        # Serialize and save the profile
        serializer = PatientProfileSerializer(data=request.data, context={"request": request})
        if serializer.is_valid():
            serializer.save(account=patient_account)
            return Response(
                {"message": "Profile added successfully", "profile": serializer.data},
                status=status.HTTP_201_CREATED
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class UpdatePatientProfileView(APIView):
    permission_classes = [IsAuthenticated]
    authentication_classes = [JWTAuthentication]
    def put(self, request, profile_id):
        try:
            # Get the profile for the logged-in user's PatientAccount
            profile = PatientProfile.objects.get(id=profile_id, account__user=request.user)
        except PatientProfile.DoesNotExist:
            return Response({"message": "Profile not found"}, status=status.HTTP_404_NOT_FOUND)
        serializer = PatientProfileUpdateSerializer(profile, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response({"message": "Profile updated successfully", "profile": serializer.data}, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class DeletePatientProfileView(APIView):
    """
    API to delete a patient profile under an authenticated patient's account.
    """
    permission_classes = [IsAuthenticated]
    authentication_classes = [JWTAuthentication]

    def delete(self, request, profile_id):
        try:
            # Get the profile under the logged-in user's PatientAccount
            profile = PatientProfile.objects.get(id=profile_id, account__user=request.user)

            # Prevent deletion of "self" profile
            if profile.relation == "self":
                return Response(
                    {"message": "Cannot delete primary (self) profile"},
                    status=status.HTTP_403_FORBIDDEN,
                )

            profile.delete()
            return Response({"message": "Profile deleted successfully"}, status=status.HTTP_200_OK)

        except PatientProfile.DoesNotExist:
            return Response({"message": "Profile not found"}, status=status.HTTP_404_NOT_FOUND)

class GetPatientProfilesView(APIView):
    permission_classes = [IsAuthenticated]
    authentication_classes = [JWTAuthentication]

    def get(self, request):
        try:
            # Get the patient account of the logged-in user
            patient_account = PatientAccount.objects.get(user=request.user)
            
            # Retrieve all profiles linked to the patient account
            profiles = PatientProfile.objects.filter(account=patient_account)
            
            # Serialize and return profiles
            serializer = PatientProfileSerializer(profiles, many=True)
            return Response({
                "patient_account": patient_account.id,
                "profiles": serializer.data}, status=status.HTTP_200_OK)

        except PatientAccount.DoesNotExist:
            return Response({"message": "Patient account not found"}, status=status.HTTP_404_NOT_FOUND)

class GetProfileByNameView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, first_name):
        try:
            # Get the patient account for the logged-in user
            patient_account = request.user.patientaccount

            # Search for profile by first name (case-insensitive)
            profile = PatientProfile.objects.filter(account=patient_account, first_name__iexact=first_name).first()

            if not profile:
                return Response({"message": "Profile not found"}, status=status.HTTP_404_NOT_FOUND)

            serializer = PatientProfileSerializer(profile)
            return Response({"profile": serializer.data}, status=status.HTTP_200_OK)

        except PatientProfile.DoesNotExist:
            return Response({"message": "Patient account not found"}, status=status.HTTP_404_NOT_FOUND)

class GetPrimaryProfileView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            # Get the "Self" profile for the logged-in user's PatientAccount
            primary_profile = PatientProfile.objects.get(account__user=request.user, relation="self")
            serializer = PatientProfileSerializer(primary_profile)
            return Response({"message": "Primary profile retrieved successfully", "profile": serializer.data}, status=status.HTTP_200_OK)
        except PatientProfile.DoesNotExist:
            return Response({"message": "No primary profile found"}, status=status.HTTP_404_NOT_FOUND)

class PatientProfileDetailsViewSet(viewsets.ModelViewSet):
    queryset = PatientProfileDetails.objects.all()
    serializer_class = PatientProfileDetailsSerializer

class CheckPatientView(APIView):
    permission_classes = [IsAuthenticated]
    authentication_classes = [JWTAuthentication]

    def post(self, request, *args, **kwargs):
        mobile_number = request.data.get("phone_number")

        if not mobile_number:
            return Response({"message": "Mobile number is required."}, status=status.HTTP_400_BAD_REQUEST)

        user = User.objects.filter(username=mobile_number).first()
        if not user:
            return Response({"message": "Patient not registered."}, status=status.HTTP_404_NOT_FOUND)

        patient_account = PatientAccount.objects.filter(user=user).first()
        if not patient_account:
            return Response({"message": "Patient account not found."}, status=status.HTTP_404_NOT_FOUND)

        serializer = PatientAccountSerializer(patient_account)
        return Response(serializer.data, status=status.HTTP_200_OK)


class PatientProfileSearchView(ListAPIView):
    serializer_class = PatientProfileSearchSerializer

    def get(self, request, *args, **kwargs):
        query = request.query_params.get('query', '').strip()
        cache_key = f"patient_search_{query}"
        cached_data = cache.get(cache_key)

        if cached_data:
            return Response(cached_data)

        queryset = PatientProfile.objects.select_related('account__user').annotate(
            similarity=TrigramSimilarity('first_name', query) +
                      TrigramSimilarity('last_name', query) +
                      TrigramSimilarity('account__user__username', query)
        ).filter(similarity__gt=0.2).order_by('-similarity')

        serializer = self.get_serializer(queryset, many=True)
        cache.set(cache_key, serializer.data, timeout=300)  # cache for 5 minutes
        return Response(serializer.data, status=status.HTTP_200_OK)


# ============================================
# Doctor EMR Patient Creation APIs
# ============================================

class CheckMobileView(APIView):
    """
    API-1: Check if patient exists by mobile number
    Endpoint: POST /api/patients/check-mobile/
    Authorization: Doctor / Clinic Staff only
    """
    permission_classes = [IsAuthenticated, IsDoctorOrHelpdesk]
    authentication_classes = [JWTAuthentication]

    def post(self, request):
        serializer = CheckMobileSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({
                "status": "error",
                "message": "Invalid mobile number",
                "errors": serializer.errors
            }, status=status.HTTP_400_BAD_REQUEST)

        mobile = serializer.validated_data['mobile']

        try:
            # Check if user exists
            user = User.objects.get(username=mobile)
            
            # Check if PatientAccount exists
            try:
                patient_account = PatientAccount.objects.get(user=user)
                profiles = PatientProfile.objects.filter(account=patient_account, is_active=True)
                
                profile_data = []
                for profile in profiles:
                    profile_data.append({
                        "profile_id": str(profile.id),
                        "full_name": f"{profile.first_name} {profile.last_name}".strip(),
                        "relation": profile.relation,
                        "gender": profile.gender,
                        "date_of_birth": profile.date_of_birth.isoformat() if profile.date_of_birth else None
                    })
                
                return Response({
                    "status": "success",
                    "exists": True,
                    "patient_account_id": str(patient_account.id),
                    "profiles": profile_data
                }, status=status.HTTP_200_OK)
            except PatientAccount.DoesNotExist:
                # User exists but no PatientAccount
                return Response({
                    "status": "success",
                    "exists": False,
                    "message": "Patient not found. Ready to create."
                }, status=status.HTTP_200_OK)

        except User.DoesNotExist:
            return Response({
                "status": "success",
                "exists": False,
                "message": "Patient not found. Ready to create."
            }, status=status.HTTP_200_OK)


class CreatePatientView(APIView):
    """
    API-2: Create Patient (Doctor Flow)
    Endpoint: POST /api/patients/create/
    Authorization: Doctor / Clinic Staff only
    Creates User, PatientAccount, and default PatientProfile (self) in a transaction
    """
    permission_classes = [IsAuthenticated, IsDoctorOrHelpdesk]
    authentication_classes = [JWTAuthentication]

    @transaction.atomic
    def post(self, request):
        try:
            logger.info("=" * 80)
            logger.info("CreatePatientView: Starting patient creation")
            logger.info(f"Request user: {request.user} (ID: {request.user.id})")
            logger.info(f"Request data: {request.data}")
            logger.info(f"Request method: {request.method}")
            
            # Debug: Check user groups
            user_groups = list(request.user.groups.values_list('name', flat=True))
            logger.info(f"User groups: {user_groups}")
            
            # Step 1: Validate serializer
            logger.info("Step 1: Validating serializer...")
            serializer = CreatePatientSerializer(data=request.data)
            if not serializer.is_valid():
                logger.error(f"Serializer validation failed: {serializer.errors}")
                return Response({
                    "status": "error",
                    "message": "Validation failed",
                    "errors": serializer.errors,
                    "debug": {
                        "raw_data": request.data,
                        "validation_errors": serializer.errors
                    }
                }, status=status.HTTP_400_BAD_REQUEST)
            
            logger.info("Step 1: Serializer validation passed")
            logger.info(f"Validated data: {serializer.validated_data}")

            mobile = serializer.validated_data['mobile']
            first_name = serializer.validated_data['first_name']
            last_name = serializer.validated_data['last_name']
            gender = serializer.validated_data['gender']
            date_of_birth = serializer.validated_data['date_of_birth']
            
            logger.info(f"Extracted data - Mobile: {mobile}, Name: {first_name} {last_name}, Gender: {gender}, DOB: {date_of_birth}")

            # Step 2: Check/Create User
            logger.info("Step 2: Checking/Creating User...")
            try:
                # Try to get existing user with lock
                logger.info(f"Attempting to get user with username: {mobile}")
                user = User.objects.select_for_update().get(username=mobile)
                logger.info(f"User found: {user.id} (is_active: {user.is_active})")
            except User.DoesNotExist:
                logger.info("User does not exist, creating new user...")
                try:
                    # Create new user
                    user = User.objects.create(
                        username=mobile,
                        first_name="",  # Set empty first_name as required by model
                        is_active=False  # Patient needs to verify via OTP later
                    )
                    logger.info(f"User created successfully: {user.id}")
                    
                    # Assign to patient group
                    logger.info("Assigning user to patient group...")
                    patient_group, created = Group.objects.get_or_create(name="patient")
                    logger.info(f"Patient group: {patient_group.name} (created: {created})")
                    user.groups.add(patient_group)
                    user.save()
                    logger.info("User assigned to patient group successfully")
                except Exception as e:
                    logger.error(f"Error creating user: {str(e)}")
                    logger.error(traceback.format_exc())
                    return Response({
                        "status": "error",
                        "message": f"Error creating user: {str(e)}",
                        "debug": {
                            "error_type": type(e).__name__,
                            "error_message": str(e),
                            "traceback": traceback.format_exc()
                        }
                    }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            except Exception as e:
                logger.error(f"Unexpected error in user lookup/creation: {str(e)}")
                logger.error(traceback.format_exc())
                return Response({
                    "status": "error",
                    "message": f"Unexpected error: {str(e)}",
                    "debug": {
                        "error_type": type(e).__name__,
                        "error_message": str(e),
                        "traceback": traceback.format_exc()
                    }
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

            # Step 3: Check/Create PatientAccount
            logger.info("Step 3: Checking/Creating PatientAccount...")
            patient_account = None
            
            # Use raw SQL to check if PatientAccount exists to avoid issues with missing columns
            # This works even if migrations haven't been run
            try:
                from django.db import connection
                with connection.cursor() as cursor:
                    cursor.execute(
                        "SELECT id FROM patient_account_patientaccount WHERE user_id = %s",
                        [str(user.id)]
                    )
                    row = cursor.fetchone()
                    if row:
                        account_id = row[0]
                        logger.info(f"PatientAccount found via raw SQL: {account_id}")
                        # Get the account using only essential fields to avoid column issues
                        try:
                            patient_account = PatientAccount.objects.only('id', 'user').get(id=account_id)
                            logger.info(f"PatientAccount retrieved: {patient_account.id}")
                        except Exception as get_error:
                            # Even with only(), might fail if accessing the object triggers other field access
                            # Use raw SQL to get the account_id and create a minimal object
                            logger.warning(f"Could not retrieve full PatientAccount object: {get_error}")
                            logger.info("Using account_id from raw SQL query")
                            # We'll use the account_id directly for profile checks
                            patient_account_id = account_id
                    else:
                        logger.info("PatientAccount does not exist in database")
            except Exception as db_error:
                # Check if it's a database schema error
                error_str = str(db_error)
                if 'does not exist' in error_str or 'column' in error_str.lower() or 'ProgrammingError' in str(type(db_error)):
                    logger.error(f"Database schema error: {error_str}")
                    logger.error("Migrations may not have been run. Please run: python manage.py migrate")
                    return Response({
                        "status": "error",
                        "message": "Database schema is out of sync. Please run migrations.",
                        "error_details": str(db_error),
                        "debug": {
                            "error_type": "DatabaseSchemaError",
                            "error_message": str(db_error),
                            "solution": "Run: python manage.py migrate patient_account"
                        }
                    }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
                # Re-raise if it's a different error
                raise
            
            # If account exists, check for self profile
            if patient_account or 'patient_account_id' in locals():
                account_for_check = patient_account if patient_account else None
                account_id_for_check = patient_account.id if patient_account else patient_account_id
                
                logger.info("Checking if self profile exists...")
                # Use raw SQL to check for profile to avoid column issues
                try:
                    from django.db import connection
                    with connection.cursor() as cursor:
                        cursor.execute(
                            "SELECT id FROM patient_account_patientprofile WHERE account_id = %s AND relation = %s",
                            [str(account_id_for_check), 'self']
                        )
                        profile_row = cursor.fetchone()
                        if profile_row:
                            logger.warning("Self profile already exists, returning conflict")
                            return Response({
                                "status": "error",
                                "message": "Patient already exists",
                                "patient_account_id": str(account_id_for_check),
                                "debug": {
                                    "user_id": str(user.id),
                                    "patient_account_id": str(account_id_for_check),
                                    "has_self_profile": True
                                }
                            }, status=status.HTTP_409_CONFLICT)
                except Exception as profile_check_error:
                    logger.warning(f"Error checking profile with raw SQL: {profile_check_error}")
                    # Fallback to ORM if raw SQL fails
                    if account_for_check:
                        if PatientProfile.objects.filter(account=account_for_check, relation='self').exists():
                            return Response({
                                "status": "error",
                                "message": "Patient already exists",
                                "patient_account_id": str(account_id_for_check)
                            }, status=status.HTTP_409_CONFLICT)
                
                logger.info("No self profile found, proceeding...")
                # Use the existing account
                if not patient_account:
                    # Get the account object for later use
                    try:
                        patient_account = PatientAccount.objects.only('id', 'user').get(id=account_id_for_check)
                    except:
                        # If we can't get it, we'll need to create a new one or handle differently
                        logger.error("Could not retrieve PatientAccount object")
                        return Response({
                            "status": "error",
                            "message": "Could not retrieve patient account",
                            "debug": {"account_id": str(account_id_for_check)}
                        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            else:
                # Account doesn't exist, create it
                logger.info("PatientAccount does not exist, creating new one...")
                try:
                    # Create PatientAccount
                    logger.info(f"Creating PatientAccount with user: {user.id}, created_by: {request.user.id}")
                    
                    # Try to create with all fields first
                    try:
                        patient_account = PatientAccount.objects.create(
                            user=user,
                            created_by=request.user,
                            onboarding_source='doctor'
                        )
                        logger.info(f"PatientAccount created successfully with all fields: {patient_account.id}")
                    except Exception as create_error:
                        error_str = str(create_error)
                        # If it's a column missing error, try without created_by and onboarding_source
                        if 'does not exist' in error_str or 'column' in error_str.lower() or 'ProgrammingError' in str(type(create_error)):
                            logger.warning(f"Database schema error when creating with created_by: {error_str}")
                            logger.warning("Attempting to create PatientAccount without created_by and onboarding_source fields")
                            # Try creating without those fields using raw SQL
                            try:
                                from django.db import connection
                                import uuid
                                new_account_id = uuid.uuid4()
                                with connection.cursor() as cursor:
                                    cursor.execute(
                                        "INSERT INTO patient_account_patientaccount (id, user_id, is_active, created_at, updated_at) VALUES (%s, %s, %s, NOW(), NOW())",
                                        [str(new_account_id), str(user.id), True]
                                    )
                                # Get the created account
                                patient_account = PatientAccount.objects.only('id', 'user').get(id=new_account_id)
                                logger.info(f"PatientAccount created successfully via raw SQL without created_by: {patient_account.id}")
                                logger.warning("NOTE: Please run migrations to add created_by and onboarding_source fields")
                            except Exception as raw_create_error:
                                logger.error(f"Error creating PatientAccount via raw SQL: {raw_create_error}")
                                # Last resort: try ORM without optional fields
                                patient_account = PatientAccount.objects.create(user=user)
                                logger.info(f"PatientAccount created via ORM fallback: {patient_account.id}")
                        else:
                            # Re-raise if it's a different error
                            raise
                except Exception as e:
                    logger.error(f"Error creating PatientAccount: {str(e)}")
                    logger.error(traceback.format_exc())
                    error_str = str(e)
                    if 'does not exist' in error_str or 'column' in error_str.lower() or 'ProgrammingError' in str(type(e)):
                        return Response({
                            "status": "error",
                            "message": "Database schema is out of sync. Please run migrations.",
                            "error_details": str(e),
                            "debug": {
                                "error_type": "DatabaseSchemaError",
                                "error_message": str(e),
                                "solution": "Run: python manage.py migrate patient_account"
                            }
                        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
                    return Response({
                        "status": "error",
                        "message": f"Error creating patient account: {str(e)}",
                        "debug": {
                            "error_type": type(e).__name__,
                            "error_message": str(e),
                            "traceback": traceback.format_exc(),
                            "user_id": str(user.id)
                        }
                    }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

            # Step 4: Create PatientProfile
            logger.info("Step 4: Creating PatientProfile (self)...")
            try:
                logger.info(f"Creating profile with account: {patient_account.id}, name: {first_name} {last_name}")
                profile = PatientProfile.objects.create(
                    account=patient_account,
                    first_name=first_name,
                    last_name=last_name,
                    relation='self',
                    gender=gender,
                    date_of_birth=date_of_birth
                )
                logger.info(f"PatientProfile created successfully: {profile.id}")
            except Exception as e:
                logger.error(f"Error creating PatientProfile: {str(e)}")
                logger.error(traceback.format_exc())
                return Response({
                    "status": "error",
                    "message": f"Error creating patient profile: {str(e)}",
                    "debug": {
                        "error_type": type(e).__name__,
                        "error_message": str(e),
                        "traceback": traceback.format_exc(),
                        "patient_account_id": str(patient_account.id),
                        "profile_data": {
                            "first_name": first_name,
                            "last_name": last_name,
                            "gender": gender,
                            "date_of_birth": str(date_of_birth) if date_of_birth else None
                        }
                    }
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

            # Success response
            logger.info("=" * 80)
            logger.info("CreatePatientView: Patient created successfully")
            logger.info(f"Patient Account ID: {patient_account.id}")
            logger.info(f"Profile ID: {profile.id}")
            logger.info("=" * 80)
            
            return Response({
                "status": "success",
                "message": "Patient created successfully",
                "patient_account_id": str(patient_account.id),
                "profile_id": str(profile.id),
                "is_mobile_verified": False,
                "debug": {
                    "user_id": str(user.id),
                    "patient_account_id": str(patient_account.id),
                    "profile_id": str(profile.id)
                }
            }, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            logger.error("=" * 80)
            logger.error("CreatePatientView: UNEXPECTED ERROR")
            logger.error(f"Error type: {type(e).__name__}")
            logger.error(f"Error message: {str(e)}")
            logger.error(traceback.format_exc())
            logger.error("=" * 80)
            
            return Response({
                "status": "error",
                "message": f"Unexpected error occurred: {str(e)}",
                "debug": {
                    "error_type": type(e).__name__,
                    "error_message": str(e),
                    "traceback": traceback.format_exc(),
                    "request_data": request.data if hasattr(request, 'data') else None
                }
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class PatientProfilesByAccountView(APIView):
    """
    API-3 & API-4: Get/Add Patient Profiles
    Endpoint: GET/POST /api/patients/{patient_account_id}/profiles/
    Authorization: Doctor / Clinic Staff only
    """
    permission_classes = [IsAuthenticated, IsDoctorOrHelpdesk]
    authentication_classes = [JWTAuthentication]

    def get(self, request, patient_account_id):
        """
        API-4: Get Patient Profiles
        """
        try:
            patient_account = PatientAccount.objects.get(id=patient_account_id)
        except PatientAccount.DoesNotExist:
            return Response({
                "status": "error",
                "message": "Patient account not found"
            }, status=status.HTTP_404_NOT_FOUND)

        profiles = PatientProfile.objects.filter(account=patient_account, is_active=True)
        serializer = PatientProfileListSerializer(profiles, many=True)

        return Response({
            "status": "success",
            "profiles": serializer.data
        }, status=status.HTTP_200_OK)

    def post(self, request, patient_account_id):
        """
        API-3: Add Family Member
        """
        try:
            patient_account = PatientAccount.objects.get(id=patient_account_id)
        except PatientAccount.DoesNotExist:
            return Response({
                "status": "error",
                "message": "Patient account not found"
            }, status=status.HTTP_404_NOT_FOUND)

        serializer = AddFamilyMemberSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({
                "status": "error",
                "message": "Validation failed",
                "errors": serializer.errors
            }, status=status.HTTP_400_BAD_REQUEST)

        # Check for duplicate profiles based on relation
        relation = serializer.validated_data.get('relation')
        first_name = serializer.validated_data.get('first_name')
        date_of_birth = serializer.validated_data.get('date_of_birth')

        # For non-child relations, only one profile per relation is allowed
        if relation in ['self', 'father', 'mother', 'spouse']:
            if PatientProfile.objects.filter(account=patient_account, relation=relation).exists():
                return Response({
                    "status": "error",
                    "message": f"A profile for {relation} already exists."
                }, status=status.HTTP_400_BAD_REQUEST)

        # For child relations, check for duplicate first_name + date_of_birth
        if relation == 'child':
            if PatientProfile.objects.filter(
                account=patient_account,
                relation='child',
                first_name=first_name,
                date_of_birth=date_of_birth
            ).exists():
                return Response({
                    "status": "error",
                    "message": "A child profile with the same first name and date of birth already exists."
                }, status=status.HTTP_400_BAD_REQUEST)

        # Create the profile
        profile = PatientProfile.objects.create(
            account=patient_account,
            **serializer.validated_data
        )

        return Response({
            "status": "success",
            "message": "Family member added",
            "profile_id": str(profile.id)
        }, status=status.HTTP_201_CREATED)


# ============================================
# Patient Selection Management APIs (Doctor EMR)
# ============================================

class SelectPatientView(APIView):
    """
    API: Select/Set Current Patient
    Endpoint: POST /api/patients/select/
    Authorization: Doctor / Clinic Staff only
    Allows doctor to select a patient for consultation
    """
    permission_classes = [IsAuthenticated, IsDoctorOrHelpdesk]
    authentication_classes = [JWTAuthentication]

    def post(self, request):
        serializer = SelectPatientSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({
                "status": "error",
                "message": "Validation failed",
                "errors": serializer.errors
            }, status=status.HTTP_400_BAD_REQUEST)

        profile_id = serializer.validated_data.get('profile_id')
        patient_account_id = serializer.validated_data.get('patient_account_id')
        doctor_id = str(request.user.id)
        
        # Cache key for storing selected patient
        cache_key = f"selected_patient_{doctor_id}"
        
        try:
            # If profile_id is provided, get profile and account
            if profile_id:
                try:
                    profile = PatientProfile.objects.select_related('account', 'account__user').get(id=profile_id)
                    patient_account = profile.account
                    profile_name = f"{profile.first_name} {profile.last_name}".strip()
                    mobile = patient_account.user.username
                except PatientProfile.DoesNotExist:
                    return Response({
                        "status": "error",
                        "message": "Patient profile not found"
                    }, status=status.HTTP_404_NOT_FOUND)
            
            # If only patient_account_id is provided, get the primary (self) profile
            elif patient_account_id:
                try:
                    patient_account = PatientAccount.objects.select_related('user').get(id=patient_account_id)
                    profile = PatientProfile.objects.filter(account=patient_account, relation='self').first()
                    if not profile:
                        return Response({
                            "status": "error",
                            "message": "Primary patient profile not found"
                        }, status=status.HTTP_404_NOT_FOUND)
                    profile_id = profile.id
                    profile_name = f"{profile.first_name} {profile.last_name}".strip()
                    mobile = patient_account.user.username
                except PatientAccount.DoesNotExist:
                    return Response({
                        "status": "error",
                        "message": "Patient account not found"
                    }, status=status.HTTP_404_NOT_FOUND)
            
            # Store selection in cache (expires in 24 hours)
            selection_data = {
                'profile_id': str(profile_id),
                'patient_account_id': str(patient_account.id),
                'profile_name': profile_name,
                'mobile': mobile,
                'selected_at': timezone.now().isoformat(),
                'selected_by': doctor_id
            }
            
            cache.set(cache_key, selection_data, timeout=86400)  # 24 hours
            
            logger.info(f"Patient selected by doctor {doctor_id}: Profile {profile_id}, Account {patient_account.id}")
            
            return Response({
                "status": "success",
                "message": "Patient selected successfully",
                "data": selection_data
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Error selecting patient: {str(e)}")
            logger.error(traceback.format_exc())
            return Response({
                "status": "error",
                "message": f"Error selecting patient: {str(e)}",
                "debug": {
                    "error_type": type(e).__name__,
                    "error_message": str(e)
                }
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class GetSelectedPatientView(APIView):
    """
    API: Get Currently Selected Patient
    Endpoint: GET /api/patients/selected/
    Authorization: Doctor / Clinic Staff only
    Returns the currently selected patient for the doctor
    """
    permission_classes = [IsAuthenticated, IsDoctorOrHelpdesk]
    authentication_classes = [JWTAuthentication]

    def get(self, request):
        doctor_id = str(request.user.id)
        cache_key = f"selected_patient_{doctor_id}"
        
        selected_data = cache.get(cache_key)
        
        if not selected_data:
            return Response({
                "status": "success",
                "message": "No patient currently selected",
                "data": None
            }, status=status.HTTP_200_OK)
        
        return Response({
            "status": "success",
            "message": "Selected patient retrieved",
            "data": selected_data
        }, status=status.HTTP_200_OK)


class ClearSelectedPatientView(APIView):
    """
    API: Clear/Unselect Current Patient
    Endpoint: DELETE /api/patients/selected/
    Authorization: Doctor / Clinic Staff only
    Clears the currently selected patient
    """
    permission_classes = [IsAuthenticated, IsDoctorOrHelpdesk]
    authentication_classes = [JWTAuthentication]

    def delete(self, request):
        doctor_id = str(request.user.id)
        cache_key = f"selected_patient_{doctor_id}"
        
        # Get current selection before clearing (for response)
        selected_data = cache.get(cache_key)
        
        # Clear the selection
        cache.delete(cache_key)
        
        logger.info(f"Patient selection cleared by doctor {doctor_id}")
        
        if selected_data:
            return Response({
                "status": "success",
                "message": "Patient selection cleared successfully",
                "cleared_data": selected_data
            }, status=status.HTTP_200_OK)
        else:
            return Response({
                "status": "success",
                "message": "No patient was selected",
                "cleared_data": None
            }, status=status.HTTP_200_OK)
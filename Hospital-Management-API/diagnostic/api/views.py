import os
from django.db import transaction
from rest_framework import generics, status, viewsets
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.exceptions import NotFound
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework_simplejwt.authentication import JWTAuthentication
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from rest_framework import filters
from django_filters.rest_framework import DjangoFilterBackend
from django.shortcuts import get_object_or_404
from django.db.models import Q
from rest_framework_simplejwt.views import (
    TokenRefreshView as SimpleJWTRefreshView,
    TokenVerifyView as SimpleJWTVerifyView
)
from account.models import User
from django.core.exceptions import ValidationError
from rest_framework.permissions import AllowAny
# Maintain ordering using Case/When
from django.db.models import Case, When
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.utils.timezone import now
from django.utils.dateparse import parse_datetime
from django.core.exceptions import ValidationError
from patient_account.models import PatientProfile
from utils.utils import api_response
import uuid
from rest_framework.pagination import PageNumberPagination
from diagnostic.models import (MedicalTest,
                               TestCategory,ImagingView,TestRecommendation,
                               PackageRecommendation,TestPackage,DiagnosticLab,
                               DiagnosticLabAddress,TestCategory,TestLabMapping,
                               ImagingView,PackageLabMapping,LabAdminUser,
                                   DiagnosticLab,TestLabMapping,TestBooking,BookingGroup,TestRecommendation,
                                   DiagnosticLab, MedicalTest,TestLabMapping, TestRecommendation, BookingGroup,
                                   TestBooking, TestReport,BookingGroup,)
from diagnostic.api.serializers import (
    MedicalTestSerializer,TestCategorySerializer,ImagingViewSerializer,TestPackageSerializer,
    TestRecommendationSerializer,PackageRecommendationSerializer,BulkPackageRecommendationSerializer,
    LabAdminRegistrationSerializer,LabAdminLoginSerializer,TestCategorySerializer,
    DiagnosticLabSerializer,DiagnosticLabAddressSerializer,
    TestLabMappingSerializer,PackageLabMappingSerializer,
    ManualBookingSerializer,UpdateBookingSerializer,
    BookingGroupSerializer,
    BookingListSerializer,BookingStatusUpdateSerializer,RescheduleBookingSerializer,
    HomeCollectionConfirmSerializer,HomeCollectionRejectSerializer,
    HomeCollectionRescheduleSerializer,MarkCollectedSerializer,
    BookingGroupListSerializer,LabReportUploadSerializer,BookingGroupTestListSerializer,
    TestReportDownloadSerializer,TestReportDetailsSerializer,TestReportDetailsSerializer,)
from consultations.models import Consultation
from account.permissions import IsDoctor, IsAdminUser,IsLabAdmin,IsPatient,IsHelpdeskOrLabAdmin
from django.core.exceptions import ValidationError
from django.db import transaction
from django.utils import timezone
from django_filters.rest_framework import DjangoFilterBackend
from django.core.paginator import Paginator
from math import radians, cos, sin, asin, sqrt
from diagnostic.filters import DiagnosticLabAddressFilter
from rest_framework import viewsets, status, filters
from rest_framework.response import Response
from diagnostic.response_format import success_response, error_response
from rest_framework.parsers import MultiPartParser, FormParser
import hashlib
from django.shortcuts import get_object_or_404
from rest_framework.exceptions import NotFound
from rest_framework.generics import ListAPIView
from patient_account.models import PatientProfile, PatientAccount
class ImagingViewViewSet(viewsets.ModelViewSet):
    queryset = ImagingView.objects.all().order_by('name')
    serializer_class = ImagingViewSerializer
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    search_fields = ['name', 'code', 'description']
    ordering_fields = ['name', 'code']

# class TestRecommendationViewSet(viewsets.ModelViewSet):
#     serializer_class = TestRecommendationSerializer
#     authentication_classes = [JWTAuthentication]
#     permission_classes = [IsAuthenticated]

#     def get_queryset(self):
#         consultation_id = self.kwargs.get('consultation_id')
#         return TestRecommendation.objects.filter(consultation_id=consultation_id)

#     def perform_create(self, serializer):
#         consultation_id = self.kwargs.get('consultation_id')
#         try:
#             consultation = Consultation.objects.get(id=consultation_id)
#         except Consultation.DoesNotExist:
#             raise NotFound("Consultation not found")
#         serializer.save(
#             consultation=consultation,
#             recommended_by=self.request.user
#         )

#     def get_object(self):
#         consultation_id = self.kwargs.get('consultation_id')
#         pk = self.kwargs.get('pk')
#         try:
#             return TestRecommendation.objects.get(id=pk, consultation_id=consultation_id)
#         except TestRecommendation.DoesNotExist:
#             raise NotFound("Test recommendation not found for this consultation.")

# class PackageRecommendationViewSet(viewsets.ModelViewSet):
#     serializer_class = PackageRecommendationSerializer
#     authentication_classes = [JWTAuthentication]
#     permission_classes = [IsAuthenticated]
#     def get_queryset(self):
#         consultation_id = self.kwargs.get('consultation_id')
#         return PackageRecommendation.objects.filter(consultation_id=consultation_id)

#     def get_object(self):
#         consultation_id = self.kwargs.get('consultation_id')
#         pk = self.kwargs.get('pk')
#         try:
#             return PackageRecommendation.objects.get(id=pk, consultation_id=consultation_id)
#         except PackageRecommendation.DoesNotExist:
#             raise NotFound("Package recommendation not found for this consultation.")

#     def perform_create(self, serializer):
#         consultation_id = self.kwargs.get('consultation_id')
#         try:
#             consultation = Consultation.objects.get(id=consultation_id)
#         except Consultation.DoesNotExist:
#             raise NotFound("Consultation not found")
#         serializer.save(
#             consultation=consultation,
#             recommended_by=self.request.user
#         )

#     @transaction.atomic
#     def create(self, request, *args, **kwargs):
#         serializer = self.get_serializer(data=request.data)
#         serializer.is_valid(raise_exception=True)
#         self.perform_create(serializer)
#         return api_response("success", "Package recommendation added", serializer.data, status.HTTP_201_CREATED)

#     @transaction.atomic
#     def update(self, request, *args, **kwargs):
#         partial = kwargs.pop('partial', False)
#         instance = self.get_object()
#         serializer = self.get_serializer(instance, data=request.data, partial=partial)
#         serializer.is_valid(raise_exception=True)
#         self.perform_update(serializer)
#         return api_response("success", "Package recommendation updated", serializer.data)

#     @transaction.atomic
#     def destroy(self, request, *args, **kwargs):
#         instance = self.get_object()
#         instance.delete()
#         return api_response("success", "Package recommendation deleted", None, status.HTTP_204_NO_CONTENT)

#     def retrieve(self, request, *args, **kwargs):
#         instance = self.get_object()
#         serializer = self.get_serializer(instance)
#         return api_response("success", "Package recommendation details", serializer.data)

#     def list(self, request, *args, **kwargs):
#         queryset = self.get_queryset()
#         serializer = self.get_serializer(queryset, many=True)
#         return api_response("success", "Package recommendations list", serializer.data)


class TestPackageListCreateView(generics.ListCreateAPIView):
    queryset = TestPackage.objects.all()
    serializer_class = TestPackageSerializer
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated,IsDoctor]

    def list(self, request, *args, **kwargs):
        packages = self.get_queryset()
        serializer = self.get_serializer(packages, many=True)
        return Response({
            "status": "success",
            "message": "Fetched successfully",
            "data": serializer.data
        })

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response({
                "status": "success",
                "message": "Package created successfully",
                "data": serializer.data
            }, status=status.HTTP_201_CREATED)
        return Response({
            "status": "error",
            "message": "Validation failed",
            "data": serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)


class TestPackageDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = TestPackage.objects.all()
    serializer_class = TestPackageSerializer
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated,IsDoctor]
    lookup_field = 'pk'

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        return Response({
            "status": "success",
            "message": "Fetched successfully",
            "data": serializer.data
        })

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        if serializer.is_valid():
            serializer.save()
            return Response({
                "status": "success",
                "message": "Package updated successfully",
                "data": serializer.data
            })
        return Response({
            "status": "error",
            "message": "Validation failed",
            "data": serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.delete()
        return Response({
            "status": "success",
            "message": "Package deleted successfully",
            "data": {}
        })


class BulkTestPackageCreateView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request):
        if not isinstance(request.data, list):
            return Response({
                "status": "error",
                "message": "Expected a list of packages.",
                "data": {}
            }, status=status.HTTP_400_BAD_REQUEST)

        serializer = TestPackageSerializer(data=request.data, many=True)
        if serializer.is_valid():
            with transaction.atomic():
                serializer.save()
            return Response({
                "status": "success",
                "message": "Packages created successfully",
                "data": serializer.data
            }, status=status.HTTP_201_CREATED)

        return Response({
            "status": "error",
            "message": "Validation failed",
            "data": serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)

class DiagnosticLabViewSet(viewsets.ModelViewSet):
    queryset = DiagnosticLab.objects.all()
    serializer_class = DiagnosticLabSerializer
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated, IsAdminUser]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['lab_type', 'is_active', 'home_sample_collection', 'pricing_tier']
    search_fields = ['name', 'contact']
    ordering_fields = ['created_at', 'updated_at']

    def haversine(self, lon1, lat1, lon2, lat2):
        lon1, lat1, lon2, lat2 = map(radians, [lon1, lat1, lon2, lat2])
        dlon = lon2 - lon1
        dlat = lat2 - lat1
        a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
        c = 2 * asin(sqrt(a))
        km = 6371 * c
        return km

    def get_queryset(self):
        queryset = super().get_queryset()
        pincode = self.request.query_params.get('pincode')
        if pincode:
            queryset = queryset.filter(service_pincodes__contains=[pincode])

        lat = self.request.query_params.get('latitude')
        lon = self.request.query_params.get('longitude')
        if lat and lon:
            lat = float(lat)
            lon = float(lon)
            labs_with_distance = []
            for lab in queryset:
                if hasattr(lab, 'address') and lab.address.latitude and lab.address.longitude:
                    distance = self.haversine(lon, lat, float(lab.address.longitude), float(lab.address.latitude))
                    labs_with_distance.append((lab.id, distance))
            labs_with_distance.sort(key=lambda x: x[1])
            lab_ids_ordered = [lab_id for lab_id, _ in labs_with_distance]
            preserved = Case(*[When(id=pk, then=pos) for pos, pk in enumerate(lab_ids_ordered)])
            queryset = queryset.filter(id__in=lab_ids_ordered).order_by(preserved)
    
        return queryset
    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        page_number = request.query_params.get('page', 1)
        page_size = request.query_params.get('page_size', 10)
        paginator = Paginator(queryset, page_size)
        page = paginator.get_page(page_number)
        serializer = self.get_serializer(page.object_list, many=True)
        return Response({
            "status": True,
            "message": "Diagnostic Labs fetched successfully",
            "total": paginator.count,
            "pages": paginator.num_pages,
            "current_page": page.number,
            "data": serializer.data
        }, status=status.HTTP_200_OK)

    def create(self, request, *args, **kwargs):
        with transaction.atomic():
            serializer = self.get_serializer(data=request.data)
            if serializer.is_valid():
                instance = DiagnosticLab.objects.filter(name__iexact=serializer.validated_data['name']).first()
                if instance:
                    return Response({
                        "status": False,
                        "message": "Lab with this name already exists.",
                        "data": {}
                    }, status=status.HTTP_400_BAD_REQUEST)
                lab = serializer.save()
                return Response({
                    "status": True,
                    "message": "Diagnostic Lab created successfully",
                    "data": DiagnosticLabSerializer(lab).data
                }, status=status.HTTP_201_CREATED)
            return Response({
                "status": False,
                "message": "Validation failed",
                "data": serializer.errors
            }, status=status.HTTP_400_BAD_REQUEST)

    def update(self, request, *args, **kwargs):
        with transaction.atomic():
            partial = kwargs.pop('partial', False)
            instance = self.get_object()
            serializer = self.get_serializer(instance, data=request.data, partial=partial)
            if serializer.is_valid():
                serializer.save()
                return Response({
                    "status": True,
                    "message": "Diagnostic Lab updated successfully",
                    "data": serializer.data
                }, status=status.HTTP_200_OK)
            return Response({
                "status": False,
                "message": "Validation failed",
                "data": serializer.errors
            }, status=status.HTTP_400_BAD_REQUEST)

    def partial_update(self, request, *args, **kwargs):
        kwargs['partial'] = True
        return self.update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.delete()
        return Response({
            "status": True,
            "message": "Diagnostic Lab deleted successfully",
            "data": {}
        }, status=status.HTTP_200_OK)


class DiagnosticLabAddressViewSet(viewsets.ModelViewSet):
    queryset = DiagnosticLabAddress.objects.select_related('lab').all().order_by('-created_at')
    serializer_class = DiagnosticLabAddressSerializer
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_class = DiagnosticLabAddressFilter
    search_fields = ['city', 'state', 'pincode', 'lab__name']
    ordering_fields = ['created_at', 'city', 'pincode']

    @transaction.atomic
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid():
            instance = serializer.save()
            return Response({
                "status": True,
                "message": "Diagnostic lab address created successfully.",
                "data": DiagnosticLabAddressSerializer(instance).data
            }, status=status.HTTP_201_CREATED)
        return Response({
            "status": False,
            "message": "Validation failed.",
            "data": serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)

    @transaction.atomic
    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        if serializer.is_valid():
            instance = serializer.save()
            return Response({
                "status": True,
                "message": "Diagnostic lab address updated successfully.",
                "data": DiagnosticLabAddressSerializer(instance).data
            }, status=status.HTTP_200_OK)
        return Response({
            "status": False,
            "message": "Update failed.",
            "data": serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)

    @transaction.atomic
    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.delete()
        return Response({
            "status": True,
            "message": "Diagnostic lab address deleted successfully.",
            "data": {}
        }, status=status.HTTP_200_OK)

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        return Response({
            "status": True,
            "message": "Diagnostic lab address fetched successfully.",
            "data": DiagnosticLabAddressSerializer(instance).data
        }, status=status.HTTP_200_OK)

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(queryset)
        serializer = DiagnosticLabAddressSerializer(page or queryset, many=True)
        return Response({
            "status": True,
            "message": "Diagnostic lab address list fetched successfully.",
            "data": serializer.data
        }, status=status.HTTP_200_OK)


class LabAdminRegisterView(generics.CreateAPIView):
    serializer_class = LabAdminRegistrationSerializer
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid():
            lab_admin = serializer.save()
            return Response({
                "status": True,
                "message": "Lab admin registered successfully.",
                "lab_admin_id": lab_admin.id
            }, status=status.HTTP_201_CREATED)
        return Response({
            "status": False,
            "message": "Validation failed.",
            "errors": serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)

class LabAdminLoginView(APIView):
    permission_classes = []
    authentication_classes = []

    def post(self, request):
        serializer = LabAdminLoginSerializer(data=request.data)
        if serializer.is_valid():
            return Response({
                "status": True,
                "message": "Login successful.",
                "data": serializer.validated_data
            }, status=status.HTTP_200_OK)
        return Response({
            "status": False,
            "message": "Login failed.",
            "errors": serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)

class LabAdminTokenRefreshView(SimpleJWTRefreshView):
    permission_classes = [AllowAny]

class LabAdminTokenVerifyView(SimpleJWTVerifyView):
    permission_classes = [AllowAny]

class TestCategoryViewSet(viewsets.ModelViewSet):
    queryset = TestCategory.objects.filter(is_active=True).order_by('-created_at')
    serializer_class = TestCategorySerializer
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated, IsAdminUser]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'modality']
    ordering_fields = ['created_at', 'name']

    @transaction.atomic
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid():
            instance = serializer.save()
            return Response({
                "status": True,
                "message": "Test category created successfully.",
                "data": TestCategorySerializer(instance).data
            }, status=status.HTTP_201_CREATED)
        return Response({
            "status": False,
            "message": "Validation failed.",
            "errors": serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)

    @transaction.atomic
    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        if serializer.is_valid():
            instance = serializer.save()
            return Response({
                "status": True,
                "message": "Test category updated successfully.",
                "data": TestCategorySerializer(instance).data
            }, status=status.HTTP_200_OK)
        return Response({
            "status": False,
            "message": "Update failed.",
            "errors": serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)

    @transaction.atomic
    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.is_active = False  # ✅ Soft delete
        instance.save()
        return Response({
            "status": True,
            "message": "Test category deleted (soft) successfully.",
            "data": {}
        }, status=status.HTTP_200_OK)

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(queryset)
        serializer = TestCategorySerializer(page or queryset, many=True)
        return Response({
            "status": True,
            "message": "Test categories fetched successfully.",
            "data": serializer.data
        }, status=status.HTTP_200_OK)

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        return Response({
            "status": True,
            "message": "Test category retrieved successfully.",
            "data": serializer.data
        }, status=status.HTTP_200_OK)
    

class ImagingViewSet(viewsets.ModelViewSet):
    queryset = ImagingView.objects.filter(is_active=True).order_by('-created_at')
    serializer_class = ImagingViewSerializer
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated, IsAdminUser]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'code']
    ordering_fields = ['created_at', 'name', 'code']
    filterset_fields = ['code', 'name']

    @transaction.atomic
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid():
            instance = serializer.save()
            return Response({
                "status": True,
                "message": "Imaging view created successfully.",
                "data": ImagingViewSerializer(instance).data
            }, status=status.HTTP_201_CREATED)
        return Response({
            "status": False,
            "message": "Validation failed.",
            "errors": serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)

    @transaction.atomic
    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        if serializer.is_valid():
            instance = serializer.save()
            return Response({
                "status": True,
                "message": "Imaging view updated successfully.",
                "data": ImagingViewSerializer(instance).data
            }, status=status.HTTP_200_OK)
        return Response({
            "status": False,
            "message": "Update failed.",
            "errors": serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)

    @transaction.atomic
    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.is_active = False
        instance.save()
        return Response({
            "status": True,
            "message": "Imaging view soft-deleted successfully.",
            "data": {}
        }, status=status.HTTP_200_OK)

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        return Response({
            "status": True,
            "message": "Imaging view fetched successfully.",
            "data": serializer.data
        }, status=status.HTTP_200_OK)

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(queryset)
        serializer = ImagingViewSerializer(page or queryset, many=True)
        return Response({
            "status": True,
            "message": "Imaging views fetched successfully.",
            "data": serializer.data
        }, status=status.HTTP_200_OK)

class MedicalTestViewSet(viewsets.ModelViewSet):
    queryset = MedicalTest.objects.filter(is_active=True).select_related('category', 'view').order_by('-created_at')
    serializer_class = MedicalTestSerializer
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated, IsAdminUser]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['type', 'fasting_required', 'category', 'view']
    search_fields = ['name', 'sample_required']
    ordering_fields = ['created_at', 'standard_price', 'name']

    @transaction.atomic
    def create(self, request, *args, **kwargs):
        name = request.data.get("name", "").strip().lower()
        existing = MedicalTest.objects.filter(name=name, is_active=False).first()
        if existing:
            serializer = self.get_serializer(existing, data=request.data, partial=True)
            if serializer.is_valid():
                instance = serializer.save(is_active=True)
                return Response({
                    "status": True,
                    "message": "Previously deleted medical test restored.",
                    "data": self.get_serializer(instance).data
                }, status=status.HTTP_200_OK)
            return Response({
                "status": False,
                "message": "Restore failed.",
                "errors": serializer.errors
            }, status=status.HTTP_400_BAD_REQUEST)

        return super().create(request, *args, **kwargs)
    @transaction.atomic
    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        if serializer.is_valid():
            instance = serializer.save()
            return Response({
                "status": True,
                "message": "Medical test updated successfully.",
                "data": MedicalTestSerializer(instance).data
            }, status=status.HTTP_200_OK)
        return Response({
            "status": False,
            "message": "Update failed.",
            "errors": serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)

    @transaction.atomic
    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.is_active = False
        instance.save()
        return Response({
            "status": True,
            "message": "Medical test soft-deleted successfully.",
            "data": {}
        }, status=status.HTTP_200_OK)

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        return Response({
            "status": True,
            "message": "Medical test fetched successfully.",
            "data": serializer.data
        }, status=status.HTTP_200_OK)

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(queryset)
        serializer = self.get_serializer(page or queryset, many=True)
        return Response({
            "status": True,
            "message": "Medical tests fetched successfully.",
            "data": serializer.data
        }, status=status.HTTP_200_OK)

class TestPackageViewSet(viewsets.ModelViewSet):
    queryset = TestPackage.objects.filter(is_active=True).prefetch_related('tests')
    serializer_class = TestPackageSerializer
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated, IsAdminUser]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['category']
    search_fields = ['name', 'description']
    ordering_fields = ['name', 'created_at', 'standard_price']

    @transaction.atomic
    def create(self, request, *args, **kwargs):
        name = request.data.get("name", "").strip()
        existing = TestPackage.objects.filter(name__iexact=name, is_active=False).first()
        if existing:
            serializer = self.get_serializer(existing, data=request.data, partial=True)
            if serializer.is_valid():
                instance = serializer.save(is_active=True)
                instance.tests.set(request.data.get("tests", []))
                return Response({
                    "status": True,
                    "message": "Previously deleted package restored.",
                    "data": self.get_serializer(instance).data
                }, status=status.HTTP_200_OK)
            return Response({
                "status": False,
                "message": "Restore failed.",
                "errors": serializer.errors
            }, status=status.HTTP_400_BAD_REQUEST)

        return super().create(request, *args, **kwargs)

    @transaction.atomic
    def update(self, request, *args, **kwargs):
        return self._update_common(request, partial=False, **kwargs)

    @transaction.atomic
    def partial_update(self, request, *args, **kwargs):
        return self._update_common(request, partial=True, **kwargs)

    def _update_common(self, request, partial=False, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        if serializer.is_valid():
            updated_instance = serializer.save()
            if "tests" in request.data:
                updated_instance.tests.set(request.data["tests"])
            return Response({
                "status": True,
                "message": "Package updated successfully.",
                "data": self.get_serializer(updated_instance).data
            }, status=status.HTTP_200_OK)
        return Response({
            "status": False,
            "message": "Update failed.",
            "errors": serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)

    @transaction.atomic
    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.is_active = False
        instance.save()
        return Response({
            "status": True,
            "message": "Package soft-deleted successfully.",
            "data": {}
        }, status=status.HTTP_200_OK)

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        serializer = self.get_serializer(queryset, many=True)
        return Response({
            "status": True,
            "message": "Packages fetched successfully.",
            "data": serializer.data
        })

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        return Response({
            "status": True,
            "message": "Package retrieved successfully.",
            "data": serializer.data
        })

class TestLabMappingViewSet(viewsets.ModelViewSet):
    serializer_class = TestLabMappingSerializer
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated, IsLabAdmin]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["test", "is_available", "home_collection_available"]
    search_fields = ["test__name"]
    ordering_fields = ["price", "turnaround_time", "created_at"]

    def get_queryset(self):
        lab = self.request.user.lab_admin_profile.lab
        return TestLabMapping.objects.filter(lab=lab, is_active=True).select_related("test")

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context["lab"] = self.request.user.lab_admin_profile.lab
        return context

    @transaction.atomic
    def create(self, request, *args, **kwargs):
        lab = request.user.lab_admin_profile.lab
        test = request.data.get("test")

        # Restore previously soft-deleted record if exists
        existing = TestLabMapping.objects.filter(test_id=test, lab=lab, is_active=False).first()
        if existing:
            serializer = self.get_serializer(existing, data=request.data, partial=True)
            if serializer.is_valid():
                instance = serializer.save(is_active=True, lab=lab)  # ✅ FIX: set lab here
                return Response({
                    "status": True,
                    "message": "Mapping restored successfully.",
                    "data": self.get_serializer(instance).data
                }, status=status.HTTP_200_OK)
            return Response({
                "status": False,
                "message": "Validation failed.",
                "errors": serializer.errors
            }, status=status.HTTP_400_BAD_REQUEST)

        # Standard create: inject lab manually
        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid():
            instance = serializer.save(lab=lab)  # ✅ FIX: set lab here
            return Response({
                "status": True,
                "message": "Mapping created successfully.",
                "data": self.get_serializer(instance).data
            }, status=status.HTTP_201_CREATED)
        return Response({
            "status": False,
            "message": "Validation failed.",
            "errors": serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)

    @transaction.atomic
    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.is_active = False
        instance.save()
        return Response({
            "status": True,
            "message": "Mapping deleted (soft).",
            "data": {}
        }, status=status.HTTP_200_OK)

    @transaction.atomic
    def update(self, request, *args, **kwargs):
        return self._update_common(request, partial=False, **kwargs)

    @transaction.atomic
    def partial_update(self, request, *args, **kwargs):
        return self._update_common(request, partial=True, **kwargs)

    def _update_common(self, request, partial, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        if serializer.is_valid():
            updated = serializer.save()
            return Response({
                "status": True,
                "message": "Mapping updated successfully.",
                "data": self.get_serializer(updated).data
            }, status=status.HTTP_200_OK)
        return Response({
            "status": False,
            "message": "Update failed.",
            "errors": serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        serializer = self.get_serializer(queryset, many=True)
        return Response({
            "status": True,
            "message": "Lab mappings fetched successfully.",
            "data": serializer.data
        })

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        return Response({
            "status": True,
            "message": "Lab mapping fetched.",
            "data": serializer.data
        })


class PackageLabMappingViewSet(viewsets.ModelViewSet):
    serializer_class = PackageLabMappingSerializer
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated, IsLabAdmin]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["package", "is_available", "home_collection_available"]
    search_fields = ["package__name"]
    ordering_fields = ["price", "turnaround_time", "created_at"]

    def get_queryset(self):
        lab = self.request.user.lab_admin_profile.lab
        return PackageLabMapping.objects.filter(lab=lab, is_active=True).select_related("package")

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context["lab"] = self.request.user.lab_admin_profile.lab
        return context

    @transaction.atomic
    def create(self, request, *args, **kwargs):
        lab = request.user.lab_admin_profile.lab
        package_id = request.data.get("package")
        existing = PackageLabMapping.objects.filter(package_id=package_id, lab=lab, is_active=False).first()
        if existing:
            serializer = self.get_serializer(existing, data=request.data, partial=True)
            if serializer.is_valid():
                instance = serializer.save(is_active=True, lab=lab)
                return Response({
                    "status": True,
                    "message": "Mapping restored successfully.",
                    "data": self.get_serializer(instance).data
                }, status=status.HTTP_200_OK)
            return Response({
                "status": False,
                "message": "Validation failed.",
                "errors": serializer.errors
            }, status=status.HTTP_400_BAD_REQUEST)

        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid():
            instance = serializer.save(lab=lab)
            return Response({
                "status": True,
                "message": "Mapping created successfully.",
                "data": self.get_serializer(instance).data
            }, status=status.HTTP_201_CREATED)
        return Response({
            "status": False,
            "message": "Validation failed.",
            "errors": serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)

    @transaction.atomic
    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.is_active = False
        instance.save()
        return Response({
            "status": True,
            "message": "Mapping soft-deleted.",
            "data": {}
        }, status=status.HTTP_200_OK)

    @transaction.atomic
    def update(self, request, *args, **kwargs):
        return self._update_common(request, partial=False, **kwargs)

    @transaction.atomic
    def partial_update(self, request, *args, **kwargs):
        return self._update_common(request, partial=True, **kwargs)

    def _update_common(self, request, partial, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        if serializer.is_valid():
            updated = serializer.save()
            return Response({
                "status": True,
                "message": "Mapping updated successfully.",
                "data": self.get_serializer(updated).data
            })
        return Response({
            "status": False,
            "message": "Update failed.",
            "errors": serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        serializer = self.get_serializer(queryset, many=True)
        return Response({
            "status": True,
            "message": "Package mappings fetched successfully.",
            "data": serializer.data
        })

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        return Response({
            "status": True,
            "message": "Mapping fetched.",
            "data": serializer.data
        })

class FilterLabsByTestView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated, IsPatient]

    def get(self, request):
        test_id = request.query_params.get("test")
        pincode = request.query_params.get("pincode")
        sort_by_price = request.query_params.get("sort_by_price", "asc")
        sort_by_tat = request.query_params.get("sort_by_turnaround")

        # Basic validation
        if not test_id or not pincode:
            return Response({
                "status": False,
                "message": "Both 'test' and 'pincode' are required.",
                "data": {}
            }, status=status.HTTP_400_BAD_REQUEST)

        try:
            filters = Q(
                test_id=test_id,
                is_available=True,
                is_active=True,
                lab__is_active=True,
                lab__address__pincode=pincode
            )

            if request.query_params.get("home_collection") == "true":
                filters &= Q(home_collection_available=True)

            if max_price := request.query_params.get("max_price"):
                filters &= Q(price__lte=float(max_price))

            if min_price := request.query_params.get("min_price"):
                filters &= Q(price__gte=float(min_price))

            if tier := request.query_params.get("pricing_tier"):
                filters &= Q(lab__pricing_tier=tier)

            if lab_type := request.query_params.get("lab_type"):
                filters &= Q(lab__lab_type=lab_type)

        except ValueError as e:
            return Response({
                "status": False,
                "message": f"Invalid parameter: {str(e)}",
                "data": {}
            }, status=status.HTTP_400_BAD_REQUEST)

        queryset = TestLabMapping.objects.filter(filters).select_related(
            "lab", "lab__address", "test"
        )

        # Sorting logic
        if sort_by_price == "desc":
            queryset = queryset.order_by("-price")
        else:
            queryset = queryset.order_by("price")

        if sort_by_tat:
            queryset = queryset.order_by("turnaround_time" if sort_by_tat == "asc" else "-turnaround_time")

        result = []
        for mapping in queryset:
            lab = mapping.lab
            addr = lab.address
            result.append({
                "lab_id": str(lab.id),
                "lab_name": lab.name,
                "price": float(mapping.price),
                "turnaround_time": mapping.turnaround_time,
                "home_collection_available": mapping.home_collection_available,
                "pricing_tier": lab.pricing_tier,
                "lab_type": lab.lab_type,
                "address": {
                    "full_address": addr.address,
                    "city": addr.city,
                    "state": addr.state,
                    "pincode": addr.pincode,
                    "latitude": addr.latitude,
                    "longitude": addr.longitude,
                    "google_maps_url": addr.google_maps_url
                }
            })

        return Response({
            "status": True,
            "message": f"Labs offering test in pincode {pincode} fetched successfully.",
            "data": result
        }, status=status.HTTP_200_OK)

class TestRecommendationViewSet(viewsets.ModelViewSet):
    serializer_class = TestRecommendationSerializer
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated, IsDoctor]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['consultation', 'test_status', 'is_completed', 'lab_advised']
    search_fields = ['custom_name', 'notes', 'doctor_comment']
    ordering_fields = ['created_at', 'scheduled_for']
    ordering = ['-created_at']

    def get_queryset(self):
        return TestRecommendation.objects.filter(
            recommended_by=self.request.user,
            is_active=True
        ).select_related("test", "consultation")

    def get_serializer_context(self):
        return {"request": self.request}

    @transaction.atomic
    def create(self, request, *args, **kwargs):
        data = request.data
        multiple_tests = data.get("tests")
        consultation_id = data.get("consultation")

        if multiple_tests:
            created = []
            for test_id in multiple_tests:
                payload = data.copy()
                payload["test"] = test_id
                payload.pop("tests")
                serializer = self.get_serializer(data=payload)
                serializer.is_valid(raise_exception=True)
                instance = serializer.save(recommended_by=request.user)
                created.append(self.get_serializer(instance).data)
            return Response({"status": True, "message": "Multiple tests recommended.", "data": created}, status=201)

        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid():
            instance = serializer.save(recommended_by=request.user)
            return Response({"status": True, "message": "Test recommendation created.", "data": self.get_serializer(instance).data}, status=201)
        return Response({"status": False, "message": "Validation failed.", "errors": serializer.errors}, status=400)

    @transaction.atomic
    def update(self, request, *args, **kwargs):
        return self._update_common(request, partial=False, **kwargs)

    @transaction.atomic
    def partial_update(self, request, *args, **kwargs):
        return self._update_common(request, partial=True, **kwargs)

    def _update_common(self, request, partial, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        if serializer.is_valid():
            updated = serializer.save()
            return Response({"status": True, "message": "Test recommendation updated.", "data": self.get_serializer(updated).data})
        return Response({"status": False, "message": "Update failed.", "errors": serializer.errors}, status=400)

    @transaction.atomic
    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.is_active = False
        instance.save()
        return Response({"status": True, "message": "Recommendation soft-deleted.", "data": {}})

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        serializer = self.get_serializer(queryset, many=True)
        return Response({"status": True, "message": "Recommendations fetched.", "data": serializer.data})

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        return Response({"status": True, "message": "Recommendation details.", "data": serializer.data})

class PackageRecommendationViewSet(viewsets.ModelViewSet):
    serializer_class = PackageRecommendationSerializer
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated, IsDoctor]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['consultation', 'is_completed']
    search_fields = ['notes', 'doctor_comment', 'package__name']
    ordering_fields = ['created_at', 'updated_at']
    ordering = ['-created_at']

    def get_queryset(self):
        return PackageRecommendation.objects.filter(is_active=True, recommended_by=self.request.user)

    def perform_create(self, serializer):
        serializer.save(recommended_by=self.request.user)

    @transaction.atomic
    def create(self, request, *args, **kwargs):
        if isinstance(request.data.get("packages"), list):
            bulk_serializer = BulkPackageRecommendationSerializer(data=request.data)
            if not bulk_serializer.is_valid():
                return Response({"status": False, "message": "Validation failed.", "errors": bulk_serializer.errors}, status=400)
            validated = bulk_serializer.validated_data
            consultation = Consultation.objects.get(id=validated["consultation"])
            recommendations = []
            for package_id in validated["packages"]:
                package = TestPackage.objects.get(id=package_id)
                rec = PackageRecommendation.objects.create(
                    consultation=consultation,
                    package=package,
                    notes=validated.get("notes", ""),
                    doctor_comment=validated.get("doctor_comment", ""),
                    recommended_by=request.user
                )
                recommendations.append(PackageRecommendationSerializer(rec).data)
            return Response({
                "status": True,
                "message": "Package recommendations created successfully.",
                "data": recommendations
            }, status=status.HTTP_201_CREATED)
        else:
            serializer = self.get_serializer(data=request.data)
            if serializer.is_valid():
                self.perform_create(serializer)
                return Response({
                    "status": True,
                    "message": "Package recommendation created successfully.",
                    "data": serializer.data
                }, status=status.HTTP_201_CREATED)
            return Response({"status": False, "message": "Validation failed.", "errors": serializer.errors}, status=400)

    @transaction.atomic
    def update(self, request, *args, **kwargs):
        return self._update_common(request, partial=False, *args, **kwargs)

    @transaction.atomic
    def partial_update(self, request, *args, **kwargs):
        return self._update_common(request, partial=True, *args, **kwargs)

    def _update_common(self, request, partial, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        if serializer.is_valid():
            serializer.save()
            return Response({"status": True, "message": "Updated successfully.", "data": serializer.data})
        return Response({"status": False, "message": "Update failed.", "errors": serializer.errors}, status=400)

    @transaction.atomic
    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.is_active = False
        instance.save()
        return Response({"status": True, "message": "Package recommendation deleted (soft).", "data": {}})

class LabAllocatorService:

    @staticmethod
    @transaction.atomic
    def allocate_tests(
        consultation_id,
        patient_profile,
        pincode,
        scheduled_time,
        booked_by="patient",
        test_ids=None  # Optional: support partial test booking
    ):
        # Fetch valid test recommendations (linked to MedicalTest)
        test_recommendations_qs = TestRecommendation.objects.filter(
            consultation_id=consultation_id,
            is_active=True,
            test__isnull=False
        ).select_related('test')

        if not test_recommendations_qs.exists():
            raise ValidationError("No active test recommendations found for this consultation.")

        # Apply test_ids filtering if passed (partial booking)
        if test_ids:
            test_recommendations_qs = test_recommendations_qs.filter(test_id__in=test_ids)

        if not test_recommendations_qs.exists():
            raise ValidationError("One or more test_ids are invalid or not part of this consultation.")

        recommended_tests = [tr.test for tr in test_recommendations_qs]
        required_test_ids = [test.id for test in recommended_tests]

        # Fetch labs servicing the given pincode
        active_labs = DiagnosticLab.objects.filter(
            is_active=True,
            service_pincodes__contains=[pincode]
        )

        if not active_labs.exists():
            raise ValidationError("No labs available for the given pincode.")

        preferred_lab = None
        for lab in active_labs:
            mapped_test_ids = TestLabMapping.objects.filter(
                lab=lab,
                test_id__in=required_test_ids,
                is_available=True,
                is_active=True
            ).values_list('test_id', flat=True)

            if set(mapped_test_ids) == set(required_test_ids):
                preferred_lab = lab
                break

        lab_grouping_type = "single_lab" if preferred_lab else "multi_lab"

        # Create BookingGroup
        booking_group = BookingGroup.objects.create(
            consultation_id=consultation_id,
            patient_profile=patient_profile,
            booked_by=booked_by,
            status="PENDING",
            is_home_collection=False,
            preferred_schedule_time=scheduled_time,
            lab_grouping_type=lab_grouping_type,
            created_at=timezone.now(),
        )

        test_bookings = []

        if preferred_lab:
            # All tests in one lab
            for tr in test_recommendations_qs:
                mapping = TestLabMapping.objects.get(
                    lab=preferred_lab,
                    test=tr.test,
                    is_available=True,
                    is_active=True
                )
                booking = TestBooking.objects.create(
                    booking_group=booking_group,
                    consultation_id=consultation_id,
                    patient_profile=patient_profile,
                    recommendation=tr,
                    lab=preferred_lab,
                    lab_mapping=mapping,
                    test_price=mapping.price,
                    tat_hours=mapping.turnaround_time,
                    scheduled_time=scheduled_time,
                    booked_by=booked_by,
                    status="PENDING",
                    is_home_collection=False
                )
                test_bookings.append(booking)
        else:
            # Distribute tests across labs
            test_to_lab_map = {}
            for test in recommended_tests:
                lab_mapping = TestLabMapping.objects.filter(
                    test=test,
                    is_available=True,
                    is_active=True,
                    lab__in=active_labs
                ).order_by('price').select_related('lab').first()

                if not lab_mapping:
                    raise ValidationError(f"No lab found for test: {test.name}")

                test_to_lab_map[test.id] = lab_mapping

            for tr in test_recommendations_qs:
                mapping = test_to_lab_map.get(tr.test.id)
                if not mapping:
                    raise ValidationError(f"Missing lab mapping for test: {tr.test.name}")

                booking = TestBooking.objects.create(
                    booking_group=booking_group,
                    consultation_id=consultation_id,
                    patient_profile=patient_profile,
                    recommendation=tr,
                    lab=mapping.lab,
                    lab_mapping=mapping,
                    test_price=mapping.price,
                    tat_hours=mapping.turnaround_time,
                    scheduled_time=scheduled_time,
                    booked_by=booked_by,
                    status="PENDING",
                    is_home_collection=False
                )
                test_bookings.append(booking)

        return {
            "booking_group": booking_group,
            "bookings": test_bookings,
        }

class AutoBookTestsView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            data = request.data
            consultation_id = data.get("consultation_id")
            patient_profile_id = data.get("patient_profile_id")
            pincode = data.get("pincode")
            booked_by = data.get("booked_by", "patient")
            test_ids = data.get("test_ids", None)
            scheduled_time = parse_datetime(data.get("scheduled_time"))

            if not all([consultation_id, patient_profile_id, pincode, scheduled_time]):
                return Response(error_response("Missing required fields"), status=status.HTTP_400_BAD_REQUEST)
            if scheduled_time < now():
                return Response(error_response("Scheduled time must be in the future"), status=status.HTTP_400_BAD_REQUEST)

            patient_profile = get_object_or_404(PatientProfile, id=patient_profile_id)

            result = LabAllocatorService.allocate_tests(
                consultation_id=consultation_id,
                patient_profile=patient_profile,
                pincode=pincode,
                scheduled_time=scheduled_time,
                booked_by=booked_by,
                test_ids=test_ids,
            )
            booking_group = result["booking_group"]
            bookings = result["bookings"]

            return Response(success_response("Tests booked successfully", {
                "booking_group_id": booking_group.id,
                "lab_grouping_type": booking_group.lab_grouping_type,
                "bookings": [
                    {
                        "test": b.recommendation.test.name if b.recommendation and b.recommendation.test else None,
                        "lab": b.lab.name if b.lab else None,
                        "scheduled_time": timezone.localtime(b.scheduled_time)
                    } for b in bookings
                ]
            }), status=status.HTTP_201_CREATED)

        except Exception as e:
            return Response(error_response("Internal server error", errors=str(e)), status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def get(self, request, id=None):
        if id:
            booking_group = get_object_or_404(BookingGroup, id=id, is_active=True)
            serializer = BookingGroupSerializer(booking_group)
            return Response(success_response("Booking group retrieved", serializer.data), status=status.HTTP_200_OK)
        else:
            qs = BookingGroup.objects.filter(is_active=True).select_related('consultation', 'patient_profile')
            if 'consultation_id' in request.query_params:
                qs = qs.filter(consultation_id=request.query_params['consultation_id'])
            serializer = BookingGroupSerializer(qs, many=True)
            return Response(success_response("Booking groups listed", serializer.data), status=status.HTTP_200_OK)

    def patch(self, request, id):
        booking_group = get_object_or_404(BookingGroup, id=id, is_active=True)
        serializer = BookingGroupSerializer(booking_group, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(success_response("Booking group updated", serializer.data), status=status.HTTP_200_OK)
        return Response(error_response("Validation error", errors=serializer.errors), status=status.HTTP_400_BAD_REQUEST)

    @transaction.atomic
    def delete(self, request, id):
        booking_group = get_object_or_404(BookingGroup, id=id, is_active=True)
        booking_group.is_active = False
        booking_group.save(update_fields=["is_active", "updated_at"])
        booking_group.test_bookings.update(is_active=False)
        return Response(success_response("Booking group deleted (soft)"), status=status.HTTP_200_OK)

class ManualBookTestsView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    @transaction.atomic
    def post(self, request):
        serializer = ManualBookingSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(error_response("Validation failed", serializer.errors), status=400)

        data = serializer.validated_data
        consultation_id = data['consultation_id']
        patient_profile_id = data['patient_profile_id']

        try:
            consultation = Consultation.objects.get(id=consultation_id)
            patient_profile = PatientProfile.objects.get(id=patient_profile_id)
        except (Consultation.DoesNotExist, PatientProfile.DoesNotExist):
            return Response(error_response("Consultation or Patient not found"), status=404)

        booking_group = BookingGroup.objects.create(
            consultation=consultation,
            patient_profile=patient_profile,
            booked_by=data['booked_by'],
            status='PENDING',
            preferred_schedule_time=data['scheduled_time']
        )

        test_bookings = []

        for item in data['bookings']:
            test_id = item.get('test_id')
            lab_id = item.get('lab_id')

            try:
                recommendation = TestRecommendation.objects.get(test_id=test_id, consultation=consultation, is_active=True)
                mapping = TestLabMapping.objects.get(test_id=test_id, lab_id=lab_id, is_available=True, is_active=True)
            except (TestRecommendation.DoesNotExist, TestLabMapping.DoesNotExist):
                transaction.set_rollback(True)
                return Response(error_response("Invalid test or lab mapping"), status=400)

            # Prevent duplicates
            if TestBooking.objects.filter(recommendation=recommendation, is_active=True).exists():
                continue

            booking = TestBooking.objects.create(
                booking_group=booking_group,
                consultation=consultation,
                patient_profile=patient_profile,
                recommendation=recommendation,
                lab=mapping.lab,
                lab_mapping=mapping,
                test_price=mapping.price,
                tat_hours=mapping.turnaround_time,
                scheduled_time=data['scheduled_time'],
                booked_by=data['booked_by']
            )
            test_bookings.append(booking)

        response_data = {
            "booking_group_id": booking_group.id,
            "test_bookings": [
                {
                    "test": b.recommendation.test.name.title(),
                    "lab": b.lab.name,
                    "status": b.status,
                    "scheduled_time": b.scheduled_time
                } for b in test_bookings
            ]
        }
        return Response(success_response("Tests booked successfully", response_data), status=201)

    @transaction.atomic
    def patch(self, request, id=None):  # Accept the URL param
        try:
            booking = TestBooking.objects.get(id=id, is_active=True)
        except TestBooking.DoesNotExist:
            return Response(error_response("Booking not found"), status=404)

        serializer = UpdateBookingSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(error_response("Validation failed", serializer.errors), status=400)

        data = serializer.validated_data
        if 'scheduled_time' in data:
            if data['scheduled_time'] < timezone.now():
                return Response(error_response("Scheduled time must be in the future."), status=400)
            booking.scheduled_time = data['scheduled_time']
        if 'status' in data:
            booking.status = data['status']
        booking.updated_at = timezone.now()
        booking.save()

        return Response(success_response("Booking updated successfully"), status=200)

    @transaction.atomic
    def delete(self, request, id=None):  # Accept the URL param
        try:
            booking = TestBooking.objects.get(id=id)
        except TestBooking.DoesNotExist:
            return Response(error_response("Booking not found"), status=404)

        booking.is_active = False
        booking.status = 'CANCELLED'
        booking.updated_at = timezone.now()
        booking.save()
        return Response(success_response("Booking cancelled successfully"), status=200)

class CustomPageNumberPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = "page_size"
    max_page_size = 100

class BookingListView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        query_params = request.query_params
        filters = Q(is_active=True)

        # 🔐 Restrict to current lab's bookings (if lab admin)
        lab_admin_qs = LabAdminUser.objects.filter(user=user, is_active=True).select_related("lab")
        if lab_admin_qs.exists():
            lab = lab_admin_qs.first().lab
            filters &= Q(lab=lab)

        # 📌 Apply filters
        if lab_id := query_params.get("lab_id"):
            filters &= Q(lab_id=lab_id)

        if status := query_params.get("status"):
            filters &= Q(status=status)

        if is_home_collection := query_params.get("is_home_collection"):
            if is_home_collection.lower() in ["true", "1"]:
                filters &= Q(is_home_collection=True)
            elif is_home_collection.lower() in ["false", "0"]:
                filters &= Q(is_home_collection=False)

        if booking_group_id := query_params.get("booking_group_id"):
            filters &= Q(booking_group_id=booking_group_id)

        if consultation_id := query_params.get("consultation_id"):
            filters &= Q(consultation_id=consultation_id)

        if from_date := query_params.get("from_date"):
            filters &= Q(scheduled_time__date__gte=from_date)

        if to_date := query_params.get("to_date"):
            filters &= Q(scheduled_time__date__lte=to_date)

        if name := query_params.get("patient_name"):
            filters &= Q(
                Q(patient_profile__first_name__icontains=name) |
                Q(patient_profile__last_name__icontains=name)
            )

        if mobile := query_params.get("mobile_number"):
            filters &= Q(patient_profile__account__user__username=mobile)

        if category := query_params.get("category"):
            filters &= Q(recommendation__test__category__name__icontains=category)

        if test_type := query_params.get("test_type"):
            filters &= Q(recommendation__test__type__iexact=test_type)

        # ⚡ Queryset with joins
        queryset = TestBooking.objects.filter(filters).select_related(
            "lab",
            "booking_group",
            "consultation",
            "patient_profile__account__user",
            "recommendation__test__category"
        ).order_by("-created_at")

        # 📦 Paginate
        paginator = CustomPageNumberPagination()
        paginated_qs = paginator.paginate_queryset(queryset, request)

        serializer = BookingListSerializer(paginated_qs, many=True)
        return paginator.get_paginated_response(success_response("Bookings fetched", serializer.data))

class BookingStatusUpdateView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    @transaction.atomic
    def patch(self, request, booking_id):
        try:
            booking = TestBooking.objects.get(id=booking_id, is_active=True)
        except TestBooking.DoesNotExist:
            return Response(error_response("Booking not found"), status=404)

        # Only lab admin for this booking's lab can update
        if not LabAdminUser.objects.filter(user=request.user, lab=booking.lab, is_active=True).exists():
            return Response(error_response("Permission denied"), status=403)

        serializer = BookingStatusUpdateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(error_response("Validation failed", serializer.errors), status=400)

        booking.status = serializer.validated_data["status"]
        if booking.status == "CONFIRMED":
            booking.lab_approved_at = timezone.now()
        booking.save()

        return Response(success_response("Booking status updated"), status=200)

class BookingRescheduleView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    @transaction.atomic
    def patch(self, request, booking_id):
        try:
            booking = TestBooking.objects.get(id=booking_id, is_active=True)
        except TestBooking.DoesNotExist:
            return Response(error_response("Booking not found"), status=404)

        if not LabAdminUser.objects.filter(user=request.user, lab=booking.lab, is_active=True).exists():
            return Response(error_response("Permission denied"), status=403)

        serializer = RescheduleBookingSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(error_response("Validation failed", serializer.errors), status=400)

        new_time = serializer.validated_data["scheduled_time"]
        if new_time < timezone.now():
            return Response(error_response("Scheduled time must be in the future"), status=400)

        booking.scheduled_time = new_time
        booking.status = "SCHEDULED"
        booking.save()

        return Response(success_response("Booking rescheduled successfully"), status=200)

class BookingCancelView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    @transaction.atomic
    def patch(self, request, booking_id):
        try:
            booking = TestBooking.objects.get(id=booking_id, is_active=True)
        except TestBooking.DoesNotExist:
            return Response(error_response("Booking not found"), status=404)

        if not LabAdminUser.objects.filter(user=request.user, lab=booking.lab, is_active=True).exists():
            return Response(error_response("Permission denied"), status=403)

        booking.status = "CANCELLED"
        booking.is_active = False
        booking.save()

        return Response(success_response("Booking cancelled successfully"), status=200)

class BookingGroupCancelView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    @transaction.atomic
    def patch(self, request, group_id):
        try:
            group = BookingGroup.objects.get(id=group_id, is_active=True)
        except BookingGroup.DoesNotExist:
            return Response(error_response("Booking group not found"), status=404)

        # Permission check: lab admin must have access to at least one booking under this group
        lab_admin = LabAdminUser.objects.filter(user=request.user, is_active=True).first()
        if not lab_admin or not TestBooking.objects.filter(booking_group=group, lab=lab_admin.lab).exists():
            return Response(error_response("Permission denied"), status=403)

        group.status = "CANCELLED"
        group.is_active = False
        group.save()

        TestBooking.objects.filter(booking_group=group).update(status="CANCELLED", is_active=False)

        return Response(success_response("All bookings under group cancelled"), status=200)

class HomeCollectionConfirmView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    @transaction.atomic
    def patch(self, request, booking_id):
        user = request.user
        try:
            booking = TestBooking.objects.select_related("lab").get(id=booking_id, is_active=True)
        except TestBooking.DoesNotExist:
            return Response(error_response("Booking not found"), status=404)

        # Lab admin check
        if LabAdminUser.objects.filter(user=user, lab=booking.lab, is_active=True).exists() is False:
            return Response(error_response("Unauthorized: This booking does not belong to your lab"), status=403)

        serializer = HomeCollectionConfirmSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(error_response("Validation failed", serializer.errors), status=400)

        data = serializer.validated_data

        booking.collector_name = data.get("collector_name")
        booking.collector_contact = data.get("collector_contact")
        booking.home_collection_address = data.get("home_collection_address")
        booking.home_collection_confirmed = True
        booking.home_collection_confirmed_at = timezone.now()
        if data.get("scheduled_time"):
            booking.scheduled_time = data.get("scheduled_time")
        booking.save()

        return Response(success_response("Home collection confirmed successfully"), status=200)

class HomeCollectionRejectView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    @transaction.atomic
    def patch(self, request, booking_id):
        user = request.user
        try:
            booking = TestBooking.objects.select_related("lab").get(id=booking_id, is_active=True)
        except TestBooking.DoesNotExist:
            return Response(error_response("Booking not found"), status=404)

        # Lab admin check
        if LabAdminUser.objects.filter(user=user, lab=booking.lab, is_active=True).exists() is False:
            return Response(error_response("Unauthorized: This booking does not belong to your lab"), status=403)

        serializer = HomeCollectionRejectSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(error_response("Validation failed", serializer.errors), status=400)

        booking.status = "CANCELLED"
        booking.rejection_reason = serializer.validated_data.get("reason")
        booking.is_active = False
        booking.save()

        return Response(success_response("Home collection rejected successfully"), status=200)

# --- PATCH /bookings/<booking_id>/reschedule-home-collection/ ---
class HomeCollectionRescheduleView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated, IsLabAdmin]

    @transaction.atomic
    def patch(self, request, booking_id):
        booking = get_object_or_404(TestBooking, id=booking_id, is_active=True)
        # print("home collection reschedule view called",booking.is_home_collection)
        # if not booking.is_home_collection:
        #     return Response(error_response("Booking is not marked for home collection"), status=400)

        serializer = HomeCollectionRescheduleSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(error_response("Validation failed", serializer.errors), status=400)

        new_time = serializer.validated_data["scheduled_time"]
        booking.scheduled_time = new_time
        booking.save(update_fields=["scheduled_time", "updated_at"])

        return Response(success_response("Home collection rescheduled successfully"), status=200)

# --- PATCH /bookings/<booking_id>/mark-collected/ ---
class MarkCollectedView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated, IsLabAdmin]

    @transaction.atomic
    def patch(self, request, booking_id):
        booking = get_object_or_404(TestBooking, id=booking_id, is_active=True)
        # if not booking.is_home_collection:
        #     return Response(error_response("Not a home collection booking"), status=400)

        serializer = MarkCollectedSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(error_response("Validation failed", serializer.errors), status=400)

        collector_name = serializer.validated_data["collector_name"]
        collector_contact = serializer.validated_data["collector_contact"]

        booking.collector_name = collector_name
        booking.collector_contact = collector_contact
        booking.home_collection_confirmed = True
        booking.home_collection_confirmed_at = timezone.localtime()
        booking.save(update_fields=[
            "collector_name", "collector_contact",
            "home_collection_confirmed", "home_collection_confirmed_at",
            "updated_at"
        ])

        return Response(success_response("Sample marked as collected"), status=200)

class CustomPageNumberPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100

class BookingGroupListView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        query_params = request.query_params
        filters = Q(is_active=True)

        if status := query_params.get("status"):
            filters &= Q(status=status)

        if patient_id := query_params.get("patient_profile_id"):
            filters &= Q(patient_profile_id=patient_id)

        if consultation_id := query_params.get("consultation_id"):
            filters &= Q(consultation_id=consultation_id)

        if booked_by := query_params.get("booked_by"):
            filters &= Q(booked_by__iexact=booked_by)

        if from_date := query_params.get("from_date"):
            filters &= Q(created_at__date__gte=from_date)

        if to_date := query_params.get("to_date"):
            filters &= Q(created_at__date__lte=to_date)

        if is_home_collection := query_params.get("is_home_collection"):
            filters &= Q(is_home_collection=is_home_collection.lower() in ["true", "1"])

        qs = BookingGroup.objects.filter(filters).select_related(
            "consultation", "patient_profile"
        ).prefetch_related("test_bookings").order_by("-created_at")

        paginator = CustomPageNumberPagination()
        paginated_qs = paginator.paginate_queryset(qs, request)
        serializer = BookingGroupListSerializer(paginated_qs, many=True)

        return paginator.get_paginated_response(success_response("Booking groups fetched", serializer.data))

class UploadLabReportView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated, IsHelpdeskOrLabAdmin]
    parser_classes = [MultiPartParser, FormParser]
    @transaction.atomic
    def post(self, request, *args, **kwargs):
        booking_id = request.data.get("booking_id")
        uploaded_file = request.FILES.get("file")

        if not booking_id or not uploaded_file:
            return Response({
                "status": False,
                "message": "Missing required fields: booking_id or file"
            }, status=400)

        booking = TestBooking.objects.filter(id=booking_id).first()
        if not booking:
            return Response({"status": False, "message": "Booking not found."}, status=404)

        # ✅ Check if report exists
        report = TestReport.objects.filter(booking=booking).first()

        if report:
            # ✅ Restore and replace
            report.is_active = True
            report.file = uploaded_file
            report.uploaded_by = request.user
            report.updated_at = timezone.localtime()
            report.save()
            message = "Report re-uploaded successfully."
        else:
            # ✅ Create new report
            TestReport.objects.create(
                booking=booking,
                lab=booking.lab,
                consultation=booking.consultation,
                patient_profile=booking.patient_profile,
                test_pnr=booking.recommendation.test_pnr if booking.recommendation else None,
                uploaded_by=request.user,
                file=uploaded_file,
                is_active=True
            )
            message = "Report uploaded successfully."

        return Response({
            "status": True,
            "message": message
        }, status=201)

class BookingGroupTestListView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated, IsHelpdeskOrLabAdmin]

    def get(self, request, group_id):
        try:
            group = BookingGroup.objects.get(id=group_id, is_active=True)
        except BookingGroup.DoesNotExist:
            return Response({
                "status": "error",
                "message": "Booking group not found."
            }, status=status.HTTP_404_NOT_FOUND)

        bookings = TestBooking.objects.filter(
            booking_group_id=group_id,
            is_active=True
        ).select_related(
            "patient_profile", "consultation", "lab", "recommendation", "report"
        )

        data = []
        for booking in bookings:
            report_uploaded = hasattr(booking, 'report') and booking.report.file
            data.append({
                "booking_id": str(booking.id),
                "test_name": booking.recommendation.test.name,
                "status": booking.status,
                "report_uploaded": bool(report_uploaded),
                "lab": booking.lab.name if booking.lab else None,
                "scheduled_time": booking.scheduled_time,
            })

        return Response({
            "status": "success",
            "message": "Test list for booking group fetched.",
            "data": {
                "patient": {
                    "name": group.patient_profile.first_name + " " + group.patient_profile.last_name,
                    "mobile": group.patient_profile.account.user.username,
                    #"age": group.patient_profile.age,
                    #"gender": group.patient_profile.gender,
                },
                "consultation_id": str(group.consultation.id),
                "tests": data
            }
        }, status=status.HTTP_200_OK)

class TestReportDownloadView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        report_id = request.query_params.get('report_id')
        test_pnr = request.query_params.get('test_pnr')
        booking_id = request.query_params.get('booking_id')

        report = None
        if report_id:
            report = get_object_or_404(TestReport, id=report_id, is_active=True)
        elif test_pnr:
            report = get_object_or_404(TestReport, test_pnr=test_pnr, is_active=True)
        elif booking_id:
            report = get_object_or_404(TestReport, booking__id=booking_id, is_active=True)
        else:
            return Response({
                "status": "error",
                "message": "Please provide report_id, test_pnr or booking_id."
            }, status=status.HTTP_400_BAD_REQUEST)

        file_url = report.file.url if report.file else None
        if not file_url:
            return Response({
                "status": "error",
                "message": "Report file not available."
            }, status=status.HTTP_404_NOT_FOUND)

        return Response({
            "status": "success",
            "message": "Report fetched successfully.",
            "data": {
                "patient_name": report.patient_profile.get_full_name() if report.patient_profile else "",
                "test_pnr": report.test_pnr,
                "uploaded_at": timezone.localtime(report.uploaded_at),
                "file_url": file_url,
                "comments": report.comments,
                "is_external": report.is_external
            }
        }, status=status.HTTP_200_OK)

class TestReportDetailsView(ListAPIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated, IsHelpdeskOrLabAdmin]
    serializer_class = TestReportDetailsSerializer

    def get_queryset(self):
        queryset = TestReport.objects.select_related(
            "booking", "consultation", "patient_profile", "booking__recommendation", "booking__lab"
        ).filter(is_active=True)

        consultation_id = self.request.query_params.get("consultation_id")
        booking_group_id = self.request.query_params.get("booking_group_id")
        patient_profile_id = self.request.query_params.get("patient_profile_id")

        if consultation_id:
            queryset = queryset.filter(consultation_id=consultation_id)
        elif patient_profile_id:
            queryset = queryset.filter(patient_profile_id=patient_profile_id)
        elif booking_group_id:
            queryset = queryset.filter(booking__booking_group_id=booking_group_id)

        return queryset

    @transaction.atomic
    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        serializer = self.serializer_class(queryset, many=True)
        return Response({
            "status": True,
            "message": "Report details fetched successfully",
            "data": serializer.data
        }, status=200)

class DeleteTestReportView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated, IsHelpdeskOrLabAdmin]

    @transaction.atomic
    def delete(self, request, report_id=None):
        try:
            report = None
            # Allow lookup by report_id or test_pnr
            if report_id and len(report_id) > 15:
                report = TestReport.objects.filter(id=report_id, is_active=True).first()
            else:
                report = TestReport.objects.filter(test_pnr=report_id, is_active=True).first()

            if not report:
                return Response({
                    "status": False,
                    "message": "Report not found.",
                }, status=404)

            # Soft delete and hard file delete
            file_path = report.file.path if report.file else None
            report.is_active = False
            report.file = None
            report.updated_at = timezone.localtime()
            report.save()

            if file_path and os.path.exists(file_path):
                os.remove(file_path)

            return Response({
                "status": True,
                "message": "Report deleted successfully.",
            }, status=200)

        except Exception as e:
            return Response({
                "status": False,
                "message": "Failed to delete report.",
                "error": str(e),
            }, status=400)

class PatientReportHistoryView(ListAPIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated, IsPatient]
    serializer_class = TestReportDetailsSerializer

    def get_queryset(self):
        user = self.request.user
        mobile = self.request.query_params.get("mobile")

        try:
            if mobile:
                account = PatientAccount.objects.get(mobile=mobile, is_active=True)
            else:
                account = PatientAccount.objects.get(user=user, is_active=True)

            # 🔄 Fetch multiple profiles, not just one
            patient_profiles = PatientProfile.objects.filter(account=account, is_active=True)

            if not patient_profiles.exists():
                raise NotFound("No patient profiles found for this account.")

        except PatientAccount.DoesNotExist:
            raise NotFound("Patient account not found.")

        return TestReport.objects.filter(
            patient_profile__in=patient_profiles,
            is_active=True
        ).select_related(
            "booking", "consultation", "booking__lab", "booking__recommendation"
        )
    @transaction.atomic
    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        serializer = self.serializer_class(queryset, many=True)
        return Response({
            "status": True,
            "message": "Report history fetched successfully",
            "data": serializer.data
        }, status=200)

class DoctorReportHistoryView(ListAPIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated, IsDoctor]
    serializer_class = TestReportDetailsSerializer

    def get_queryset(self):
        consultation_id = self.request.query_params.get("consultation_id")
        patient_profile_id = self.request.query_params.get("patient_profile_id")

        # No input means no access
        if not consultation_id and not patient_profile_id:
            raise NotFound("Either consultation_id or patient_profile_id is required.")

        queryset = TestReport.objects.select_related(
            "booking", "consultation", "patient_profile", "booking__recommendation", "booking__lab"
        ).filter(is_active=True)

        if consultation_id:
            queryset = queryset.filter(consultation_id=consultation_id)

        if patient_profile_id:
            try:
                profile = PatientProfile.objects.get(id=patient_profile_id, is_active=True)
            except PatientProfile.DoesNotExist:
                raise NotFound("Patient profile not found.")
            queryset = queryset.filter(patient_profile=profile)

        return queryset

    @transaction.atomic
    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        serializer = self.serializer_class(queryset, many=True)
        return Response({
            "status": True,
            "message": "Doctor report history fetched successfully.",
            "data": serializer.data
        }, status=200)

class AdminReportHistoryView(ListAPIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated, IsHelpdeskOrLabAdmin]
    serializer_class = TestReportDetailsSerializer

    def get_queryset(self):
        queryset = TestReport.objects.select_related(
            "booking", "consultation", "patient_profile", "booking__recommendation", "booking__lab"
        ).filter(is_active=True)

        patient_profile_id = self.request.query_params.get("patient_profile_id")
        mobile = self.request.query_params.get("mobile")

        if patient_profile_id:
            queryset = queryset.filter(patient_profile_id=patient_profile_id)

        elif mobile:
            try:
                # ✅ Get User by username (used as mobile)
                user = User.objects.get(username=mobile, is_active=True)

                # ✅ Get PatientAccount
                account = PatientAccount.objects.get(user=user, is_active=True)

                # ✅ Get related PatientProfiles
                patient_profiles = PatientProfile.objects.filter(account=account, is_active=True)

                if not patient_profiles.exists():
                    raise NotFound("No patient profiles found for this mobile number.")

                queryset = queryset.filter(patient_profile__in=patient_profiles)

            except User.DoesNotExist:
                raise NotFound("User with this mobile number does not exist.")
            except PatientAccount.DoesNotExist:
                raise NotFound("Patient account linked to this user does not exist.")

        else:
            raise NotFound("Please provide either patient_profile_id or mobile.")

        return queryset

    @transaction.atomic
    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        serializer = self.serializer_class(queryset, many=True)
        return Response({
            "status": True,
            "message": "Admin report history fetched successfully.",
            "data": serializer.data
        }, status=200)


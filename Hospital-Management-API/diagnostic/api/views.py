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
from diagnostic.models import (MedicalTest,
                               TestCategory,ImagingView,TestRecommendation,
                               PackageRecommendation,TestPackage,DiagnosticLab,
                               DiagnosticLabAddress,TestCategory,TestLabMapping,
                               ImagingView,PackageLabMapping,
                                   DiagnosticLab,TestLabMapping,TestBooking,BookingGroup,TestRecommendation,
                                   DiagnosticLab, MedicalTest,TestLabMapping, TestRecommendation, BookingGroup
                                   )
from diagnostic.api.serializers import (
    MedicalTestSerializer,TestCategorySerializer,ImagingViewSerializer,TestPackageSerializer,
    TestRecommendationSerializer,PackageRecommendationSerializer,BulkPackageRecommendationSerializer,
    LabAdminRegistrationSerializer,LabAdminLoginSerializer,TestCategorySerializer,
    DiagnosticLabSerializer,DiagnosticLabAddressSerializer,
    TestLabMappingSerializer,PackageLabMappingSerializer,
    AutoBookingRequestSerializer,ManualBookingSerializer,UpdateBookingSerializer,
    BookingGroupSerializer,TestBookingSummarySerializer,)
from consultations.models import Consultation
from account.permissions import IsDoctor, IsAdminUser,IsLabAdmin,IsPatient
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


# class LabAllocatorService:
#     @staticmethod
#     @transaction.atomic
#     def allocate_tests(consultation_id, patient_profile, pincode, scheduled_time, booked_by):
#         test_recommendations = TestRecommendation.objects.filter(
#             consultation=consultation_id,
#             is_active=True,
#             test__isnull=False
#         ).select_related('test')

#         if not test_recommendations.exists():
#             raise ValidationError("No active test recommendations found for this consultation.")

#         required_tests = [tr.test for tr in test_recommendations if tr.test]
#         required_test_ids = [test.id for test in required_tests]

#         active_labs = DiagnosticLab.objects.filter(
#             is_active=True,
#             service_pincodes__contains=[pincode]
#         )

#         preferred_lab = None
#         for lab in active_labs:
#             mapped_tests = TestLabMapping.objects.filter(
#                 lab=lab,
#                 test_id__in=required_test_ids,
#                 is_available=True,
#                 is_active=True
#             ).values_list('test_id', flat=True)

#             if set(mapped_tests) == set(required_test_ids):
#                 preferred_lab = lab
#                 break

#         lab_grouping_type = "single_lab" if preferred_lab else "multi_lab"

#         if not active_labs.exists():
#             raise ValidationError("No labs available for the given pincode.")

#         # Create BookingGroup
#         booking_group = BookingGroup.objects.create(
#             consultation=consultation,
#             patient_profile=patient_profile,
#             booked_by=booked_by,
#             status="PENDING",
#             is_home_collection=False,
#             preferred_schedule_time=scheduled_time,
#             lab_grouping_type=lab_grouping_type,
#             created_at=timezone.now(),
#         )

#         test_bookings = []

#         if preferred_lab:
#             # One lab supports all
#             for tr in test_recommendations:
#                 mapping = TestLabMapping.objects.get(
#                     lab=preferred_lab,
#                     test=tr.test,
#                     is_available=True,
#                     is_active=True
#                 )

#                 booking = TestBooking.objects.create(
#                     booking_group=booking_group,
#                     consultation=consultation,
#                     patient_profile=patient_profile,
#                     recommendation=tr,
#                     lab=preferred_lab,
#                     lab_mapping=mapping,
#                     test_price=mapping.price,
#                     tat_hours=mapping.turnaround_time,
#                     scheduled_time=scheduled_time,
#                     booked_by=booked_by,
#                     status="PENDING",
#                     is_home_collection=False
#                 )
#                 test_bookings.append(booking)

#         else:
#             # Distribute across labs
#             test_to_lab_map = {}
#             for test in required_tests:
#                 lab_mapping = TestLabMapping.objects.filter(
#                     test=test,
#                     is_available=True,
#                     is_active=True,
#                     lab__in=active_labs
#                 ).order_by('price').select_related('lab').first()
#                 if not lab_mapping:
#                     raise ValidationError(f"No lab found for test: {test.name}")
#                 test_to_lab_map[test.id] = lab_mapping

#             for tr in test_recommendations:
#                 mapping = test_to_lab_map.get(tr.test.id)
#                 if not mapping:
#                     raise ValidationError(f"Missing mapping for test: {tr.test.name}")

#                 booking = TestBooking.objects.create(
#                     booking_group=booking_group,
#                     consultation=consultation,
#                     patient_profile=patient_profile,
#                     recommendation=tr,
#                     lab=mapping.lab,
#                     lab_mapping=mapping,
#                     test_price=mapping.price,
#                     tat_hours=mapping.turnaround_time,
#                     scheduled_time=scheduled_time,
#                     booked_by=booked_by,
#                     status="PENDING",
#                     is_home_collection=False
#                 )
#                 test_bookings.append(booking)

#         return {
#             "booking_group": booking_group,
#             "bookings": test_bookings,
#         }

# class AutoBookTestsView(APIView):
#     permission_classes = [IsAuthenticated]

#     def post(self, request):
#         try:
#             data = request.data
#             consultation_id = data.get("consultation_id")
#             patient_profile_id = data.get("patient_profile_id")
#             pincode = data.get("pincode")
#             scheduled_time = data.get("scheduled_time")
#             booked_by = data.get("booked_by", "patient")
#             test_ids = data.get("test_ids", None)  # Optional

#             if not consultation_id or not patient_profile_id or not pincode:
#                 return Response(error_response("Missing required fields."), status=status.HTTP_400_BAD_REQUEST)

#             # Validate optional test_ids
#             if test_ids:
#                 valid_ids = TestRecommendation.objects.filter(
#                     consultation_id=consultation_id,
#                     test__isnull=False,
#                     is_active=True,
#                     id__in=test_ids
#                 ).values_list("id", flat=True)
#                 if len(set(valid_ids)) != len(set(test_ids)):
#                     return Response(error_response("One or more test_ids are invalid or not part of this consultation."),
#                                     status=status.HTTP_400_BAD_REQUEST)

#             with transaction.atomic():
#                 result = LabAllocatorService.allocate_tests(
#                     consultation_id=consultation_id,
#                     patient_profile_id=patient_profile_id,
#                     pincode=pincode,
#                     scheduled_time=scheduled_time,
#                     booked_by=booked_by,
#                     specific_test_ids=test_ids  # Pass None or list
#                 )

#             return Response(success_response("Tests booked successfully.", result), status=status.HTTP_200_OK)

#         except Exception as e:
#             return Response(error_response(str(e)), status=status.HTTP_500_INTERNAL_SERVER_ERROR)


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


# class AutoBookTestsView(APIView):
#     permission_classes = [IsAuthenticated]

#     def post(self, request):
#         try:
#             data = request.data

#             consultation_id = data.get("consultation_id")
#             patient_profile_id = data.get("patient_profile_id")
#             pincode = data.get("pincode")
#             scheduled_time = parse_datetime(data.get("scheduled_time"))
#             booked_by = data.get("booked_by", "patient")
#             test_ids = data.get("test_ids")  # Optional for partial booking

#             # Validate required fields
#             if not all([consultation_id, patient_profile_id, pincode, scheduled_time]):
#                 return Response(error_response("Missing required fields"), status=status.HTTP_400_BAD_REQUEST)

#             if scheduled_time < now():
#                 return Response(error_response("Scheduled time must be in the future"), status=status.HTTP_400_BAD_REQUEST)

#             # Fetch patient profile object
#             try:
#                 patient_profile = PatientProfile.objects.get(id=patient_profile_id, is_active=True)
#             except PatientProfile.DoesNotExist:
#                 return Response(error_response("Invalid patient profile ID"), status=status.HTTP_404_NOT_FOUND)

#             # Delegate to service
#             allocation_result = LabAllocatorService.allocate_tests(
#                 consultation_id=consultation_id,
#                 patient_profile=patient_profile,
#                 pincode=pincode,
#                 scheduled_time=scheduled_time,
#                 booked_by=booked_by,
#                 test_ids=test_ids  # Optional
#             )

#             booking_group = allocation_result["booking_group"]
#             bookings = allocation_result["bookings"]

#             return Response(success_response(
#                 "Tests booked successfully",
#                 data={
#                     "booking_group_id": booking_group.id,
#                     "lab_grouping_type": booking_group.lab_grouping_type,
#                     "bookings": [
#                         {
#                             "test": b.recommendation.test.name if b.recommendation and b.recommendation.test else None,
#                             "lab": b.lab.name if b.lab else None,
#                             "scheduled_time": b.scheduled_time
#                         }
#                         for b in bookings
#                     ]
#                 }
#             ), status=status.HTTP_201_CREATED)

#         except ValidationError as e:
#             return Response(error_response(str(e)), status=status.HTTP_400_BAD_REQUEST)

#         except Exception as e:
#             import traceback
#             traceback.print_exc()
#             return Response(error_response("Internal server error", errors=str(e)), status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        

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
    def patch(self, request):
        booking_id = request.query_params.get("booking_id")
        try:
            booking = TestBooking.objects.get(id=booking_id, is_active=True)
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
        booking.save()

        return Response(success_response("Booking updated successfully"), status=200)

    @transaction.atomic
    def delete(self, request):
        booking_id = request.query_params.get("booking_id")
        try:
            booking = TestBooking.objects.get(id=booking_id)
        except TestBooking.DoesNotExist:
            return Response(error_response("Booking not found"), status=404)

        booking.is_active = False
        booking.status = 'CANCELLED'
        booking.save()
        return Response(success_response("Booking cancelled successfully"), status=200)

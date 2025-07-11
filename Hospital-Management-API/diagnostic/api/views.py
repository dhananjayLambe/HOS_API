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
from django.db.models import Q
from rest_framework_simplejwt.views import (
    TokenRefreshView as SimpleJWTRefreshView,
    TokenVerifyView as SimpleJWTVerifyView
)
from rest_framework.permissions import AllowAny
# Maintain ordering using Case/When
from django.db.models import Case, When

from utils.utils import api_response

from diagnostic.models import (MedicalTest,
                               TestCategory,ImagingView,TestRecommendation,
                               PackageRecommendation,TestPackage,DiagnosticLab,
                               DiagnosticLabAddress,TestCategory,TestLabMapping,
                               ImagingView,PackageLabMapping,)
from diagnostic.api.serializers import (
    MedicalTestSerializer,TestCategorySerializer,ImagingViewSerializer,TestPackageSerializer,
    TestRecommendationSerializer,PackageRecommendationSerializer,BulkPackageRecommendationSerializer,
    LabAdminRegistrationSerializer,LabAdminLoginSerializer,TestCategorySerializer,
    DiagnosticLabSerializer,DiagnosticLabAddressSerializer,
    TestLabMappingSerializer,PackageLabMappingSerializer,)
from consultations.models import Consultation
from account.permissions import IsDoctor, IsAdminUser,IsLabAdmin,IsPatient
from django.db import transaction
from django.utils import timezone
from django_filters.rest_framework import DjangoFilterBackend
from django.core.paginator import Paginator
from math import radians, cos, sin, asin, sqrt
from diagnostic.filters import DiagnosticLabAddressFilter
from rest_framework import viewsets, status, filters
from rest_framework.response import Response


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


# class PackageRecommendationViewSet(viewsets.ModelViewSet):
#     serializer_class = PackageRecommendationSerializer
#     authentication_classes = [JWTAuthentication]
#     permission_classes = [IsAuthenticated, IsDoctor]
#     filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
#     filterset_fields = ['consultation', 'is_completed']
#     search_fields = ['notes', 'doctor_comment', 'package__name']
#     ordering_fields = ['created_at', 'updated_at']
#     ordering = ['-created_at']

#     def get_queryset(self):
#         return PackageRecommendation.objects.filter(is_active=True, recommended_by=self.request.user)

#     def perform_create(self, serializer):
#         serializer.save(recommended_by=self.request.user)

#     @transaction.atomic
#     def create(self, request, *args, **kwargs):
#         serializer = self.get_serializer(data=request.data)
#         if serializer.is_valid():
#             self.perform_create(serializer)
#             return Response({
#                 "status": True,
#                 "message": "Package recommendation created successfully.",
#                 "data": serializer.data
#             }, status=status.HTTP_201_CREATED)
#         return Response({"status": False, "message": "Validation failed.", "errors": serializer.errors}, status=400)

#     @transaction.atomic
#     def update(self, request, *args, **kwargs):
#         return self._update_common(request, partial=False, *args, **kwargs)

#     @transaction.atomic
#     def partial_update(self, request, *args, **kwargs):
#         return self._update_common(request, partial=True, *args, **kwargs)

#     def _update_common(self, request, partial, *args, **kwargs):
#         instance = self.get_object()
#         serializer = self.get_serializer(instance, data=request.data, partial=partial)
#         if serializer.is_valid():
#             serializer.save()
#             return Response({"status": True, "message": "Updated successfully.", "data": serializer.data})
#         return Response({"status": False, "message": "Update failed.", "errors": serializer.errors}, status=400)

#     @transaction.atomic
#     def destroy(self, request, *args, **kwargs):
#         instance = self.get_object()
#         instance.is_active = False
#         instance.save()
#         return Response({"status": True, "message": "Package recommendation deleted (soft).", "data": {}})


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
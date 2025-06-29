"""main URL Configuration

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/3.0/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

#swagger
from rest_framework import permissions
from drf_yasg.views import get_schema_view
from drf_yasg import openapi

schema_view = get_schema_view(
    openapi.Info(
        title="DoctorPro EMR API",
        default_version='v1',
        description="API documentation for the DoctorPro EMR system",
        terms_of_service="https://doctorprocare.com/terms/",
        contact=openapi.Contact(email="support@doctorprocare.com"),
        license=openapi.License(name="MIT License"),
    ),
    public=True,
    permission_classes=(permissions.AllowAny,),
)

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/doctor/', include('doctor.api.urls')),
    path('api/patients/', include('patient_account.api.urls')),
    path('api/admin/', include('hospitalAdmin.api.urls')),
    path('api/hospital_mgmt/', include('hospital_mgmt.api.urls')),
    path('api/clinic/', include('clinic.api.urls')),
    path('api/helpdesk/', include('helpdesk.api.urls')),
    path('api/appointments/', include('appointments.api.urls')),
    path('api/queue/', include('queue_management.api.urls')),
    path('api/consultations/', include('consultations.api.urls')),
    path('api/prescriptions/', include('prescriptions.api.urls')),
    path('api/diagnostic/', include('diagnostic.api.urls')),

    #Swagger API
    path('swagger/', schema_view.with_ui('swagger', cache_timeout=0), name='schema-swagger-ui'),
    path('redoc/', schema_view.with_ui('redoc', cache_timeout=0), name='schema-redoc'),
    path('swagger.json', schema_view.without_ui(cache_timeout=0), name='schema-json')
]

urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

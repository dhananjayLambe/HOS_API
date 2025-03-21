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

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/doctor/', include('doctor.api.urls')),
    #path('api/patient/', include('patient.api.urls')),
    path('api/patients/', include('patient_account.api.urls')),
    path('api/admin/', include('hospitalAdmin.api.urls')),
    path('api/hospital_mgmt/', include('hospital_mgmt.api.urls')),
    path('api/clinic/', include('clinic.api.urls')),
    path('api/helpdesk/', include('helpdesk.api.urls')),
    path('api/appointments/', include('appointments.api.urls')),
    path('api/queue/', include('queue_management.api.urls')),
]

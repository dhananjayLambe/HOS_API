from django.urls import path
from helpdesk.api.views import (
    HelpdeskUserRegisterView,HelpdeskLoginView,
    HelpdeskLogoutView)

from rest_framework_simplejwt.views import TokenRefreshView

app_name='helpdesk'

urlpatterns = [
     path("register/", HelpdeskUserRegisterView.as_view(), name="helpdesk-register"),
     path("login/", HelpdeskLoginView.as_view(), name="helpdesk-login"),
     path("logout/", HelpdeskLogoutView.as_view(), name="helpdesk-logout"),
      path("token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),

]
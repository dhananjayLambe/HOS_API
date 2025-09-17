from django.urls import path,include
from account.api.views import CheckUserStatusView,StaffSendOTPView,VerifyOTPStaffView,\
RefreshTokenStaffView

urlpatterns = [
        path("check-user-status/", CheckUserStatusView.as_view(), name="check-user-status"),
        path("send-otp/", StaffSendOTPView.as_view(), name="staff-send-otp"),
        path("verify-otp/",VerifyOTPStaffView.as_view(), name="verify-otp"),
        path('refresh-token/',RefreshTokenStaffView.as_view(), name='refresh-token'),
]

#TO_DONeed to enabled the redius for otp later before prod deployment and we need to add the external 
#TO-do OTP service for production deployment 
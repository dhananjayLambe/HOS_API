from rest_framework.permissions import BasePermission

class IsDoctor(BasePermission):
    """Custom permission for Doctors."""
    def has_permission(self, request, view):
        return bool(request.user and request.user.groups.filter(name='doctor').exists())

class IsHelpdesk(BasePermission):
    """Custom permission for Helpdesk users."""
    def has_permission(self, request, view):
        return bool(request.user and request.user.groups.filter(name='helpdesk').exists())

class IsPatient(BasePermission):
    """Custom permission for Patients."""
    def has_permission(self, request, view):
        return bool(request.user and request.user.groups.filter(name='patient').exists())

class IsAdminUser(BasePermission):
    """Custom permission for Admin users (superusers)."""
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_superuser)

class IsDoctorOrHelpdesk(BasePermission):
    """Custom permission to allow access to Doctors OR Helpdesk users."""
    def has_permission(self, request, view):
        return bool(request.user and request.user.groups.filter(name__in=['doctor', 'helpdesk']).exists())
    
class IsDoctorOrHelpdeskOrPatient(BasePermission):
    """Custom permission to allow access to Doctors OR Helpdesk users."""
    def has_permission(self, request, view):
        return bool(request.user and request.user.groups.filter(name__in=['doctor', 'helpdesk', 'patient']).exists())
    

class IsDoctorOrHelpdeskOrOwnerOrAdmin(BasePermission):
    def has_object_permission(self, request, view, obj):
        if request.user.is_superuser:
            return True
        if hasattr(request.user, 'doctor') and obj.doctor == request.user.doctor:
            return True
        if hasattr(request.user, 'helpdesk'):
            return obj.patient_account.clinic in request.user.helpdesk.clinics.all()
        if hasattr(request.user, 'patient') and obj.patient_account.user == request.user:
            return True
        return False
    
class IsDoctorOrHelpdeskSameClinic(BasePermission):
    def has_object_permission(self, request, view, obj):
        user = request.user
        if hasattr(user, 'doctor'):
            return obj.clinic == user.doctor.clinic
        if hasattr(user, 'helpdesk'):
            return obj.clinic in user.helpdesk.clinics.all()
        return False
    
class IsHelpdeskOfSameClinic(BasePermission):
    def has_object_permission(self, request, view, obj):
        if hasattr(request.user, 'helpdesk'):
            return obj.clinic in request.user.helpdesk.clinics.all()
        return False

class IsDoctorAndClinicMatch(BasePermission):
    def has_object_permission(self, request, view, obj):
        if hasattr(request.user, 'doctor'):
            return obj.clinic == request.user.doctor.clinic
        return False

class IsHelpdeskOrOwner(BasePermission):
    def has_object_permission(self, request, view, obj):
        if hasattr(request.user, 'helpdesk'):
            return True
        if hasattr(obj, 'user') and obj.user == request.user:
            return True
        return False

class IsDoctorOrOwner(BasePermission):
    def has_object_permission(self, request, view, obj):
        if hasattr(request.user, 'doctor'):
            return True
        if hasattr(obj, 'user') and obj.user == request.user:
            return True
        return False

class IsClinicAdmin(BasePermission):
    def has_permission(self, request, view):
        user = request.user
        print("User:", user)
        print("Is Authenticated:", user.is_authenticated)
        print("User Groups:", user.groups.values_list("name", flat=True))

        return user and user.is_authenticated and \
               user.groups.filter(name='clinic_admin').exists()


class IsLabAdmin(BasePermission):
    def has_permission(self, request, view):
        user = request.user
        # print("User:", user)
        # print("Is Authenticated:", user.is_authenticated)
        # print("User Groups:", user.groups.values_list("name", flat=True))

        return user and user.is_authenticated and \
               user.groups.filter(name='lab-admin').exists()


class IsHelpdeskOrLabAdmin(BasePermission):
    """
    Custom permission to allow access only to users in 'helpdesk' or 'lab-admin' group.
    """

    def has_permission(self, request, view):
        return bool(
            request.user and
            request.user.is_authenticated and
            request.user.groups.filter(name__in=['helpdesk', 'lab-admin']).exists()
        )


class IsDoctorOrClinicAdminOrSuperuser(BasePermission):
    """
    Custom permission to allow access to Doctors, Clinic Admins, or Superusers.
    Used for CREATE, UPDATE, DELETE operations on clinic information.
    """

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        
        # Superuser always has access
        if request.user.is_superuser:
            return True
        
        # Check if user is in doctor or clinic_admin group
        return bool(
            request.user.groups.filter(name__in=['doctor', 'clinic_admin']).exists()
        )


class IsDoctorOrHelpdeskOrClinicAdminOrSuperuser(BasePermission):
    """
    Custom permission to allow access to Doctors, Helpdesk, Clinic Admins, or Superusers.
    Used for READ operations on clinic information.
    """

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        
        # Superuser always has access
        if request.user.is_superuser:
            return True
        
        # Check if user is in doctor, helpdesk, or clinic_admin group
        return bool(
            request.user.groups.filter(name__in=['doctor', 'helpdesk', 'clinic_admin']).exists()
        )
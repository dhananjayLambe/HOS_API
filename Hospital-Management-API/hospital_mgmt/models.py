from django.db import models
#from django.contrib.auth.models import User
from account.models import User

class Hospital(models.Model):
    name = models.CharField(max_length=255, unique=True)
    address = models.TextField()
    contact_number = models.CharField(max_length=15)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        
        return self.name

class FrontDeskUser(models.Model):
    hospital = models.ForeignKey(Hospital, on_delete=models.CASCADE, related_name="front_desk_users")
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.user.username} ({self.hospital.name})"

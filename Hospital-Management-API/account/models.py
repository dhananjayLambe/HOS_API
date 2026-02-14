import uuid
from django.db import models
from django.contrib.auth.models import AbstractUser
from django.utils.translation import gettext_lazy as _

class User(AbstractUser):
    id=models.UUIDField(primary_key=True, default=uuid.uuid4)
    first_name = models.CharField(_('first name'), max_length=150)
    status=models.BooleanField(default=False)
    

class BusinessIDCounter(models.Model):
    """
    Generic counter for business IDs.
    Handles CL, DOC, PAT, EMP, etc.
    """
    entity_type = models.CharField(max_length=20, unique=True)
    counter = models.BigIntegerField(default=0)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Business ID Counter"
        verbose_name_plural = "Business ID Counters"

    def __str__(self):
        return f"{self.entity_type} → {self.counter}"
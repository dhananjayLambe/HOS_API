"""
Support Ticket Sequence Model
Used for generating monthly sequential ticket numbers.
"""
from django.db import models


class SupportTicketSequence(models.Model):
    """
    Model to track ticket number sequences per month.
    Used to generate unique sequential ticket numbers.
    """
    year = models.PositiveIntegerField()
    month = models.PositiveIntegerField()
    last_number = models.PositiveIntegerField(default=0)

    class Meta:
        unique_together = ("year", "month")
        verbose_name = "Support Ticket Sequence"
        verbose_name_plural = "Support Ticket Sequences"

    def __str__(self):
        return f"{self.year}-{self.month:02d}: {self.last_number:06d}"


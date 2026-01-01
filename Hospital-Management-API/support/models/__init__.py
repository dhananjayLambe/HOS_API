"""
Support models package.
This package contains all support-related models split into separate files
to avoid circular import issues.
"""
from .sequence import SupportTicketSequence
from .ticket import (
    SupportTicket,
    SupportTicketAttachment,
    SupportTicketComment
)

# Export all models for Django's app registry
__all__ = [
    'SupportTicketSequence',
    'SupportTicket',
    'SupportTicketAttachment',
    'SupportTicketComment',
]


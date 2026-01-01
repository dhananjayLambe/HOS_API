"""
Support Models Module
This file imports all models from the models package for backward compatibility.
All models are now organized in separate files to avoid circular imports.
"""
# Import all models directly from submodules to avoid circular imports
from support.models.sequence import SupportTicketSequence
from support.models.ticket import (
    SupportTicket,
    SupportTicketAttachment,
    SupportTicketComment
)

# Re-export for backward compatibility
__all__ = [
    'SupportTicketSequence',
    'SupportTicket',
    'SupportTicketAttachment',
    'SupportTicketComment',
]

from django.urls import path
from support.api import views

app_name = 'support'

urlpatterns = [
    # List (GET) and Create (POST) support tickets
    path('tickets/', views.SupportTicketListView.as_view(), name='ticket-list-create'),
    
    # Support ticket detail, update, and delete
    path('tickets/<uuid:id>/', views.SupportTicketDetailView.as_view(), name='ticket-detail'),
    path('tickets/<uuid:id>/update/', views.SupportTicketUpdateView.as_view(), name='ticket-update'),
    path('tickets/<uuid:id>/delete/', views.SupportTicketDeleteView.as_view(), name='ticket-delete'),
    
    # Attachments - List, Create, Delete
    path('tickets/<uuid:ticket_id>/attachments/', views.SupportTicketAttachmentView.as_view(), name='ticket-attachment-list-create'),
    path('tickets/<uuid:ticket_id>/attachments/<uuid:attachment_id>/', views.SupportTicketAttachmentDeleteView.as_view(), name='ticket-attachment-delete'),
    
    # Comments - List, Create, Update, Delete
    path('tickets/<uuid:ticket_id>/comments/', views.SupportTicketCommentView.as_view(), name='ticket-comment-list-create'),
    path('tickets/<uuid:ticket_id>/comments/<uuid:comment_id>/', views.SupportTicketCommentUpdateDeleteView.as_view(), name='ticket-comment-update-delete'),
]

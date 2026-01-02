from django.urls import path
from caleder_events.api.views import (
    ListEventsAPIView,
    RetrieveEventAPIView
)

app_name = 'calendar_events'

urlpatterns = [
    # RESTful endpoints: same URL, different HTTP methods
    # GET /api/calendar/events/ - List events
    # POST /api/calendar/events/ - Create event
    path('events/', ListEventsAPIView.as_view(), name='list-create-events'),
    
    # GET /api/calendar/events/{id}/ - Retrieve event
    # PUT /api/calendar/events/{id}/ - Full update event
    # PATCH /api/calendar/events/{id}/ - Partial update event
    # DELETE /api/calendar/events/{id}/ - Delete event
    path('events/<uuid:event_id>/', RetrieveEventAPIView.as_view(), name='event-detail'),
]


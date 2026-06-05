"""Report lifecycle timeline response serializers."""

from rest_framework import serializers

from diagnostics_engine.services.reports.report_timeline_presenter import ReportTimelineDTO


class ReportTimelineEventSerializer(serializers.Serializer):
    event_type = serializers.CharField()
    timestamp = serializers.DateTimeField()
    actor_name = serializers.CharField(allow_blank=True)
    message = serializers.CharField(allow_blank=True)


class ReportTimelineSerializer(serializers.Serializer):
    report_id = serializers.UUIDField()
    events = ReportTimelineEventSerializer(many=True)

    @classmethod
    def from_dto(cls, dto: ReportTimelineDTO):
        return cls(
            {
                "report_id": dto.report_id,
                "events": [
                    {
                        "event_type": event.event_type,
                        "timestamp": event.timestamp,
                        "actor_name": event.actor_name,
                        "message": event.message,
                    }
                    for event in dto.events
                ],
            }
        )

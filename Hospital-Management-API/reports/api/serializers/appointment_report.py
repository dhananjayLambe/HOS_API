from __future__ import annotations

from datetime import date, timedelta

from rest_framework import serializers

from reports.constants.report_constants import APPOINTMENT_TYPE_CHOICES, STATUS_CHOICES


class AppointmentSummaryFilterSerializer(serializers.Serializer):
    start_date = serializers.DateField(required=False)
    end_date = serializers.DateField(required=False)
    doctor_id = serializers.UUIDField(required=False)
    appointment_type = serializers.ChoiceField(choices=APPOINTMENT_TYPE_CHOICES, required=False)
    status = serializers.ChoiceField(choices=STATUS_CHOICES, required=False)

    def validate(self, attrs):
        end_date = attrs.get("end_date") or date.today()
        start_date = attrs.get("start_date") or (end_date - timedelta(days=6))
        if start_date > end_date:
            raise serializers.ValidationError("start_date cannot be after end_date.")
        attrs["start_date"] = start_date
        attrs["end_date"] = end_date
        return attrs


class MetricSerializer(serializers.Serializer):
    count = serializers.IntegerField()
    change_percentage = serializers.FloatField()
    trend = serializers.ChoiceField(choices=("up", "down", "stable"))


class SummarySerializer(serializers.Serializer):
    total_appointments = MetricSerializer()
    completed = MetricSerializer()
    checked_in = MetricSerializer()
    cancelled = MetricSerializer()
    no_show = MetricSerializer()
    walk_in_patients = MetricSerializer()
    new_patients = MetricSerializer()
    returning_patients = MetricSerializer()


class OperationalSummarySerializer(serializers.Serializer):
    peak_opd_hour = serializers.CharField()
    best_attendance_day = serializers.CharField()
    average_daily_footfall = serializers.IntegerField()
    patient_retention_percentage = serializers.FloatField()


class PerformanceInsightItemSerializer(serializers.Serializer):
    title = serializers.CharField()
    value = serializers.CharField()
    trend = serializers.CharField()


class PerformanceInsightsSerializer(serializers.Serializer):
    performing_well = PerformanceInsightItemSerializer(many=True)
    needs_attention = PerformanceInsightItemSerializer(many=True)


class StatusDistributionSerializer(serializers.Serializer):
    status = serializers.CharField()
    count = serializers.IntegerField()
    percentage = serializers.FloatField()


class AppointmentTypeDistributionSerializer(serializers.Serializer):
    type = serializers.CharField()
    count = serializers.IntegerField()
    percentage = serializers.FloatField()


class DailyTrendSerializer(serializers.Serializer):
    date = serializers.DateField()
    total = serializers.IntegerField()
    completed = serializers.IntegerField()
    cancelled = serializers.IntegerField()
    no_show = serializers.IntegerField()


class MonthlyTrendSerializer(serializers.Serializer):
    month = serializers.CharField()
    appointments = serializers.IntegerField()


class PeakHourSerializer(serializers.Serializer):
    slot = serializers.CharField()
    count = serializers.IntegerField()


class PatientSplitSerializer(serializers.Serializer):
    new_patients = serializers.IntegerField()
    returning_patients = serializers.IntegerField()
    retention_percentage = serializers.FloatField()


class DoctorLoadSerializer(serializers.Serializer):
    doctor_id = serializers.UUIDField()
    doctor_name = serializers.CharField()
    total = serializers.IntegerField()
    completed = serializers.IntegerField()
    cancelled = serializers.IntegerField()
    no_show = serializers.IntegerField()
    average_per_day = serializers.FloatField()


class RecentAppointmentSerializer(serializers.Serializer):
    patient_name = serializers.CharField()
    visit_type = serializers.CharField()
    appointment_type = serializers.CharField()
    appointment_time = serializers.CharField()
    status = serializers.CharField()


class AppointmentSummaryReportResponseSerializer(serializers.Serializer):
    summary = SummarySerializer()
    operational_summary = OperationalSummarySerializer()
    performance_insights = PerformanceInsightsSerializer()
    status_distribution = StatusDistributionSerializer(many=True)
    appointment_type_distribution = AppointmentTypeDistributionSerializer(many=True)
    daily_trends = DailyTrendSerializer(many=True)
    monthly_trends = MonthlyTrendSerializer(many=True)
    peak_hours = PeakHourSerializer(many=True)
    patient_split = PatientSplitSerializer()
    doctor_load = DoctorLoadSerializer(many=True)
    recent_appointments = RecentAppointmentSerializer(many=True)

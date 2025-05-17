from rest_framework import serializers
from django.utils.text import slugify
from diagnostic.models import (
    MedicalTest, TestCategory, ImagingView, TestRecommendation
    )

class MedicalTestSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source="category.name", read_only=True)
    view_name = serializers.CharField(source="view.name", read_only=True)

    class Meta:
        model = MedicalTest
        fields = [
            "id", "name", "category", "category_name", "view", "view_name",
            "type", "description", "default_instructions",
            "standard_price", "is_active", "created_at"
        ]
        read_only_fields = ["id", "created_at"]
    
    def validate_name(self, value):
        if MedicalTest.objects.exclude(id=self.instance.id if self.instance else None).filter(name__iexact=value).exists():
            raise serializers.ValidationError("A medical test with this name already exists.")
        return value

class TestCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = TestCategory
        fields = ['id', 'name', 'slug', 'modality', 'description']
        read_only_fields = ['id', 'slug']

    def validate_name(self, value):
        qs = TestCategory.objects.exclude(id=self.instance.id if self.instance else None)
        if qs.filter(name__iexact=value).exists():
            raise serializers.ValidationError("A category with this name already exists.")
        return value

    def create(self, validated_data):
        validated_data['slug'] = slugify(validated_data['name'])
        return super().create(validated_data)

    def update(self, instance, validated_data):
        if 'name' in validated_data:
            validated_data['slug'] = slugify(validated_data['name'])
        return super().update(instance, validated_data)

class ImagingViewSerializer(serializers.ModelSerializer):
    class Meta:
        model = ImagingView
        fields = ['id', 'name', 'code', 'description']
        read_only_fields = ['id']

    def validate(self, data):
        """
        Ensure uniqueness across name, code, and description
        """
        name = data.get('name', getattr(self.instance, 'name', None))
        code = data.get('code', getattr(self.instance, 'code', None))
        description = data.get('description', getattr(self.instance, 'description', None))

        qs = ImagingView.objects.exclude(id=self.instance.id if self.instance else None)

        if qs.filter(name__iexact=name).exists():
            raise serializers.ValidationError({'name': 'An imaging view with this name already exists.'})
        if qs.filter(code__iexact=code).exists():
            raise serializers.ValidationError({'code': 'An imaging view with this code already exists.'})
        if description and qs.filter(description__iexact=description).exists():
            raise serializers.ValidationError({'description': 'This description is already used.'})

        return data


class TestRecommendationSerializer(serializers.ModelSerializer):
    test_name = serializers.CharField(source='test.name', read_only=True)

    class Meta:
        model = TestRecommendation
        fields = [
            'id', 'consultation', 'test', 'test_name', 'custom_name', 'notes',
            'doctor_comment', 'is_completed', 'recommended_by', 'created_at'
        ]
        read_only_fields = ['id', 'created_at', 'recommended_by', 'consultation']

    def validate(self, data):
        test = data.get('test')
        custom_name = data.get('custom_name')

        if not test and not custom_name:
            raise serializers.ValidationError("Either a predefined test or custom name must be provided.")
        return data
from rest_framework import serializers
from .models import Application, ApplicationStatus


class ApplicationSerializer(serializers.ModelSerializer):
    """
    Serializer for Application CRUD operations.
    Validates company, role, and status choices.
    User is set automatically in the view.
    """
    user = serializers.ReadOnlyField(source='user.username')
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = Application
        fields = (
            'id',
            'user',
            'company',
            'role',
            'status',
            'status_display',
            'applied_date',
            'job_url',
            'location',
            'salary_range',
            'notes',
            'follow_up_date',
            'created_at',
            'updated_at',
        )
        read_only_fields = ('id', 'user', 'status_display', 'created_at', 'updated_at')

    def validate_company(self, value):
        trimmed = value.strip()
        if not trimmed:
            raise serializers.ValidationError("Company name cannot be blank.")
        return trimmed

    def validate_role(self, value):
        trimmed = value.strip()
        if not trimmed:
            raise serializers.ValidationError("Role / Job title cannot be blank.")
        return trimmed

    def validate_status(self, value):
        if value not in ApplicationStatus.values:
            allowed = ", ".join(ApplicationStatus.values)
            raise serializers.ValidationError(
                f"Invalid status '{value}'. Allowed choices are: {allowed}"
            )
        return value

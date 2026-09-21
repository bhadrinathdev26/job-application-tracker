from rest_framework import serializers
from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer


class UserSerializer(serializers.ModelSerializer):
    """
    Serializer for exposing safe User details.
    Password hashes and sensitive metadata are omitted.
    """
    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'date_joined')
        read_only_fields = ('id', 'date_joined')


class RegisterSerializer(serializers.ModelSerializer):
    """
    Serializer for new user registration.
    Validates email uniqueness and runs password through Django's validation rules.
    """
    password = serializers.CharField(
        write_only=True,
        required=True,
        style={'input_type': 'password'},
        help_text="User password meeting system complexity requirements."
    )
    email = serializers.EmailField(
        required=True,
        allow_blank=False,
        help_text="Unique email address for the user."
    )

    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'password')

    def validate_email(self, value):
        """
        Ensure email is unique across all users (case-insensitive).
        """
        normalized_email = value.strip().lower()
        if User.objects.filter(email__iexact=normalized_email).exists():
            raise serializers.ValidationError("A user with this email address already exists.")
        return normalized_email

    def validate_password(self, value):
        """
        Validate password using Django's configured AUTH_PASSWORD_VALIDATORS.
        """
        validate_password(value)
        return value

    def create(self, validated_data):
        """
        Create a new user using create_user so the password is securely hashed.
        """
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data['email'],
            password=validated_data['password']
        )
        return user


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    """
    Custom JWT serializer that includes user details alongside access and refresh tokens.
    """
    def validate(self, attrs):
        data = super().validate(attrs)
        # Add serialized user profile to the login response
        data['user'] = {
            'id': self.user.id,
            'username': self.user.username,
            'email': self.user.email,
        }
        return data

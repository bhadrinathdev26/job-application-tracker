from rest_framework import generics, status, permissions
from rest_framework.response import Response
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.tokens import RefreshToken
from .serializers import (
    RegisterSerializer,
    UserSerializer,
    CustomTokenObtainPairSerializer,
)


class RegisterView(generics.CreateAPIView):
    """
    Endpoint: POST /api/auth/register/
    Registers a new user, hashes password, verifies email uniqueness,
    and returns user details with initial JWT tokens for auto-login.
    """
    permission_classes = [permissions.AllowAny]
    serializer_class = RegisterSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        # Generate JWT tokens for immediate access
        refresh = RefreshToken.for_user(user)

        return Response(
            {
                "message": "User registered successfully.",
                "user": UserSerializer(user).data,
                "tokens": {
                    "access": str(refresh.access_token),
                    "refresh": str(refresh),
                },
            },
            status=status.HTTP_201_CREATED,
        )


class CustomTokenObtainPairView(TokenObtainPairView):
    """
    Endpoint: POST /api/auth/login/
    Takes username and password credentials, returns access & refresh tokens
    plus safe user profile metadata.
    """
    permission_classes = [permissions.AllowAny]
    serializer_class = CustomTokenObtainPairSerializer


class CurrentUserView(generics.RetrieveAPIView):
    """
    Endpoint: GET /api/auth/me/
    Returns the authenticated user's profile details.
    Requires a valid JWT Bearer token in the Authorization header.
    """
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = UserSerializer

    def get_object(self):
        return self.request.user

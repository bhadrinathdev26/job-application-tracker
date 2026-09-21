from django.test import TestCase
from django.urls import reverse
from django.contrib.auth.models import User
from rest_framework import status
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken


class AuthenticationAPITests(TestCase):
    """
    Test suite for Authentication API:
    - User Registration & Email Uniqueness
    - User Login & JWT Token issuance
    - Token Refresh
    - Current User Profile (/api/auth/me/)
    """

    def setUp(self):
        self.client = APIClient()
        self.register_url = reverse('auth:auth-register')
        self.login_url = reverse('auth:auth-login')
        self.refresh_url = reverse('auth:auth-refresh')
        self.me_url = reverse('auth:auth-me')

        # Existing user for login and duplicate checks
        self.user_password = "ValidSecretPassword123!"
        self.user = User.objects.create_user(
            username="existinguser",
            email="existing@example.com",
            password=self.user_password
        )

    def test_register_success(self):
        """Should register a new user and return user info + JWT tokens."""
        payload = {
            "username": "newapplicant",
            "email": "newapplicant@example.com",
            "password": "StrongPassword789!"
        }
        response = self.client.post(self.register_url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        data = response.json()
        self.assertEqual(data["user"]["username"], payload["username"])
        self.assertEqual(data["user"]["email"], payload["email"])
        self.assertIn("tokens", data)
        self.assertIn("access", data["tokens"])
        self.assertIn("refresh", data["tokens"])

        # Confirm saved in database
        self.assertTrue(User.objects.filter(username=payload["username"]).exists())

    def test_register_duplicate_email_fails(self):
        """Should fail registration if email is already taken (case-insensitive)."""
        payload = {
            "username": "anotheruser",
            "email": "EXISTING@example.com",  # Duplicate email with different casing
            "password": "StrongPassword789!"
        }
        response = self.client.post(self.register_url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        data = response.json()
        self.assertIn("email", data)
        self.assertIn("already exists", str(data["email"][0]).lower())

    def test_register_duplicate_username_fails(self):
        """Should fail registration if username is already taken."""
        payload = {
            "username": "existinguser",
            "email": "uniqueemail@example.com",
            "password": "StrongPassword789!"
        }
        response = self.client.post(self.register_url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        data = response.json()
        self.assertIn("username", data)

    def test_login_success(self):
        """Should login user and return access token, refresh token, and user payload."""
        payload = {
            "username": "existinguser",
            "password": self.user_password
        }
        response = self.client.post(self.login_url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertIn("access", data)
        self.assertIn("refresh", data)
        self.assertIn("user", data)
        self.assertEqual(data["user"]["username"], self.user.username)
        self.assertEqual(data["user"]["email"], self.user.email)

    def test_login_invalid_password(self):
        """Should return 401 when given an incorrect password."""
        payload = {
            "username": "existinguser",
            "password": "WrongPassword999!"
        }
        response = self.client.post(self.login_url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_token_refresh_success(self):
        """Should return a new access token when provided a valid refresh token."""
        refresh = RefreshToken.for_user(self.user)
        payload = {"refresh": str(refresh)}
        response = self.client.post(self.refresh_url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertIn("access", data)

    def test_token_refresh_invalid_token(self):
        """Should return 401 when given an invalid or expired refresh token."""
        payload = {"refresh": "invalid-token-string"}
        response = self.client.post(self.refresh_url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_current_user_authenticated(self):
        """Should return the user profile when authenticated with JWT Bearer token."""
        refresh = RefreshToken.for_user(self.user)
        access_token = str(refresh.access_token)

        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {access_token}")
        response = self.client.get(self.me_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertEqual(data["id"], self.user.id)
        self.assertEqual(data["username"], self.user.username)
        self.assertEqual(data["email"], self.user.email)

    def test_current_user_unauthenticated(self):
        """Should return 401 Unauthorized when requesting /api/auth/me/ without credentials."""
        response = self.client.get(self.me_url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

from datetime import date, timedelta

from django.core.exceptions import ValidationError
from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status

from accounts.models import PlayerProfile

User = get_user_model()


# ---------------------------------------------------------------------------
# Custom User Manager Tests
# ---------------------------------------------------------------------------

class CustomUserManagerTests(TestCase):
    """Tests for the CustomUserManager."""

    def test_create_user_with_email(self):
        """Creating a user with email should succeed."""
        user = User.objects.create_user(
            email="player@test.com",
            password="testpass123",
        )
        self.assertEqual(user.email, "player@test.com")
        self.assertTrue(user.check_password("testpass123"))
        self.assertTrue(user.is_active)
        self.assertFalse(user.is_staff)
        self.assertFalse(user.is_superuser)
        self.assertEqual(user.role, "PLAYER")

    def test_create_user_without_email_raises_error(self):
        """Creating a user without email should raise ValueError."""
        with self.assertRaises(ValueError):
            User.objects.create_user(email="", password="testpass123")

    def test_create_user_normalizes_email(self):
        """Email should be normalized (domain part lowered)."""
        user = User.objects.create_user(
            email="player@TEST.COM",
            password="testpass123",
        )
        self.assertEqual(user.email, "player@test.com")

    def test_create_superuser(self):
        """Creating a superuser should set is_staff and is_superuser."""
        admin = User.objects.create_superuser(
            email="admin@test.com",
            password="adminpass123",
        )
        self.assertTrue(admin.is_staff)
        self.assertTrue(admin.is_superuser)
        self.assertEqual(admin.role, "ADMIN")

    def test_create_superuser_not_staff_raises_error(self):
        """Superuser with is_staff=False should raise ValueError."""
        with self.assertRaises(ValueError):
            User.objects.create_superuser(
                email="admin@test.com",
                password="adminpass123",
                is_staff=False,
            )

    def test_create_superuser_not_superuser_raises_error(self):
        """Superuser with is_superuser=False should raise ValueError."""
        with self.assertRaises(ValueError):
            User.objects.create_superuser(
                email="admin@test.com",
                password="adminpass123",
                is_superuser=False,
            )


# ---------------------------------------------------------------------------
# User Model Tests
# ---------------------------------------------------------------------------

class UserModelTests(TestCase):
    """Tests for the User model."""

    def test_user_str_returns_email(self):
        """__str__ should return the user's email."""
        user = User.objects.create_user(
            email="player@test.com",
            password="testpass123",
        )
        self.assertEqual(str(user), "player@test.com")

    def test_user_uuid_primary_key(self):
        """User PK should be a UUID."""
        user = User.objects.create_user(
            email="player@test.com",
            password="testpass123",
        )
        self.assertIsNotNone(user.id)
        self.assertEqual(len(str(user.id)), 36)  # UUID format: 8-4-4-4-12

    def test_user_default_role_is_player(self):
        """Default role should be PLAYER."""
        user = User.objects.create_user(
            email="player@test.com",
            password="testpass123",
        )
        self.assertEqual(user.role, "PLAYER")

    def test_user_is_not_verified_by_default(self):
        """New users should not be verified by default."""
        user = User.objects.create_user(
            email="player@test.com",
            password="testpass123",
        )
        self.assertFalse(user.is_verified)


# ---------------------------------------------------------------------------
# PlayerProfile Model Tests
# ---------------------------------------------------------------------------

class PlayerProfileTests(TestCase):
    """Tests for the PlayerProfile model."""

    def setUp(self):
        self.user = User.objects.create_user(
            email="player@test.com",
            password="testpass123",
        )

    def test_profile_auto_created(self):
        """A PlayerProfile should be auto-created when a User is created."""
        self.assertTrue(hasattr(self.user, "profile"))
        self.assertIsInstance(self.user.profile, PlayerProfile)

    def test_age_minimum_validation(self):
        """Profile with date_of_birth under 16 should fail validation."""
        profile = self.user.profile
        profile.date_of_birth = date.today() - timedelta(days=365 * 10)
        with self.assertRaises(ValidationError) as ctx:
            profile.full_clean()
        self.assertIn("date_of_birth", ctx.exception.message_dict)

    def test_age_minimum_validation_valid(self):
        """Profile with date_of_birth >= 16 should pass validation."""
        profile = self.user.profile
        profile.date_of_birth = date.today() - timedelta(days=365 * 20)
        profile.first_name = "John"
        profile.last_name = "Doe"
        profile.city = "Gen\u00e8ve"
        profile.level_tennis = "beginner"
        try:
            profile.full_clean()
        except ValidationError:
            self.fail("full_clean() raised ValidationError for a valid age.")

    def test_is_profile_complete_true(self):
        """is_profile_complete should return True when all required fields are set."""
        profile = self.user.profile
        profile.first_name = "John"
        profile.last_name = "Doe"
        profile.date_of_birth = date(2000, 1, 1)
        profile.city = "Lausanne"
        profile.level_padel = "intermediate"
        profile.save()
        self.assertTrue(profile.is_profile_complete)

    def test_is_profile_complete_false_missing_name(self):
        """is_profile_complete should return False when first_name is missing."""
        profile = self.user.profile
        profile.last_name = "Doe"
        profile.date_of_birth = date(2000, 1, 1)
        profile.city = "Lausanne"
        profile.level_tennis = "advanced"
        profile.save()
        self.assertFalse(profile.is_profile_complete)

    def test_is_profile_complete_false_no_sport(self):
        """is_profile_complete should return False when no sport level is set."""
        profile = self.user.profile
        profile.first_name = "John"
        profile.last_name = "Doe"
        profile.date_of_birth = date(2000, 1, 1)
        profile.city = "Lausanne"
        profile.save()
        self.assertFalse(profile.is_profile_complete)


# ---------------------------------------------------------------------------
# Register API Tests
# ---------------------------------------------------------------------------

class RegisterAPITests(TestCase):
    """Tests for POST /api/auth/register/."""

    def setUp(self):
        self.client = APIClient()
        self.url = "/api/auth/register/"

    def test_register_success(self):
        """Valid registration should return 201 with user + tokens."""
        data = {
            "email": "newplayer@test.com",
            "password": "strongpass123",
            "password_confirm": "strongpass123",
        }
        response = self.client.post(self.url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["user"]["email"], "newplayer@test.com")
        self.assertIn("access", response.data["tokens"])
        self.assertIn("refresh", response.data["tokens"])
        # Profile should be nested
        self.assertIn("profile", response.data["user"])

    def test_register_password_mismatch(self):
        """Mismatched passwords should return 400."""
        data = {
            "email": "newplayer@test.com",
            "password": "strongpass123",
            "password_confirm": "differentpass",
        }
        response = self.client.post(self.url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_register_duplicate_email(self):
        """Registering with an existing email should return 400."""
        User.objects.create_user(
            email="existing@test.com",
            password="testpass123",
        )
        data = {
            "email": "existing@test.com",
            "password": "strongpass123",
            "password_confirm": "strongpass123",
        }
        response = self.client.post(self.url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_register_duplicate_email_case_insensitive(self):
        """Email uniqueness check should be case-insensitive."""
        User.objects.create_user(
            email="player@test.com",
            password="testpass123",
        )
        data = {
            "email": "PLAYER@test.com",
            "password": "strongpass123",
            "password_confirm": "strongpass123",
        }
        response = self.client.post(self.url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_register_too_young(self):
        """Registration itself succeeds, but updating profile with underage DOB should fail."""
        # Register first
        data = {
            "email": "young@test.com",
            "password": "strongpass123",
            "password_confirm": "strongpass123",
        }
        reg_response = self.client.post(self.url, data, format="json")
        self.assertEqual(reg_response.status_code, status.HTTP_201_CREATED)

        # Now try to set an underage date_of_birth via profile update
        user = User.objects.get(email="young@test.com")
        self.client.force_authenticate(user=user)
        too_young_dob = date.today() - timedelta(days=365 * 10)
        profile_response = self.client.patch(
            "/api/auth/profile/",
            {"date_of_birth": str(too_young_dob)},
            format="json",
        )
        self.assertEqual(profile_response.status_code, status.HTTP_400_BAD_REQUEST)


# ---------------------------------------------------------------------------
# Login API Tests
# ---------------------------------------------------------------------------

class LoginAPITests(TestCase):
    """Tests for POST /api/auth/login/."""

    def setUp(self):
        self.client = APIClient()
        self.url = "/api/auth/login/"
        self.user = User.objects.create_user(
            email="player@test.com",
            password="testpass123",
        )

    def test_login_success(self):
        """Valid credentials should return 200 with user + tokens."""
        data = {"email": "player@test.com", "password": "testpass123"}
        response = self.client.post(self.url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["user"]["email"], "player@test.com")
        self.assertIn("access", response.data["tokens"])
        self.assertIn("refresh", response.data["tokens"])

    def test_login_wrong_password(self):
        """Wrong password should return 400."""
        data = {"email": "player@test.com", "password": "wrongpassword"}
        response = self.client.post(self.url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_login_nonexistent_user(self):
        """Non-existent email should return 400."""
        data = {"email": "nobody@test.com", "password": "testpass123"}
        response = self.client.post(self.url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


# ---------------------------------------------------------------------------
# Me API Tests
# ---------------------------------------------------------------------------

class MeAPITests(TestCase):
    """Tests for GET /api/auth/me/."""

    def setUp(self):
        self.client = APIClient()
        self.url = "/api/auth/me/"
        self.user = User.objects.create_user(
            email="player@test.com",
            password="testpass123",
        )

    def test_me_authenticated(self):
        """Authenticated user should get their full profile."""
        self.client.force_authenticate(user=self.user)
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["email"], "player@test.com")
        self.assertIn("profile", response.data)

    def test_me_unauthenticated(self):
        """Unauthenticated request should return 401."""
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


# ---------------------------------------------------------------------------
# Update Profile API Tests
# ---------------------------------------------------------------------------

class UpdateProfileAPITests(TestCase):
    """Tests for PATCH /api/auth/profile/."""

    def setUp(self):
        self.client = APIClient()
        self.url = "/api/auth/profile/"
        self.user = User.objects.create_user(
            email="player@test.com",
            password="testpass123",
        )
        self.client.force_authenticate(user=self.user)

    def test_update_profile_success(self):
        """PATCH with valid data should update the profile."""
        data = {
            "first_name": "Th\u00e9o",
            "last_name": "Tran Van",
            "date_of_birth": "2000-05-15",
            "city": "Gen\u00e8ve",
            "level_tennis": "intermediate",
        }
        response = self.client.patch(self.url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["first_name"], "Th\u00e9o")
        self.assertEqual(response.data["city"], "Gen\u00e8ve")
        self.assertEqual(response.data["level_tennis"], "intermediate")

    def test_update_profile_partial(self):
        """PATCH should support partial updates."""
        data = {"bio": "I love padel!"}
        response = self.client.patch(self.url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["bio"], "I love padel!")

    def test_update_profile_too_young(self):
        """Setting an underage date_of_birth should return 400."""
        too_young_dob = date.today() - timedelta(days=365 * 10)
        data = {"date_of_birth": str(too_young_dob)}
        response = self.client.patch(self.url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_update_profile_unauthenticated(self):
        """Unauthenticated PATCH should return 401."""
        self.client.force_authenticate(user=None)
        data = {"first_name": "Hacker"}
        response = self.client.patch(self.url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_update_profile_email_read_only(self):
        """Email field in profile should be read-only."""
        self.client.patch(self.url, {"first_name": "Test"}, format="json")
        response = self.client.get("/api/auth/me/")
        self.assertEqual(response.data["profile"]["email"], "player@test.com")

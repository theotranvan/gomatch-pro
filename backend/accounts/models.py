import uuid
from datetime import date

from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin
from django.core.exceptions import ValidationError
from django.db import models

from accounts.enums import UserRole
from accounts.managers import CustomUserManager
from core.enums import SkillLevel, PlayMode


class User(AbstractBaseUser, PermissionsMixin):
    """
    Custom User model using email as the unique identifier
    instead of the default username.
    """

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
    )
    email = models.EmailField(
        unique=True,
        max_length=255,
        verbose_name="email address",
    )
    phone_number = models.CharField(
        max_length=20,
        blank=True,
        null=True,
        verbose_name="phone number",
    )
    role = models.CharField(
        max_length=20,
        choices=UserRole.choices,
        default=UserRole.PLAYER,
        verbose_name="role",
    )
    is_active = models.BooleanField(
        default=True,
        verbose_name="active",
    )
    is_staff = models.BooleanField(
        default=False,
        verbose_name="staff status",
    )
    is_verified = models.BooleanField(
        default=False,
        verbose_name="email verified",
    )
    date_joined = models.DateTimeField(
        auto_now_add=True,
        verbose_name="date joined",
    )
    last_login = models.DateTimeField(
        auto_now=True,
        null=True,
        blank=True,
        verbose_name="last login",
    )

    objects = CustomUserManager()

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = []  # email is already required by USERNAME_FIELD

    class Meta:
        db_table = "users"
        verbose_name = "user"
        verbose_name_plural = "users"
        ordering = ["-date_joined"]

    def __str__(self):
        return self.email


class PlayerProfile(models.Model):
    """
    Extended profile for players containing personal info,
    skill levels, location, and availability.
    """

    MINIMUM_AGE = 16

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
    )
    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name="profile",
    )
    first_name = models.CharField(
        max_length=50,
        blank=True,
        default="",
        verbose_name="first name",
    )
    last_name = models.CharField(
        max_length=50,
        blank=True,
        default="",
        verbose_name="last name",
    )
    date_of_birth = models.DateField(
        null=True,
        blank=True,
        verbose_name="date of birth",
    )
    avatar_url = models.URLField(
        blank=True,
        null=True,
        verbose_name="avatar URL",
    )
    bio = models.TextField(
        max_length=500,
        blank=True,
        default="",
        verbose_name="biography",
    )
    level_tennis = models.CharField(
        max_length=20,
        choices=SkillLevel.choices,
        blank=True,
        null=True,
        verbose_name="tennis level",
    )
    level_padel = models.CharField(
        max_length=20,
        choices=SkillLevel.choices,
        blank=True,
        null=True,
        verbose_name="padel level",
    )
    preferred_play_mode = models.CharField(
        max_length=20,
        choices=PlayMode.choices,
        default=PlayMode.BOTH,
        verbose_name="preferred play mode",
    )
    city = models.CharField(
        max_length=100,
        blank=True,
        default="",
        verbose_name="city",
    )
    latitude = models.DecimalField(
        max_digits=9,
        decimal_places=6,
        blank=True,
        null=True,
        verbose_name="latitude",
    )
    longitude = models.DecimalField(
        max_digits=9,
        decimal_places=6,
        blank=True,
        null=True,
        verbose_name="longitude",
    )
    availability = models.JSONField(
        blank=True,
        null=True,
        default=dict,
        verbose_name="availability",
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name="created at",
    )
    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name="updated at",
    )

    class Meta:
        db_table = "player_profiles"
        verbose_name = "player profile"
        verbose_name_plural = "player profiles"

    def __str__(self):
        return f"{self.first_name} {self.last_name} ({self.user.email})"

    def clean(self):
        """Validate that the player is at least 16 years old."""
        super().clean()
        if self.date_of_birth:
            today = date.today()
            age = (
                today.year
                - self.date_of_birth.year
                - (
                    (today.month, today.day)
                    < (self.date_of_birth.month, self.date_of_birth.day)
                )
            )
            if age < self.MINIMUM_AGE:
                raise ValidationError(
                    {
                        "date_of_birth": f"Player must be at least {self.MINIMUM_AGE} years old."
                    }
                )

    @property
    def is_profile_complete(self) -> bool:
        """
        A profile is considered complete when first_name, last_name,
        date_of_birth, city, and at least one sport level are filled.
        """
        has_basic_info = all([
            self.first_name,
            self.last_name,
            self.date_of_birth,
            self.city,
        ])
        has_sport = self.level_tennis is not None or self.level_padel is not None
        return has_basic_info and has_sport

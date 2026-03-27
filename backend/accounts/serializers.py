from datetime import date

from django.contrib.auth import authenticate
from rest_framework import serializers

from accounts.models import User, PlayerProfile, Connection


class UserRegistrationSerializer(serializers.ModelSerializer):
    """Serializer for user registration."""

    password = serializers.CharField(
        write_only=True,
        min_length=8,
        style={"input_type": "password"},
    )
    password_confirm = serializers.CharField(
        write_only=True,
        min_length=8,
        style={"input_type": "password"},
    )

    class Meta:
        model = User
        fields = [
            "id",
            "email",
            "password",
            "password_confirm",
            "date_joined",
        ]
        read_only_fields = ["id", "date_joined"]

    def validate_email(self, value):
        """Case-insensitive email uniqueness check."""
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("A user with this email already exists.")
        return value.lower()

    def validate(self, attrs):
        """Check that the two password entries match."""
        if attrs["password"] != attrs["password_confirm"]:
            raise serializers.ValidationError(
                {"password_confirm": "Passwords do not match."}
            )
        return attrs

    def create(self, validated_data):
        """Create a new user with encrypted password."""
        validated_data.pop("password_confirm")
        return User.objects.create_user(**validated_data)


class LoginSerializer(serializers.Serializer):
    """Serializer for user login via email + password."""

    email = serializers.EmailField()
    password = serializers.CharField(
        write_only=True,
        style={"input_type": "password"},
    )

    def validate(self, attrs):
        """Authenticate user with the provided credentials."""
        email = attrs.get("email", "").lower()
        password = attrs.get("password")

        user = authenticate(
            request=self.context.get("request"),
            email=email,
            password=password,
        )
        if not user:
            raise serializers.ValidationError(
                {"detail": "Invalid email or password."}
            )
        if not user.is_active:
            raise serializers.ValidationError(
                {"detail": "This account has been deactivated."}
            )
        attrs["user"] = user
        return attrs


class PlayerProfileSerializer(serializers.ModelSerializer):
    """Serializer for reading and updating a player profile."""

    email = serializers.EmailField(source="user.email", read_only=True)

    class Meta:
        model = PlayerProfile
        fields = [
            "id",
            "email",
            "username",
            "first_name",
            "last_name",
            "date_of_birth",
            "avatar_url",
            "bio",
            "level_tennis",
            "level_padel",
            "preferred_play_mode",
            "city",
            "latitude",
            "longitude",
            "availability",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "email", "created_at", "updated_at"]

    def validate_username(self, value):
        """Validate username format and case-insensitive uniqueness."""
        if value is None:
            return value
        if not PlayerProfile.USERNAME_REGEX.match(value):
            raise serializers.ValidationError(
                "Le pseudo doit contenir entre 3 et 30 caractères alphanumériques ou underscores."
            )
        qs = PlayerProfile.objects.filter(username__iexact=value)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError("Ce pseudo est déjà pris.")
        return value

    def validate_date_of_birth(self, value):
        """Ensure the player is at least 16 years old."""
        if value:
            today = date.today()
            age = (
                today.year
                - value.year
                - ((today.month, today.day) < (value.month, value.day))
            )
            if age < PlayerProfile.MINIMUM_AGE:
                raise serializers.ValidationError(
                    f"Player must be at least {PlayerProfile.MINIMUM_AGE} years old."
                )
        return value


class UserMeSerializer(serializers.ModelSerializer):
    """Serializer returning user data with nested profile."""

    profile = PlayerProfileSerializer(read_only=True)

    class Meta:
        model = User
        fields = [
            "id",
            "email",
            "phone_number",
            "role",
            "is_active",
            "is_verified",
            "date_joined",
            "last_login",
            "profile",
        ]
        read_only_fields = [
            "id",
            "email",
            "is_active",
            "is_verified",
            "date_joined",
            "last_login",
        ]


class PushTokenSerializer(serializers.Serializer):
    """Serializer for registering an Expo push token."""

    token = serializers.CharField(max_length=255)


class ConnectionPlayerSerializer(serializers.ModelSerializer):
    """Lightweight player serializer used inside connection responses."""

    class Meta:
        model = PlayerProfile
        fields = ["id", "username", "first_name", "last_name", "avatar_url", "city"]


class ConnectionSerializer(serializers.ModelSerializer):
    """Serializer for Connection objects."""

    requester = ConnectionPlayerSerializer(read_only=True)
    receiver = ConnectionPlayerSerializer(read_only=True)

    class Meta:
        model = Connection
        fields = ["id", "requester", "receiver", "status", "created_at", "updated_at"]
        read_only_fields = ["id", "requester", "receiver", "status", "created_at", "updated_at"]


class ConnectionRequestSerializer(serializers.Serializer):
    """Serializer for POST /connections/request/."""

    player_id = serializers.UUIDField()

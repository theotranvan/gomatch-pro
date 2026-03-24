from accounts.models import User


class AccountService:
    """Service layer for account-related business logic."""

    @staticmethod
    def create_user(email: str, password: str, **extra_fields) -> User:
        """Create a new user account."""
        return User.objects.create_user(
            email=email,
            password=password,
            **extra_fields,
        )

    @staticmethod
    def get_user_by_id(user_id: str) -> User | None:
        """Retrieve a user by their UUID."""
        try:
            return User.objects.get(id=user_id)
        except User.DoesNotExist:
            return None

    @staticmethod
    def get_user_by_email(email: str) -> User | None:
        """Retrieve a user by their email address."""
        try:
            return User.objects.get(email=email)
        except User.DoesNotExist:
            return None

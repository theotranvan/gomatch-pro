from rest_framework import generics, permissions, serializers as drf_serializers, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from drf_spectacular.utils import extend_schema, inline_serializer

from accounts.filters import PlayerFilter
from accounts.models import User, PlayerProfile
from accounts.serializers import (
    UserRegistrationSerializer,
    LoginSerializer,
    PlayerProfileSerializer,
    UserMeSerializer,
)


def _get_tokens_for_user(user):
    """Generate JWT access and refresh tokens for a user."""
    refresh = RefreshToken.for_user(user)
    return {
        "refresh": str(refresh),
        "access": str(refresh.access_token),
    }


class RegisterView(generics.CreateAPIView):
    """
    POST /api/auth/register/
    Register a new user account and return JWT tokens.
    """

    queryset = User.objects.all()
    serializer_class = UserRegistrationSerializer
    permission_classes = [permissions.AllowAny]

    @extend_schema(
        tags=["Auth"],
        summary="Register a new user",
        responses={
            201: inline_serializer(
                name="RegisterResponse",
                fields={
                    "user": UserMeSerializer(),
                    "tokens": inline_serializer(
                        name="TokenPair",
                        fields={
                            "access": drf_serializers.CharField(),
                            "refresh": drf_serializers.CharField(),
                        },
                    ),
                },
            ),
        },
    )
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        tokens = _get_tokens_for_user(user)
        return Response(
            {
                "user": UserMeSerializer(user).data,
                "tokens": tokens,
            },
            status=status.HTTP_201_CREATED,
        )


class LoginView(APIView):
    """
    POST /api/auth/login/
    Authenticate with email + password, return JWT tokens.
    """

    permission_classes = [permissions.AllowAny]

    @extend_schema(
        tags=["Auth"],
        summary="Login",
        request=LoginSerializer,
        responses={
            200: inline_serializer(
                name="LoginResponse",
                fields={
                    "user": UserMeSerializer(),
                    "tokens": inline_serializer(
                        name="LoginTokenPair",
                        fields={
                            "access": drf_serializers.CharField(),
                            "refresh": drf_serializers.CharField(),
                        },
                    ),
                },
            ),
        },
    )
    def post(self, request):
        serializer = LoginSerializer(
            data=request.data,
            context={"request": request},
        )
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data["user"]
        tokens = _get_tokens_for_user(user)
        return Response(
            {
                "user": UserMeSerializer(user).data,
                "tokens": tokens,
            },
            status=status.HTTP_200_OK,
        )


class MeView(APIView):
    """
    GET /api/auth/me/
    Returns the authenticated user's full profile.
    """

    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(tags=["Auth"], summary="Get current user", responses=UserMeSerializer)
    def get(self, request):
        serializer = UserMeSerializer(request.user)
        return Response(serializer.data)


@extend_schema(tags=["Auth"])
class UpdateProfileView(generics.UpdateAPIView):
    """
    PATCH /api/auth/profile/
    Update the authenticated user's PlayerProfile.
    """

    serializer_class = PlayerProfileSerializer
    permission_classes = [permissions.IsAuthenticated]
    http_method_names = ["patch"]

    def get_object(self):
        return self.request.user.profile


@extend_schema(tags=["Players"])
class PlayerListView(generics.ListAPIView):
    """
    GET /api/players/
    List all players with complete profiles.
    Filterable by sport, city, level_tennis, level_padel, preferred_play_mode.
    """

    serializer_class = PlayerProfileSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_class = PlayerFilter

    def get_queryset(self):
        return PlayerProfile.objects.select_related("user").order_by(
            "last_name", "first_name"
        )


@extend_schema(tags=["Players"])
class PlayerDetailView(generics.RetrieveAPIView):
    """
    GET /api/players/:id/
    Retrieve a single player profile by ID.
    """

    serializer_class = PlayerProfileSerializer
    permission_classes = [permissions.IsAuthenticated]
    queryset = PlayerProfile.objects.select_related("user")

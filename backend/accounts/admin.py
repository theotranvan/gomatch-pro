from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.utils.html import format_html

from accounts.models import User, PlayerProfile, Connection


class PlayerProfileInline(admin.StackedInline):
    """Inline admin for PlayerProfile, shown inside the User admin."""

    model = PlayerProfile
    can_delete = False
    verbose_name = "Player Profile"
    verbose_name_plural = "Player Profile"
    fk_name = "user"
    fieldsets = (
        (
            "Identity",
            {"fields": ("first_name", "last_name", "date_of_birth", "avatar_url")},
        ),
        ("Bio", {"fields": ("bio",), "classes": ("collapse",)}),
        (
            "Sport levels",
            {"fields": ("level_tennis", "level_padel", "preferred_play_mode")},
        ),
        (
            "Location",
            {"fields": ("city", "latitude", "longitude")},
        ),
        (
            "Availability",
            {"fields": ("availability",), "classes": ("collapse",)},
        ),
    )


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    """Custom admin view for the User model."""

    model = User
    inlines = [PlayerProfileInline]
    list_display = (
        "email",
        "get_full_name",
        "role",
        "is_active",
        "is_verified",
        "is_staff",
        "date_joined",
    )
    list_filter = ("role", "is_active", "is_verified", "is_staff")
    search_fields = (
        "email",
        "phone_number",
        "profile__first_name",
        "profile__last_name",
    )
    ordering = ("-date_joined",)
    date_hierarchy = "date_joined"
    list_per_page = 25
    actions = ["activate_users", "deactivate_users", "verify_users"]

    # Fields shown when editing an existing user
    fieldsets = (
        (None, {"fields": ("email", "password")}),
        ("Personal info", {"fields": ("phone_number",)}),
        (
            "Permissions",
            {
                "fields": (
                    "role",
                    "is_active",
                    "is_verified",
                    "is_staff",
                    "is_superuser",
                    "groups",
                    "user_permissions",
                ),
            },
        ),
        (
            "Important dates",
            {"fields": ("date_joined", "last_login"), "classes": ("collapse",)},
        ),
    )
    readonly_fields = ("date_joined", "last_login")

    # Fields shown when creating a new user via admin
    add_fieldsets = (
        (
            None,
            {
                "classes": ("wide",),
                "fields": (
                    "email",
                    "password1",
                    "password2",
                    "phone_number",
                    "role",
                    "is_active",
                    "is_staff",
                ),
            },
        ),
    )

    @admin.display(description="Full name")
    def get_full_name(self, obj):
        profile = getattr(obj, "profile", None)
        if profile and (profile.first_name or profile.last_name):
            return f"{profile.first_name} {profile.last_name}".strip()
        return format_html('<span style="color:#999">—</span>')

    @admin.action(description="Activate selected users")
    def activate_users(self, request, queryset):
        updated = queryset.update(is_active=True)
        self.message_user(request, f"{updated} user(s) activated.")

    @admin.action(description="Deactivate selected users")
    def deactivate_users(self, request, queryset):
        updated = queryset.update(is_active=False)
        self.message_user(request, f"{updated} user(s) deactivated.")

    @admin.action(description="Mark selected users as verified")
    def verify_users(self, request, queryset):
        updated = queryset.update(is_verified=True)
        self.message_user(request, f"{updated} user(s) verified.")


@admin.register(Connection)
class ConnectionAdmin(admin.ModelAdmin):
    list_display = ("requester", "receiver", "status", "created_at")
    list_filter = ("status",)
    search_fields = ("requester__first_name", "receiver__first_name")
    readonly_fields = ("id", "created_at", "updated_at")

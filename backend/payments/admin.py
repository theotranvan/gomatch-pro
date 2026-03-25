from django.contrib import admin

from payments.models import Payment


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = [
        "id",
        "booking",
        "payer",
        "amount",
        "status",
        "payment_method",
        "created_at",
        "completed_at",
    ]
    list_filter = ["status", "payment_method"]
    search_fields = ["stripe_payment_intent_id", "payer__email"]
    readonly_fields = ["id", "created_at"]

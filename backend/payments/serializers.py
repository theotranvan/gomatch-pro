from rest_framework import serializers

from payments.models import Payment


class PaymentSerializer(serializers.ModelSerializer):
    """Serializer for Payment model."""

    class Meta:
        model = Payment
        fields = [
            "id",
            "booking",
            "payer",
            "amount",
            "status",
            "payment_method",
            "stripe_payment_intent_id",
            "created_at",
            "completed_at",
        ]
        read_only_fields = [
            "id",
            "payer",
            "amount",
            "status",
            "payment_method",
            "stripe_payment_intent_id",
            "created_at",
            "completed_at",
        ]


class CreatePaymentIntentSerializer(serializers.Serializer):
    """Input serializer for creating a payment intent."""

    booking_id = serializers.UUIDField()

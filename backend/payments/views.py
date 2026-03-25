import json

from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator

from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from payments.models import Payment
from payments.serializers import (
    CreatePaymentIntentSerializer,
    PaymentSerializer,
)
from payments.services import PaymentService


class CreatePaymentIntentView(APIView):
    """POST /api/payments/create-intent/ — create a Stripe PaymentIntent."""

    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = CreatePaymentIntentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            result = PaymentService.create_payment_intent(
                user=request.user,
                booking_id=str(serializer.validated_data["booking_id"]),
            )
        except ValueError as e:
            return Response(
                {"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST
            )

        return Response(result, status=status.HTTP_201_CREATED)


@method_decorator(csrf_exempt, name="dispatch")
class StripeWebhookView(APIView):
    """POST /api/payments/webhook/ — Stripe webhook (no auth, no CSRF)."""

    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        payload = request.body
        sig_header = request.META.get("HTTP_STRIPE_SIGNATURE", "")

        try:
            PaymentService.handle_webhook(payload, sig_header)
        except ValueError as e:
            return Response(
                {"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST
            )

        return Response({"status": "ok"}, status=status.HTTP_200_OK)


class MyPaymentsView(APIView):
    """GET /api/payments/my/ — list payments for the authenticated user."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        payments = Payment.objects.filter(payer=request.user)
        serializer = PaymentSerializer(payments, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

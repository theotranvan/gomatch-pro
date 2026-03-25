from django.urls import path

from payments.views import (
    CreatePaymentIntentView,
    MyPaymentsView,
    StripeWebhookView,
)

urlpatterns = [
    path("create-intent/", CreatePaymentIntentView.as_view(), name="create-payment-intent"),
    path("webhook/", StripeWebhookView.as_view(), name="stripe-webhook"),
    path("my/", MyPaymentsView.as_view(), name="my-payments"),
]

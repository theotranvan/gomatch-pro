from django.urls import path

from events.views import (
    CancelRegistrationView,
    EventDetailView,
    EventListCreateView,
    MyRegistrationsView,
    RegisterForEventView,
)

urlpatterns = [
    path("", EventListCreateView.as_view(), name="event-list-create"),
    path("my/", MyRegistrationsView.as_view(), name="my-registrations"),
    path("<uuid:pk>/", EventDetailView.as_view(), name="event-detail"),
    path("<uuid:pk>/register/", RegisterForEventView.as_view(), name="event-register"),
    path("<uuid:pk>/cancel-registration/", CancelRegistrationView.as_view(), name="event-cancel"),
]

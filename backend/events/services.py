from django.utils import timezone
from rest_framework.exceptions import ValidationError

from accounts.models import PlayerProfile
from core.enums import EventStatus, RegistrationStatus
from events.models import Event, EventRegistration


class EventService:

    @staticmethod
    def create_event(user, data: dict) -> Event:
        return Event.objects.create(created_by=user, **data)

    @staticmethod
    def register_for_event(user, event_id, partner_id=None) -> EventRegistration:
        try:
            event = Event.objects.get(pk=event_id)
        except Event.DoesNotExist:
            raise ValidationError({"detail": "Événement introuvable."})

        if event.status != EventStatus.UPCOMING:
            raise ValidationError({"detail": "Les inscriptions ne sont pas ouvertes."})

        if event.registration_deadline and timezone.now() > event.registration_deadline:
            raise ValidationError({"detail": "La date limite d'inscription est passée."})

        profile = user.profile

        if EventRegistration.objects.filter(event=event, player=profile).exclude(
            status=RegistrationStatus.CANCELLED
        ).exists():
            raise ValidationError({"detail": "Vous êtes déjà inscrit."})

        partner = None
        if partner_id:
            try:
                partner = PlayerProfile.objects.get(pk=partner_id)
            except PlayerProfile.DoesNotExist:
                raise ValidationError({"detail": "Partenaire introuvable."})

        # Determine status: registered or waitlisted
        status = RegistrationStatus.REGISTERED
        if event.max_attendees is not None and event.registrations_count >= event.max_attendees:
            status = RegistrationStatus.WAITLISTED

        # Re-use cancelled registration if exists
        existing = EventRegistration.objects.filter(
            event=event, player=profile, status=RegistrationStatus.CANCELLED
        ).first()
        if existing:
            existing.status = status
            existing.partner = partner
            existing.save(update_fields=["status", "partner"])
            return existing

        return EventRegistration.objects.create(
            event=event, player=profile, partner=partner, status=status,
        )

    @staticmethod
    def cancel_registration(user, event_id) -> EventRegistration:
        try:
            reg = EventRegistration.objects.get(
                event_id=event_id, player=user.profile,
            )
        except EventRegistration.DoesNotExist:
            raise ValidationError({"detail": "Inscription introuvable."})

        if reg.status == RegistrationStatus.CANCELLED:
            raise ValidationError({"detail": "Inscription déjà annulée."})

        reg.status = RegistrationStatus.CANCELLED
        reg.save(update_fields=["status"])
        return reg

    @staticmethod
    def get_upcoming_events():
        return Event.objects.filter(status=EventStatus.UPCOMING).order_by("date", "start_time")

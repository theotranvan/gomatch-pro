from django.utils import timezone

from core.enums import BookingStatus, TimeSlotStatus
from bookings.models import Booking
from matches.models import Match
from venues.models import TimeSlot


class BookingService:
    """Service for creating and cancelling court bookings."""

    @staticmethod
    def create_booking(user, time_slot_id, match_id=None):
        """
        Book a time slot.
        The slot must be HELD by this user or AVAILABLE.
        """
        try:
            slot = TimeSlot.objects.select_related("court").get(pk=time_slot_id)
        except TimeSlot.DoesNotExist:
            raise ValueError("Time slot not found.")

        if slot.status == TimeSlotStatus.HELD and slot.held_by != user:
            raise ValueError("This slot is held by another user.")
        if slot.status == TimeSlotStatus.BOOKED:
            raise ValueError("This slot is already booked.")
        if slot.status not in (TimeSlotStatus.AVAILABLE, TimeSlotStatus.HELD):
            raise ValueError("This slot is not available for booking.")

        # Resolve optional match
        match = None
        if match_id:
            try:
                match = Match.objects.get(pk=match_id)
            except Match.DoesNotExist:
                raise ValueError("Match not found.")

        # Calculate amounts
        total_amount = slot.court.hourly_rate
        if match:
            per_player_amount = total_amount / match.max_participants
        else:
            per_player_amount = total_amount

        # Mark slot as booked
        slot.status = TimeSlotStatus.BOOKED
        slot.held_until = None
        slot.held_by = None
        slot.save(update_fields=["status", "held_until", "held_by"])

        booking = Booking.objects.create(
            time_slot=slot,
            match=match,
            booked_by=user,
            total_amount=total_amount,
            per_player_amount=per_player_amount,
        )
        return booking

    @staticmethod
    def cancel_booking(user, booking_id):
        """Cancel a booking and release the slot."""
        try:
            booking = Booking.objects.select_related("time_slot").get(pk=booking_id)
        except Booking.DoesNotExist:
            raise ValueError("Booking not found.")

        if booking.booked_by != user:
            raise ValueError("You can only cancel your own bookings.")

        if booking.status == BookingStatus.CANCELLED:
            raise ValueError("This booking is already cancelled.")

        booking.status = BookingStatus.CANCELLED
        booking.cancelled_at = timezone.now()
        booking.save(update_fields=["status", "cancelled_at"])

        # Release the slot
        slot = booking.time_slot
        slot.status = TimeSlotStatus.AVAILABLE
        slot.save(update_fields=["status"])

        return booking

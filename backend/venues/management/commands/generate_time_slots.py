from datetime import date, datetime, time, timedelta

from django.core.management.base import BaseCommand, CommandError

from venues.models import Court, TimeSlot


class Command(BaseCommand):
    help = "Generate 1-hour time slots (08:00-22:00) for a court and date range."

    def add_arguments(self, parser):
        parser.add_argument("court_id", type=str, help="UUID of the court.")
        parser.add_argument("start_date", type=str, help="Start date (YYYY-MM-DD).")
        parser.add_argument(
            "end_date",
            type=str,
            nargs="?",
            default=None,
            help="End date (YYYY-MM-DD). Defaults to start_date.",
        )

    def handle(self, *args, **options):
        try:
            court = Court.objects.get(pk=options["court_id"])
        except Court.DoesNotExist:
            raise CommandError(f"Court '{options['court_id']}' not found.")

        start = datetime.strptime(options["start_date"], "%Y-%m-%d").date()
        end_str = options["end_date"]
        end = datetime.strptime(end_str, "%Y-%m-%d").date() if end_str else start

        if end < start:
            raise CommandError("end_date must be >= start_date.")

        created = 0
        current = start
        while current <= end:
            for hour in range(8, 22):
                _, is_new = TimeSlot.objects.get_or_create(
                    court=court,
                    date=current,
                    start_time=time(hour, 0),
                    defaults={"end_time": time(hour + 1, 0)},
                )
                if is_new:
                    created += 1
            current += timedelta(days=1)

        self.stdout.write(self.style.SUCCESS(f"Created {created} slot(s) for {court}."))

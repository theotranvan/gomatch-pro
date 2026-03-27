import itertools
from locust import HttpUser, task, between

# Round-robin assignment of pre-created users
_user_counter = itertools.count()
PASSWORD = "testpass123"
TOTAL_USERS = 100


class GoMatchUser(HttpUser):
    wait_time = between(1, 3)
    token = None
    headers = {}

    def on_start(self):
        idx = next(_user_counter) % TOTAL_USERS
        email = f"load_test_{idx:03d}@test.com"

        # Login only — users pre-created via create_test_users.py
        with self.client.post(
            "/api/auth/login/",
            json={"email": email, "password": PASSWORD},
            catch_response=True,
        ) as resp:
            if resp.status_code == 200:
                data = resp.json()
                tokens = data.get("tokens", {})
                self.token = tokens.get("access") or data.get("access")
                self.headers = {"Authorization": f"Bearer {self.token}"}
                resp.success()
            else:
                resp.failure(f"Login failed ({resp.status_code}): {resp.text[:200]}")

    @task(3)
    def view_open_matches(self):
        self.client.get("/api/matches/open/", headers=self.headers)

    @task(2)
    def view_rankings(self):
        self.client.get("/api/rankings/?sport=tennis", headers=self.headers)

    @task(2)
    def view_venues(self):
        self.client.get("/api/venues/", headers=self.headers)

    @task(1)
    def view_profile(self):
        self.client.get("/api/auth/me/", headers=self.headers)

    @task(1)
    def view_chat_rooms(self):
        self.client.get("/api/chat/rooms/", headers=self.headers)

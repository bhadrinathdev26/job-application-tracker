from django.test import TestCase
from django.urls import reverse
from django.contrib.auth.models import User
from rest_framework import status
from rest_framework.test import APIClient
from .models import Application, ApplicationStatus


class ApplicationAPITests(TestCase):
    """
    Test suite for Applications CRUD, User Isolation, Search, Filter & Pagination.
    """

    def setUp(self):
        self.client = APIClient()
        self.list_url = reverse('applications:application-list')

        # Create two separate users for user isolation tests
        self.user_a = User.objects.create_user(
            username="usera",
            email="usera@example.com",
            password="Password123!"
        )
        self.user_b = User.objects.create_user(
            username="userb",
            email="userb@example.com",
            password="Password123!"
        )

        # Authenticate as user_a by default
        self.client.force_authenticate(user=self.user_a)

    def test_unauthenticated_access_denied(self):
        """Unauthenticated requests must return 401."""
        self.client.force_authenticate(user=None)
        response = self.client.get(self.list_url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_create_application_success(self):
        """User can create an application and user field is bound automatically."""
        payload = {
            "company": "Stripe",
            "role": "Software Engineer",
            "status": "applied",
            "applied_date": "2026-03-01",
            "location": "Remote",
            "salary_range": "$120k - $140k",
            "notes": "Referred by John."
        }
        response = self.client.post(self.list_url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        data = response.json()
        self.assertEqual(data["company"], "Stripe")
        self.assertEqual(data["role"], "Software Engineer")
        self.assertEqual(data["status"], "applied")
        self.assertEqual(data["user"], self.user_a.username)

        # Verify saved in DB and linked to user_a
        app = Application.objects.get(id=data["id"])
        self.assertEqual(app.user, self.user_a)

    def test_create_validation_errors(self):
        """Missing company or role or invalid status must return 400 Bad Request."""
        # Missing company
        res = self.client.post(self.list_url, {"role": "Developer"}, format="json")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("company", res.json())

        # Invalid status
        res = self.client.post(
            self.list_url,
            {"company": "Meta", "role": "Dev", "status": "invalid_status"},
            format="json"
        )
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("status", res.json())

    def test_user_isolation_on_list(self):
        """User A should only see their own applications, not User B's."""
        # Create apps for User A
        Application.objects.create(user=self.user_a, company="Google", role="SWE", status="applied")
        Application.objects.create(user=self.user_a, company="Amazon", role="SDE", status="interview")

        # Create app for User B
        Application.objects.create(user=self.user_b, company="Apple", role="iOS Engineer", status="offer")

        response = self.client.get(self.list_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.json()["results"]
        companies = [item["company"] for item in results]

        self.assertEqual(len(results), 2)
        self.assertIn("Google", companies)
        self.assertIn("Amazon", companies)
        self.assertNotIn("Apple", companies)

    def test_cross_user_retrieve_returns_404(self):
        """User A attempting to retrieve User B's application must receive 404 Not Found."""
        app_b = Application.objects.create(user=self.user_b, company="Netflix", role="Dev", status="wishlist")
        detail_url = reverse('applications:application-detail', kwargs={'pk': app_b.id})

        response = self.client.get(detail_url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_update_application_patch(self):
        """User can update status (simulating Kanban drag and drop) via PATCH."""
        app = Application.objects.create(
            user=self.user_a,
            company="Microsoft",
            role="Backend Dev",
            status="applied"
        )
        detail_url = reverse('applications:application-detail', kwargs={'pk': app.id})

        # Drag card to 'interview'
        patch_res = self.client.patch(detail_url, {"status": "interview"}, format="json")
        self.assertEqual(patch_res.status_code, status.HTTP_200_OK)
        self.assertEqual(patch_res.json()["status"], "interview")

        app.refresh_from_db()
        self.assertEqual(app.status, ApplicationStatus.INTERVIEW)

    def test_cross_user_update_returns_404(self):
        """User A attempting to modify User B's application must receive 404."""
        app_b = Application.objects.create(user=self.user_b, company="Uber", role="SWE", status="applied")
        detail_url = reverse('applications:application-detail', kwargs={'pk': app_b.id})

        patch_res = self.client.patch(detail_url, {"status": "offer"}, format="json")
        self.assertEqual(patch_res.status_code, status.HTTP_404_NOT_FOUND)

        app_b.refresh_from_db()
        self.assertEqual(app_b.status, ApplicationStatus.APPLIED)

    def test_delete_application(self):
        """User can delete their own application."""
        app = Application.objects.create(user=self.user_a, company="Adobe", role="Frontend", status="applied")
        detail_url = reverse('applications:application-detail', kwargs={'pk': app.id})

        del_res = self.client.delete(detail_url)
        self.assertEqual(del_res.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Application.objects.filter(id=app.id).exists())

    def test_cross_user_delete_returns_404(self):
        """User A attempting to delete User B's application must receive 404."""
        app_b = Application.objects.create(user=self.user_b, company="GitHub", role="DevOps", status="applied")
        detail_url = reverse('applications:application-detail', kwargs={'pk': app_b.id})

        del_res = self.client.delete(detail_url)
        self.assertEqual(del_res.status_code, status.HTTP_404_NOT_FOUND)
        self.assertTrue(Application.objects.filter(id=app_b.id).exists())

    def test_search_and_filter(self):
        """Should filter by status and search by company/role."""
        Application.objects.create(user=self.user_a, company="Spotify", role="Backend Python", status="applied")
        Application.objects.create(user=self.user_a, company="SoundCloud", role="Audio Engineer", status="applied")
        Application.objects.create(user=self.user_a, company="Spotify", role="Data Engineer", status="interview")

        # Filter by status=applied
        res_filter = self.client.get(f"{self.list_url}?status=applied")
        self.assertEqual(res_filter.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res_filter.json()["results"]), 2)

        # Search for "Spotify"
        res_search = self.client.get(f"{self.list_url}?search=Spotify")
        self.assertEqual(res_search.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res_search.json()["results"]), 2)

        # Combine search + filter
        res_combo = self.client.get(f"{self.list_url}?search=Spotify&status=interview")
        self.assertEqual(res_combo.status_code, status.HTTP_200_OK)
        results = res_combo.json()["results"]
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]["role"], "Data Engineer")

    def test_pagination(self):
        """Applications list should paginate results (page_size=10)."""
        for i in range(15):
            Application.objects.create(
                user=self.user_a,
                company=f"Company {i+1}",
                role="Engineer",
                status="applied"
            )

        response = self.client.get(self.list_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertEqual(data["count"], 15)
        self.assertEqual(len(data["results"]), 10)
        self.assertIsNotNone(data["next"])
        self.assertIsNone(data["previous"])

        # Fetch page 2
        page2_response = self.client.get(f"{self.list_url}?page=2")
        self.assertEqual(page2_response.status_code, status.HTTP_200_OK)
        page2_data = page2_response.json()
        self.assertEqual(len(page2_data["results"]), 5)
        self.assertIsNone(page2_data["next"])
        self.assertIsNotNone(page2_data["previous"])

    def test_stats_calculation(self):
        """Should correctly calculate total apps, status counts, and response rate."""
        # 1 wishlist, 2 applied, 1 interview, 1 offer, 1 rejected
        Application.objects.create(user=self.user_a, company="C1", role="R1", status="wishlist")
        Application.objects.create(user=self.user_a, company="C2", role="R2", status="applied")
        Application.objects.create(user=self.user_a, company="C3", role="R3", status="applied")
        Application.objects.create(user=self.user_a, company="C4", role="R4", status="interview")
        Application.objects.create(user=self.user_a, company="C5", role="R5", status="offer")
        Application.objects.create(user=self.user_a, company="C6", role="R6", status="rejected")

        # User B app should be isolated and not affect User A stats
        Application.objects.create(user=self.user_b, company="C7", role="R7", status="offer")

        stats_url = reverse('applications:application-stats')
        response = self.client.get(stats_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()

        self.assertEqual(data["total_applications"], 6)
        self.assertEqual(data["status_counts"]["wishlist"], 1)
        self.assertEqual(data["status_counts"]["applied"], 2)
        self.assertEqual(data["status_counts"]["interview"], 1)
        self.assertEqual(data["status_counts"]["offer"], 1)
        self.assertEqual(data["status_counts"]["rejected"], 1)

        # 2 positive (interview + offer) out of 5 non-wishlist applied = 40.0%
        self.assertEqual(data["response_rate_percent"], 40.0)
        self.assertEqual(data["positive_responses"], 2)
        self.assertEqual(data["active_applications"], 4)  # exclude offer and rejected (1+2+1=4)
        self.assertIn("weekly_trend", data)
        self.assertEqual(len(data["weekly_trend"]), 8)

    def test_follow_ups_endpoint(self):
        """Should only return active applications where follow_up_date <= today."""
        from django.utils import timezone
        from datetime import timedelta
        today = timezone.now().date()

        # Due in past (applied) -> YES
        app_overdue = Application.objects.create(
            user=self.user_a, company="Past Due Co", role="Dev", status="applied",
            follow_up_date=today - timedelta(days=2)
        )
        # Due today (interview) -> YES
        app_today = Application.objects.create(
            user=self.user_a, company="Due Today Co", role="Dev", status="interview",
            follow_up_date=today
        )
        # Due in future -> NO
        Application.objects.create(
            user=self.user_a, company="Future Co", role="Dev", status="applied",
            follow_up_date=today + timedelta(days=5)
        )
        # Due in past but already rejected -> NO
        Application.objects.create(
            user=self.user_a, company="Rejected Co", role="Dev", status="rejected",
            follow_up_date=today - timedelta(days=1)
        )
        # Due in past but belongs to User B -> NO
        Application.objects.create(
            user=self.user_b, company="User B Overdue", role="Dev", status="applied",
            follow_up_date=today - timedelta(days=1)
        )

        follow_ups_url = reverse('applications:application-follow-ups')
        response = self.client.get(follow_ups_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()

        # Should contain exactly the 2 active due applications for User A
        self.assertEqual(len(data), 2)
        companies = [item["company"] for item in data]
        self.assertEqual(companies, ["Past Due Co", "Due Today Co"])

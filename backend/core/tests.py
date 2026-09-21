from django.test import TestCase
from django.urls import reverse


class HealthCheckEndpointTests(TestCase):
    """
    Verifies that the /api/health/ endpoint is operational and reports database status.
    """

    def test_health_check_returns_200_and_status(self):
        response = self.client.get(reverse('health-check'))
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data.get('status'), 'ok')
        self.assertEqual(data.get('database_status'), 'connected')
        self.assertIn('database_engine', data)

"""
URL configuration for Job Application Tracker (core).
"""

from django.contrib import admin
from django.urls import path, include
from django.http import JsonResponse
from django.db import connection
from django.conf import settings


def health_check(request):
    """
    Health check endpoint to verify API and database connectivity.
    Accessed at /api/health/
    """
    db_status = "unhealthy"
    try:
        connection.ensure_connection()
        db_status = "connected"
    except Exception as e:
        db_status = f"error: {str(e)}"

    return JsonResponse({
        "status": "ok",
        "api": "Job Application Tracker API",
        "version": "1.0.0",
        "database_engine": settings.DB_ENGINE,
        "database_status": db_status,
    })


urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/health/', health_check, name='health-check'),
    path('api/auth/', include('authentication.urls', namespace='auth')),
]

from rest_framework import viewsets, permissions, filters, status as http_status
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Count, Q
from django.utils import timezone
from datetime import timedelta
from .models import Application, ApplicationStatus
from .serializers import ApplicationSerializer
from .filters import ApplicationFilter


class ApplicationViewSet(viewsets.ModelViewSet):
    """
    ModelViewSet providing full CRUD (Create, Read, Update, Partial Update, Delete)
    for job applications, plus aggregated analytics and follow-up reminders.

    Security Rule:
    Strict user isolation is enforced. Every query filters by `user=request.user`.
    Users can never see, modify, or delete applications belonging to other users.
    Any cross-user access attempts automatically return 404 Not Found.
    """
    serializer_class = ApplicationSerializer
    permission_classes = [permissions.IsAuthenticated]

    # Filtering, Searching, and Ordering
    filter_backends = [
        DjangoFilterBackend,
        filters.SearchFilter,
        filters.OrderingFilter,
    ]
    filterset_class = ApplicationFilter
    search_fields = ['company', 'role', 'location', 'notes']
    ordering_fields = ['applied_date', 'created_at', 'company', 'status']
    ordering = ['-created_at']

    def get_queryset(self):
        """
        Return only the applications belonging to the currently authenticated user.
        """
        return Application.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        """
        Set the logged-in user as the owner of the newly created application.
        """
        serializer.save(user=self.request.user)

    @action(detail=False, methods=['get'], url_path='stats')
    def stats(self, request):
        """
        Endpoint: GET /api/applications/stats/
        Returns aggregated analytics:
        - Total applications
        - Breakdown count per status
        - Response rate (% of applications that reached interview or offer)
        - Applications submitted per week (last 8 weeks)
        - Count of pending follow-ups
        """
        user_apps = self.get_queryset()
        total_apps = user_apps.count()

        # Count per status (ensure all status keys exist even if count is 0)
        status_counts = {choice[0]: 0 for choice in ApplicationStatus.choices}
        counts_qs = user_apps.values('status').annotate(count=Count('id'))
        for item in counts_qs:
            status_counts[item['status']] = item['count']

        # Response rate calculation:
        # Applications that reached interview or offer divided by applications actually applied
        applied_total = user_apps.exclude(status=ApplicationStatus.WISHLIST).count()
        positive_responses = user_apps.filter(
            status__in=[ApplicationStatus.INTERVIEW, ApplicationStatus.OFFER]
        ).count()
        response_rate = (
            round((positive_responses / applied_total) * 100, 1)
            if applied_total > 0
            else 0.0
        )

        # Weekly trend calculation (last 8 weeks based on applied_date or created_at)
        today = timezone.now().date()
        weekly_trend = []
        for i in range(7, -1, -1):
            start_of_week = today - timedelta(days=(i * 7) + today.weekday())
            end_of_week = start_of_week + timedelta(days=6)
            week_label = f"Wk {start_of_week.strftime('%b %d')}"
            count = user_apps.filter(
                Q(applied_date__gte=start_of_week, applied_date__lte=end_of_week) |
                Q(applied_date__isnull=True, created_at__date__gte=start_of_week, created_at__date__lte=end_of_week)
            ).count()
            weekly_trend.append({
                "week": week_label,
                "start_date": str(start_of_week),
                "end_date": str(end_of_week),
                "count": count
            })

        # Overdue / due follow-ups count
        follow_ups_count = user_apps.filter(
            follow_up_date__lte=today
        ).exclude(
            status__in=[ApplicationStatus.OFFER, ApplicationStatus.REJECTED]
        ).count()

        return Response({
            "total_applications": total_apps,
            "status_counts": status_counts,
            "response_rate_percent": response_rate,
            "positive_responses": positive_responses,
            "active_applications": user_apps.exclude(status__in=[ApplicationStatus.OFFER, ApplicationStatus.REJECTED]).count(),
            "follow_ups_due_count": follow_ups_count,
            "weekly_trend": weekly_trend,
        })

    @action(detail=False, methods=['get'], url_path='follow-ups')
    def follow_ups(self, request):
        """
        Endpoint: GET /api/applications/follow-ups/
        Returns list of applications where follow_up_date is today or past,
        excluding concluded statuses (offer, rejected), ordered by oldest follow-up first.
        """
        today = timezone.now().date()
        qs = self.get_queryset().filter(
            follow_up_date__lte=today
        ).exclude(
            status__in=[ApplicationStatus.OFFER, ApplicationStatus.REJECTED]
        ).order_by('follow_up_date')

        serializer = self.get_serializer(qs, many=True)
        return Response(serializer.data)

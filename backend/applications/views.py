from rest_framework import viewsets, permissions, filters
from django_filters.rest_framework import DjangoFilterBackend
from .models import Application
from .serializers import ApplicationSerializer
from .filters import ApplicationFilter


class ApplicationViewSet(viewsets.ModelViewSet):
    """
    ModelViewSet providing full CRUD (Create, Read, Update, Partial Update, Delete)
    for job applications.

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

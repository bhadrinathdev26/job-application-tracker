from django.db import models
from django.contrib.auth.models import User


class ApplicationStatus(models.TextChoices):
    WISHLIST = 'wishlist', 'Wishlist'
    APPLIED = 'applied', 'Applied'
    INTERVIEW = 'interview', 'Interview'
    OFFER = 'offer', 'Offer'
    REJECTED = 'rejected', 'Rejected'


class Application(models.Model):
    """
    Job application entity tracked by a job seeker.
    Each record belongs to exactly one user.
    """
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='applications',
        help_text="The user who owns this application."
    )
    company = models.CharField(max_length=255, help_text="Company name.")
    role = models.CharField(max_length=255, help_text="Job title or role applied for.")
    status = models.CharField(
        max_length=20,
        choices=ApplicationStatus.choices,
        default=ApplicationStatus.WISHLIST,
        help_text="Current stage in the application pipeline."
    )
    applied_date = models.DateField(
        null=True,
        blank=True,
        help_text="Date when application was submitted."
    )
    job_url = models.URLField(
        max_length=500,
        blank=True,
        null=True,
        help_text="Link to the job posting."
    )
    location = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        help_text="Work location (e.g., Remote, Bengaluru, New York)."
    )
    salary_range = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        help_text="Estimated or advertised salary (e.g., $80k-$100k or 8-12 LPA)."
    )
    notes = models.TextField(
        blank=True,
        null=True,
        help_text="Personal interview notes, contact persons, or preparation details."
    )
    follow_up_date = models.DateField(
        null=True,
        blank=True,
        help_text="Date scheduled for sending a follow-up email."
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'status']),
            models.Index(fields=['user', 'follow_up_date']),
            models.Index(fields=['user', '-created_at']),
        ]

    def __str__(self):
        return f"{self.company} - {self.role} ({self.get_status_display()})"

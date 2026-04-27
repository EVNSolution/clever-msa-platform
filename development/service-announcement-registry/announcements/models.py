import uuid

from django.core.exceptions import ValidationError
from django.db import models


class Announcement(models.Model):
    class Status(models.TextChoices):
        DRAFT = "draft", "draft"
        PUBLISHED = "published", "published"
        ARCHIVED = "archived", "archived"

    class ExposureScope(models.TextChoices):
        ALL = "all", "all"
        DRIVER = "driver", "driver"
        OPERATOR = "operator", "operator"

    announcement_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    slug = models.SlugField(max_length=96, unique=True)
    title = models.CharField(max_length=200)
    body = models.TextField()
    status = models.CharField(max_length=32, choices=Status.choices)
    exposure_scope = models.CharField(max_length=32, choices=ExposureScope.choices)
    published_at = models.DateTimeField(null=True, blank=True)
    expires_at = models.DateTimeField(null=True, blank=True)
    is_pinned = models.BooleanField(default=False)
    display_order = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("display_order", "-published_at", "slug")

    def clean(self):
        errors = {}

        if self.status == self.Status.PUBLISHED and self.published_at is None:
            errors["published_at"] = ["published announcement requires published_at."]

        if self.expires_at is not None and self.published_at is None:
            errors["published_at"] = ["published_at is required when expires_at is set."]

        if (
            self.expires_at is not None
            and self.published_at is not None
            and self.expires_at <= self.published_at
        ):
            errors["expires_at"] = ["expires_at must be later than published_at."]

        if errors:
            raise ValidationError(errors)

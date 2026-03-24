import uuid

from django.core.exceptions import ValidationError
from django.db import models


class SettlementPolicy(models.Model):
    class Status(models.TextChoices):
        ACTIVE = "active", "active"
        INACTIVE = "inactive", "inactive"

    policy_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    policy_code = models.CharField(max_length=64)
    name = models.CharField(max_length=128)
    status = models.CharField(max_length=32, choices=Status.choices)
    description = models.TextField(blank=True)

    class Meta:
        ordering = ("policy_id",)


class SettlementPolicyVersion(models.Model):
    class Status(models.TextChoices):
        DRAFT = "draft", "draft"
        PUBLISHED = "published", "published"
        RETIRED = "retired", "retired"

    policy_version_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    policy = models.ForeignKey(
        SettlementPolicy,
        on_delete=models.CASCADE,
        related_name="versions",
        db_column="policy_id",
    )
    version_number = models.PositiveIntegerField()
    rule_payload = models.JSONField(default=dict)
    status = models.CharField(max_length=32, choices=Status.choices)
    published_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ("policy_version_id",)
        constraints = [
            models.UniqueConstraint(
                fields=("policy", "version_number"),
                name="unique_policy_version_number_per_policy",
            )
        ]

    def clean(self):
        errors = {}
        is_published = self.status == self.Status.PUBLISHED
        if is_published and self.published_at is None:
            errors["published_at"] = "published_at is required for published versions."
        if not is_published and self.published_at is not None:
            errors["published_at"] = "published_at must be empty unless the version is published."
        if errors:
            raise ValidationError(errors)

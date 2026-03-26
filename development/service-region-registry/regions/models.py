import uuid

from django.core.exceptions import ValidationError
from django.db import models


def _validate_polygon_geojson(value) -> None:
    if not isinstance(value, dict):
        raise ValidationError("polygon_geojson must be a GeoJSON object.")

    geo_type = value.get("type")
    coordinates = value.get("coordinates")
    if geo_type not in {"Polygon", "MultiPolygon"}:
        raise ValidationError("polygon_geojson.type must be Polygon or MultiPolygon.")
    if not isinstance(coordinates, list) or not coordinates:
        raise ValidationError("polygon_geojson.coordinates must be a non-empty list.")


class Region(models.Model):
    class Status(models.TextChoices):
        DRAFT = "draft", "draft"
        ACTIVE = "active", "active"
        INACTIVE = "inactive", "inactive"

    class DifficultyLevel(models.TextChoices):
        LOW = "low", "low"
        MEDIUM = "medium", "medium"
        HIGH = "high", "high"

    region_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    region_code = models.CharField(max_length=64, unique=True)
    name = models.CharField(max_length=128)
    status = models.CharField(max_length=32, choices=Status.choices)
    difficulty_level = models.CharField(max_length=32, choices=DifficultyLevel.choices)
    polygon_geojson = models.JSONField(default=dict)
    description = models.TextField(blank=True)
    display_order = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("display_order", "region_code")

    def clean(self):
        errors = {}

        try:
            _validate_polygon_geojson(self.polygon_geojson)
        except ValidationError as exc:
            errors["polygon_geojson"] = exc.messages

        if errors:
            raise ValidationError(errors)

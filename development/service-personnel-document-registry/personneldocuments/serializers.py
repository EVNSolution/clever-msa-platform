from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers
from rest_framework.exceptions import NotAuthenticated, PermissionDenied

from personneldocuments.exceptions import ServiceUnavailableError
from personneldocuments.models import PersonnelDocument
from personneldocuments.services.source_clients import (
    SourceAuthenticationError,
    SourceClients,
    SourcePermissionError,
    SourceServiceError,
    SourceValidationError,
)


class PersonnelDocumentSerializer(serializers.ModelSerializer):
    source_clients_class = SourceClients

    class Meta:
        model = PersonnelDocument
        fields = (
            "personnel_document_id",
            "driver_id",
            "document_type",
            "status",
            "title",
            "document_number",
            "issuer_name",
            "issued_on",
            "expires_on",
            "notes",
            "external_reference",
            "payload",
        )
        read_only_fields = ("personnel_document_id",)

    def _get_authorization(self) -> str:
        request = self.context.get("request")
        if request is None:
            return ""
        return request.headers.get("Authorization", "")

    def _apply_attrs(self, candidate: PersonnelDocument, attrs: dict) -> PersonnelDocument:
        for field, value in attrs.items():
            setattr(candidate, field, value)
        return candidate

    def validate(self, attrs):
        candidate = self._apply_attrs(self.instance or PersonnelDocument(), attrs)

        try:
            self.source_clients_class().validate_driver_exists(
                driver_id=str(candidate.driver_id),
                authorization=self._get_authorization(),
            )
            candidate.full_clean()
        except DjangoValidationError as exc:
            raise serializers.ValidationError(getattr(exc, "message_dict", exc.messages)) from exc
        except SourceValidationError as exc:
            raise serializers.ValidationError({exc.field: [exc.message]}) from exc
        except SourceAuthenticationError as exc:
            raise NotAuthenticated(str(exc)) from exc
        except SourcePermissionError as exc:
            raise PermissionDenied(str(exc)) from exc
        except SourceServiceError as exc:
            raise ServiceUnavailableError(str(exc)) from exc

        return attrs


class HealthSerializer(serializers.Serializer):
    status = serializers.CharField()

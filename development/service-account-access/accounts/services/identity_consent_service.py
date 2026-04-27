from django.utils import timezone

from accounts.models import IdentityConsentCurrent, IdentityConsentHistory


class IdentityConsentService:
    def is_fully_consented(self, identity) -> bool:
        current = getattr(identity, "consent_current", None)
        if current is None:
            return False
        return current.privacy_policy_consented and current.location_policy_consented

    def withdraw(self, identity, *, consent_type: str) -> IdentityConsentCurrent:
        current = identity.consent_current
        if consent_type == IdentityConsentHistory.ConsentType.PRIVACY_POLICY:
            current.privacy_policy_consented = False
            current.save(update_fields=["privacy_policy_consented"])
        else:
            current.location_policy_consented = False
            current.save(update_fields=["location_policy_consented"])

        IdentityConsentHistory.objects.create(
            identity=identity,
            consent_type=consent_type,
            version=self._current_version(current, consent_type=consent_type),
            is_consented=False,
        )
        return current

    def recover(
        self,
        identity,
        *,
        privacy_policy_version: str,
        location_policy_version: str,
    ) -> IdentityConsentCurrent:
        now = timezone.now()
        current = identity.consent_current
        current.privacy_policy_version = privacy_policy_version
        current.privacy_policy_consented = True
        current.privacy_policy_consented_at = now
        current.location_policy_version = location_policy_version
        current.location_policy_consented = True
        current.location_policy_consented_at = now
        current.save(
            update_fields=[
                "privacy_policy_version",
                "privacy_policy_consented",
                "privacy_policy_consented_at",
                "location_policy_version",
                "location_policy_consented",
                "location_policy_consented_at",
            ]
        )
        IdentityConsentHistory.objects.bulk_create(
            [
                IdentityConsentHistory(
                    identity=identity,
                    consent_type=IdentityConsentHistory.ConsentType.PRIVACY_POLICY,
                    version=privacy_policy_version,
                    is_consented=True,
                ),
                IdentityConsentHistory(
                    identity=identity,
                    consent_type=IdentityConsentHistory.ConsentType.LOCATION_POLICY,
                    version=location_policy_version,
                    is_consented=True,
                ),
            ]
        )
        return current

    def _current_version(self, current: IdentityConsentCurrent, *, consent_type: str) -> str:
        if consent_type == IdentityConsentHistory.ConsentType.PRIVACY_POLICY:
            return current.privacy_policy_version
        return current.location_policy_version

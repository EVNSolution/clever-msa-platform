from rest_framework import serializers

from organizations.models import Company, Fleet


class CompanySerializer(serializers.ModelSerializer):
    class Meta:
        model = Company
        fields = ("company_id", "route_no", "name")


class FleetSerializer(serializers.ModelSerializer):
    class Meta:
        model = Fleet
        fields = ("fleet_id", "route_no", "company_id", "name")

    def validate_company_id(self, value):
        if not Company.objects.filter(company_id=value).exists():
            raise serializers.ValidationError("Referenced company does not exist.")
        return value

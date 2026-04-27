from django.urls import include, path

urlpatterns = [
    path("api/settlement-inquiries/", include("settlementinquiry.urls")),
]

from django.urls import include, path

urlpatterns = [
    path("", include("organizations.urls")),
]

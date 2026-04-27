from django.urls import include, path

urlpatterns = [
    path("", include("regions.urls")),
]

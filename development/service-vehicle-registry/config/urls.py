from django.urls import include, path

urlpatterns = [
    path("", include("vehicles.urls")),
]

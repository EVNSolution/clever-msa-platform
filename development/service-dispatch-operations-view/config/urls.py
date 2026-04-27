from django.urls import include, path

urlpatterns = [
    path("", include("dispatchops.urls")),
]

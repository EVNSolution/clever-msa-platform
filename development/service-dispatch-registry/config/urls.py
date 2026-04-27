from django.urls import include, path

urlpatterns = [
    path("", include("dispatch.urls")),
]

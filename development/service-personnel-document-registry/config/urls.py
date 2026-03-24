from django.urls import include, path

urlpatterns = [
    path("", include("personneldocuments.urls")),
]

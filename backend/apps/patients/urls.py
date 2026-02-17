from django.urls import path
from . import views

app_name = 'patients'

urlpatterns = [
    path('', views.PatientListCreateAPIView.as_view(), name='patient_list_create'),
    path('<uuid:pk>/', views.PatientDetailAPIView.as_view(), name='patient_detail'),
]
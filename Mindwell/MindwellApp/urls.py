from django.urls import path
from . import views

urlpatterns = [
    path('',views.inicio,name='inicio'),
    path('dashboard',views.dashboard,name='dashboard'),
    path('api/dashboard/estadisticas',views.api_estadisticas,name='api_estadisticas'),
]
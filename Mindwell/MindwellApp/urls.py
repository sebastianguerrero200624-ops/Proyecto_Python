from django.urls import path, include
from . import views

urlpatterns = [
    # Raíz del sitio
    path('', views.inicio, name='inicio'),

    # Dashboard único (todos los roles)
    path('dashboard/', views.dashboard, name='dashboard'),

    # APIs para el JS del dashboard
    path('api/dashboard/estadisticas',   views.api_estadisticas,   name='api_estadisticas'),

    path('autenticar/', include('AutenticarApp.urls')),
]
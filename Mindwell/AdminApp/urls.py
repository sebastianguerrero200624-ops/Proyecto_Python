from django.urls import path
from . import views

urlpatterns = [
    # Vistas HTML
    path('usuarios/',views.usuarios,name='admin_usuarios'),
    path('reportes/',views.reportes,name='admin_reportes'),

    # APIs
    path('api/usuarios/',views.api_listar_usuarios,name='api_admin_usuarios'),
    path('api/usuarios/<int:user_id>/rol/',views.api_cambiar_rol,name='api_cambiar_rol'),
    path('api/reportes/datos/',views.api_datos_reporte,name='api_datos_reporte'),

    # PDF
    path('reportes/pdf/',views.generar_pdf_reporte,name='admin_pdf_reporte'),
]
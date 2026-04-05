from django.urls import path
from . import views

urlpatterns = [

    path('actividades/',views.actividades,name='actividades'),

    path('api/recursos/',views.api_listar_recursos,name='api_listar_recursos'),
    path('api/recursos/crear/',views.api_crear_recurso,name='api_crear_recurso'),
    path('api/recursos/<int:recurso_id>/',views.api_editar_recurso,name='api_editar_recurso'),
    path('api/recursos/<int:recurso_id>/toggle/',views.api_toggle_recurso,name='api_toggle_recurso'),
    path('api/recursos/<int:recurso_id>/eliminar/',views.api_eliminar_recurso,name='api_eliminar_recurso'),

    path('api/actividades/',views.api_listar_asignadas,name='api_listar_asignadas'),
    path('api/actividades/crear/',views.api_crear_asignada,name='api_crear_asignada'),
    path('api/actividades/<int:asignada_id>/',views.api_detalle_asignada,name='api_detalle_asignada'),
    path('api/actividades/<int:asignada_id>/editar/',views.api_editar_asignada,name='api_editar_asignada'),
    path('api/actividades/<int:asignada_id>/eliminar/',views.api_eliminar_asignada,name='api_eliminar_asignada'),
    path('api/actividades/<int:asignada_id>/completar/',views.api_completar_asignada,name='api_completar_asignada'),

    path('api/aprendices/disponibles/',views.api_aprendices_disponibles,name='api_aprendices_disponibles'),
]
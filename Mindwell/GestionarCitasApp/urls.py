from django.urls import path
from . import views

urlpatterns = [
   
    path('citas/', views.gestionar_citas, name='gestionar_citas'),


    path('api/citas/',views.api_listar_citas,name='api_listar_citas'),
    path('api/citas/orientadores/',views.api_orientadores,name='api_orientadores'),
    path('api/citas/pendientes/',views.api_citas_pendientes, name='api_citas_pendientes'),
    path('api/citas/crear/',views.api_crear_cita,name='api_crear_cita'),
    path('api/citas/<int:cita_id>/',views.api_detalle_cita,name='api_detalle_cita'),
    path('api/citas/<int:cita_id>/aprobar/',views.api_aprobar_cita,name='api_aprobar_cita'),
    path('api/citas/<int:cita_id>/reprogramar/',views.api_reprogramar_cita,name='api_reprogramar_cita'),
    path('api/citas/<int:cita_id>/cancelar/',views.api_cancelar_cita,name='api_cancelar_cita'),
    path('api/citas/<int:cita_id>/finalizar/',views.api_finalizar_cita,name='api_finalizar_cita'),
]
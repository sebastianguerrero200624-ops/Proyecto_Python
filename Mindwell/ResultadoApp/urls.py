from django.urls import path
from . import views

urlpatterns = [
    # Vista HTML principal
    path('resultados/', views.resultados, name='resultados'),

    # datos para gráficas
    path('api/resultados/graficas/',views.api_datos_graficas,    name='api_datos_graficas'),
    path('api/resultados/',views.api_listar_resultados,name='api_listar_resultados'),
    path('api/resultados/crear/',views.api_crear_resultado,      name='api_crear_resultado'),
    path('api/resultados/<int:resultado_id>/editar/',views.api_editar_resultado,name='api_editar_resultado'),

    #  auxiliares
    path('api/resultados/citas-sin-resultado/',views.api_citas_sin_resultado,   name='api_citas_sin_resultado'),
    path('api/resultados/aprendices/',views.api_aprendices_orientador, name='api_aprendices_orientador'),

    # PDF 
    path('resultados/pdf/<int:estudiante_id>/', views.generar_pdf_proceso, name='generar_pdf_proceso'),
]
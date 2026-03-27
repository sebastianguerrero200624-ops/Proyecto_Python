from django.urls import path
from . import views

urlpatterns = [
    # Registro (POST) y página principal login/registro (GET)
    path('',views.Registrar.as_view(),name='registrar'),
    # Login
    path('login',views.validar,name='login'),
    path('terminos_condiciones',views.termicon,name='terminos_condiciones'),

    # Confirmación de correo
    path('pendiente_confirmacion', views.pendiente_confirmacion, name='pendiente_confirmacion'),
    path('confirmar_correo',views.confirmar_correo,name='confirmar_correo'),

    # Sesión
    path('cerrar_sesion',views.cerrar_sesion,name='cerrar_sesion'),

    # Recuperación de contraseña
    path('recup',views.recup,name='recup'),
    path('cambiarpass',views.cambiarpass,name='cambiarpass'),

]
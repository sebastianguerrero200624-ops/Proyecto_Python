from django.db import models
from django.contrib.auth.models import User


class Perfil(models.Model):
    ROL_CHOICES = [
        (1, 'Administrador'),
        (2, 'Aprendiz'),
        (3, 'Instructor'),
    ]

    user       = models.OneToOneField(User, on_delete=models.CASCADE, related_name='perfil')
    nombres    = models.CharField(max_length=100, blank=True, default='')
    apellidos  = models.CharField(max_length=100, blank=True, default='')
    documento  = models.CharField(max_length=10, blank=True, default='')
    rol_id     = models.IntegerField(choices=ROL_CHOICES, default=2)
    # False = cuenta pendiente de confirmación de correo
    # True  = cuenta activa (correo verificado)
    activo     = models.BooleanField(default=False)

    def __str__(self):
        return f'{self.user.username} — Rol: {self.get_rol_id_display()} — Activo: {self.activo}'


class TokenConfirmacion(models.Model):
    """Token de un solo uso enviado al correo para activar la cuenta."""
    correo     = models.EmailField()
    token      = models.CharField(max_length=64)
    creado_en  = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f'Token para {self.correo}'


class Recup(models.Model):
    """Token de un solo uso para recuperación de contraseña."""
    correo     = models.EmailField()
    token      = models.CharField(max_length=64)
    creado_en  = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f'Recuperación para {self.correo}'
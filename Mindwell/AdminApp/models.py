from django.db import models
from django.contrib.auth.models import User


class LogActividad(models.Model):
    """
    Registro automático de actividad de usuarios.
    Se crea cada vez que alguien crea una cita, actividad o resultado.
    """

    TIPO_CHOICES = [
        ('CITA',       'Cita creada'),
        ('ACTIVIDAD',  'Actividad asignada'),
        ('RESULTADO',  'Resultado registrado'),
    ]

    usuario    = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='logs_actividad'
    )
    tipo       = models.CharField(max_length=15, choices=TIPO_CHOICES)
    descripcion = models.CharField(max_length=255, blank=True, default='')
    fecha      = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-fecha']
        verbose_name = 'Log de Actividad'
        verbose_name_plural = 'Logs de Actividad'

    def __str__(self):
        return f'{self.tipo} — {self.usuario} — {self.fecha:%Y-%m-%d}'


class CambioRol(models.Model):
    """
    Auditoría de cambios de rol realizados por el administrador.
    """
    administrador = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True,
        related_name='cambios_rol_realizados'
    )
    usuario_afectado = models.ForeignKey(
        User, on_delete=models.CASCADE,
        related_name='cambios_rol_recibidos'
    )
    rol_anterior = models.IntegerField()
    rol_nuevo    = models.IntegerField()
    fecha        = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-fecha']
        verbose_name = 'Cambio de Rol'
        verbose_name_plural = 'Cambios de Rol'

    def __str__(self):
        return f'Cambio rol usuario #{self.usuario_afectado_id}: {self.rol_anterior}→{self.rol_nuevo}'
from django.db import models
from django.contrib.auth.models import User


class Recurso(models.Model):
    """
    Material general creado por cualquier orientador.
    Visible para TODOS los aprendices.
    """
    titulo = models.CharField(max_length=150)
    descripcion = models.TextField(max_length=400, blank=True, default='')
    url_recurso = models.URLField(max_length=300, blank=True, default='')
    creado_por = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='recursos_creados',
        help_text='Orientador que creó el recurso (rol_id=3)'
    )
    creado_en = models.DateTimeField(auto_now_add=True)
    actualizado  = models.DateTimeField(auto_now=True)

    activo = models.BooleanField(default=True)

    class Meta:
        ordering = ['-creado_en']
        verbose_name = 'Recurso'
        verbose_name_plural = 'Recursos'

    def __str__(self):
        return f'Recurso: {self.titulo}'


class ActividadAsignada(models.Model):
    """
    Actividad asignada por un orientador a un aprendiz específico.
    SOLO se puede asignar si existe una Cita FINALIZADA entre ambos.
    """
    ESTADO_CHOICES = [
        ('Pendiente',  'Pendiente'),
        ('Completada', 'Completada'),
    ]

    orientador   = models.ForeignKey(
        User, on_delete=models.CASCADE,
        related_name='actividades_asignadas_como_orientador',
        help_text='Orientador que asigna (rol_id=3)'
    )
    estudiante   = models.ForeignKey(
        User, on_delete=models.CASCADE,
        related_name='actividades_asignadas_como_estudiante',
        help_text='Aprendiz destinatario (rol_id=2)'
    )
    # Puede basarse en un Recurso existente o ser completamente personalizada
    recurso      = models.ForeignKey(
        Recurso, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='actividades_generadas',
        help_text='Recurso base (opcional — puede ser personalizada)'
    )
    titulo       = models.CharField(max_length=150)
    descripcion  = models.TextField(max_length=500, blank=True, default='')
    url_actividad = models.URLField(max_length=300, blank=True, default='')
    estado       = models.CharField(max_length=15, choices=ESTADO_CHOICES, default='Pendiente')
    fecha_asignacion   = models.DateField(auto_now_add=True)
    fecha_completado   = models.DateTimeField(null=True, blank=True)
    observacion        = models.CharField(max_length=255, blank=True, default='')
    creado_en          = models.DateTimeField(auto_now_add=True)
    actualizado        = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-creado_en']
        verbose_name = 'Actividad Asignada'
        verbose_name_plural = 'Actividades Asignadas'

    def __str__(self):
        return (
            f'Actividad "{self.titulo}" → '
            f'{self.estudiante.get_full_name()} '
            f'[{self.estado}]'
        )
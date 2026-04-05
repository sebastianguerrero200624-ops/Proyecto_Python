from django.db import models
from django.contrib.auth.models import User
from GestionarCitasApp.models import Cita


class Resultado(models.Model):
    """
    Resultado/evaluación de una cita finalizada.
    Solo el orientador puede crear/editar resultados.
    Un resultado por cita (OneToOne).
    """

    NIVEL_CHOICES = [
        ('BAJO',  'Bajo'),
        ('MEDIO', 'Medio'),
        ('ALTO',  'Alto'),
    ]

    # Relación 1:1 con la cita — solo citas FINALIZADAS
    cita         = models.OneToOneField(
        Cita, on_delete=models.CASCADE,
        related_name='resultado',
        help_text='Debe ser una cita con estado FINALIZADA'
    )

    # Participantes (desnormalizados para velocidad en consultas)
    orientador   = models.ForeignKey(
        User, on_delete=models.CASCADE,
        related_name='resultados_como_orientador'
    )
    estudiante   = models.ForeignKey(
        User, on_delete=models.CASCADE,
        related_name='resultados_como_estudiante'
    )

    # ── Campos de evaluación ──────────────────────────────────
    fecha_evaluacion  = models.DateField(auto_now_add=True)

    # Puntuación de estrés/ansiedad (0-100)
    puntuacion_estres    = models.PositiveSmallIntegerField(
        default=0,
        help_text='Nivel de estrés evaluado (0-100)'
    )
    puntuacion_ansiedad  = models.PositiveSmallIntegerField(
        default=0,
        help_text='Nivel de ansiedad evaluado (0-100)'
    )

    nivel_detectado  = models.CharField(
        max_length=10, choices=NIVEL_CHOICES, default='BAJO'
    )

    # ── Texto libre ───────────────────────────────────────────
    avance_observado     = models.TextField(
        blank=True, default='',
        help_text='Descripción del avance del aprendiz en esta cita'
    )
    recomendaciones      = models.TextField(
        blank=True, default='',
        help_text='Recomendaciones del orientador para el aprendiz'
    )
    observaciones        = models.TextField(
        blank=True, default='',
        help_text='Notas internas del orientador'
    )

    # ── Flags de seguimiento ──────────────────────────────────
    requiere_seguimiento = models.BooleanField(
        default=False,
        help_text='Marcar si el aprendiz necesita seguimiento especial'
    )
    asistio              = models.BooleanField(
        default=True,
        help_text='El aprendiz asistió a la cita'
    )

    creado_en   = models.DateTimeField(auto_now_add=True)
    actualizado = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-fecha_evaluacion']
        verbose_name = 'Resultado'
        verbose_name_plural = 'Resultados'

    def __str__(self):
        return (
            f'Resultado cita #{self.cita_id} | '
            f'{self.estudiante.get_full_name()} | '
            f'Estrés: {self.puntuacion_estres} | {self.nivel_detectado}'
        )

    # ── Propiedad calculada ───────────────────────────────────
    @property
    def nivel_calculado(self):
        """Calcula el nivel basado en el promedio de estrés y ansiedad."""
        promedio = (self.puntuacion_estres + self.puntuacion_ansiedad) / 2
        if promedio <= 33:
            return 'BAJO'
        elif promedio <= 66:
            return 'MEDIO'
        return 'ALTO'
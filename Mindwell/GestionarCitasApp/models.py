from django.db import models
from django.contrib.auth.models import User


class Cita(models.Model):

    ESTADO_CHOICES = [
        ('PENDIENTE',    'Pendiente'),
        ('APROBADA',     'Aprobada'),
        ('REPROGRAMADA', 'Reprogramada'),
        ('CANCELADA',    'Cancelada'),
        ('FINALIZADA',   'Finalizada'),
    ]

    # ── Participantes ──────────────────────────────────────────────
    # estudiante → Perfil con rol_id=2
    # orientador → Perfil con rol_id=3
    estudiante  = models.ForeignKey(
        User, on_delete=models.CASCADE,
        related_name='citas_como_estudiante',
        help_text='Usuario con rol Aprendiz (rol_id=2)'
    )
    orientador  = models.ForeignKey(
        User, on_delete=models.CASCADE,
        related_name='citas_como_orientador',
        help_text='Usuario con rol Instructor/Psicosocial (rol_id=3)'
    )

    # ── Datos de la cita ───────────────────────────────────────────
    fecha       = models.DateField()
    hora        = models.TimeField()
    motivo      = models.CharField(max_length=255)
    estado      = models.CharField(max_length=15, choices=ESTADO_CHOICES, default='PENDIENTE')

    # ── Reprogramación ─────────────────────────────────────────────
    # Solo el orientador puede reprogramar citas en estado APROBADA
    fecha_reprogramada = models.DateField(null=True, blank=True)
    hora_reprogramada  = models.TimeField(null=True, blank=True)
    motivo_reprogramacion = models.CharField(max_length=255, blank=True, default='')

    # ── Auditoría ──────────────────────────────────────────────────
    creado_en   = models.DateTimeField(auto_now_add=True)
    actualizado = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-creado_en']
        verbose_name = 'Cita'
        verbose_name_plural = 'Citas'

    def __str__(self):
        return (
            f'Cita #{self.pk} | '
            f'{self.estudiante.get_full_name()} → {self.orientador.get_full_name()} | '
            f'{self.fecha} {self.hora} | {self.estado}'
        )

    # ── Propiedades de conveniencia ────────────────────────────────
    @property
    def fecha_efectiva(self):
        """Fecha real (reprogramada si existe, original si no)."""
        return self.fecha_reprogramada or self.fecha

    @property
    def hora_efectiva(self):
        """Hora real (reprogramada si existe, original si no)."""
        return self.hora_reprogramada or self.hora

    # ── Reglas de negocio ─────────────────────────────────────────
    @property
    def puede_cancelar_estudiante(self):
        return self.estado in ('PENDIENTE',)

    @property
    def puede_reprogramar_orientador(self):
        return self.estado == 'APROBADA'

    @property
    def puede_aprobar(self):
        return self.estado == 'PENDIENTE'

    @property
    def puede_finalizar(self):
        return self.estado == 'APROBADA'
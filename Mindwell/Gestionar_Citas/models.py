from django.db import models
from django.contrib.auth.models import User

# Create your models here.


class Cita(models.Model):
    ESTADOS = [
        ('PENDIENTE',  'Pendiente'),
        ('APROBADA',   'Aprobada'),
        ('CANCELADA',  'Cancelada'),
        ('FINALIZADA', 'Finalizada'),
    ]

 # El nombre del aprendiz se toma de aprendiz.get_full_name()
    aprendiz = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='citas_aprendiz',
        db_column='id_aprendiz'
        )
    orientador = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='citas_orientador',
        db_column='id_orientador'
        )
    
    fecha_cita = models.DateField()
    hora_cita = models.TimeField()
    motivo = models.TextField()
    estado = models.CharField(max_length=20, choices=ESTADOS, default='PENDIENTE')
    motivo_cancelacion = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    activo = models.BooleanField(default=True)
 
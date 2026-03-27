from django.db import models
from django.contrib.auth.models import User
 
 
class Recurso(models.Model):
    """Recursos/materiales visibles para todos los usuarios."""
    nombre_rec      = models.CharField(max_length=200)
    url_recurso     = models.URLField(max_length=500, blank=True, null=True)
    obj_recurso     = models.TextField(blank=True, null=True)   # objetivo
    dec_recurso     = models.TextField(blank=True, null=True)   # descripción
    created_recurso = models.DateTimeField(auto_now_add=True)
    update_recurso  = models.DateTimeField(auto_now=True)
    activo          = models.BooleanField(default=True)
 
    class Meta:
        db_table = 'recurso'
        ordering = ['-created_recurso']
 
    def __str__(self):
        return self.nombre_rec
 
 
class Actividad(models.Model):
    """
    Actividad asignada por un orientador a un aprendiz específico.
    Solo la puede ver el orientador que la creó y el aprendiz asignado.
    """
    # El aprendiz: FK al User de Django
    # (el nombre se toma de user.first_name + user.last_name)
    aprendiz        = models.ForeignKey(
                        User,
                        on_delete=models.CASCADE,
                        related_name='actividades_asignadas',
                        db_column='id_aprendiz'
                      )
    orientador      = models.ForeignKey(
                        User,
                        on_delete=models.CASCADE,
                        related_name='actividades_creadas',
                        db_column='id_orientador'
                      )
    titulo_act      = models.CharField(max_length=200)
    desc_act        = models.TextField(blank=True, null=True)
    url_act         = models.URLField(max_length=500, blank=True, null=True)
    estado          = models.CharField(
                        max_length=20,
                        choices=[('Pendiente','Pendiente'),('Completada','Completada')],
                        default='Pendiente'
                      )
    fecha_asignacion = models.DateField(auto_now_add=True)
    fecha_completado = models.DateTimeField(blank=True, null=True)
    observacion      = models.TextField(blank=True, null=True)
    activo           = models.BooleanField(default=True)
 
    class Meta:
        db_table = 'actividad'
        ordering = ['-fecha_asignacion']
 
    def __str__(self):
        return f'{self.titulo_act} → {self.aprendiz.get_full_name()}'
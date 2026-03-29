from django.contrib import admin
from .models import Cita

# Register your models here.


@admin.register(Cita)
class CitaAdmin(admin.ModelAdmin):
    list_display  = ('pk', 'estudiante', 'orientador', 'fecha', 'hora', 'estado', 'creado_en')
    list_filter   = ('estado',)
    search_fields = ('estudiante__username', 'orientador__username')
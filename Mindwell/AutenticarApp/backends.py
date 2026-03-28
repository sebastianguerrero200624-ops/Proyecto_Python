from django.contrib.auth.backends import BaseBackend
from django.contrib.auth.models import User
from AutenticarApp.models import Perfil


class DocumentoBackend(BaseBackend):
    """
    Permite autenticarse con el número de documento de identidad
    almacenado en Perfil.documento, en lugar del username de Django.
    """

    def authenticate(self, request, username=None, password=None, **kwargs):
        try:
            perfil = Perfil.objects.select_related('user').get(documento=username)
            user = perfil.user
            if user.check_password(password):
                return user
        except Perfil.DoesNotExist:
            return None

    def get_user(self, user_id):
        try:
            return User.objects.get(pk=user_id)
        except User.DoesNotExist:
            return None
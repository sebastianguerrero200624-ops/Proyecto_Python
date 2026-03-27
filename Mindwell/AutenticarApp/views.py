import string, random
from django.shortcuts import render, redirect
from django.views.generic import View
from django.contrib.auth.forms import AuthenticationForm
from django.contrib.auth import login, logout, authenticate
from django.contrib import messages
from django.contrib.auth.models import User
from django.template.loader import render_to_string
from django.core.mail import EmailMessage
from django.contrib.auth.hashers import make_password
from Mindwell import settings

from .models import Perfil, TokenConfirmacion, Recup


# ──────────────────────────────────────────────
#  HELPERS
# ──────────────────────────────────────────────

DOMINIOS_ROL = {
    'administradormindwell2006.com': 1,   # Administrador
    'gmail.com':                     2,   # Aprendiz
    'soy.sena.edu.co':               2,   # Aprendiz
    'sena.edu.co':                   3,   # Psicosocial
}

DOMINIOS_PERMITIDOS = set(DOMINIOS_ROL.keys())


def _generar_token(k=64):
    caracteres = string.ascii_uppercase + string.ascii_lowercase + string.digits
    return ''.join(random.choices(caracteres, k=k))
    
def termicon(request):
    return render(request, 'terminos_condiciones.html')


def _rol_desde_correo(correo: str):
    """Devuelve el rol_id según el dominio del correo, o None si no está permitido."""
    dominio = correo.strip().lower().split('@')[-1]
    return DOMINIOS_ROL.get(dominio)


def _enviar_token_confirmacion(user, request=None):
    """Crea un TokenConfirmacion y envía el correo de verificación."""
    # Eliminar tokens anteriores para este correo (reenvío)
    TokenConfirmacion.objects.filter(correo=user.email).delete()

    token = _generar_token()
    TokenConfirmacion.objects.create(correo=user.email, token=token)

    url = f'http://localhost:8000/autenticar/confirmar_correo?c={user.email}&t={token}'
    contexto = {
        'url': url,
        'nombre': user.first_name or user.username,
    }
    html = render_to_string('correo_confirmacion.html', contexto)
    email = EmailMessage(
        subject='Confirma tu cuenta en MindWell',
        body=html,
        from_email=settings.EMAIL_HOST_USER,
        to=[user.email],
    )
    email.content_subtype = 'html'
    email.send()


# ──────────────────────────────────────────────
#  REGISTRO  (GET = mostrar página, POST = crear cuenta)
# ──────────────────────────────────────────────

class Registrar(View):
    """
    Maneja el formulario de registro que vive dentro de login.html.
    La vista de login también vive en esa misma página (ver `validar`).
    """

    def get(self, request):
        return render(request, 'login.html')

    def post(self, request):
        # ── Recoger datos ──
        nombres    = request.POST.get('nombres', '').strip()
        apellidos  = request.POST.get('apellidos', '').strip()
        documento  = request.POST.get('documento', '').strip()
        correo     = request.POST.get('correo', '').strip().lower()
        password   = request.POST.get('password', '')
        password2  = request.POST.get('password2', '')
        terminos   = request.POST.get('terminos')

        errores = {}

        # ── Validaciones ──
        if not nombres:
            errores['nombres'] = 'El campo Nombres es obligatorio.'

        if not apellidos:
            errores['apellidos'] = 'El campo Apellidos es obligatorio.'

        if not documento.isdigit() or not (5 <= len(documento) <= 10):
            errores['documento'] = 'El documento debe tener entre 5 y 10 dígitos numéricos.'

        if not correo:
            errores['correo'] = 'El correo electrónico es obligatorio.'
        else:
            rol = _rol_desde_correo(correo)
            if rol is None:
                errores['correo'] = (
                    'El dominio del correo no está permitido. '
                )
            elif User.objects.filter(email=correo).exists():
                errores['correo'] = 'Ya existe una cuenta con ese correo electrónico.'

        if len(password) < 8:
            errores['password'] = 'La contraseña debe tener al menos 8 caracteres.'
        elif password != password2:
            errores['password2'] = 'Las contraseñas no coinciden.'

        if not terminos:
            errores['terminos'] = 'Debes aceptar los términos y condiciones.'

        if errores:
            return render(request, 'login.html', {
                'errores': errores,
                'mostrar_registro': True,   # para que el JS abra el panel de registro
                'datos': request.POST,
            })

        # ── Crear usuario ──
        rol = _rol_desde_correo(correo)
        username = correo.split('@')[0]
        # Garantizar username único
        base_username = username
        contador = 1
        while User.objects.filter(username=username).exists():
            username = f'{base_username}{contador}'
            contador += 1

        usuario = User.objects.create_user(
            username=username,
            email=correo,
            password=password,
            first_name=nombres,
            last_name=apellidos,
        )

        Perfil.objects.create(
            user=usuario,
            nombres=nombres,
            apellidos=apellidos,
            documento=documento,
            rol_id=rol,
            activo=False,   # pendiente de verificación
        )

        # ── Enviar correo de confirmación ──
        _enviar_token_confirmacion(usuario)

        return redirect('pendiente_confirmacion')


# ──────────────────────────────────────────────
#  PENDIENTE DE CONFIRMACIÓN  (página intermedia)
# ──────────────────────────────────────────────

def pendiente_confirmacion(request):
    return render(request, 'pendiente_confirmacion.html')


# ──────────────────────────────────────────────
#  CONFIRMAR CORREO  (clic en el enlace del email)
# ──────────────────────────────────────────────

def confirmar_correo(request):
    correo = request.GET.get('c', '').strip()
    token  = request.GET.get('t', '').strip()

    try:
        registro = TokenConfirmacion.objects.get(correo=correo, token=token)
        usuario  = User.objects.get(email=correo)
        perfil   = usuario.perfil

        # Activar cuenta
        perfil.activo = True
        perfil.save(update_fields=['activo'])

        # Eliminar token usado
        registro.delete()

        messages.success(request, '¡Tu cuenta ha sido confirmada! Ya puedes iniciar sesión.')
        return redirect('login')

    except (TokenConfirmacion.DoesNotExist, User.DoesNotExist):
        return render(request, 'confirmar_correo_error.html', {
            'msj': 'El enlace de confirmación no es válido o ya fue utilizado.'
        })


# ──────────────────────────────────────────────
#  LOGIN
# ──────────────────────────────────────────────

def validar(request):
    if request.method == 'POST':
        form = AuthenticationForm(request, data=request.POST)
        if form.is_valid():
            nombre = form.cleaned_data.get('username')
            contra = form.cleaned_data.get('password')
            usuario = authenticate(username=nombre, password=contra)
            if usuario:
                # Verificar que la cuenta esté activa (correo confirmado)
                try:
                    if not usuario.perfil.activo:
                        messages.error(
                            request,
                            'Tu cuenta no está confirmada. '
                            'Revisa tu correo y haz clic en el enlace de verificación.'
                        )
                        return render(request, 'login.html', {'form': form})
                except Perfil.DoesNotExist:
                    pass  # Usuarios sin perfil (superusuarios) pasan directo

                login(request, usuario)
                return redirect('/')
            else:
                messages.error(request, 'Documento y/o Contraseña no válidos.')
        else:
            messages.error(request, 'La información ingresada no es correcta.')
    else:
        form = AuthenticationForm()

    return render(request, 'login.html', {'form': form})


# ──────────────────────────────────────────────
#  CERRAR SESIÓN
# ──────────────────────────────────────────────

def cerrar_sesion(request):
    logout(request)
    return redirect('/')


# ──────────────────────────────────────────────
#  RECUPERAR CONTRASEÑA
# ──────────────────────────────────────────────

def recup(request):
    if request.method == 'POST':
        correo = request.POST.get('correo', '').strip()
        try:
            user = User.objects.get(email=correo)
            token = _generar_token()
            Recup.objects.create(correo=user.email, token=token)

            url_cc = f'http://localhost:8000/autenticar/cambiarpass?c={user.email}&t={token}'
            contexto = {'url_cc': url_cc, 'nom': user.first_name or user.username}
            html = render_to_string('correo_recup.html', contexto)

            email = EmailMessage(
                subject='Recuperación de Contraseña — MindWell',
                body=html,
                from_email=settings.EMAIL_HOST_USER,
                to=[user.email],
            )
            email.content_subtype = 'html'
            email.send()

            msj = 'La solicitud se ha procesado exitosamente. Revisa tu correo.'
            ok = 1
        except User.DoesNotExist:
            msj = 'El correo especificado no existe.'
            ok = 0

        return render(request, 'recup.html', {'msj': msj, 'ok': ok})
    else:
        return render(request, 'recup.html')


# ──────────────────────────────────────────────
#  CAMBIAR CONTRASEÑA
# ──────────────────────────────────────────────

def cambiarpass(request):
    if request.method == 'POST':
        id_usr = request.POST.get('id')
        pw     = request.POST.get('pass')
        pw2    = request.POST.get('pass2')

        if pw != pw2:
            messages.error(request, 'La contraseña y su confirmación no coinciden.')
            return render(request, 'cambiar_pass.html', {'id_usr': id_usr})

        user = User.objects.get(id=id_usr)
        user.password = make_password(pw, salt=None, hasher='default')
        user.save(update_fields=['password'])
        messages.success(request, 'Contraseña actualizada correctamente.')
        return redirect('login')

    else:
        cor = request.GET.get('c', '')
        tok = request.GET.get('t', '')
        recup_qs = Recup.objects.filter(correo=cor, token=tok)
        try:
            user = User.objects.get(email=cor)
        except User.DoesNotExist:
            user = None

        if recup_qs.exists() and user:
            recup_qs.delete()
            return render(request, 'cambiar_pass.html', {'id_usr': user.id})
        else:
            messages.error(request, 'El enlace no es válido o ya fue utilizado.')
            return render(request, 'cambiar_pass.html')
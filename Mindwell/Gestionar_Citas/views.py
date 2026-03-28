import json
from django.http             import JsonResponse
from django.views            import View
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from django.contrib.auth     import authenticate, login
from django.contrib.auth.models import User
from django.utils            import timezone
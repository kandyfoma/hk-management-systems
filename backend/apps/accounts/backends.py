"""
Custom authentication backends for HK Management System
"""
from django.contrib.auth.backends import ModelBackend
from django.contrib.auth import get_user_model

User = get_user_model()


class PhoneNumberAuthBackend(ModelBackend):
    """
    Custom authentication backend that allows login via phone number
    instead of username
    """
    def authenticate(self, request, username=None, password=None, **kwargs):
        try:
            # Try to get user by phone if username contains a phone-like pattern
            user = User.objects.get(phone=username)
        except User.DoesNotExist:
            return None
        
        if user.check_password(password) and self.user_can_authenticate(user):
            return user
        return None

    def get_user(self, user_id):
        try:
            return User.objects.get(pk=user_id)
        except User.DoesNotExist:
            return None

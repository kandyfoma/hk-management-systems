from rest_framework import serializers
from django.contrib.auth import authenticate
from .models import User, UserPermission, UserRole, Permission


class UserCreateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)
    confirm_password = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = [
            'phone', 'password', 'confirm_password', 'first_name', 'last_name',
            'email', 'primary_role', 'department', 'employee_id', 
            'professional_license', 'organization', 'metadata'
        ]

    def validate(self, attrs):
        if attrs['password'] != attrs['confirm_password']:
            raise serializers.ValidationError("Passwords do not match")
        return attrs

    def create(self, validated_data):
        validated_data.pop('confirm_password')
        password = validated_data.pop('password')
        user = User.objects.create_user(password=password, **validated_data)
        return user


class UserUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = [
            'first_name', 'last_name', 'email', 'primary_role', 'department',
            'employee_id', 'professional_license', 'is_active', 'metadata'
        ]
        read_only_fields = ['phone', 'organization', 'created_at']


class UserSerializer(serializers.ModelSerializer):
    full_name = serializers.ReadOnlyField()
    role_display_name = serializers.CharField(source='get_role_display_name', read_only=True)
    organization_name = serializers.CharField(source='organization.name', read_only=True)
    permissions = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id', 'phone', 'first_name', 'last_name', 'full_name', 'email',
            'primary_role', 'role_display_name', 'department', 'employee_id',
            'professional_license', 'organization', 'organization_name',
            'is_active', 'last_login', 'created_at', 'updated_at', 'metadata',
            'permissions'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_permissions(self, obj):
        return [perm.permission for perm in obj.user_permissions.all()]


class UserListSerializer(serializers.ModelSerializer):
    """Simplified serializer for user lists"""
    full_name = serializers.ReadOnlyField()
    role_display_name = serializers.CharField(source='get_role_display_name', read_only=True)
    organization_name = serializers.CharField(source='organization.name', read_only=True)

    class Meta:
        model = User
        fields = [
            'id', 'first_name', 'last_name', 'full_name', 'phone', 'email', 'primary_role', 
            'role_display_name', 'department', 'employee_id',
            'organization_name', 'is_active', 'last_login', 'created_at'
        ]


class UserPermissionSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source='user.full_name', read_only=True)
    granted_by_name = serializers.CharField(source='granted_by.full_name', read_only=True)
    permission_display = serializers.CharField(source='get_permission_display', read_only=True)

    class Meta:
        model = UserPermission
        fields = [
            'id', 'user', 'user_name', 'permission', 'permission_display',
            'granted_by', 'granted_by_name', 'granted_at'
        ]
        read_only_fields = ['granted_at']


class LoginSerializer(serializers.Serializer):
    phone = serializers.CharField()
    password = serializers.CharField(write_only=True)

    def validate(self, attrs):
        phone = attrs.get('phone')
        password = attrs.get('password')

        if phone and password:
            user = authenticate(
                request=self.context.get('request'),
                username=phone,
                password=password
            )

            if not user:
                raise serializers.ValidationError('Invalid phone number or password')

            if not user.is_active:
                raise serializers.ValidationError('User account is disabled')

            attrs['user'] = user
            return attrs
        else:
            raise serializers.ValidationError('Must include phone and password')


class ChangePasswordSerializer(serializers.Serializer):
    current_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True, min_length=8)
    confirm_password = serializers.CharField(write_only=True)

    def validate(self, attrs):
        if attrs['new_password'] != attrs['confirm_password']:
            raise serializers.ValidationError("New passwords do not match")
        return attrs

    def validate_current_password(self, value):
        user = self.context['request'].user
        if not user.check_password(value):
            raise serializers.ValidationError("Current password is incorrect")
        return value


class UserRoleChoicesSerializer(serializers.Serializer):
    """Serializer for user role choices"""
    value = serializers.CharField()
    label = serializers.CharField()


class PermissionChoicesSerializer(serializers.Serializer):
    """Serializer for permission choices"""
    value = serializers.CharField()
    label = serializers.CharField()
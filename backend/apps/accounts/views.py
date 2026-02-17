from rest_framework import generics, status, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.authtoken.models import Token
from django_filters.rest_framework import DjangoFilterBackend
from django_filters import rest_framework as filters
from django.contrib.auth import login, logout
from django.db.models import Q
from .models import User, UserPermission, UserRole, Permission
from .serializers import (
    UserSerializer, UserListSerializer, UserCreateSerializer, UserUpdateSerializer,
    UserPermissionSerializer, LoginSerializer, ChangePasswordSerializer,
    UserRoleChoicesSerializer, PermissionChoicesSerializer
)


class UserFilter(filters.FilterSet):
    role = filters.ChoiceFilter(field_name='primary_role', choices=UserRole.choices)
    is_active = filters.BooleanFilter()
    department = filters.CharFilter(lookup_expr='icontains')
    organization = filters.UUIDFilter(field_name='organization__id')
    search = filters.CharFilter(method='filter_search')

    class Meta:
        model = User
        fields = ['role', 'is_active', 'department', 'organization']

    def filter_search(self, queryset, name, value):
        return queryset.filter(
            Q(first_name__icontains=value) |
            Q(last_name__icontains=value) |
            Q(phone__icontains=value) |
            Q(employee_id__icontains=value)
        )


class UserListCreateAPIView(generics.ListCreateAPIView):
    queryset = User.objects.select_related('organization').prefetch_related('user_permissions')
    filter_backends = [DjangoFilterBackend]
    filterset_class = UserFilter
    search_fields = ['first_name', 'last_name', 'phone', 'employee_id']
    ordering_fields = ['first_name', 'last_name', 'created_at', 'last_login']
    ordering = ['-created_at']

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return UserCreateSerializer
        return UserListSerializer

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


class UserDetailAPIView(generics.RetrieveUpdateDestroyAPIView):
    queryset = User.objects.select_related('organization').prefetch_related('user_permissions')
    serializer_class = UserSerializer

    def get_serializer_class(self):
        if self.request.method in ['PUT', 'PATCH']:
            return UserUpdateSerializer
        return UserSerializer

    def perform_update(self, serializer):
        serializer.save(updated_by=self.request.user)

    def perform_destroy(self, instance):
        # Soft delete - set is_active to False instead of deleting
        instance.is_active = False
        instance.save()


class UserPermissionListCreateAPIView(generics.ListCreateAPIView):
    serializer_class = UserPermissionSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['user', 'permission']

    def get_queryset(self):
        return UserPermission.objects.select_related('user', 'granted_by')

    def perform_create(self, serializer):
        serializer.save(granted_by=self.request.user)


class UserPermissionDetailAPIView(generics.RetrieveDestroyAPIView):
    queryset = UserPermission.objects.select_related('user', 'granted_by')
    serializer_class = UserPermissionSerializer


@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def login_view(request):
    """User login endpoint"""
    serializer = LoginSerializer(data=request.data, context={'request': request})
    if serializer.is_valid():
        user = serializer.validated_data['user']
        login(request, user)
        token, created = Token.objects.get_or_create(user=user)
        
        # Update last login
        from django.utils import timezone
        user.last_login = timezone.now()
        user.save(update_fields=['last_login'])
        
        return Response({
            'token': token.key,
            'user': UserSerializer(user).data
        })
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
def logout_view(request):
    """User logout endpoint"""
    try:
        request.user.auth_token.delete()
    except:
        pass
    logout(request)
    return Response({'message': 'Successfully logged out'})


@api_view(['GET'])
def profile_view(request):
    """Get current user profile"""
    serializer = UserSerializer(request.user)
    return Response(serializer.data)


@api_view(['PUT', 'PATCH'])
def update_profile_view(request):
    """Update current user profile"""
    serializer = UserUpdateSerializer(request.user, data=request.data, partial=True)
    if serializer.is_valid():
        serializer.save()
        return Response(UserSerializer(request.user).data)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
def change_password_view(request):
    """Change user password"""
    serializer = ChangePasswordSerializer(data=request.data, context={'request': request})
    if serializer.is_valid():
        user = request.user
        user.set_password(serializer.validated_data['new_password'])
        user.save()
        
        # Invalidate existing tokens
        Token.objects.filter(user=user).delete()
        token = Token.objects.create(user=user)
        
        return Response({
            'message': 'Password changed successfully',
            'token': token.key
        })
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def user_role_choices_view(request):
    """Get user role choices"""
    choices = [
        {'value': choice[0], 'label': choice[1]}
        for choice in UserRole.choices
    ]
    return Response(choices)


@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def permission_choices_view(request):
    """Get permission choices"""
    choices = [
        {'value': choice[0], 'label': choice[1]}
        for choice in Permission.choices
    ]
    return Response(choices)


@api_view(['GET'])
def user_permissions_view(request, user_id):
    """Get permissions for a specific user"""
    try:
        user = User.objects.get(id=user_id)
        permissions = user.user_permissions.all()
        serializer = UserPermissionSerializer(permissions, many=True)
        return Response(serializer.data)
    except User.DoesNotExist:
        return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)


@api_view(['POST'])
def assign_permission_view(request, user_id):
    """Assign permission to a user"""
    try:
        user = User.objects.get(id=user_id)
        permission = request.data.get('permission')
        
        if permission not in dict(Permission.choices):
            return Response({'error': 'Invalid permission'}, status=status.HTTP_400_BAD_REQUEST)
        
        permission_obj, created = UserPermission.objects.get_or_create(
            user=user,
            permission=permission,
            defaults={'granted_by': request.user}
        )
        
        if created:
            serializer = UserPermissionSerializer(permission_obj)
            return Response({
                'message': 'Permission assigned successfully',
                'permission': serializer.data
            }, status=status.HTTP_201_CREATED)
        else:
            return Response({'message': 'Permission already exists'})
            
    except User.DoesNotExist:
        return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)


@api_view(['DELETE'])
def revoke_permission_view(request, user_id, permission):
    """Revoke permission from a user"""
    try:
        user = User.objects.get(id=user_id)
        permission_obj = UserPermission.objects.get(user=user, permission=permission)
        permission_obj.delete()
        return Response({'message': 'Permission revoked successfully'})
    except User.DoesNotExist:
        return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)
    except UserPermission.DoesNotExist:
        return Response({'error': 'Permission not found'}, status=status.HTTP_404_NOT_FOUND)
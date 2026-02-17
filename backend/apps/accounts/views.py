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
        
        # Prepare organization data
        organization_data = None
        if user.organization:
            organization_data = {
                'id': str(user.organization.id),
                'name': user.organization.name,
                'license_key': getattr(user.organization, 'license_key', None),
            }
        
        return Response({
            'token': token.key,
            'user': UserSerializer(user).data,
            'organization': organization_data
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


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def user_module_access_view(request):
    """Get module access permissions for the current user"""
    try:
        user = request.user
        
        # For now, we'll generate module access based on organization licenses
        # In a more complex system, this would be stored in a separate table
        if not user.organization:
            return Response([])
        
        organization = user.organization
        licenses = organization.licenses.filter(status='active')
        
        module_access_data = []
        for license_obj in licenses:
            # Map backend license type to frontend ModuleType
            module_type = license_obj.type
            
            # Generate basic permissions based on user role and license type
            permissions = []
            if user.primary_role == 'ADMIN':
                permissions = ['read', 'write', 'delete', 'manage_users', 'manage_settings']
            elif user.primary_role == 'MANAGER':
                permissions = ['read', 'write', 'delete']
            elif user.primary_role == 'EMPLOYEE':
                permissions = ['read', 'write']
            else:
                permissions = ['read']
            
            module_access_data.append({
                'id': f"{user.id}_{license_obj.id}",
                'userId': str(user.id),
                'licenseId': str(license_obj.id),
                'moduleType': module_type,
                'role': user.primary_role,
                'permissions': permissions,
                'facilityAccess': [str(user.organization.id)],  # User can access their org
                'isActive': True,
                'grantedAt': license_obj.created_at.isoformat(),
                'createdAt': license_obj.created_at.isoformat(),
                'updatedAt': license_obj.updated_at.isoformat() if license_obj.updated_at else None
            })
        
        return Response(module_access_data)
        
    except Exception as e:
        return Response({'error': str(e)}, status=500)


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def bulk_import_users_view(request):
    """Bulk import users from CSV or JSON data"""
    try:
        user = request.user
        
        # Check if user has permission to manage users
        if user.primary_role not in ['ADMIN', 'MANAGER']:
            return Response({'error': 'Insufficient permissions'}, status=403)
        
        data = request.data
        users_data = data.get('users', [])
        
        if not users_data:
            return Response({'error': 'No user data provided'}, status=400)
        
        created_users = []
        errors = []
        
        for i, user_data in enumerate(users_data):
            try:
                # Validate required fields
                if not user_data.get('first_name') or not user_data.get('last_name'):
                    errors.append(f"Row {i+1}: First name and last name are required")
                    continue
                
                if not user_data.get('phone'):
                    errors.append(f"Row {i+1}: Phone number is required")
                    continue
                
                # Check if user already exists
                phone = user_data.get('phone', '').strip()
                if User.objects.filter(phone=phone).exists():
                    errors.append(f"Row {i+1}: User with phone {phone} already exists")
                    continue
                
                # Create user
                new_user = User(
                    first_name=user_data.get('first_name', '').strip(),
                    last_name=user_data.get('last_name', '').strip(),
                    phone=phone,
                    email=user_data.get('email', '').strip() or None,
                    employee_id=user_data.get('employee_id', '').strip() or None,
                    primary_role=user_data.get('role', 'EMPLOYEE'),
                    department=user_data.get('department', '').strip() or None,
                    organization=user.organization,  # Same org as the admin creating
                    is_active=True,
                    is_staff=user_data.get('role') in ['ADMIN', 'MANAGER'],
                )
                
                # Set default password or use provided one
                password = user_data.get('password', 'defaultpass123')
                new_user.set_password(password)
                new_user.save()
                
                created_users.append({
                    'id': str(new_user.id),
                    'name': f"{new_user.first_name} {new_user.last_name}",
                    'phone': new_user.phone,
                    'role': new_user.primary_role
                })
                
            except Exception as e:
                errors.append(f"Row {i+1}: {str(e)}")
        
        return Response({
            'success': True,
            'created_count': len(created_users),
            'error_count': len(errors),
            'created_users': created_users,
            'errors': errors
        })
        
    except Exception as e:
        return Response({'error': str(e)}, status=500)


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def organization_users_view(request):
    """Get all users for the current user's organization"""
    try:
        user = request.user
        if not user.organization:
            return Response({'error': 'User not associated with an organization'}, status=400)
        
        organization = user.organization
        users = organization.users.all().order_by('first_name', 'last_name')
        
        # Use the UserListSerializer
        serializer = UserListSerializer(users, many=True)
        return Response(serializer.data)
        
    except Exception as e:
        return Response({'error': str(e)}, status=500)
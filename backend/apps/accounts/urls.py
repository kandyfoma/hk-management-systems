from django.urls import path
from . import views

app_name = 'accounts'

urlpatterns = [
    # Authentication
    path('login/', views.login_view, name='login'),
    path('logout/', views.logout_view, name='logout'),
    path('profile/', views.profile_view, name='profile'),
    path('profile/update/', views.update_profile_view, name='update_profile'),
    path('change-password/', views.change_password_view, name='change_password'),
    
    # Users
    path('users/', views.UserListCreateAPIView.as_view(), name='user_list_create'),
    path('users/<uuid:pk>/', views.UserDetailAPIView.as_view(), name='user_detail'),
    
    # User Permissions
    path('permissions/', views.UserPermissionListCreateAPIView.as_view(), name='permission_list_create'),
    path('permissions/<int:pk>/', views.UserPermissionDetailAPIView.as_view(), name='permission_detail'),
    path('users/<uuid:user_id>/permissions/', views.user_permissions_view, name='user_permissions'),
    path('users/<uuid:user_id>/permissions/assign/', views.assign_permission_view, name='assign_permission'),
    path('users/<uuid:user_id>/permissions/<str:permission>/revoke/', views.revoke_permission_view, name='revoke_permission'),
    
    # Choices
    path('choices/roles/', views.user_role_choices_view, name='user_role_choices'),
    path('choices/permissions/', views.permission_choices_view, name='permission_choices'),
]
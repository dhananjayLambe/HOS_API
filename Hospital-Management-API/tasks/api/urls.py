from django.urls import path
from tasks.api import views

app_name = 'tasks'

urlpatterns = [
    # List (GET) and Create (POST) tasks
    path('', views.TaskListView.as_view(), name='task-list-create'),
    
    # Task detail, update, and delete
    path('<uuid:task_id>/', views.TaskDetailView.as_view(), name='task-detail'),
]


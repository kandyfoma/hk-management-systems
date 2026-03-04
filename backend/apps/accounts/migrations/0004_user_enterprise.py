# Generated migration for adding enterprise field to User

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('occupational_health', '0021_exposure_reading_worker_nullable_datefield'),
        ('accounts', '0003_alter_user_primary_role'),
    ]

    operations = [
        migrations.AddField(
            model_name='user',
            name='enterprise',
            field=models.ForeignKey(
                blank=True,
                help_text='Associated enterprise for occupational health and safety',
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='users',
                to='occupational_health.enterprise'
            ),
        ),
    ]

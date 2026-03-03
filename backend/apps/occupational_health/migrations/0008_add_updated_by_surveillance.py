# Generated migration for adding updated_by field to SurveillanceProgram

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('occupational_health', '0007_surveillanceprogram_surveillanceenrollment_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='surveillanceprogram',
            name='updated_by',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='surveillance_programs_updated', to=settings.AUTH_USER_MODEL),
        ),
    ]

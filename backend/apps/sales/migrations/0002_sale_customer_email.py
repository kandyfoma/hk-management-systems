from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('sales', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='sale',
            name='customer_email',
            field=models.EmailField(blank=True, max_length=254),
        ),
    ]

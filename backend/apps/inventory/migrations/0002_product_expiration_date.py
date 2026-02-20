from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('inventory', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='product',
            name='expiration_date',
            field=models.DateField(blank=True, help_text="Date d'expiration générale du produit", null=True),
        ),
    ]

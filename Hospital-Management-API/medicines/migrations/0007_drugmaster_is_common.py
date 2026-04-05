# Generated manually for is_common fallback ordering

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("medicines", "0006_alter_drugmaster_search_vector"),
    ]

    operations = [
        migrations.AddField(
            model_name="drugmaster",
            name="is_common",
            field=models.BooleanField(
                db_index=True,
                default=False,
                help_text="High-volume / commonly prescribed; boosts global fallback ordering.",
            ),
        ),
        migrations.AddIndex(
            model_name="drugmaster",
            index=models.Index(
                fields=["is_active", "is_common", "brand_name"],
                name="medicines_dr_is_acti_7a8b9c_idx",
            ),
        ),
    ]

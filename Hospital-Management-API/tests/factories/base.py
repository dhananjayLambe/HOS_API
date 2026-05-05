from django.db.models.fields.related import ManyToManyField
import factory


class BaseModelFactory(factory.django.DjangoModelFactory):
    """full_clean + save; M2M extracted via _meta (stable across Django versions)."""

    class Meta:
        abstract = True

    @classmethod
    def _create(cls, model_class, *args, **kwargs):
        m2m_field_names = {
            f.name
            for f in model_class._meta.get_fields()
            if isinstance(f, ManyToManyField)
        }
        m2m = {k: kwargs.pop(k) for k in list(kwargs) if k in m2m_field_names}

        obj = model_class(*args, **kwargs)
        obj.full_clean(exclude=cls._exclude_from_clean())
        obj.save()

        for field, value in m2m.items():
            getattr(obj, field).set(value)
        return obj

    @classmethod
    def _exclude_from_clean(cls):
        return []

import factory
from django.contrib.auth import get_user_model

User = get_user_model()


class UserFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = User

    username = factory.Sequence(lambda n: f"9{n:010d}")
    first_name = "Test"
    last_name = "User"

    @classmethod
    def _create(cls, model_class, *args, **kwargs):
        password = kwargs.pop("password", "pass12345")
        return model_class.objects.create_user(*args, password=password, **kwargs)

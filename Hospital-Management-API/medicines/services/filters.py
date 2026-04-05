def filter_active_medicines(queryset):
    return queryset.filter(is_active=True)


def remove_duplicates(medicine_list):
    return list({m.id: m for m in medicine_list}.values())
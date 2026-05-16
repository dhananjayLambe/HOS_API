"""Backward-compatible re-export — use lab_orders_list instead."""

from labs.api.serializers.lab_orders_list import LabOrderListItemSerializer  # noqa: F401

__all__ = ["LabOrderListItemSerializer"]

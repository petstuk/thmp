"""Helpers for integration API responses."""


def mask_secret_ref(value: str | None) -> str | None:
    if value is None or value == "":
        return None
    return "***"

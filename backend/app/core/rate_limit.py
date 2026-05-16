from __future__ import annotations

from collections.abc import Callable

from app.core.config import settings


class NoOpLimiter:
    enabled = False

    def limit(self, _value: str) -> Callable:
        def decorator(func: Callable) -> Callable:
            return func

        return decorator


try:
    from slowapi import Limiter
    from slowapi.util import get_remote_address

    limiter = Limiter(
        key_func=get_remote_address,
        default_limits=[settings.RATE_LIMIT_DEFAULT],
    )
    limiter.enabled = True
except ModuleNotFoundError:
    limiter = NoOpLimiter()

from typing import Any, Set


class InMemoryRedisClient:
    def __init__(self):
        self._kv_store: dict[str, str] = {}
        self._set_store: dict[str, Set[str]] = {}
        self._hash_store: dict[str, dict[str, Any]] = {}

    def set(self, key: str, value: str, ex: int | None = None) -> bool:
        self._kv_store[key] = value
        return True

    def get(self, key: str):
        return self._kv_store.get(key)

    def exists(self, key: str) -> int:
        return int(key in self._kv_store or key in self._set_store or key in self._hash_store)

    def delete(self, *keys: str) -> int:
        deleted = 0
        for key in keys:
            if key in self._kv_store:
                del self._kv_store[key]
                deleted += 1
            if key in self._set_store:
                del self._set_store[key]
                deleted += 1
            if key in self._hash_store:
                del self._hash_store[key]
                deleted += 1
        return deleted

    def sadd(self, key: str, *values: str) -> int:
        members = self._set_store.setdefault(key, set())
        before = len(members)
        members.update(values)
        return len(members) - before

    def smembers(self, key: str) -> Set[str]:
        return set(self._set_store.get(key, set()))

    def scard(self, key: str) -> int:
        return len(self._set_store.get(key, set()))

    def srem(self, key: str, *values: str) -> int:
        members = self._set_store.get(key)
        if not members:
            return 0
        removed = 0
        for value in values:
            if value in members:
                members.remove(value)
                removed += 1
        if not members:
            self._set_store.pop(key, None)
        return removed

    def hset(self, key: str, mapping: dict[str, str | int]) -> int:
        bucket = self._hash_store.setdefault(key, {})
        bucket.update(mapping)
        return len(mapping)

    def expire(self, key: str, ttl: int) -> bool:
        return True

    def incr(self, key: str) -> int:
        next_value = int(self._kv_store.get(key, "0")) + 1
        self._kv_store[key] = str(next_value)
        return next_value

    def flushdb(self) -> bool:
        self._kv_store.clear()
        self._set_store.clear()
        self._hash_store.clear()
        return True


_CLIENT = InMemoryRedisClient()


def get_in_memory_redis_client() -> InMemoryRedisClient:
    return _CLIENT

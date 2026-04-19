import bcrypt


def hash_password(password: str) -> str:
    data = password.encode("utf-8")
    if len(data) > 72:
        raise ValueError("Password must be at most 72 bytes for bcrypt")
    hashed = bcrypt.hashpw(data, bcrypt.gensalt(rounds=12))
    return hashed.decode("ascii")


def verify_password(password: str, password_hash: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("ascii"))
    except ValueError:
        return False

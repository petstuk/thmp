from app.ioc_extract import extract_iocs_from_text


def test_empty() -> None:
    assert extract_iocs_from_text("") == []
    assert extract_iocs_from_text("   ") == []


def test_ipv4() -> None:
    out = extract_iocs_from_text("Contact 192.168.1.1 and 10.0.0.1")
    ips = {x["value"] for x in out if x["type"] == "ip"}
    assert "192.168.1.1" in ips
    assert "10.0.0.1" in ips


def test_domain() -> None:
    out = extract_iocs_from_text("evil.example.com is bad")
    assert any(x["type"] == "domain" and "evil.example.com" in x["value"] for x in out)


def test_dedupes_same_ioc() -> None:
    out = extract_iocs_from_text("1.1.1.1 1.1.1.1")
    assert len([x for x in out if x["type"] == "ip"]) == 1


def test_url() -> None:
    out = extract_iocs_from_text("open https://example.com/a path")
    assert any(x["type"] == "url" and x["value"].startswith("https://") for x in out)

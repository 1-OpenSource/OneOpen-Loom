from app.services.content_migrate import legacy_markdown_to_html, looks_like_html


def test_looks_like_html():
    assert looks_like_html("<p>Hello</p>")
    assert looks_like_html('<div data-mb-toc="true"></div>')
    assert not looks_like_html("# Hello\n\nWorld")


def test_legacy_markdown_to_html_macros():
    source = "# Title\n\n{{toc}}\n\n{{info:Note}}\n\n{{workitem:ABC-1}}\n"
    html = legacy_markdown_to_html(source)
    assert "<h1>" in html
    assert 'data-mb-toc="true"' in html
    assert 'data-mb-panel="info"' in html
    assert 'data-mb-workitem="ABC-1"' in html


def test_legacy_markdown_idempotent_for_html():
    html = "<p>Already HTML</p>"
    assert legacy_markdown_to_html(html) == html

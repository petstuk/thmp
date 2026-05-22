from __future__ import annotations

try:
    from jinja2 import Environment, BaseLoader, select_autoescape
except ModuleNotFoundError:  # pragma: no cover - local fallback for lean envs
    Environment = None
    BaseLoader = None
    select_autoescape = None

DEFAULT_TEMPLATE = """
<html>
  <head>
    <meta charset="utf-8" />
    <style>
      body { font-family: Arial, sans-serif; margin: 32px; color: #111827; }
      h1 { margin: 0 0 8px 0; }
      h2 { margin-top: 24px; margin-bottom: 8px; }
      .meta { color: #4b5563; font-size: 12px; margin-bottom: 20px; }
      .card { border: 1px solid #d1d5db; border-radius: 8px; padding: 12px; margin-bottom: 10px; }
      code { background: #f3f4f6; padding: 1px 4px; border-radius: 4px; }
      ul { margin-top: 6px; }
    </style>
  </head>
  <body>
    <h1>{{ title }}</h1>
    <div class="meta">
      Workspace {{ workspace_id }} | Generated {{ generated_at }}
    </div>
    {% if summary %}
      <div class="card">{{ summary }}</div>
    {% endif %}
    {% for section in sections %}
      <h2>{{ section.title }}</h2>
      <div class="card">
        {% if section.lines %}
          <ul>
          {% for line in section.lines %}
            <li>{{ line }}</li>
          {% endfor %}
          </ul>
        {% else %}
          <div>{{ section.body }}</div>
        {% endif %}
      </div>
    {% endfor %}
  </body>
</html>
""".strip()

EXEC_BRIEF_TEMPLATE = """
<html>
  <body style="font-family:Arial,sans-serif;margin:28px;color:#111827;">
    <h1>{{ title }}</h1>
    <p><strong>Executive summary</strong></p>
    <p>{{ summary }}</p>
    {% for section in sections %}
      <h3>{{ section.title }}</h3>
      <p>{{ section.body }}</p>
    {% endfor %}
  </body>
</html>
""".strip()

TECH_DEEP_TEMPLATE = """
<html>
  <body style="font-family:monospace;margin:20px;color:#111827;">
    <h1>{{ title }}</h1>
    <p>Workspace: {{ workspace_id }}</p>
    {% for section in sections %}
      <h3>{{ section.title }}</h3>
      {% if section.lines %}
        <pre>{{ section.lines | join('\\n') }}</pre>
      {% else %}
        <pre>{{ section.body }}</pre>
      {% endif %}
    {% endfor %}
  </body>
</html>
""".strip()


def builtin_template(name: str) -> str:
    if name == "exec_brief":
        return EXEC_BRIEF_TEMPLATE
    if name == "technical_deep":
        return TECH_DEEP_TEMPLATE
    return DEFAULT_TEMPLATE


def render_html(template_body: str, context: dict) -> str:
    if Environment is not None and BaseLoader is not None and select_autoescape is not None:
        env = Environment(loader=BaseLoader(), autoescape=select_autoescape(default=True))
        tpl = env.from_string(template_body)
        return tpl.render(**context)
    sections = context.get("sections", [])
    section_html = []
    for s in sections:
        title = str(s.get("title", "Section"))
        body = str(s.get("body", ""))
        lines = s.get("lines")
        if isinstance(lines, list):
            body = "<ul>" + "".join(f"<li>{str(line)}</li>" for line in lines) + "</ul>"
        section_html.append(f"<h2>{title}</h2><div>{body}</div>")
    return (
        "<html><body>"
        f"<h1>{context.get('title', 'THMP Report')}</h1>"
        f"<div>{context.get('summary', '')}</div>"
        + "".join(section_html)
        + "</body></html>"
    )

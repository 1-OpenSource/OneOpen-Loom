# Configuration file for the Sphinx documentation builder.
# https://www.sphinx-doc.org/en/master/usage/configuration.html

from __future__ import annotations

from datetime import date
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]

project = "OneOpen Loom"
author = "OneOpenSource"
copyright = f"{date.today().year}, OneOpenSource"
release = "0.1.0"
version = "0.1"

extensions = [
    "myst_parser",
    "sphinx.ext.autodoc",
    "sphinx.ext.napoleon",
    "sphinx.ext.viewcode",
    "sphinx.ext.intersphinx",
    "sphinx.ext.todo",
    "sphinx_copybutton",
    "sphinx_design",
    "sphinxcontrib.mermaid",
]

templates_path = ["_templates"]
exclude_patterns = ["_build", "Thumbs.db", ".DS_Store", "requirements-docs.txt"]

source_suffix = {
    ".rst": "restructuredtext",
    ".md": "markdown",
}

master_doc = "index"
language = "en"

html_theme = "sphinx_rtd_theme"
html_title = "OneOpen Loom Documentation"
html_short_title = "Loom"
html_static_path = ["_static"]
html_css_files = ["custom.css"]
html_logo = "logo.svg"
html_favicon = "logo.svg"
html_show_sourcelink = True
html_show_sphinx = False
html_copy_source = False

html_theme_options = {
    "logo_only": False,
    "prev_next_buttons_location": "bottom",
    "style_external_links": True,
    "style_nav_header_background": "#1e293b",
    "collapse_navigation": False,
    "sticky_navigation": True,
    "navigation_depth": 3,
    "includehidden": True,
    "titles_only": False,
}

html_context = {
    "display_github": True,
    "github_user": "1-OpenSource",
    "github_repo": "OneOpen-Loom",
    "github_version": "main",
    "conf_py_path": "/docs/",
}

myst_enable_extensions = [
    "colon_fence",
    "deflist",
    "fieldlist",
    "replacements",
    "smartquotes",
    "tasklist",
]

myst_heading_anchors = 3
todo_include_todos = True

intersphinx_mapping = {
    "python": ("https://docs.python.org/3", None),
}

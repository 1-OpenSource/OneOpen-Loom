OneOpen Workboard documentation
=================================

**OneOpen Workboard** is the work-management product in the
**OneOpen Loom** collaboration suite.

Use Workboard to plan and deliver software and service work: workspaces,
projects, work items, backlog ranking, Kanban workboards, sprints, workflows,
OQL search, service queues, dashboards, and workspace administration.

.. important::

   **Loom ≠ Workboard.**

   * **OneOpen Loom** — the open-source *suite* (umbrella) that will host several products.
   * **OneOpen Workboard** — the *work management* product (this documentation).

   This Sphinx site documents **Workboard**. For the suite overview, see the
   repository `README <https://github.com/1-OpenSource/OneOpen-Loom>`_.

.. note::

   Built with Sphinx and the classic
   `Read the Docs <https://docs.readthedocs.io/>`_ theme.

Quick start
-----------

.. code-block:: bash

   cd backend
   python -m venv .venv
   # Windows: .\.venv\Scripts\Activate.ps1
   # macOS/Linux: source .venv/bin/activate
   pip install -r requirements.txt
   cp .env.example .env
   alembic upgrade head
   python -m app.scripts.seed
   uvicorn app.main:app --reload --port 8000

.. code-block:: bash

   cd frontend
   npm install
   npm run dev

Open http://localhost:5173 and sign in (after seed) with
``akhil@oneopen.dev`` / ``password123``.

Contents
--------

.. toctree::
   :maxdepth: 2
   :caption: Getting started

   workboard/overview
   workboard/quickstart
   workboard/concepts

.. toctree::
   :maxdepth: 2
   :caption: Using Workboard

   workboard/projects-and-items
   workboard/workboard-board
   workboard/workflows-and-admin
   workboard/service-and-spaces

.. toctree::
   :maxdepth: 2
   :caption: Develop & roadmap

   workboard/development
   workboard/roadmap
   workboard/gap-analysis

Indices
-------

* :ref:`genindex`
* :ref:`search`

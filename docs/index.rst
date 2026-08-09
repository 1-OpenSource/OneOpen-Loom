OneOpen Loom documentation
==========================

**OneOpen Loom** is the open-source **collaboration suite** in
`OneOpenSource <https://oneopensource.org>`_.

Loom is the **umbrella**, not a single application. It hosts products that
share workspace identity and optional integrations:

* **OneOpen Workboard** — work management and delivery
* **OneOpen Magicboard** — knowledge, spaces, and pages

.. important::

   **Loom ≠ Workboard ≠ Magicboard.**

   * **Loom** — the suite (this documentation site).
   * **Workboard** — track and deliver work (``backend/`` + ``frontend/``).
   * **Magicboard** — team knowledge (``magicboard/``), runs independently.

.. note::

   Built with Sphinx and the
   `Read the Docs <https://docs.readthedocs.io/>`_ theme.
   Suite mark: ``docs/logo.svg``. Product marks live under
   ``docs/workboard/logo.svg`` and ``docs/magicboard/logo.svg``.

Suite quick start
-----------------

**Prerequisites:** Python 3.12+, Node.js 20+

Workboard (API ``:8001``, SPA ``:5173``)::

   cd backend
   python -m pip install -r requirements.txt
   cp .env.example .env
   alembic upgrade head
   python -m app.scripts.seed
   uvicorn app.main:app --reload --port 8001

   cd frontend
   npm install
   npm run dev

Magicboard (API ``:8002``, SPA ``:5174``)::

   cd magicboard/backend
   python -m pip install -r requirements.txt
   cp .env.example .env
   python -m app.scripts.seed
   uvicorn app.main:app --reload --port 8002

   cd magicboard/frontend
   npm install
   npm run dev

After seed, sign in with ``akhil@oneopen.dev`` / ``password123``.

Contents
--------

.. toctree::
   :maxdepth: 2
   :caption: Workboard

   workboard/overview
   workboard/quickstart
   workboard/concepts
   workboard/projects-and-items
   workboard/workboard-board
   workboard/workflows-and-admin
   workboard/service-and-spaces
   workboard/development
   workboard/roadmap
   workboard/gap-analysis

.. toctree::
   :maxdepth: 2
   :caption: Magicboard

   magicboard/overview
   magicboard/quickstart
   magicboard/concepts
   magicboard/authoring
   magicboard/collaboration
   magicboard/workboard-integration
   magicboard/development
   magicboard/branding

Indices
-------

* :ref:`genindex`
* :ref:`search`

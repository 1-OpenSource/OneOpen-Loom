OneOpen Loom documentation
==========================

**OneOpen Loom** is an open-source collaboration suite:

* **Workboard** — work management and delivery (``backend/`` + ``frontend/``)
* **Magicboard** — knowledge, spaces, and pages (``magicboard/``)

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

Indices
-------

* :ref:`genindex`
* :ref:`search`

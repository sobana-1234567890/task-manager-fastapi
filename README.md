# Task Manager (FastAPI + Vanilla JS)

A full-stack Task Manager application with JWT authentication, user-isolated task CRUD, pagination/filtering, and a plain HTML/CSS/JavaScript frontend.

## Project Structure

```
task_manager/
├── app/
│   ├── main.py
│   ├── models.py
│   ├── schemas.py
│   ├── database.py
│   ├── auth.py
│   └── routes/
│       ├── auth.py
│       └── tasks.py
├── frontend/
│   ├── index.html
│   ├── style.css
│   └── app.js
├── tests/
│   └── test_api.py
├── requirements.txt
├── .env.example
└── Dockerfile
```

## Environment Variables

The app reads configuration from environment variables. If `.env` is missing, safe fallback values are used so local startup still works.

By default, the API uses SQLite via:

- `DATABASE_URL=sqlite:///./test.db`

Copy `.env.example` to `.env` and update as needed:

```env
DATABASE_URL=sqlite:///./test.db
JWT_SECRET_KEY=your_secret_key_here
```

To use another database in production, set `DATABASE_URL` to your connection string (for example PostgreSQL):

```env
DATABASE_URL=postgresql+psycopg://user:password@host:5432/dbname
```

## Local Setup

1. Create and activate a virtual environment.
2. Install dependencies:

```bash
pip install -r requirements.txt
```

3. Create `.env` from `.env.example`.
4. Run backend:

```bash
uvicorn app.main:app --reload
```

Backend runs at `http://127.0.0.1:8000`.

5. Run frontend:
   - Open `frontend/index.html` in a browser, or
   - Serve the folder with any static server.

## API Endpoints

### Authentication
- `POST /register`
- `POST /login`

### Tasks (JWT required)
- `POST /tasks`
- `GET /tasks?page=1&limit=10&completed=true|false`
- `GET /tasks/{id}`
- `PUT /tasks/{id}`
- `DELETE /tasks/{id}`

## Running Tests

```bash
pytest -q
```

## Docker

Build image:

```bash
docker build -t task-manager .
```

Run container:

```bash
docker run --env-file .env -p 8000:8000 task-manager
```

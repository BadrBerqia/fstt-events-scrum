from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr
from sqlalchemy import create_engine, Column, Integer, String, Boolean, DateTime, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session, relationship
from datetime import datetime
import hashlib

# Database setup
DATABASE_URL = "sqlite:///./fstt_events.db"
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# Models
class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    is_admin = Column(Boolean, default=False)
    registrations = relationship("Registration", back_populates="user")

class Category(Base):
    __tablename__ = "categories"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False)
    events = relationship("Event", back_populates="category")

class Event(Base):
    __tablename__ = "events"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    description = Column(String)
    location = Column(String)
    date = Column(DateTime, nullable=False)
    status = Column(String, default="en_cours")
    category_id = Column(Integer, ForeignKey("categories.id"))
    category = relationship("Category", back_populates="events")
    registrations = relationship("Registration", back_populates="event")

class Registration(Base):
    __tablename__ = "registrations"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    event_id = Column(Integer, ForeignKey("events.id"), nullable=False)
    registered_at = Column(DateTime, default=datetime.utcnow)
    user = relationship("User", back_populates="registrations")
    event = relationship("Event", back_populates="registrations")

class Comment(Base):
    __tablename__ = "comments"
    id = Column(Integer, primary_key=True, index=True)
    content = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    event_id = Column(Integer, ForeignKey("events.id"), nullable=False)
    user = relationship("User")
    event = relationship("Event")

# Create tables
Base.metadata.create_all(bind=engine)

# Pydantic schemas
class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: int
    name: str
    email: str
    is_admin: bool
    class Config:
        from_attributes = True

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class LoginResponse(BaseModel):
    message: str
    user: UserResponse

class CategoryResponse(BaseModel):
    id: int
    name: str
    class Config:
        from_attributes = True

class EventResponse(BaseModel):
    id: int
    title: str
    description: str | None
    location: str | None
    date: datetime
    status: str
    category: CategoryResponse | None
    registration_count: int = 0
    class Config:
        from_attributes = True

class EventCreate(BaseModel):
    title: str
    description: str | None = None
    location: str | None = None
    date: datetime
    category_id: int | None = None

class StatusUpdate(BaseModel):
    status: str

class RegistrationResponse(BaseModel):
    id: int
    event_id: int
    user_id: int
    registered_at: datetime
    class Config:
        from_attributes = True

# App
app = FastAPI(title="FSTT Events API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Helper
def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()

# Seed data
def seed_data(db: Session):
    if db.query(Category).count() == 0:
        categories = [
            Category(name="Conférence"),
            Category(name="Formation"),
            Category(name="Atelier"),
            Category(name="Club"),
            Category(name="Sport")
        ]
        db.add_all(categories)
        db.commit()
    
    if db.query(Event).count() == 0:
        events = [
            Event(
                title="Conférence IA et Data Science",
                description="Découvrez les dernières avancées en Intelligence Artificielle",
                location="Amphi A",
                date=datetime(2025, 1, 25, 14, 0),
                status="en_cours",
                category_id=1
            ),
            Event(
                title="Formation Python Avancé",
                description="Apprenez les concepts avancés de Python",
                location="Salle 101",
                date=datetime(2025, 1, 28, 9, 0),
                status="en_cours",
                category_id=2
            ),
            Event(
                title="Atelier Cloud Azure",
                description="Hands-on sur les services Azure",
                location="Labo Info",
                date=datetime(2025, 2, 1, 10, 0),
                status="en_cours",
                category_id=3
            ),
            Event(
                title="Tournoi de Football",
                description="Tournoi inter-filières",
                location="Terrain FSTT",
                date=datetime(2025, 2, 5, 15, 0),
                status="en_cours",
                category_id=5
            ),
        ]
        db.add_all(events)
        db.commit()

# Routes Auth
@app.post("/auth/register", response_model=UserResponse)
def register(user: UserCreate, is_admin: bool = False, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == user.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email déjà utilisé")
    
    db_user = User(
        name=user.name,
        email=user.email,
        password_hash=hash_password(user.password),
        is_admin=is_admin
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

@app.post("/auth/login", response_model=LoginResponse)
def login(credentials: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == credentials.email).first()
    if not user or user.password_hash != hash_password(credentials.password):
        raise HTTPException(status_code=401, detail="Email ou mot de passe incorrect")
    
    return {"message": "Connexion réussie", "user": user}

# Routes Events
@app.get("/events")
def get_events(db: Session = Depends(get_db)):
    seed_data(db)
    events = db.query(Event).all()
    result = []
    for event in events:
        event_dict = {
            "id": event.id,
            "title": event.title,
            "description": event.description,
            "location": event.location,
            "date": event.date,
            "status": event.status,
            "category": {"id": event.category.id, "name": event.category.name} if event.category else None,
            "registration_count": len(event.registrations)
        }
        result.append(event_dict)
    return result

@app.get("/categories", response_model=list[CategoryResponse])
def get_categories(db: Session = Depends(get_db)):
    seed_data(db)
    return db.query(Category).all()

@app.post("/events")
def create_event(event: EventCreate, db: Session = Depends(get_db)):
    db_event = Event(
        title=event.title,
        description=event.description,
        location=event.location,
        date=event.date,
        status="en_cours",
        category_id=event.category_id
    )
    db.add(db_event)
    db.commit()
    db.refresh(db_event)
    return {
        "id": db_event.id,
        "title": db_event.title,
        "description": db_event.description,
        "location": db_event.location,
        "date": db_event.date,
        "status": db_event.status,
        "category": {"id": db_event.category.id, "name": db_event.category.name} if db_event.category else None,
        "registration_count": 0
    }

@app.put("/events/{event_id}")
def update_event(event_id: int, event: EventCreate, db: Session = Depends(get_db)):
    db_event = db.query(Event).filter(Event.id == event_id).first()
    if not db_event:
        raise HTTPException(status_code=404, detail="Événement non trouvé")
    
    db_event.title = event.title
    db_event.description = event.description
    db_event.location = event.location
    db_event.date = event.date
    db_event.category_id = event.category_id
    
    db.commit()
    db.refresh(db_event)
    return {
        "id": db_event.id,
        "title": db_event.title,
        "description": db_event.description,
        "location": db_event.location,
        "date": db_event.date,
        "status": db_event.status,
        "category": {"id": db_event.category.id, "name": db_event.category.name} if db_event.category else None,
        "registration_count": len(db_event.registrations)
    }

@app.delete("/events/{event_id}")
def delete_event(event_id: int, db: Session = Depends(get_db)):
    db_event = db.query(Event).filter(Event.id == event_id).first()
    if not db_event:
        raise HTTPException(status_code=404, detail="Événement non trouvé")
    
    db.delete(db_event)
    db.commit()
    return {"message": "Événement supprimé"}

@app.patch("/events/{event_id}/status")
def update_event_status(event_id: int, status_update: StatusUpdate, db: Session = Depends(get_db)):
    db_event = db.query(Event).filter(Event.id == event_id).first()
    if not db_event:
        raise HTTPException(status_code=404, detail="Événement non trouvé")
    
    valid_statuses = ["en_cours", "complet", "annule", "termine"]
    if status_update.status not in valid_statuses:
        raise HTTPException(status_code=400, detail="Statut invalide")
    
    db_event.status = status_update.status
    db.commit()
    db.refresh(db_event)
    return {"message": "Statut mis à jour", "status": db_event.status}

# SCRUM-13: S'inscrire à un événement
@app.post("/events/{event_id}/register")
def register_to_event(event_id: int, user_id: int, db: Session = Depends(get_db)):
    # Vérifier que l'événement existe
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Événement non trouvé")
    
    # Vérifier que l'utilisateur existe
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")
    
    # Vérifier si déjà inscrit
    existing = db.query(Registration).filter(
        Registration.user_id == user_id,
        Registration.event_id == event_id
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Déjà inscrit à cet événement")
    
    # Créer l'inscription
    registration = Registration(user_id=user_id, event_id=event_id)
    db.add(registration)
    db.commit()
    db.refresh(registration)
    return {"message": "Inscription réussie", "registration_id": registration.id}

# Vérifier si l'utilisateur est inscrit à un événement
@app.get("/events/{event_id}/registration/{user_id}")
def check_registration(event_id: int, user_id: int, db: Session = Depends(get_db)):
    registration = db.query(Registration).filter(
        Registration.user_id == user_id,
        Registration.event_id == event_id
    ).first()
    return {"is_registered": registration is not None}

# SCRUM-14: Voir mes inscriptions
@app.get("/users/{user_id}/registrations")
def get_user_registrations(user_id: int, db: Session = Depends(get_db)):
    registrations = db.query(Registration).filter(Registration.user_id == user_id).all()
    result = []
    for reg in registrations:
        event = reg.event
        result.append({
            "registration_id": reg.id,
            "registered_at": reg.registered_at,
            "event": {
                "id": event.id,
                "title": event.title,
                "description": event.description,
                "location": event.location,
                "date": event.date,
                "status": event.status,
                "category": {"id": event.category.id, "name": event.category.name} if event.category else None
            }
        })
    return result

# SCRUM-15: Annuler une inscription
@app.delete("/registrations/{registration_id}")
def cancel_registration(registration_id: int, db: Session = Depends(get_db)):
    registration = db.query(Registration).filter(Registration.id == registration_id).first()
    if not registration:
        raise HTTPException(status_code=404, detail="Inscription non trouvée")
    
    db.delete(registration)
    db.commit()
    return {"message": "Inscription annulée"}

# SCRUM-15: Liste des inscrits à un événement (Admin)
@app.get("/events/{event_id}/registrations")
def get_event_registrations(event_id: int, db: Session = Depends(get_db)):
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Événement non trouvé")
    
    registrations = db.query(Registration).filter(Registration.event_id == event_id).all()
    result = []
    for reg in registrations:
        result.append({
            "registration_id": reg.id,
            "registered_at": reg.registered_at,
            "user": {
                "id": reg.user.id,
                "name": reg.user.name,
                "email": reg.user.email
            }
        })
    return result

# SCRUM-17: Gérer les catégories (Admin)
class CategoryCreate(BaseModel):
    name: str

@app.post("/categories", response_model=CategoryResponse)
def create_category(category: CategoryCreate, db: Session = Depends(get_db)):
    existing = db.query(Category).filter(Category.name == category.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Cette catégorie existe déjà")
    
    db_category = Category(name=category.name)
    db.add(db_category)
    db.commit()
    db.refresh(db_category)
    return db_category

@app.put("/categories/{category_id}", response_model=CategoryResponse)
def update_category(category_id: int, category: CategoryCreate, db: Session = Depends(get_db)):
    db_category = db.query(Category).filter(Category.id == category_id).first()
    if not db_category:
        raise HTTPException(status_code=404, detail="Catégorie non trouvée")
    
    existing = db.query(Category).filter(Category.name == category.name, Category.id != category_id).first()
    if existing:
        raise HTTPException(status_code=400, detail="Une catégorie avec ce nom existe déjà")
    
    db_category.name = category.name
    db.commit()
    db.refresh(db_category)
    return db_category

@app.delete("/categories/{category_id}")
def delete_category(category_id: int, db: Session = Depends(get_db)):
    db_category = db.query(Category).filter(Category.id == category_id).first()
    if not db_category:
        raise HTTPException(status_code=404, detail="Catégorie non trouvée")
    
    # Vérifier si des événements utilisent cette catégorie
    events_count = db.query(Event).filter(Event.category_id == category_id).count()
    if events_count > 0:
        raise HTTPException(status_code=400, detail=f"Impossible de supprimer: {events_count} événement(s) utilisent cette catégorie")
    
    db.delete(db_category)
    db.commit()
    return {"message": "Catégorie supprimée"}

# SCRUM-18: Commenter un événement
class CommentCreate(BaseModel):
    content: str
    user_id: int

@app.post("/events/{event_id}/comments")
def create_comment(event_id: int, comment: CommentCreate, db: Session = Depends(get_db)):
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Événement non trouvé")
    
    user = db.query(User).filter(User.id == comment.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")
    
    db_comment = Comment(
        content=comment.content,
        user_id=comment.user_id,
        event_id=event_id
    )
    db.add(db_comment)
    db.commit()
    db.refresh(db_comment)
    return {
        "id": db_comment.id,
        "content": db_comment.content,
        "created_at": db_comment.created_at,
        "user": {"id": user.id, "name": user.name}
    }

@app.get("/events/{event_id}/comments")
def get_event_comments(event_id: int, db: Session = Depends(get_db)):
    comments = db.query(Comment).filter(Comment.event_id == event_id).order_by(Comment.created_at.desc()).all()
    return [{
        "id": c.id,
        "content": c.content,
        "created_at": c.created_at,
        "user": {"id": c.user.id, "name": c.user.name}
    } for c in comments]

@app.delete("/comments/{comment_id}")
def delete_comment(comment_id: int, db: Session = Depends(get_db)):
    comment = db.query(Comment).filter(Comment.id == comment_id).first()
    if not comment:
        raise HTTPException(status_code=404, detail="Commentaire non trouvé")
    
    db.delete(comment)
    db.commit()
    return {"message": "Commentaire supprimé"}

# SCRUM-19: Historique des participations (événements terminés)
@app.get("/users/{user_id}/history")
def get_user_history(user_id: int, db: Session = Depends(get_db)):
    registrations = db.query(Registration).filter(Registration.user_id == user_id).all()
    result = []
    for reg in registrations:
        event = reg.event
        if event.status == "termine":
            result.append({
                "registration_id": reg.id,
                "registered_at": reg.registered_at,
                "event": {
                    "id": event.id,
                    "title": event.title,
                    "description": event.description,
                    "location": event.location,
                    "date": event.date,
                    "status": event.status,
                    "category": {"id": event.category.id, "name": event.category.name} if event.category else None
                }
            })
    return result

@app.get("/")
def root():
    return {"message": "FSTT Events API", "status": "running"}
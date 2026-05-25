from flask_sqlalchemy import SQLAlchemy
from datetime import datetime

db = SQLAlchemy()

class Coffee(db.Model):
    __tablename__ = 'coffees'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), unique=True, nullable=False)
    description = db.Column(db.Text, nullable=True)
    roast = db.Column(db.String(50), nullable=False)  # 'Light', 'Medium', 'Dark'
    votes = db.Column(db.Integer, default=0, nullable=False)
    image_url = db.Column(db.String(255), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationship to reviews
    reviews = db.relationship('Review', backref='coffee', lazy=True, cascade="all, delete-orphan")
    
    @property
    def average_rating(self):
        if not self.reviews:
            return 0.0
        total_rating = sum(review.rating for review in self.reviews)
        return round(total_rating / len(self.reviews), 1)
        
    @property
    def review_count(self):
        return len(self.reviews)

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'roast': self.roast,
            'votes': self.votes,
            'image_url': self.image_url,
            'average_rating': self.average_rating,
            'review_count': self.review_count,
            'created_at': self.created_at.strftime('%Y-%m-%d %H:%M:%S')
        }

class Review(db.Model):
    __tablename__ = 'reviews'
    
    id = db.Column(db.Integer, primary_key=True)
    coffee_id = db.Column(db.Integer, db.ForeignKey('coffees.id'), nullable=False)
    user_name = db.Column(db.String(100), nullable=False)
    rating = db.Column(db.Integer, nullable=False)  # 1 to 5 stars
    comment = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'coffee_id': self.coffee_id,
            'user_name': self.user_name,
            'rating': self.rating,
            'comment': self.comment,
            'created_at': self.created_at.strftime('%Y-%m-%d %H:%M:%S')
        }

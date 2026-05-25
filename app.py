import os
import subprocess
from flask import Flask, render_template, request, jsonify
from models import db, Coffee, Review

app = Flask(__name__)

# Configure SQLite Database
db_path = os.path.join(os.path.abspath(os.path.dirname(__file__)), 'coffeeshop.db')
app.config['SQLALCHEMY_DATABASE_URI'] = f'sqlite:///{db_path}'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db.init_app(app)

def seed_database():
    """Seed the database with premium coffee items and initial reviews/ratings."""
    # Check if database has coffees already
    if Coffee.query.first() is not None:
        return
        
    print("Seeding database with initial coffees and reviews...")
    
    coffees_data = [
        {
            "name": "Midnight Espresso",
            "description": "A bold, intense shot of pure dark roast espresso with a dense, caramel-like crema and notes of bittersweet chocolate.",
            "roast": "Dark",
            "image_url": "https://images.unsplash.com/photo-151097252790b-af4f42df5e40?q=80&w=600&auto=format&fit=crop",
            "votes": 42,
            "reviews": [
                {"user_name": "Marcus V.", "rating": 5, "comment": "Absolutely spectacular crema. Bold, robust, and wakes me up instantly!"},
                {"user_name": "Elena R.", "rating": 4, "comment": "Very intense and rich. A bit strong if you are not used to pure espresso, but perfect for purists."},
                {"user_name": "David K.", "rating": 5, "comment": "The gold standard of espresso. Beautiful caramel undertones."}
            ]
        },
        {
            "name": "Velvet Flat White",
            "description": "Smooth, velvety microfoam poured over a double shot of medium-roast ristretto espresso, offering a perfect balance of milk and coffee.",
            "roast": "Medium",
            "image_url": "https://images.unsplash.com/photo-1577968897966-3d4325b36b61?q=80&w=600&auto=format&fit=crop",
            "votes": 58,
            "reviews": [
                {"user_name": "Sophia L.", "rating": 5, "comment": "The microfoam is incredibly silky. Best flat white I have ever had!"},
                {"user_name": "Liam M.", "rating": 5, "comment": "Perfect balance of coffee and milk. Not too sweet, just smooth coffee goodness."},
                {"user_name": "Nate T.", "rating": 4, "comment": "Consistently delicious. Love the ristretto base."}
            ]
        },
        {
            "name": "Classic Cappuccino",
            "description": "Equal parts rich espresso, steamed milk, and thick, airy froth, dusted with premium organic cocoa powder.",
            "roast": "Medium",
            "image_url": "https://images.unsplash.com/photo-1534778101976-62847782c213?q=80&w=600&auto=format&fit=crop",
            "votes": 35,
            "reviews": [
                {"user_name": "Emma W.", "rating": 4, "comment": "Lovely foam texture. The dusting of cocoa powder is a nice touch."},
                {"user_name": "Oliver H.", "rating": 5, "comment": "Classic, well-balanced, and looks beautiful. Highly recommend!"}
            ]
        },
        {
            "name": "Golden Caramel Macchiato",
            "description": "Freshly steamed milk with vanilla-flavored syrup, marked with espresso and drizzled with a decadent buttery caramel sauce.",
            "roast": "Medium",
            "image_url": "https://images.unsplash.com/photo-1485808191679-5f86510681a2?q=80&w=600&auto=format&fit=crop",
            "votes": 73,
            "reviews": [
                {"user_name": "Chloe B.", "rating": 5, "comment": "My absolute favorite! The caramel drizzle is sweet perfection."},
                {"user_name": "Lucas G.", "rating": 4, "comment": "Sweet and satisfying. Excellent treat for a afternoon boost!"}
            ]
        },
        {
            "name": "Cold Brew Reserve",
            "description": "Lightly roasted single-origin beans steeped in cool water for 20 hours, resulting in an exceptionally smooth, low-acidity, naturally sweet brew.",
            "roast": "Light",
            "image_url": "https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?q=80&w=600&auto=format&fit=crop",
            "votes": 61,
            "reviews": [
                {"user_name": "Jackson P.", "rating": 5, "comment": "Unbelievably smooth. No bitterness whatsoever. Perfect over ice."},
                {"user_name": "Zoe D.", "rating": 5, "comment": "Crisp, clean, and delicious. You can taste the floral notes of the light roast."}
            ]
        },
        {
            "name": "French Roast Classic",
            "description": "An aromatic dark roast with smoky undertones, a heavy body, and a clean finish. Perfect for French Press lovers.",
            "roast": "Dark",
            "image_url": "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?q=80&w=600&auto=format&fit=crop",
            "votes": 29,
            "reviews": [
                {"user_name": "Robert S.", "rating": 4, "comment": "Classic dark roast. Very smoky and rich."},
                {"user_name": "Grace Y.", "rating": 4, "comment": "Excellent body. Great for a slow morning brew."}
            ]
        }
    ]
    
    for coffee_item in coffees_data:
        coffee = Coffee(
            name=coffee_item["name"],
            description=coffee_item["description"],
            roast=coffee_item["roast"],
            image_url=coffee_item["image_url"],
            votes=coffee_item["votes"]
        )
        db.session.add(coffee)
        db.session.flush()  # to get the coffee.id
        
        for review_item in coffee_item["reviews"]:
            review = Review(
                coffee_id=coffee.id,
                user_name=review_item["user_name"],
                rating=review_item["rating"],
                comment=review_item["comment"]
            )
            db.session.add(review)
            
    db.session.commit()
    print("Database seeding completed successfully.")

# Create DB Tables & Seed
with app.app_context():
    db.create_all()
    seed_database()

@app.route('/')
def index():
    """Render the dashboard page."""
    return render_template('index.html')

@app.route('/api/coffees', methods=['GET'])
def get_coffees():
    """Retrieve all coffees with optional filters."""
    roast_filter = request.args.get('roast', 'All')
    sort_by = request.args.get('sort_by', 'votes')  # votes, rating, name
    search_query = request.args.get('search', '').strip()
    
    query = Coffee.query
    
    if roast_filter != 'All':
        query = query.filter(Coffee.roast == roast_filter)
        
    if search_query:
        query = query.filter(Coffee.name.ilike(f'%{search_query}%') | Coffee.description.ilike(f'%{search_query}%'))
        
    coffees = query.all()
    
    # Serialize coffees to dictionaries
    serialized_coffees = [c.to_dict() for c in coffees]
    
    # Sort coffees since average_rating is a dynamic property, Python sorting is easier
    if sort_by == 'votes':
        serialized_coffees.sort(key=lambda x: x['votes'], reverse=True)
    elif sort_by == 'rating':
        serialized_coffees.sort(key=lambda x: x['average_rating'], reverse=True)
    elif sort_by == 'name':
        serialized_coffees.sort(key=lambda x: x['name'].lower())
        
    return jsonify(serialized_coffees)

@app.route('/api/coffees/<int:coffee_id>/vote', methods=['POST'])
def vote_coffee(coffee_id):
    """Increment the vote count for a coffee."""
    coffee = Coffee.query.get_or_404(coffee_id)
    coffee.votes += 1
    db.session.commit()
    return jsonify({
        'success': True,
        'votes': coffee.votes,
        'message': f'Voted for {coffee.name}!'
    })

@app.route('/api/coffees/<int:coffee_id>/reviews', methods=['GET'])
def get_reviews(coffee_id):
    """Get all reviews for a coffee."""
    coffee = Coffee.query.get_or_404(coffee_id)
    reviews = [r.to_dict() for r in coffee.reviews]
    # Sort reviews by date descending
    reviews.sort(key=lambda x: x['created_at'], reverse=True)
    return jsonify({
        'coffee_name': coffee.name,
        'average_rating': coffee.average_rating,
        'review_count': coffee.review_count,
        'reviews': reviews
    })

@app.route('/api/coffees/<int:coffee_id>/rate', methods=['POST'])
def rate_coffee(coffee_id):
    """Submit a review/rating for a coffee."""
    coffee = Coffee.query.get_or_404(coffee_id)
    data = request.get_json() or {}
    
    user_name = data.get('user_name', '').strip()
    rating = data.get('rating')
    comment = data.get('comment', '').strip()
    
    if not user_name:
        return jsonify({'error': 'Name is required'}), 400
        
    try:
        rating = int(rating)
        if rating < 1 or rating > 5:
            raise ValueError
    except (TypeError, ValueError):
        return jsonify({'error': 'Rating must be an integer between 1 and 5'}), 400
        
    new_review = Review(
        coffee_id=coffee.id,
        user_name=user_name,
        rating=rating,
        comment=comment
    )
    db.session.add(new_review)
    db.session.commit()
    
    return jsonify({
        'success': True,
        'average_rating': coffee.average_rating,
        'review_count': coffee.review_count,
        'review': new_review.to_dict(),
        'message': 'Review submitted successfully!'
    })

@app.route('/api/coffees/add', methods=['POST'])
def add_coffee():
    """Add a new coffee item."""
    data = request.get_json() or {}
    
    name = data.get('name', '').strip()
    description = data.get('description', '').strip()
    roast = data.get('roast', 'Medium')
    image_choice = data.get('image_choice', 'default') # espresso, cappuccino, flat_white, macchiato, cold_brew, french_roast, default
    
    if not name:
        return jsonify({'error': 'Coffee name is required'}), 400
        
    # Check if coffee with this name already exists
    existing = Coffee.query.filter(Coffee.name.ilike(name)).first()
    if existing:
        return jsonify({'error': f'A coffee named "{name}" already exists'}), 400
        
    # Set image url based on user's choice
    image_map = {
        'espresso': 'https://images.unsplash.com/photo-151097252790b-af4f42df5e40?q=80&w=600&auto=format&fit=crop',
        'cappuccino': 'https://images.unsplash.com/photo-1534778101976-62847782c213?q=80&w=600&auto=format&fit=crop',
        'flat_white': 'https://images.unsplash.com/photo-1577968897966-3d4325b36b61?q=80&w=600&auto=format&fit=crop',
        'macchiato': 'https://images.unsplash.com/photo-1485808191679-5f86510681a2?q=80&w=600&auto=format&fit=crop',
        'cold_brew': 'https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?q=80&w=600&auto=format&fit=crop',
        'french_roast': 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?q=80&w=600&auto=format&fit=crop',
        'default': 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?q=80&w=600&auto=format&fit=crop'
    }
    image_url = image_map.get(image_choice, image_map['default'])
    
    new_coffee = Coffee(
        name=name,
        description=description,
        roast=roast,
        image_url=image_url,
        votes=0
    )
    db.session.add(new_coffee)
    db.session.commit()
    
    return jsonify({
        'success': True,
        'coffee': new_coffee.to_dict(),
        'message': f'Successfully added "{name}" to the menu!'
    })

def git_push_on_startup():
    """Initializes Git and pushes the code to the repository automatically."""
    marker_file = os.path.join(os.path.abspath(os.path.dirname(__file__)), '.git_pushed')
    if os.path.exists(marker_file):
        return
        
    print("\n" + "="*50)
    print("   AROMA LOUNGE - AUTOMATIC GIT PUSH INITIALIZATION")
    print("="*50)
    try:
        # Check if git is initialized
        if not os.path.exists(os.path.join(os.path.abspath(os.path.dirname(__file__)), '.git')):
            print("Initializing Git repository...")
            subprocess.run(["git", "init"], check=True)
            
        # Add remote origin
        print("Setting remote origin to https://github.com/mr-yasar/coffee-virtualintern.git ...")
        # Remove if already exists
        subprocess.run(["git", "remote", "remove", "origin"], stderr=subprocess.DEVNULL)
        subprocess.run(["git", "remote", "add", "origin", "https://github.com/mr-yasar/coffee-virtualintern.git"], check=True)
        
        # Add files
        print("Staging files...")
        subprocess.run(["git", "add", "."], check=True)
        
        # Commit
        print("Committing changes...")
        # Check if there are changes to commit
        status = subprocess.run(["git", "status", "--porcelain"], capture_output=True, text=True)
        if status.stdout.strip():
            subprocess.run(["git", "commit", "-m", "Initial commit: Premium Coffee Rating Application with Flask, SQLite, and glassmorphic UI."], check=True)
        
        # Branch
        subprocess.run(["git", "branch", "-M", "main"], check=True)
        
        # Push
        print("\nPushing to GitHub remote... If prompted, please enter your credentials in this terminal.")
        result = subprocess.run(["git", "push", "-u", "origin", "main"])
        if result.returncode == 0:
            with open(marker_file, 'w') as f:
                f.write('pushed')
            print("\n" + "="*50)
            print("   GIT PUSH SUCCESSFUL!")
            print("="*50 + "\n")
        else:
            print("\n" + "="*50)
            print("   WARNING: Git push failed. Will retry on next startup.")
            print("="*50 + "\n")
    except Exception as e:
        print(f"Error during automatic git push: {e}\n")

if __name__ == '__main__':
    # Only run on the main process (not on the reloader process)
    if os.environ.get('WERKZEUG_RUN_MAIN') == 'true' or not app.debug:
        git_push_on_startup()
    app.run(debug=True, port=5000)

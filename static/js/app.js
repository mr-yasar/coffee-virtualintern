/**
 * AROMA LOUNGE - CLIENT SIDE APP LOGIC
 */

document.addEventListener('DOMContentLoaded', () => {
    // State management
    let currentRoast = 'All';
    let currentSort = 'votes';
    let currentSearch = '';
    let selectedCoffeeId = null;
    let searchDebounceTimeout = null;

    // DOM Elements
    const coffeeGrid = document.getElementById('coffee-grid');
    const loadingIndicator = document.getElementById('loading-indicator');
    const noResults = document.getElementById('no-results');
    const searchInput = document.getElementById('search-input');
    const roastFilters = document.getElementById('roast-filters');
    const sortSelect = document.getElementById('sort-select');
    
    // Modal Elements
    const addCoffeeModal = document.getElementById('add-coffee-modal');
    const coffeeDetailModal = document.getElementById('coffee-detail-modal');
    const openAddModalBtn = document.getElementById('open-add-modal-btn');
    const addCoffeeForm = document.getElementById('add-coffee-form');
    const addReviewForm = document.getElementById('add-review-form');
    
    // Toast Elements
    const toast = document.getElementById('toast-notification');
    const toastMessage = toast.querySelector('.toast-message');

    // Initialize application
    fetchCoffees();
    setupEventListeners();

    /* ==========================================================================
       API REQUESTS
       ========================================================================== */

    /**
     * Fetch coffee blends from the backend with current filters and sort options
     */
    async function fetchCoffees() {
        showLoading(true);
        try {
            const url = `/api/coffees?roast=${currentRoast}&sort_by=${currentSort}&search=${encodeURIComponent(currentSearch)}`;
            const response = await fetch(url);
            if (!response.ok) throw new Error('Failed to fetch coffees');
            
            const coffees = await response.json();
            renderCoffeeGrid(coffees);
        } catch (error) {
            console.error('Error:', error);
            showToast('Failed to brew coffee list. Please try again.', true);
        } finally {
            showLoading(false);
        }
    }

    /**
     * Cast a vote for a coffee blend
     */
    async function voteCoffee(coffeeId, heartElement, countElement) {
        try {
            const response = await fetch(`/api/coffees/${coffeeId}/vote`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });
            
            const data = await response.json();
            if (data.success) {
                // Update votes count
                countElement.textContent = data.votes;
                heartElement.classList.add('voted');
                showToast(data.message);
                
                // If this is the currently open detail coffee, update that too
                if (selectedCoffeeId === coffeeId) {
                    document.getElementById('detail-votes-count').textContent = data.votes;
                    const detailVoteBtn = document.getElementById('detail-vote-btn');
                    detailVoteBtn.classList.add('voted');
                }
            } else {
                showToast(data.error || 'Failed to vote', true);
            }
        } catch (error) {
            console.error('Error voting:', error);
            showToast('Connection error. Could not submit vote.', true);
        }
    }

    /**
     * Fetch detailed reviews for a specific coffee
     */
    async function fetchCoffeeReviews(coffeeId) {
        try {
            const response = await fetch(`/api/coffees/${coffeeId}/reviews`);
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Error fetching reviews:', error);
            showToast('Could not load reviews.', true);
            return null;
        }
    }

    /**
     * Submit a rating and review for a coffee
     */
    async function submitReview(event) {
        event.preventDefault();
        
        const nameInput = document.getElementById('reviewer-name');
        const ratingInput = document.getElementById('review-rating-value');
        const commentInput = document.getElementById('reviewer-comment');
        
        const user_name = nameInput.value.trim();
        const rating = parseInt(ratingInput.value);
        const comment = commentInput.value.trim();
        
        if (!user_name) {
            showToast('Please enter your name.', true);
            return;
        }
        
        if (!rating || rating < 1 || rating > 5) {
            showToast('Please select a star rating.', true);
            return;
        }
        
        try {
            const response = await fetch(`/api/coffees/${selectedCoffeeId}/rate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_name, rating, comment })
            });
            
            const data = await response.json();
            
            if (data.success) {
                showToast(data.message);
                
                // Reset form
                addReviewForm.reset();
                resetStarSelector();
                
                // Refresh modal content (reviews list & stats)
                openCoffeeDetail(selectedCoffeeId);
                
                // Refresh main grid list to update the card's average rating and reviews count
                fetchCoffees();
            } else {
                showToast(data.error || 'Failed to submit review.', true);
            }
        } catch (error) {
            console.error('Error submitting review:', error);
            showToast('Connection error. Could not submit review.', true);
        }
    }

    /**
     * Add a new coffee blend
     */
    async function submitNewCoffee(event) {
        event.preventDefault();
        
        const nameInput = document.getElementById('coffee-name');
        const roastInput = document.querySelector('input[name="coffee-roast"]:checked');
        const descInput = document.getElementById('coffee-description');
        const imgInput = document.querySelector('input[name="coffee-image"]:checked');
        
        const name = nameInput.value.trim();
        const roast = roastInput.value;
        const description = descInput.value.trim();
        const image_choice = imgInput.value;
        
        if (!name) {
            showToast('Please enter a coffee name.', true);
            return;
        }
        
        try {
            const response = await fetch('/api/coffees/add', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, roast, description, image_choice })
            });
            
            const data = await response.json();
            
            if (data.success) {
                showToast(data.message);
                addCoffeeForm.reset();
                closeModal('add-coffee-modal');
                fetchCoffees();
            } else {
                showToast(data.error || 'Failed to add coffee blend.', true);
            }
        } catch (error) {
            console.error('Error adding coffee:', error);
            showToast('Connection error. Could not add coffee.', true);
        }
    }

    /* ==========================================================================
       RENDERING & UI LOGIC
       ========================================================================== */

    /**
     * Render the grid of coffee cards
     */
    function renderCoffeeGrid(coffees) {
        coffeeGrid.innerHTML = '';
        
        if (coffees.length === 0) {
            coffeeGrid.style.display = 'none';
            noResults.style.display = 'block';
            return;
        }
        
        noResults.style.display = 'none';
        coffeeGrid.style.display = 'grid';
        
        coffees.forEach(coffee => {
            const card = document.createElement('div');
            card.className = 'coffee-card glass-panel';
            card.dataset.id = coffee.id;
            
            const starsHtml = renderStarsHtml(coffee.average_rating);
            
            card.innerHTML = `
                <div class="card-image-wrapper">
                    <img src="${coffee.image_url}" alt="${coffee.name}" loading="lazy">
                    <span class="badge roast-badge ${coffee.roast.toLowerCase()}">${coffee.roast} Roast</span>
                </div>
                <div class="card-content">
                    <div class="card-header-row">
                        <h3 class="card-title">${coffee.name}</h3>
                    </div>
                    <p class="card-description">${coffee.description || 'No description provided.'}</p>
                    
                    <div class="card-footer-stats">
                        <div class="rating-display" title="Average Rating: ${coffee.average_rating} out of 5">
                            <div class="stars">${starsHtml}</div>
                            <span class="rating-number">${coffee.average_rating.toFixed(1)}</span>
                            <span class="rating-count">(${coffee.review_count})</span>
                        </div>
                        
                        <div class="votes-display">
                            <span class="votes-count">${coffee.votes}</span>
                            <button class="vote-heart-btn" title="Vote for this blend">
                                <i class="fa-solid fa-heart"></i>
                            </button>
                        </div>
                    </div>
                </div>
            `;
            
            // Add event listeners for this card
            const titleElement = card.querySelector('.card-title');
            const imgElement = card.querySelector('.card-image-wrapper');
            const voteBtn = card.querySelector('.vote-heart-btn');
            const votesCountElement = card.querySelector('.votes-count');
            
            // Open details on clicking title or image
            [titleElement, imgElement].forEach(elem => {
                elem.addEventListener('click', () => {
                    openCoffeeDetail(coffee.id);
                });
            });
            
            // Vote button click
            voteBtn.addEventListener('click', (e) => {
                e.stopPropagation(); // prevent opening details modal
                voteCoffee(coffee.id, voteBtn, votesCountElement);
            });
            
            coffeeGrid.appendChild(card);
        });
    }

    /**
     * Load details and open reviews modal
     */
    async function openCoffeeDetail(coffeeId) {
        selectedCoffeeId = coffeeId;
        const details = await fetchCoffeeReviews(coffeeId);
        if (!details) return;

        // Reset the review form state
        addReviewForm.reset();
        resetStarSelector();

        // Find the coffee info from database response
        // Fetch specific coffee info (we can extract from database list or match details)
        const coffeeName = details.coffee_name;
        const reviewList = details.reviews;
        
        // Find matching coffee object from the currently displayed coffees
        // and fetch details to fill the left column
        try {
            const response = await fetch(`/api/coffees?search=${encodeURIComponent(coffeeName)}`);
            const results = await response.json();
            const coffee = results.find(c => c.id === coffeeId);
            
            if (coffee) {
                document.getElementById('detail-modal-title').textContent = coffee.name;
                document.getElementById('detail-image').src = coffee.image_url;
                document.getElementById('detail-image').alt = coffee.name;
                
                const roastBadge = document.getElementById('detail-roast-badge');
                roastBadge.className = `badge roast-badge ${coffee.roast.toLowerCase()}`;
                roastBadge.textContent = `${coffee.roast} Roast`;
                
                document.getElementById('detail-description').textContent = coffee.description || 'No description provided.';
                document.getElementById('detail-rating-avg').textContent = coffee.average_rating.toFixed(1);
                document.getElementById('detail-stars-visual').innerHTML = renderStarsHtml(coffee.average_rating);
                document.getElementById('detail-review-count').textContent = `${coffee.review_count} review${coffee.review_count !== 1 ? 's' : ''}`;
                document.getElementById('detail-votes-count').textContent = coffee.votes;
                
                // Configure detail vote button
                const detailVoteBtn = document.getElementById('detail-vote-btn');
                detailVoteBtn.className = 'btn btn-icon btn-vote';
                
                // Clean prior event listeners and assign new one
                const newVoteBtn = detailVoteBtn.cloneNode(true);
                detailVoteBtn.parentNode.replaceChild(newVoteBtn, detailVoteBtn);
                
                newVoteBtn.addEventListener('click', () => {
                    const card = document.querySelector(`.coffee-card[data-id="${coffeeId}"]`);
                    const cardHeartBtn = card ? card.querySelector('.vote-heart-btn') : null;
                    const cardVotesCount = card ? card.querySelector('.votes-count') : null;
                    
                    voteCoffee(coffeeId, newVoteBtn, document.getElementById('detail-votes-count'));
                    if (cardHeartBtn && cardVotesCount) {
                        cardHeartBtn.classList.add('voted');
                        cardVotesCount.textContent = parseInt(cardVotesCount.textContent) + 1;
                    }
                });
            }
        } catch (e) {
            console.error('Error setting modal details:', e);
        }

        // Render reviews list
        const reviewsContainer = document.getElementById('reviews-list-container');
        reviewsContainer.innerHTML = '';
        
        if (reviewList.length === 0) {
            reviewsContainer.innerHTML = '<p class="no-reviews">No reviews yet. Be the first to rate this coffee!</p>';
        } else {
            reviewList.forEach(review => {
                const reviewItem = document.createElement('div');
                reviewItem.className = 'review-item';
                
                const reviewStars = renderStarsHtml(review.rating);
                
                // Format relative date or just show standard
                const date = new Date(review.created_at);
                const formattedDate = date.toLocaleDateString(undefined, { 
                    year: 'numeric', 
                    month: 'short', 
                    day: 'numeric' 
                });
                
                reviewItem.innerHTML = `
                    <div class="review-header">
                        <span class="reviewer-name">${escapeHtml(review.user_name)}</span>
                        <div class="review-meta">
                            <div class="stars">${reviewStars}</div>
                            <span class="review-date">${formattedDate}</span>
                        </div>
                    </div>
                    <p class="review-comment">${escapeHtml(review.comment) || '<i>No comment left.</i>'}</p>
                `;
                reviewsContainer.appendChild(reviewItem);
            });
        }

        openModal('coffee-detail-modal');
    }

    /* ==========================================================================
       EVENT LISTENERS & HANDLERS
       ========================================================================== */

    function setupEventListeners() {
        // Roast filtering
        roastFilters.addEventListener('click', (e) => {
            const target = e.target;
            if (!target.classList.contains('roast-btn')) return;
            
            // Toggle active classes
            roastFilters.querySelectorAll('.roast-btn').forEach(btn => btn.classList.remove('active'));
            target.classList.add('active');
            
            currentRoast = target.dataset.roast;
            fetchCoffees();
        });

        // Sorting
        sortSelect.addEventListener('change', (e) => {
            currentSort = e.target.value;
            fetchCoffees();
        });

        // Searching with debounce
        searchInput.addEventListener('input', (e) => {
            clearTimeout(searchDebounceTimeout);
            searchDebounceTimeout = setTimeout(() => {
                currentSearch = e.target.value;
                fetchCoffees();
            }, 300);
        });

        // Modal triggers
        openAddModalBtn.addEventListener('click', () => openModal('add-coffee-modal'));
        
        // Modal close buttons (clicks on x or cancel buttons)
        document.querySelectorAll('.close-modal-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const targetId = btn.dataset.target;
                closeModal(targetId);
            });
        });

        // Close modal when clicking overlay
        document.querySelectorAll('.modal-overlay').forEach(overlay => {
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) {
                    closeModal(overlay.id);
                }
            });
        });

        // Forms submissions
        addCoffeeForm.addEventListener('submit', submitNewCoffee);
        addReviewForm.addEventListener('submit', submitReview);

        // Star rating hover & click interactions
        const starContainer = document.getElementById('star-rating-selector');
        const stars = starContainer.querySelectorAll('.star-select');
        const ratingInput = document.getElementById('review-rating-value');
        
        stars.forEach(star => {
            star.addEventListener('click', () => {
                const rating = star.dataset.rating;
                ratingInput.value = rating;
                
                // Highlight stars
                stars.forEach(s => {
                    const icon = s.querySelector('i');
                    if (parseInt(s.dataset.rating) <= parseInt(rating)) {
                        s.classList.add('active');
                        icon.className = 'fa-solid fa-star';
                    } else {
                        s.classList.remove('active');
                        icon.className = 'fa-regular fa-star';
                    }
                });
            });
            
            // Hover styling
            star.addEventListener('mouseenter', () => {
                const rating = star.dataset.rating;
                stars.forEach(s => {
                    const icon = s.querySelector('i');
                    if (parseInt(s.dataset.rating) <= parseInt(rating)) {
                        icon.className = 'fa-solid fa-star';
                    }
                });
            });
            
            star.addEventListener('mouseleave', () => {
                const currentRating = parseInt(ratingInput.value) || 0;
                stars.forEach(s => {
                    const icon = s.querySelector('i');
                    if (parseInt(s.dataset.rating) <= currentRating) {
                        icon.className = 'fa-solid fa-star';
                    } else {
                        icon.className = 'fa-regular fa-star';
                    }
                });
            });
        });
    }

    /* ==========================================================================
       HELPER FUNCTIONS
       ========================================================================== */

    function showLoading(isLoading) {
        if (isLoading) {
            loadingIndicator.style.display = 'flex';
            coffeeGrid.style.display = 'none';
            noResults.style.display = 'none';
        } else {
            loadingIndicator.style.display = 'none';
        }
    }

    function openModal(modalId) {
        const modal = document.getElementById(modalId);
        modal.classList.add('active');
        document.body.style.overflow = 'hidden'; // prevent background scrolling
    }

    function closeModal(modalId) {
        const modal = document.getElementById(modalId);
        modal.classList.remove('active');
        document.body.style.overflow = '';
        if (modalId === 'coffee-detail-modal') {
            selectedCoffeeId = null;
        }
    }

    function resetStarSelector() {
        const starContainer = document.getElementById('star-rating-selector');
        const stars = starContainer.querySelectorAll('.star-select');
        const ratingInput = document.getElementById('review-rating-value');
        
        ratingInput.value = '';
        stars.forEach(s => {
            s.classList.remove('active');
            s.querySelector('i').className = 'fa-regular fa-star';
        });
    }

    function showToast(message, isError = false) {
        toastMessage.textContent = message;
        
        if (isError) {
            toast.classList.add('error');
            toast.querySelector('.toast-icon').className = 'fa-solid fa-circle-exclamation toast-icon';
        } else {
            toast.classList.remove('error');
            toast.querySelector('.toast-icon').className = 'fa-solid fa-circle-check toast-icon';
        }
        
        toast.classList.add('active');
        
        // Remove active state after 3.5s
        setTimeout(() => {
            toast.classList.remove('active');
        }, 3500);
    }

    /**
     * Helper to render star icons based on rating float value
     */
    function renderStarsHtml(rating) {
        let starsHtml = '';
        const fullStars = Math.floor(rating);
        const hasHalfStar = rating - fullStars >= 0.3 && rating - fullStars < 0.8;
        const isRoundingUp = rating - fullStars >= 0.8;
        
        const count = isRoundingUp ? fullStars + 1 : fullStars;
        
        for (let i = 1; i <= 5; i++) {
            if (i <= count) {
                starsHtml += '<i class="fa-solid fa-star"></i>';
            } else if (i === count + 1 && hasHalfStar) {
                starsHtml += '<i class="fa-solid fa-star-half-stroke"></i>';
            } else {
                starsHtml += '<i class="fa-regular fa-star"></i>';
            }
        }
        return starsHtml;
    }

    /**
     * Escape strings to prevent HTML Injection
     */
    function escapeHtml(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.innerText = str;
        return div.innerHTML;
    }
});

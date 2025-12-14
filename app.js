// Game State
let gameState = {
    image: null,
    imageDataUrl: null,
    pieceCount: 16,
    gridSize: 4,
    pieces: [],
    placedPieces: [],
    startTime: null,
    timerInterval: null,
    pieceSize: 100
};

// DOM Elements
const setupScreen = document.getElementById('setupScreen');
const gameScreen = document.getElementById('gameScreen');
const imageUpload = document.getElementById('imageUpload');
const imagePreview = document.getElementById('imagePreview');
const pieceCount = document.getElementById('pieceCount');
const startButton = document.getElementById('startButton');
const loadButton = document.getElementById('loadButton');
const saveButton = document.getElementById('saveButton');
const resetButton = document.getElementById('resetButton');
const newGameButton = document.getElementById('newGameButton');
const puzzleBoard = document.getElementById('puzzleBoard');
const piecesList = document.getElementById('piecesList');
const piecesPlaced = document.getElementById('piecesPlaced');
const totalPieces = document.getElementById('totalPieces');
const timer = document.getElementById('timer');
const victoryMessage = document.getElementById('victoryMessage');
const finalTime = document.getElementById('finalTime');

// Check for saved game on load
window.addEventListener('DOMContentLoaded', () => {
    const savedGame = localStorage.getItem('jigsawPuzzleGame');
    if (savedGame) {
        loadButton.style.display = 'block';
    }
});

// Image Upload Handler
imageUpload.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (event) => {
            gameState.imageDataUrl = event.target.result;
            const img = new Image();
            img.onload = () => {
                gameState.image = img;
                imagePreview.innerHTML = `<img src="${event.target.result}" alt="Preview">`;
                startButton.disabled = false;
            };
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);
    }
});

// Piece Count Handler
pieceCount.addEventListener('change', (e) => {
    gameState.pieceCount = parseInt(e.target.value);
    gameState.gridSize = Math.sqrt(gameState.pieceCount);
});

// Start Game
startButton.addEventListener('click', () => {
    initializeGame();
});

// Load Saved Game
loadButton.addEventListener('click', () => {
    loadGame();
});

// Save Game
saveButton.addEventListener('click', () => {
    saveGame();
    alert('Game saved successfully!');
});

// Reset Game
resetButton.addEventListener('click', () => {
    if (confirm('Are you sure you want to start a new puzzle? Current progress will be lost.')) {
        clearInterval(gameState.timerInterval);
        setupScreen.classList.add('active');
        gameScreen.classList.remove('active');
        resetGameState();
    }
});

// New Game from Victory
newGameButton.addEventListener('click', () => {
    victoryMessage.style.display = 'none';
    clearInterval(gameState.timerInterval);
    setupScreen.classList.add('active');
    gameScreen.classList.remove('active');
    resetGameState();
    localStorage.removeItem('jigsawPuzzleGame');
});

// Initialize Game
function initializeGame() {
    gameState.gridSize = Math.sqrt(gameState.pieceCount);
    gameState.pieces = [];
    gameState.placedPieces = new Array(gameState.pieceCount).fill(null);
    gameState.startTime = Date.now();
    
    setupScreen.classList.remove('active');
    gameScreen.classList.add('active');
    
    createPuzzleBoard();
    createPuzzlePieces();
    startTimer();
    updateProgress();
}

// Create Puzzle Board
function createPuzzleBoard() {
    puzzleBoard.innerHTML = '';
    const containerWidth = Math.min(800, window.innerWidth - 100);
    gameState.pieceSize = containerWidth / gameState.gridSize;
    
    puzzleBoard.style.gridTemplateColumns = `repeat(${gameState.gridSize}, ${gameState.pieceSize}px)`;
    puzzleBoard.style.gridTemplateRows = `repeat(${gameState.gridSize}, ${gameState.pieceSize}px)`;
    
    for (let i = 0; i < gameState.pieceCount; i++) {
        const slot = document.createElement('div');
        slot.className = 'puzzle-slot';
        slot.dataset.index = i;
        slot.style.width = `${gameState.pieceSize}px`;
        slot.style.height = `${gameState.pieceSize}px`;
        
        slot.addEventListener('dragover', handleDragOver);
        slot.addEventListener('drop', handleDrop);
        slot.addEventListener('dragleave', handleDragLeave);
        
        puzzleBoard.appendChild(slot);
    }
    
    totalPieces.textContent = gameState.pieceCount;
}

// Create Puzzle Pieces
function createPuzzlePieces() {
    piecesList.innerHTML = '';
    
    const pieceWidth = gameState.image.width / gameState.gridSize;
    const pieceHeight = gameState.image.height / gameState.gridSize;
    
    // Create pieces array with position info
    for (let i = 0; i < gameState.pieceCount; i++) {
        const row = Math.floor(i / gameState.gridSize);
        const col = i % gameState.gridSize;
        
        gameState.pieces.push({
            index: i,
            correctPosition: i,
            backgroundPosition: `-${col * pieceWidth}px -${row * pieceHeight}px`,
            backgroundSize: `${gameState.image.width}px ${gameState.image.height}px`
        });
    }
    
    // Shuffle pieces
    shuffleArray(gameState.pieces);
    
    // Create piece elements
    gameState.pieces.forEach((piece, displayIndex) => {
        const pieceElement = document.createElement('div');
        pieceElement.className = 'piece';
        pieceElement.draggable = true;
        pieceElement.dataset.correctPosition = piece.correctPosition;
        pieceElement.dataset.displayIndex = displayIndex;
        
        pieceElement.style.backgroundImage = `url(${gameState.imageDataUrl})`;
        pieceElement.style.backgroundPosition = piece.backgroundPosition;
        pieceElement.style.backgroundSize = piece.backgroundSize;
        
        pieceElement.addEventListener('dragstart', handleDragStart);
        pieceElement.addEventListener('dragend', handleDragEnd);
        
        piecesList.appendChild(pieceElement);
    });
}

// Drag and Drop Handlers
function handleDragStart(e) {
    e.target.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', e.target.dataset.correctPosition);
}

function handleDragEnd(e) {
    e.target.classList.remove('dragging');
}

function handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    e.currentTarget.classList.add('highlight');
    return false;
}

function handleDragLeave(e) {
    e.currentTarget.classList.remove('highlight');
}

function handleDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    
    const slot = e.currentTarget;
    slot.classList.remove('highlight');
    
    const correctPosition = parseInt(e.dataTransfer.getData('text/html'));
    const slotIndex = parseInt(slot.dataset.index);
    
    // Check if correct position
    if (correctPosition === slotIndex && !gameState.placedPieces[slotIndex]) {
        const draggedPiece = document.querySelector(`[data-correct-position="${correctPosition}"]`);
        
        // Create piece for board
        const boardPiece = document.createElement('div');
        boardPiece.className = 'puzzle-piece';
        boardPiece.style.backgroundImage = `url(${gameState.imageDataUrl})`;
        boardPiece.style.backgroundPosition = draggedPiece.style.backgroundPosition;
        boardPiece.style.backgroundSize = draggedPiece.style.backgroundSize;
        
        slot.appendChild(boardPiece);
        slot.classList.add('filled');
        
        // Mark piece as placed
        draggedPiece.classList.add('placed');
        gameState.placedPieces[slotIndex] = correctPosition;
        
        updateProgress();
        checkVictory();
    }
    
    return false;
}

// Update Progress
function updateProgress() {
    const placed = gameState.placedPieces.filter(p => p !== null).length;
    piecesPlaced.textContent = placed;
}

// Timer
function startTimer() {
    gameState.timerInterval = setInterval(() => {
        const elapsed = Date.now() - gameState.startTime;
        const minutes = Math.floor(elapsed / 60000);
        const seconds = Math.floor((elapsed % 60000) / 1000);
        timer.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }, 1000);
}

// Check Victory
function checkVictory() {
    const placed = gameState.placedPieces.filter(p => p !== null).length;
    if (placed === gameState.pieceCount) {
        clearInterval(gameState.timerInterval);
        finalTime.textContent = timer.textContent;
        victoryMessage.style.display = 'flex';
        localStorage.removeItem('jigsawPuzzleGame');
    }
}

// Save Game
function saveGame() {
    const saveData = {
        imageDataUrl: gameState.imageDataUrl,
        pieceCount: gameState.pieceCount,
        gridSize: gameState.gridSize,
        pieces: gameState.pieces,
        placedPieces: gameState.placedPieces,
        startTime: gameState.startTime,
        elapsedTime: Date.now() - gameState.startTime
    };
    localStorage.setItem('jigsawPuzzleGame', JSON.stringify(saveData));
}

// Load Game
function loadGame() {
    const savedData = JSON.parse(localStorage.getItem('jigsawPuzzleGame'));
    if (!savedData) return;
    
    gameState.imageDataUrl = savedData.imageDataUrl;
    gameState.pieceCount = savedData.pieceCount;
    gameState.gridSize = savedData.gridSize;
    gameState.pieces = savedData.pieces;
    gameState.placedPieces = savedData.placedPieces;
    gameState.startTime = Date.now() - savedData.elapsedTime;
    
    // Load image
    const img = new Image();
    img.onload = () => {
        gameState.image = img;
        setupScreen.classList.remove('active');
        gameScreen.classList.add('active');
        
        createPuzzleBoard();
        restorePuzzleState();
        startTimer();
        updateProgress();
    };
    img.src = savedData.imageDataUrl;
}

// Restore Puzzle State
function restorePuzzleState() {
    piecesList.innerHTML = '';
    
    const pieceWidth = gameState.image.width / gameState.gridSize;
    const pieceHeight = gameState.image.height / gameState.gridSize;
    
    // Restore placed pieces
    gameState.placedPieces.forEach((correctPos, slotIndex) => {
        if (correctPos !== null) {
            const slot = puzzleBoard.children[slotIndex];
            const row = Math.floor(correctPos / gameState.gridSize);
            const col = correctPos % gameState.gridSize;
            
            const boardPiece = document.createElement('div');
            boardPiece.className = 'puzzle-piece';
            boardPiece.style.backgroundImage = `url(${gameState.imageDataUrl})`;
            boardPiece.style.backgroundPosition = `-${col * pieceWidth}px -${row * pieceHeight}px`;
            boardPiece.style.backgroundSize = `${gameState.image.width}px ${gameState.image.height}px`;
            
            slot.appendChild(boardPiece);
            slot.classList.add('filled');
        }
    });
    
    // Restore remaining pieces
    gameState.pieces.forEach((piece, displayIndex) => {
        if (!gameState.placedPieces.includes(piece.correctPosition)) {
            const pieceElement = document.createElement('div');
            pieceElement.className = 'piece';
            pieceElement.draggable = true;
            pieceElement.dataset.correctPosition = piece.correctPosition;
            pieceElement.dataset.displayIndex = displayIndex;
            
            pieceElement.style.backgroundImage = `url(${gameState.imageDataUrl})`;
            pieceElement.style.backgroundPosition = piece.backgroundPosition;
            pieceElement.style.backgroundSize = piece.backgroundSize;
            
            pieceElement.addEventListener('dragstart', handleDragStart);
            pieceElement.addEventListener('dragend', handleDragEnd);
            
            piecesList.appendChild(pieceElement);
        }
    });
}

// Utility: Shuffle Array
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

// Reset Game State
function resetGameState() {
    gameState = {
        image: null,
        imageDataUrl: null,
        pieceCount: 16,
        gridSize: 4,
        pieces: [],
        placedPieces: [],
        startTime: null,
        timerInterval: null,
        pieceSize: 100
    };
    imagePreview.innerHTML = '';
    imageUpload.value = '';
    startButton.disabled = true;
}
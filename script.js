let map;
let currentIndex = 0;
let correct = 0;
let incorrect = 0;
let quizStartTime = null;
let quizEndTime = null;
let timerInterval = null;
let mutexLocked = false; // prevents double-answering while advancing
let activeBoxes = []; // keep rectangles on map

const MUST_HAVE_LOCATIONS = {
  name: "Alumni Relations, Reseda Annex (Required)",
  bounds: {
    north: 34.240016,
    south: 34.239732,
    east: -118.535614,
    west: -118.535947,
  },
};

const LOCATIONS = [
  {
    name: "Campus Store",
    bounds: {
      north: 34.237781,
      south: 34.236974,
      east: -118.5276,
      west: -118.528689,
    },
  },
  {
    name: "Student Recreation Center",
    bounds: {
      north: 34.240637,
      south: 34.239253,
      east: -118.524638,
      west: -118.525169,
    },
  },
  {
    name: "Jacaranda Hall",
    bounds: {
      north: 34.242078,
      south: 34.241009,
      east: -118.527836,
      west: -118.529456,
    },
  },
  {
    name: "Chaparral Hall",
    bounds: {
      north: 34.238606,
      south: 34.237883,
      east: -118.526688,
      west: -118.527224,
    },
  },
  {
    name: "Sierra Hall",
    bounds: {
      north: 34.238544,
      south: 34.238069,
      east: -118.529992,
      west: -118.531435,
    },
  },
  {
    name: "Delmar T. Oviatt Library",
    bounds: {
      north: 34.240402,
      south: 34.239741,
      east: -118.528619,
      west: -118.530024,
    },
  },
  {
    name: "Redwood Hall",
    bounds: {
      north: 34.242624,
      south: 34.241236,
      east: -118.525288,
      west: -118.527047,
    },
  },
  {
    name: "Lot B5",
    bounds: {
      north: 34.242655,
      south: 34.241111,
      east: -118.531832,
      west: -118.533715,
    },
  },
  {
    name: "University Student Union",
    bounds: {
      north: 34.240309,
      south: 34.239719,
      east: -118.525261,
      west: -118.526602,
    },
  },
];

// Function to get a random set of locations including the required one for the quiz
function getRandomLocations(locations, count = 4) {
  const copy = [...locations];

  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }

  const randomLocations = copy.slice(0, count);
  return [...randomLocations, MUST_HAVE_LOCATIONS];
}

// get the inital random location
let finalLocations = getRandomLocations(LOCATIONS);

// Function to clear boxes
function clearBoxes() {
  activeBoxes.forEach((r) => r.setMap(null));
  activeBoxes = [];
}

// Function to add a box to the map
function addBox(boundsObj, isCorrect) {
  const box = new google.maps.Rectangle({
    bounds: boundsObj,
    map,
    strokeOpacity: 0.9,
    strokeWeight: 2,
    fillOpacity: 0.35,
    strokeColor: isCorrect ? "#1f7a3a" : "#b02a2a",
    fillColor: isCorrect ? "#5ac878" : "#ff5050",
  });
  activeBoxes.push(box);
  return box;
}

// Function to update the UI
function updateUI() {
  const q = finalLocations[currentIndex];
  $("#questionText").text(q ? q.name : "Done");
  $("#progress").text(String(Math.min(currentIndex, finalLocations.length)));
  $("#correctCount").text(String(correct));
  $("#incorrectCount").text(String(incorrect));
}

// Function to add to the answer log
function logAttempt(questionName, wasCorrect) {
  const $log = $("#log");
  const msg = wasCorrect ? "Your answer is correct!!" : "Sorry wrong location.";
  const msgClass = wasCorrect ? "small-correct" : "small-wrong";
  const item = $(`
    <div class="log-item">
      <span>Where is ${questionName}</span>
      <span class=${msgClass}>${msg}</span>
    </div>
  `);
  $log.prepend(item);
}

// Function to call when quiz starts
function startQuizTimer() {
  if (quizStartTime !== null) return; // already started

  quizStartTime = Date.now();

  timerInterval = setInterval(() => {
    const elapsedMs = Date.now() - quizStartTime;
    const seconds = Math.floor(elapsedMs / 1000);
    const minutes = Math.floor(seconds / 60);
    const displaySeconds = seconds % 60;

    $("#timer").text(
      `${minutes}:${displaySeconds.toString().padStart(2, "0")}`,
    );
  }, 1000);
}

// Function used to calculate final score
function calculateFinalScore(correct, incorrect, totalSeconds) {
  if (!totalSeconds || totalSeconds <= 0) return 0;

  const totalQuestions = correct + incorrect;

  // Accuracy score
  const accuracy = correct / totalQuestions;

  // Time score decey multiplier
  const expectedTime = totalQuestions * 0.5;
  const timeFactor = Math.min(1, expectedTime / totalSeconds);

  // Final score
  const maxScore = totalQuestions * 100;

  const finalScore = Math.round(maxScore * accuracy * timeFactor);

  return finalScore;
}

// Function to call when quiz is finished
function finishQuiz() {
  mutexLocked = true;

  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }

  quizEndTime = Date.now();
  const totalSeconds = Math.floor((quizEndTime - quizStartTime) / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const score = calculateFinalScore(correct, incorrect, totalSeconds);

  $("#feedback").addClass("hidden");
  $("#finalBanner").removeClass("hidden");
  $("#finalBanner").text(
    `${correct} Correct, ${incorrect} Incorrect | Time: ${minutes}:${seconds.toString().padStart(2, "0")} | Score: ${score}`,
  );

  $("#questionText").text("Quiz Complete");

  const $entry = $(`
    <div class="score-entry">
      <span class="score-value">${score}</span>
      <span class="score-details">
        ${correct}/${finalLocations.length} correct ·
        ${minutes}:${seconds.toString().padStart(2, "0")}
      </span>
    </div>
  `);

  $("#scorePanel").append($entry);
}

// Function that is called when the next question is needed also finishes quiz if there is no next question
function nextQuestion() {
  currentIndex += 1;
  mutexLocked = false;
  updateUI();

  if (currentIndex >= finalLocations.length) {
    finishQuiz();
  } else {
    $("#feedback").text("Double-click the map to answer.");
  }
}

// Function to check to see if point picked is in correct bounds
function isPointInBounds(latLng, bounds) {
  const lat = latLng.lat();
  const lng = latLng.lng();
  return (
    lat <= bounds.north &&
    lat >= bounds.south &&
    lng <= bounds.east &&
    lng >= bounds.west
  );
}

// Function that handless the guessing after user double clicks
function handleGuess(latLng) {
  if (mutexLocked) return;
  if (currentIndex >= finalLocations.length) return;

  // Starts timer
  if (currentIndex === 0) {
    startQuizTimer();
  }

  mutexLocked = true;

  const q = finalLocations[currentIndex];
  const correctBounds = q.bounds;
  const wasCorrect = isPointInBounds(latLng, correctBounds);

  if (wasCorrect) {
    correct += 1;
    $("#feedback").text("Your answer is correct!!");
    addBox(correctBounds, true); // green
  } else {
    incorrect += 1;
    $("#feedback").text("Sorry wrong location.");
    addBox(correctBounds, false); // red
  }

  logAttempt(q.name, wasCorrect);
  updateUI();

  // advance after a short pause so user can see the results
  window.setTimeout(nextQuestion, 1000);
}

// Function to restart the game
function restart() {
  currentIndex = 0;
  correct = 0;
  incorrect = 0;
  mutexLocked = false;

  if (timerInterval) clearInterval(timerInterval);
  timerInterval = null;
  quizStartTime = null;
  quizEndTime = null;
  $("#timer").text("0:00");

  clearBoxes();
  $("#log").empty();
  $("#finalBanner").addClass("hidden");
  $("#feedback").removeClass("hidden");
  $("#feedback").text("Double-click the map to answer.");

  finalLocations = getRandomLocations(LOCATIONS);
  updateUI();
}

// Google Maps callback
window.initMap = function initMap() {
  // Center around CSUN
  const csunCenter = { lat: 34.24, lng: -118.529 };

  map = new google.maps.Map(document.getElementById("map"), {
    center: csunCenter,
    zoom: 17,

    // Disable map interactions (panning/zooming)
    disableDefaultUI: true,
    draggable: false,
    scrollwheel: false,
    disableDoubleClickZoom: true,
    gestureHandling: "none",
    keyboardShortcuts: false,

    // Remove all lables
    styles: [{ elementType: "labels", stylers: [{ visibility: "off" }] }],
  });

  // Answering by DOUBLE CLICK
  map.addListener("dblclick", (e) => {
    handleGuess(e.latLng);
  });

  // Restart button
  $("#restartButton").on("click", restart);

  updateUI();
};

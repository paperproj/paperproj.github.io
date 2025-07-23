import { useState, useEffect } from 'react';
import { AnimatePresence } from "framer-motion";
import { BASE_URL } from './utils/constants';

// Icons for visuals
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBookmark, faThumbsUp, faThumbsDown } from "@fortawesome/free-solid-svg-icons";

// Local imports from codebase
import { getLocalStorageSizeKB } from './utils/storage';
import PaperCard from './components/PaperCard'
import useKeyboardShortcuts from './hooks/useKeyboardShortcuts';
import usePaperQueue from './hooks/usePaperQueue';
import FieldSelector from './components/FieldSelector';


function App() {

  // Static default values, do not need persistance across sessions
  const LOCK_DURATION_MS = 500;
  const [showFullAbstract, setShowFullAbstract] = useState(false);
  const [locked, setLocked] = useState(false);
  const [keyboardSwipeDirection, setKeyboardSwipeDirection] = useState(null);
  const [actionType, setActionType] = useState(null);

  // Read from localStorage, dynamic values that persist across sessions
  const [showHistory, setShowHistory] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("showHistory")) || false;
    } catch {
      return false;
    }
  });

  const [selectedField, setSelectedField] = useState(() => {
    try {
      return localStorage.getItem("selectedField") || "";
    } catch {
      return "";
    }
  });


  // Hook that handles the core logic for paper fetching, queuing, and feedback
  const {
    paper, // Current full paper object
    likedIds, // Array of paper IDs the user has liked
    likedPapers, // Arrays of full paper objects the user has liked
    dislikedIds,
    dislikedPapers, // Same as above but for user dislikes
    restored, // A boolean flag to indicate whether history is successfully loaded from localStorage
    loading, // A boolean flag
    error, // Holds error messages from fetch failures or backend issues
    lockedRef, // A ref object that blocks quick repeat actions
    handleFeedback, // Function that records feedback
    handleSkip, // Function that handles action on skip
    handleResetSession, // Function to reset the entire session
  } = usePaperQueue({ setLocked, LOCK_DURATION_MS, selectedField });


  // Hook that syncs the showHistory state to the localStorage
  useEffect(() => {
    localStorage.setItem("showHistory", JSON.stringify(showHistory));
  }, [showHistory]);

  // Hook that listens for keyboard input and triggers feedback actions
  // 1) like  dislike, skip, toggle abstract
  useKeyboardShortcuts({
    paper, // Needed to verify that abstract toggling is valid
    lockedRef, // Prevents double inputs (e.g. spamming arrow keys)

    // Feedback handlers tied to arrow keys
    onLike: () => {
      handleFeedback(true);
      setActionType("like");
      setTimeout(() => setActionType(null), 400);
    },
    onDislike: () => {
      handleFeedback(false);
      setActionType("dislike");
      setTimeout(() => setActionType(null), 400);
    },
    onSkip: () => {
      handleSkip();
      setActionType("skip");
      setTimeout(() => setActionType(null), 400);
    },
    onToggleAbstract: () => {
      if (paper?.abstract) {
        setShowFullAbstract(prev => !prev)
      }
    },
    setKeyboardSwipeDirection // Controls animation direction on keypress
  });

  // Rendering of React UI
  return (
    <div style={{ padding: "1rem", fontFamily: "sans-serif" }}>

      {/* Centered layout with a max width */}
      <div style={{ maxWidth: "600px", margin: "0 auto" }}>

        {/*  Header bar: app title + field selection */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem" }}>

          {/* Header */}
          <h1 style={{ margin: 0, fontSize: "1.5rem" }}>
            <FontAwesomeIcon icon={faBookmark} color="#007bff" />
            &nbsp;Paper Project
          </h1>

          {/* Field selector */}
          <div style={{ flex: "0 0 250px" }}>
            <FieldSelector onSelect={(field) => {
              setSelectedField(field);
              localStorage.setItem("selectedField", field);

              // Reset backend fallback state
              fetch(`${BASE_URL}/reset-fallback`, { method: "POST" });

              // Reset local state
              window.location.reload();

            }} />
          </div>

        </div>

        {/* Loading/error messages */}
        {loading && <p>Loading...</p>}
        {error && <p style={{ color: "red" }}>{error}</p>}

        {/* Animated paper transitions */}
        <AnimatePresence mode="wait">

          {/* Render PaperCard when valid paper and no error */}
          {!loading && paper && !error && (
            <PaperCard
              paper={paper}
              locked={locked}
              showFullAbstract={showFullAbstract}
              setShowFullAbstract={setShowFullAbstract}

              // Feedback actions
              onLike={() => {
                handleFeedback(true);
                setActionType("like");
                setTimeout(() => setActionType(null), 400);
              }}
              onDislike={() => {
                handleFeedback(false);
                setActionType("dislike");
                setTimeout(() => setActionType(null), 400);
              }}
              onSkip={() => {
                handleSkip();
                setActionType("skip");
                setTimeout(() => setActionType(null), 400);
              }}

              // Reset all feedback
              onReset={handleResetSession}

              // Toggle liked/disliked paper history
              onToggleHistory={() => setShowHistory((prev) => !prev)}

              // Pass state for UI feedback animations
              showHistory={showHistory}
              keyboardSwipeDirection={keyboardSwipeDirection}
              actionType={actionType}
            />
          )}
        </AnimatePresence>

          {/* History view: only show when requested and localStorage restored */}
          {!loading && showHistory && restored && (
          <>
            {/* Dual-column liked/disliked paper titles */}
            <div style={styles.historyContainer}>

              {/* Liked papers column */}
              <div style={styles.historyColumn}>
                <h4 style={styles.historyHeader}>
                  <FontAwesomeIcon icon={faThumbsUp} color="#007bff" /> Liked
                </h4>
                <ul style={styles.historyList}>
                  {likedPapers.map((p) => (
                    <li key={`like-${p.paperId}`} style={styles.historyItem}>{p.title}</li>
                  ))}
                </ul>
              </div>

              {/* Disliked papers column */}
              <div style={styles.historyColumn}>
                <h4 style={styles.historyHeader}>
                  <FontAwesomeIcon icon={faThumbsDown} color="#007bff" /> Disliked
                </h4>
                <ul style={styles.historyList}>
                  {dislikedPapers.map((p) => (
                    <li key={`dislike-${p.paperId}`} style={styles.historyItem}>{p.title}</li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Show estimated localStorage usage */}
            <p style={{ fontSize: "0.7rem", textAlign: "right", marginTop: "0.5rem", color: "#666" }}>
              Storage: {getLocalStorageSizeKB()} KB
            </p>

          </>
        )}
      </div>
    </div>
  );

}

const styles = {

  historyContainer: {
    display: "flex",
    justifyContent: "space-between",
    gap: "2rem",
    marginTop: "2rem",
    background: "#f9f9f9",
    padding: "1rem",
    borderRadius: "8px",
    fontSize: "0.75rem",
  },

  historyColumn: {
    flex: 1,
    maxHeight: "200px",
    overflowY: "auto",
    paddingRight: "0.5rem",
  },

  historyHeader: {
    marginBottom: "0.5rem",
    fontSize: "0.85rem",
    color: "#333",
  },

  historyList: {
    listStyleType: "disc",
    paddingLeft: "1rem",
    margin: 0,
    overflowX: "auto",
    whiteSpace: "nowrap",
  },

  historyItem: {
    marginBottom: "0.25rem",
    whiteSpace: "nowrap",
    maxWidth: "100%",
    paddingBottom: "2px",
  },

};

export default App;
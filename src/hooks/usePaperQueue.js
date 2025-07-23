import { useEffect, useState, useRef } from "react";
import { BASE_URL } from '../utils/constants';

// Main hook that manages the paper queue, history, and interactions
export default function usePaperQueue({ setLocked, LOCK_DURATION_MS, selectedField }) {
  const [paper, setPaper] = useState(null);

  // Liked papers and their IDs
  const [likedPapers, setLikedPapers] = useState([]);
  const [likedIds, setLikedIds] = useState([]);

  // Disliked papers and their IDs
  const [dislikedIds, setDislikedIds] = useState([]);
  const [dislikedPapers, setDislikedPapers] = useState([]);

  // Skipped paper IDs
  const [skippedIds, setSkippedIds] = useState([]);

  // Queues: fallback (default feed) and recommendations
  const [fallbackQueue, setFallbackQueue] = useState([]);
  const [recommendationQueue, setRecommendationQueue] = useState([]);

  // Tracks how many feedback actions have been given
  const [actionCount, setActionCount] = useState(0);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Prevents duplicate actions during loading/animation delay
  const lockedRef = useRef(false);

  // localStorage
  const [restored, setRestored] = useState(false);


  useEffect(() => {
    if (restored) {
      fetchFallbackBatch();
    }
  }, [restored, selectedField]);

  // Persist state to localStorage whenever liked/disliked/skipped changes
  useEffect(() => {
    if (!restored) return;
    localStorage.setItem("likedPapers", JSON.stringify(likedPapers));
  }, [likedPapers, restored]);

  useEffect(() => {
    if (!restored) return;
    localStorage.setItem("dislikedPapers", JSON.stringify(dislikedPapers));
  }, [dislikedPapers, restored]);

  useEffect(() => {
    if (!restored) return;
    localStorage.setItem("skippedIds", JSON.stringify(skippedIds));
  }, [skippedIds, restored]);


  // Restore session history from localStorage on first load
  useEffect(() => {
    const liked = JSON.parse(localStorage.getItem("likedPapers") || "[]");
    console.log("Restoring likedPapers:", liked);
    const disliked = JSON.parse(localStorage.getItem("dislikedPapers") || "[]");
    console.log("Restoring dislikedPapers:", disliked);
    const skipped = JSON.parse(localStorage.getItem("skippedIds") || "[]");

    setLikedPapers(liked);
    setDislikedPapers(disliked);
    setSkippedIds(skipped);

    setLikedIds(liked.map(p => p.paperId));
    setDislikedIds(disliked.map(p => p.paperId));

    setRestored(true);
  }, []);

  // Returns a set of all seen paper IDs (to filter duplicates)
  function getSeenSet() {
    return new Set([
      ...likedPapers.map(p => p.paperId),
      ...dislikedPapers.map(p => p.paperId),
      ...skippedIds,
    ]);
  }

  // Fetches a batch of default feed papers and filters out any already seen papers
  function fetchFallbackBatch() {
    setLoading(true);
    const encodedField = selectedField ? `&field=${encodeURIComponent(selectedField)}` : "";

    fetch(`${BASE_URL}/feed?limit=5${encodedField}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
        } else {
          const seen = getSeenSet();
          const filtered = data.filter(p => !seen.has(p.paperId));
          setFallbackQueue(filtered);
          setPaper(filtered[0]);
        }
      })
      .catch((err) => setError("Network error: " + err.message))
      .finally(() => setLoading(false));
  }


  // Fetches recommendations based on liked/disliked paper IDs
  async function fetchRecommendationBatch() {

    const body = {
      positivePaperIds: likedIds,
      negativePaperIds: dislikedIds,
    };

    try {
      const response = await fetch(`${BASE_URL}/recommendations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const papers = await response.json();
      if (Array.isArray(papers)) {
        const seen = getSeenSet();
        const filtered = papers.filter(p => !seen.has(p.paperId));
        setRecommendationQueue(filtered);
      } else {
        console.warn("Unexpected format in /smart-batch:", papers);
      }
    } catch (err) {
      console.error("❌ Recommendation batch fetch failed:", err.message);
    }
  }

  // Locks UI interaction temporarily
  function lockForDuration() {
    setLocked(true);
    lockedRef.current = true;
    setTimeout(() => {
      setLocked(false);
      lockedRef.current = false;
    }, LOCK_DURATION_MS);
  }

  // Handles like/dislike actions, updates state, queues next paper
  function handleFeedback(isLiked) {
    if (lockedRef.current || !paper?.paperId) return;

    lockForDuration();

    if (isLiked) {
      setLikedIds((prev) =>
        prev.includes(paper.paperId) ? prev : [...prev, paper.paperId]
      );
      setLikedPapers((prev) =>
        prev.some(p => p.paperId === paper.paperId) ? prev : [...prev, paper]
      );
    } else {
      setDislikedIds((prev) =>
        prev.includes(paper.paperId) ? prev : [...prev, paper.paperId]
      );
      setDislikedPapers((prev) =>
        prev.some(p => p.paperId === paper.paperId) ? prev : [...prev, paper]
      );
    }
    advanceQueue();
  }

  // Handles skip actions and queues next paper
  function handleSkip() {
    if (lockedRef.current || !paper?.paperId) return;
    setSkippedIds((prev) => [...prev, paper.paperId]);
    lockForDuration();
    advanceQueue();
  }

  // Moves forward in the queue or fetches new batch if need be
  function advanceQueue() {
    setActionCount((count) => {
      const newCount = count + 1;
      if (newCount % 5 === 0) fetchRecommendationBatch();
      return newCount;
    });

    const nextQueue = fallbackQueue.slice(1);

    if (nextQueue.length > 0) {
      setFallbackQueue(nextQueue);
      setPaper(nextQueue[0]);
    } else if (recommendationQueue.length > 0) {
      setFallbackQueue(recommendationQueue);
      setRecommendationQueue([]);
      setPaper(recommendationQueue[0]);
    } else {
      fetchFallbackBatch();
    }
  }

  // Fully resets the sesstion and localStorage
  function handleResetSession() {
    fetch(`${BASE_URL}/reset-fallback`, { method: "POST" })
      .then(() => {
        setPaper(null);
        setLikedIds([]);
        setLikedPapers([]);
        setDislikedIds([]);
        setDislikedPapers([]);
        setFallbackQueue([]);
        setRecommendationQueue([]);
        setActionCount(0);
        fetchFallbackBatch();
        setSkippedIds([]);

        localStorage.removeItem("likedPapers");
        localStorage.removeItem("dislikedPapers");
        localStorage.removeItem("skippedIds");
      });
  }

  // Hook return API
  return {
    paper,
    likedIds,
    likedPapers,
    dislikedIds,
    dislikedPapers,
    fallbackQueue,
    recommendationQueue,
    loading,
    error,
    lockedRef,
    handleFeedback,
    handleSkip,
    handleResetSession,
    restored,
  };
}

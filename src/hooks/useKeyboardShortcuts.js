import { useEffect } from "react";


// Hook to map keyboard input to paper feedback actions
export default function useKeyboardShortcuts({
  paper,  // Current paper object
  lockedRef, // Ref that prevents double input if locked
  onLike, // Callback for "like" action
  onDislike, // Callback for "dislike" action
  onSkip, // Callback for "skip" action
  onToggleAbstract, // Callback for toggling abstract view
  setKeyboardSwipeDirection // Sets the swipe direction for animation
 }) {

  useEffect(() => {

    // Handler for key presses
    const handleKeyDown = (event) => {

      // If no paper or interaction is locked, do nothing
      if (!paper || lockedRef.current) return;

      switch (event.key) {

        case "ArrowRight":
          setKeyboardSwipeDirection("right");
          setTimeout(() => {
            onLike();
            setKeyboardSwipeDirection(null);
          }, 300);
          break;

        case "ArrowLeft":
          setKeyboardSwipeDirection("left");
          setTimeout(() => {
            onDislike();
            setKeyboardSwipeDirection(null);
          }, 300);
          break;

        case "ArrowUp":
          setKeyboardSwipeDirection("up");
          setTimeout(() => {
            onSkip();
            setKeyboardSwipeDirection(null);
          }, 300);
          break;

        case "ArrowDown":
          if (onToggleAbstract) {
            onToggleAbstract();
          }
          break;

        // Ignore any other keys
        default:
          break;
      }
    };

    // Waits for a keyboard input anywhere in the app
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [paper, onLike, onDislike, onSkip, lockedRef, setKeyboardSwipeDirection]);
}

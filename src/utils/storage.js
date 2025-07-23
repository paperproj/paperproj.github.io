// Utility to approximate storage usage in KB, helps to debug localStorage limits
export function getLocalStorageSizeKB() {
  let total = 0;
  for (let key in localStorage) {
    if (localStorage.hasOwnProperty(key)) {
      const value = localStorage.getItem(key);
      total += key.length + (value?.length || 0);
    }
  }
  return (total / 1024).toFixed(1);
}
import { useState, useEffect } from "react";

// List of fields to populate the field selector
import { FIELDS } from "../data/fields";


export default function FieldSelector({ onSelect }) {
  const [query, setQuery] = useState("");
  const [filtered, setFiltered] = useState([]);

  useEffect(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      setFiltered([]);
      return;
    }

    const matches = FIELDS.filter(field => {
      const words = field.toLowerCase().split(/[\s\-]/); // Split on spaces & hyphens
      return words.some(word => word.includes(q));
    });

    setFiltered(matches);
  }, [query]);

  return (
    <div style={{ position: "relative", width: "200px", marginLeft: "1rem" }}>
      <input
        placeholder="Adjust your feed..."
        value={query}
        onChange={e => setQuery(e.target.value)}
        style={{
          width: "100%",
          padding: "0.5rem",
          border: "1px solid #ccc",
          borderRadius: "4px",
        }}
      />
      {filtered.length > 0 && (
        <ul
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            background: "#fff",
            border: "1px solid #ccc",
            borderTop: "none",
            maxHeight: "150px",
            overflowY: "auto",
            margin: 0,
            padding: 0,
            zIndex: 1000,
            listStyle: "none",
          }}
        >
          {filtered.map((field) => (
            <li key={field}>
              <button
                onClick={() => {
                  setQuery(field);
                  setFiltered([]);
                  onSelect(field);
                }}
                style={{
                  width: "100%",
                  textAlign: "left",
                  padding: "0.5rem",
                  background: "white",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                {field}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// EnglishInput.js - Clean Version
import React from "react";

export default function EnglishInput({ value, onChange, onSubmit, loading }) {
  return (
    <div className="english-input">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!loading && value.trim()) onSubmit(value);
        }}
      >
        <textarea
          rows={6}
          value={value}
          disabled={loading}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Example: A Student can enroll in many Courses. Each Course has a course_id (primary key) and title. Students have student_id (primary key), name, and email..."
          className="input-field"
        />
        <button 
          type="submit" 
          disabled={loading || !value.trim()} 
          className="btn btn-primary"
          style={{width: '100%', marginTop: '1rem'}}
        >
          {loading ? (
            <>
              <div className="spinner-small"></div>
              Generating...
            </>
          ) : (
            'Generate ER Diagram'
          )}
        </button>
      </form>
    </div>
  );
}
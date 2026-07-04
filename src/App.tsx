import React, { useState } from "react";

function App() {
  const [count] = useState(0);
  return <div style={{ padding: 16 }}>Resource Companion {count}</div>;
}

export default App;

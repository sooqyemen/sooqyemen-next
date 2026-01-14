document.addEventListener("DOMContentLoaded", function() {
  const script = document.createElement("script");
  script.src = "path/to/your/script.js";
  script.defer = true;
  document.head.appendChild(script);
});